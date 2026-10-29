import 'dotenv/config';
import pg from 'pg';
import {migrate} from './migrate';
import {seed} from './seed';
const url=new URL(process.env.DATABASE_URL||'');
if(process.env.APP_ENV!=='development'||!['localhost','127.0.0.1'].includes(url.hostname)||!/^\/nexokit_(dev|test)$/.test(url.pathname)||!process.argv.includes('--confirm-local-reset')) throw new Error('Requires local nexokit_dev/test and --confirm-local-reset');
const db=new pg.Client({connectionString:url.toString()});await db.connect();
await db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');await db.end();
await migrate(url.toString(),true);await seed(url.toString());console.log('Local fixtures reset.');
