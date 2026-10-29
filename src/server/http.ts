import 'server-only';
import {randomUUID,createHash} from 'node:crypto';
import {pool} from './db';
export class HttpError extends Error {constructor(public status:number,public code:string,message:string){super(message);}}
export function sameOrigin(req:Request) {
 const origin=req.headers.get('origin');
 if(!origin||origin!==new URL(process.env.APP_BASE_URL||'http://127.0.0.1:3000').origin) throw new HttpError(403,'ORIGIN_REJECTED','Solicitud no autorizada');
}
export async function jsonBody(req:Request,maxBytes=16384) {
 if(!req.headers.get('content-type')?.startsWith('application/json'))throw new HttpError(400,'INVALID_CONTENT_TYPE','Se requiere JSON');
 const reader=req.body?.getReader(); if(!reader)throw new HttpError(400,'EMPTY_BODY','Faltan datos');
 const chunks:Uint8Array[]=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>maxBytes){await reader.cancel();throw new HttpError(413,'BODY_TOO_LARGE','Solicitud demasiado grande');}chunks.push(value);}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new HttpError(400,'INVALID_JSON','Datos inválidos');}
}
export async function rateLimit(req:Request,scope:string,max=10) {
 const ip=process.env.VERCEL==='1'?req.headers.get('x-forwarded-for')?.split(',')[0]||'unknown':'local';
 const key=createHash('sha256').update(scope+':'+ip).digest('hex');
 const result=await pool().query(`INSERT INTO public.request_limit(key,window_start,hits) VALUES($1,now(),1)
 ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN request_limit.window_start < now()-interval '1 minute' THEN 1 ELSE request_limit.hits+1 END,
 window_start=CASE WHEN request_limit.window_start < now()-interval '1 minute' THEN now() ELSE request_limit.window_start END RETURNING hits`,[key]);
 if(result.rows[0].hits>max)throw new HttpError(429,'RATE_LIMIT','Espera un minuto antes de volver a intentar');
}
export function errorResponse(e:unknown) {
 const requestId=randomUUID();
 if(e instanceof HttpError)return Response.json({error:{code:e.code,message:e.message},requestId},{status:e.status});
 console.error('request_failed',{requestId});
 return Response.json({error:{code:'SERVICE_UNAVAILABLE',message:'No pudimos guardar los datos. Intenta de nuevo en unos minutos.'},requestId},{status:503});
}
