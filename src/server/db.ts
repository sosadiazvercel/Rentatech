import 'server-only';
import pg from 'pg';
const globalDb=globalThis as unknown as {pool?:pg.Pool};
export function pool() {
 if(!process.env.DATABASE_URL) throw new Error('DATABASE_NOT_CONFIGURED');
 return globalDb.pool ??=new pg.Pool({
  connectionString:process.env.DATABASE_URL,
  max:process.env.VERCEL==='1'?1:5,
  connectionTimeoutMillis:10_000,
  idleTimeoutMillis:30_000,
  ssl:process.env.DATABASE_SSL==='true'?{rejectUnauthorized:true}:undefined,
 });
}
export async function transaction<T>(fn:(db:pg.PoolClient)=>Promise<T>) {
 const db=await pool().connect();
 try {await db.query('BEGIN');const result=await fn(db);await db.query('COMMIT');return result;}
 catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
}
