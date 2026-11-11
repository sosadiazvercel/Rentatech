import 'dotenv/config';
import {it,expect} from 'vitest';
import {readFile,readdir} from 'node:fs/promises';
import pg from 'pg';
import {migrate} from '../../scripts/migrate';

it('upgrades an installation with 0005 recorded but locked_until missing, preserving leads',async()=>{
 const url=new URL(process.env.DATABASE_URL!);
 if(!['localhost','127.0.0.1'].includes(url.hostname))throw Error('Local test database only');
 url.pathname='/rentatech_upgrade_test';const adminUrl=new URL(url);adminUrl.pathname='/postgres';
 const admin=new pg.Client({connectionString:adminUrl.toString()});await admin.connect();
 try{if(!(await admin.query("SELECT 1 FROM pg_database WHERE datname='rentatech_upgrade_test'")).rowCount)await admin.query('CREATE DATABASE rentatech_upgrade_test');}finally{await admin.end();}
 const db=new pg.Client({connectionString:url.toString()});await db.connect();
 try{
  await db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
  await db.query(`CREATE SCHEMA IF NOT EXISTS auth; CREATE TABLE IF NOT EXISTS auth.users(id uuid PRIMARY KEY,email text UNIQUE);
   DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
   IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF; END $$;
   CREATE TABLE public.schema_migrations(name text PRIMARY KEY,applied_at timestamptz DEFAULT now());`);
  const files=(await readdir('supabase/migrations')).filter(file=>file.endsWith('.sql')&&file<'0008').sort();
  for(const file of files){await db.query(await readFile(`supabase/migrations/${file}`,'utf8'));await db.query('INSERT INTO schema_migrations(name) VALUES($1)',[file]);}
  await db.query('ALTER TABLE notification_outbox DROP COLUMN locked_until');
  const customer=(await db.query("INSERT INTO customer(contact_name,email_normalized,phone_e164,customer_type) VALUES('Upgrade QA','upgrade@example.test','+573001234567','private') RETURNING id")).rows[0];
  const lead=(await db.query("INSERT INTO lead(customer_id,stage,request,source,privacy_version,privacy_accepted_at,continuation_token_hash,continuation_expires_at) VALUES($1,'qualified',$2,'qa','qa',now(),'qa',now()+interval '1 day') RETURNING id",[customer.id,JSON.stringify({name:'Upgrade QA',days:2})])).rows[0];
  const appEnv=process.env.APP_ENV;process.env.APP_ENV='development';
  try{await migrate(url.toString(),true);await migrate(url.toString(),true);}finally{process.env.APP_ENV=appEnv;}
  expect((await db.query("SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='notification_outbox' AND column_name='locked_until'")).rows[0].data_type).toBe('timestamp with time zone');
  expect((await db.query("SELECT count(*)::int n FROM schema_migrations WHERE name='0008_lead_workflow.sql'")).rows[0].n).toBe(1);
  expect((await db.query('SELECT stage,request FROM lead WHERE id=$1',[lead.id])).rows[0]).toEqual({stage:'new',request:{name:'Upgrade QA',days:2}});
 }finally{await db.end();}
});
