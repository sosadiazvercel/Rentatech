import 'dotenv/config';
import { readFile, readdir } from 'node:fs/promises';
import pg from 'pg';
export async function migrate(url: string, local = false) {
 const db = new pg.Client({ connectionString: url, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined });
 await db.connect();
 try {
  if(local) {
   const host = new URL(url).hostname;
   if(!['127.0.0.1','localhost','::1'].includes(host) || process.env.APP_ENV !== 'development') throw new Error('Local bootstrap restricted to localhost development');
   await db.query(`CREATE SCHEMA IF NOT EXISTS auth; CREATE TABLE IF NOT EXISTS auth.users(id uuid PRIMARY KEY, email text UNIQUE);
    DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
    IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF; END $$;`);
  }
  await db.query('CREATE TABLE IF NOT EXISTS public.schema_migrations(name text PRIMARY KEY, applied_at timestamptz DEFAULT now())');
  for(const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort()) {
   if((await db.query('SELECT 1 FROM public.schema_migrations WHERE name=$1',[file])).rowCount) continue;
   await db.query('BEGIN');
   try { await db.query(await readFile(`supabase/migrations/${file}`,'utf8')); await db.query('INSERT INTO public.schema_migrations(name) VALUES($1)',[file]); await db.query('COMMIT'); }
   catch(e) { await db.query('ROLLBACK'); throw e; }
  }
 } finally { await db.end(); }
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/migrate.ts')) {
 if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
 await migrate(process.env.DATABASE_URL,process.argv.includes('--local'));
 console.log('Migrations applied.');
}
