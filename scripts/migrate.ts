import 'dotenv/config';
import { readFile, readdir } from 'node:fs/promises';
import pg from 'pg';

const migrationSignals:Record<string,string>={
 '0001_foundations.sql':"SELECT to_regclass('public.staff_profile') IS NOT NULL AS applied",
 '0002_required_values.sql':"SELECT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='lost_requires_reason' AND conrelid=to_regclass('public.lead')) AS applied",
 '0003_sprint2.sql':"SELECT to_regclass('public.rental_settings') IS NOT NULL AS applied",
 '0004_mvp_cotizador_vr.sql':"SELECT EXISTS(SELECT 1 FROM public.pricing_version WHERE rules_hash='mvp-cotizador-vr-oct-2026') AS applied",
 '0005_product_photos_email.sql':"SELECT to_regclass('public.equipment_photo') IS NOT NULL AS applied",
 '0006_product_management.sql':"SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='equipment' AND column_name='slug') AS applied",
 '0007_basic_staff_auth.sql':"SELECT to_regclass('public.staff_session') IS NOT NULL AS applied",
};
async function baselineExistingSchema(db:pg.Client,files:string[]){
 if((await db.query('SELECT 1 FROM public.schema_migrations LIMIT 1')).rowCount)return;
 const states:boolean[]=[];
 for(const [index,file] of files.entries()){
  if(index>0&&!states[0]){states.push(false);continue;}
  const signal=migrationSignals[file];states.push(signal?Boolean((await db.query(signal)).rows[0]?.applied):false);
 }
 const firstMissing=states.findIndex(applied=>!applied);
 const prefixLength=firstMissing<0?states.length:firstMissing;
 if(states.slice(prefixLength).some(Boolean))throw new Error('Existing database schema is not a contiguous migration prefix; review it before deploying.');
 for(const file of files.slice(0,prefixLength))await db.query('INSERT INTO public.schema_migrations(name) VALUES($1) ON CONFLICT DO NOTHING',[file]);
}
export async function migrate(url: string, local = false) {
 const db = new pg.Client({ connectionString: url, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined });
 await db.connect();
 try {
  await db.query("SELECT pg_advisory_lock(hashtext('rentatech_schema_migrations'))");
  if(local) {
   const host = new URL(url).hostname;
   if(!['127.0.0.1','localhost','::1'].includes(host) || process.env.APP_ENV !== 'development') throw new Error('Local bootstrap restricted to localhost development');
   await db.query(`CREATE SCHEMA IF NOT EXISTS auth; CREATE TABLE IF NOT EXISTS auth.users(id uuid PRIMARY KEY, email text UNIQUE);
    DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
    IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF; END $$;`);
  }
  await db.query('CREATE TABLE IF NOT EXISTS public.schema_migrations(name text PRIMARY KEY, applied_at timestamptz DEFAULT now())');
  const files=(await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort();
  await baselineExistingSchema(db,files);
  for(const file of files) {
   if((await db.query('SELECT 1 FROM public.schema_migrations WHERE name=$1',[file])).rowCount) continue;
   await db.query('BEGIN');
   try { await db.query(await readFile(`supabase/migrations/${file}`,'utf8')); await db.query('INSERT INTO public.schema_migrations(name) VALUES($1)',[file]); await db.query('COMMIT'); }
   catch(e) { await db.query('ROLLBACK'); throw e; }
  }
 } finally { await db.query("SELECT pg_advisory_unlock(hashtext('rentatech_schema_migrations'))").catch(()=>{});await db.end(); }
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/migrate.ts')) {
 if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
 await migrate(process.env.DATABASE_URL,process.argv.includes('--local'));
 console.log('Migrations applied.');
}
