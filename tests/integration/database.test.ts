import 'dotenv/config';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import pg from 'pg';
import {randomUUID} from 'node:crypto';
import {migrate} from '../../scripts/migrate';
import {seed} from '../../scripts/seed';
import {createLead,updateLead} from '@/server/leads';
import {createBasicSession} from '@/server/auth';
import {pool} from '@/server/db';
import {validLead} from '../fixture';
let db:pg.Client;
beforeAll(async()=>{
 const base=process.env.TEST_DATABASE_URL||process.env.DATABASE_URL;if(!base)throw new Error('Database required; start pnpm db:start first');
 const url=new URL(base);url.pathname='/nexokit_test';
 if(!['localhost','127.0.0.1'].includes(url.hostname))throw new Error('Integration tests require local nexokit_test');
 const adminUrl=new URL(url);adminUrl.pathname='/postgres';const admin=new pg.Client({connectionString:adminUrl.toString()});await admin.connect();
 if(!(await admin.query("SELECT 1 FROM pg_database WHERE datname='nexokit_test'")).rowCount)await admin.query('CREATE DATABASE nexokit_test');await admin.end();
 process.env.DATABASE_URL=url.toString();process.env.APP_ENV='development';process.env.TOKEN_SECRET='integration-only-token-secret-32-characters';
 db=new pg.Client({connectionString:url.toString()});await db.connect();await db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
 await migrate(url.toString(),true);await seed(url.toString());
});
afterAll(async()=>{await db?.end();await pool().end();});
describe('PostgreSQL migration and CRM',()=>{
 it('migrates empty database and creates exactly 28 marked fixtures',async()=>{expect((await db.query('SELECT count(*)::int n FROM inventory_unit WHERE is_fixture')).rows[0].n).toBe(28);await migrate(process.env.DATABASE_URL!,true);});
 it('creates an opaque server-side session for the built-in administrator',async()=>{
  const token=await createBasicSession();
  expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect((await db.query('SELECT count(*)::int n FROM staff_session')).rows[0].n).toBe(1);
 });
 it('denies direct public and authenticated access to PII and pricing',async()=>{for(const role of ['anon','authenticated']){await db.query(`SET ROLE ${role}`);await expect(db.query('SELECT * FROM customer')).rejects.toThrow();await expect(db.query('SELECT * FROM pricing_version')).rejects.toThrow();await db.query('RESET ROLE');}});
 it('rejects blank serials and bad foreign keys',async()=>{
  const id=(await db.query('SELECT id FROM equipment LIMIT 1')).rows[0].id;
  await expect(db.query("INSERT INTO inventory_unit(equipment_id,asset_tag,status,serial) VALUES($1,'BAD','ready','')",[id])).rejects.toThrow();
  await expect(db.query("INSERT INTO inventory_unit(equipment_id,asset_tag) VALUES($1,'BAD-FK')",[randomUUID()])).rejects.toThrow();
 });
 it('rejects overlapping allocation and allows exact buffer boundary',async()=>{
  const id=(await db.query('SELECT id FROM inventory_unit LIMIT 1')).rows[0].id;
  await db.query("INSERT INTO unit_allocation(inventory_unit_id,kind,period,reason) VALUES($1,'manual','[2030-10-15 08:00-05,2030-10-15 16:00-05)','QA')",[id]);
  await expect(db.query("INSERT INTO unit_allocation(inventory_unit_id,kind,period,reason) VALUES($1,'manual','[2030-10-15 15:00-05,2030-10-15 18:00-05)','QA conflict')",[id])).rejects.toThrow();
  await db.query("INSERT INTO unit_allocation(inventory_unit_id,kind,period,reason) VALUES($1,'manual','[2030-10-15 16:00-05,2030-10-15 20:00-05)','QA boundary')",[id]);
 });
 it('deduplicates simultaneous submissions atomically and preserves distinct opportunities',async()=>{
  const key=randomUUID();const results=await Promise.all([createLead(validLead,key),createLead(validLead,key)]);
  expect(results[0].leadId).toBe(results[1].leadId);
  await createLead({...validLead,purpose:'Otro evento'},randomUUID());
  expect((await db.query('SELECT count(*)::int n FROM customer')).rows[0].n).toBe(1);
  expect((await db.query('SELECT count(*)::int n FROM lead')).rows[0].n).toBe(2);
  await expect(createLead({...validLead,quantity:10},key)).rejects.toMatchObject({status:409});
 });
 it('preserves consent, attribution and does not overwrite customer identity on public repeat',async()=>{
  await createLead({...validLead,name:'Otro nombre',marketing:true,attribution:{source:'partner'}},randomUUID());
  const l=(await db.query('SELECT * FROM lead ORDER BY created_at DESC LIMIT 1')).rows[0];
  expect(l.marketing_consent).toBe(true);expect(l.privacy_version).toBe('sprint1-demo-v1');expect(l.attribution.first.source).toBe('test');expect(l.attribution.last.source).toBe('partner');
  expect((await db.query('SELECT contact_name FROM customer')).rows[0].contact_name).toBe(validLead.name);
 });
 it('saves follow-up and immutable audit history',async()=>{
  const id=(await db.query('SELECT id FROM lead LIMIT 1')).rows[0].id;
  await updateLead(id,{stage:'qualified',ownerId:'00000000-0000-4000-8000-000000000012',estimatedValue:2500000,nextAction:'2030-10-01T10:00:00-05:00',lossReason:'',note:'Revisar logística'}, {id:'00000000-0000-4000-8000-000000000011',auth_user_id:'00000000-0000-4000-8000-000000000001',role:'admin'});
  expect((await db.query('SELECT stage FROM lead WHERE id=$1',[id])).rows[0].stage).toBe('qualified');
  expect((await db.query('SELECT body FROM lead_note WHERE lead_id=$1',[id])).rows[0].body).toBe('Revisar logística');
  await expect(db.query("UPDATE audit_log SET action='tampered'")).rejects.toThrow();
 });
 it('requires an actual loss reason at the database boundary',async()=>{
  const id=(await db.query('SELECT id FROM lead LIMIT 1')).rows[0].id;
  await expect(db.query("UPDATE lead SET stage='lost',loss_reason=NULL WHERE id=$1",[id])).rejects.toThrow();
 });
});
