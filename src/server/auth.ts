import 'server-only';
import {createHash,randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';
import {pool} from './db';
import {HttpError} from './http';

export type Staff={id:string;auth_user_id:string|null;role:'admin'|'operator'};
export const STAFF_SESSION_COOKIE='nk_staff_session';
const DEFAULT_ADMIN_EMAIL='admin@sosadiazeventos.com';
const PASSWORD_SALT='rentatech-basic-admin-v1';
const DEFAULT_PASSWORD_HASH='8ebe0e3a9038b1af123e7cc7f24282ba84b9d54c555172031f356eed31ef37bac3d0c6001bc0307b253aaa07d68939aac6a7b853181b5eb23afe81253fdf60ac';

export function basicAdminEmail(){return (process.env.BASIC_ADMIN_EMAIL||DEFAULT_ADMIN_EMAIL).trim().toLowerCase();}
function passwordHash(value:string){return scryptSync(value,PASSWORD_SALT,64);}
export function matchesBasicCredentials(email:string,password:string){
 if(email.trim().toLowerCase()!==basicAdminEmail())return false;
 const actual=passwordHash(password);
 const expected=process.env.BASIC_ADMIN_PASSWORD?passwordHash(process.env.BASIC_ADMIN_PASSWORD):Buffer.from(DEFAULT_PASSWORD_HASH,'hex');
 return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
function tokenHash(token:string){return createHash('sha256').update(token).digest('hex');}
export async function createBasicSession(){
 const token=randomBytes(32).toString('base64url');
 const result=await pool().query(`INSERT INTO public.staff_session(token_hash,staff_id,expires_at)
  SELECT $1,id,now()+interval '8 hours' FROM public.staff_profile
  WHERE login_email=$2 AND active=true AND role='admin' RETURNING staff_id`,[tokenHash(token),basicAdminEmail()]);
 if(!result.rowCount)throw new HttpError(503,'BASIC_ADMIN_NOT_CONFIGURED','El administrador interno todavía no está configurado');
 return token;
}
export async function revokeBasicSession(){
 const store=await cookies();const token=store.get(STAFF_SESSION_COOKIE)?.value;
 if(token)await pool().query('DELETE FROM public.staff_session WHERE token_hash=$1',[tokenHash(token)]);
 store.delete(STAFF_SESSION_COOKIE);
}
export async function currentStaff():Promise<Staff|null>{
 const token=(await cookies()).get(STAFF_SESSION_COOKIE)?.value;
 if(!token||!/^[A-Za-z0-9_-]{43}$/.test(token))return null;
 const result=await pool().query<Staff>(`SELECT p.id,p.auth_user_id,p.role
  FROM public.staff_session s JOIN public.staff_profile p ON p.id=s.staff_id
  WHERE s.token_hash=$1 AND s.expires_at>now() AND p.active=true`,[tokenHash(token)]);
 return result.rows[0]||null;
}
export async function requireStaff(role?:'admin'){
 const staff=await currentStaff();if(!staff)throw new HttpError(401,'AUTH_REQUIRED','Inicia sesión para continuar');
 if(role&&staff.role!==role)throw new HttpError(403,'FORBIDDEN','Tu rol no permite esta acción');return staff;
}
