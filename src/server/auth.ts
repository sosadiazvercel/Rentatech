import 'server-only';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';
import {createServerClient} from '@supabase/ssr';
import {pool} from './db';
import {HttpError} from './http';
export type Staff={id:string;auth_user_id:string;role:'admin'|'operator'};
export function isLocalAuth(){return process.env.APP_ENV==='development'&&process.env.AUTH_MODE==='local';}
export function localRoleForEmail(email:string):Staff['role']|null{
 if(!isLocalAuth())return null;
 const normalized=email.trim().toLowerCase();
 if(normalized===(process.env.LOCAL_ADMIN_EMAIL||'admin@example.test').trim().toLowerCase())return 'admin';
 if(normalized===(process.env.LOCAL_OPERATOR_EMAIL||'operador@example.test').trim().toLowerCase())return 'operator';
 return null;
}
function secret(){const s=process.env.SESSION_SECRET;if(!s||s.length<32)throw new Error('SESSION_SECRET_REQUIRED');return s;}
export function makeLocalSession(userId:string){
 if(!isLocalAuth())throw new Error('LOCAL_AUTH_DISABLED');
 const payload=Buffer.from(JSON.stringify({sub:userId,exp:Date.now()+8*3600000})).toString('base64url');
 return payload+'.'+createHmac('sha256',secret()).update(payload).digest('base64url');
}
export function readLocalSession(value:string){
 if(!isLocalAuth())return null;
 try{const [p,s,...rest]=value.split('.');if(rest.length||!p||!s)return null;
 const expected=createHmac('sha256',secret()).update(p).digest();const actual=Buffer.from(s,'base64url');
 if(expected.length!==actual.length||!timingSafeEqual(expected,actual))return null;
 const data=JSON.parse(Buffer.from(p,'base64url').toString());return typeof data.sub==='string'&&data.exp>Date.now()?data.sub:null;
 }catch{return null;}
}
export async function supabaseServer(){
 const store=await cookies();const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)throw new HttpError(503,'AUTH_NOT_CONFIGURED','El acceso del equipo todavía no está configurado');
 return createServerClient(url,key,{cookies:{
  getAll:()=>store.getAll(),
  setAll:items=>{try{items.forEach(({name,value,options})=>store.set(name,value,options));}catch{/* Server component: proxy refreshes cookies. */}}
 }});
}
export async function currentStaff():Promise<Staff|null>{
 let userId:string|null=null;
 if(isLocalAuth())userId=readLocalSession((await cookies()).get('nk_local_session')?.value||'');
 else {
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL)return null;
  const client=await supabaseServer();const {data,error}=await client.auth.getUser();
  if(error||!data.user)return null;userId=data.user.id;
  if(process.env.APP_ENV==='production'){
   const {data:claims}=await client.auth.getClaims();if(claims?.claims.aal!=='aal2')return null;
  }
 }
 if(!userId)return null;
 const result=await pool().query<Staff>('SELECT id,auth_user_id,role FROM public.staff_profile WHERE auth_user_id=$1 AND active=true',[userId]);return result.rows[0]||null;
}
export async function requireStaff(role?:'admin'){
 const staff=await currentStaff();if(!staff)throw new HttpError(401,'AUTH_REQUIRED','Inicia sesión para continuar');
 if(role&&staff.role!==role)throw new HttpError(403,'FORBIDDEN','Tu rol no permite esta acción');return staff;
}
export function matchesPassword(actual:string,expected:string|undefined){
 if(!isLocalAuth()||!expected)return false;
 const a=Buffer.from(actual),b=Buffer.from(expected);return a.length===b.length&&timingSafeEqual(a,b);
}
