import 'server-only';
import {createPublicKey,verify,type JsonWebKey} from 'node:crypto';
import {HttpError} from './http';

type GoogleKey=JsonWebKey&{kid?:string;alg?:string;use?:string};
let keyCache:{keys:GoogleKey[];expires:number}|undefined;

async function googleKeys(){
 if(keyCache&&keyCache.expires>Date.now())return keyCache.keys;
 const response=await fetch('https://www.googleapis.com/oauth2/v3/certs',{cache:'no-store',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new HttpError(503,'GOOGLE_AUTH_UNAVAILABLE','No fue posible verificar la cuenta de Google.');
 const body=await response.json();
 if(!Array.isArray(body.keys))throw new HttpError(503,'GOOGLE_AUTH_UNAVAILABLE','No fue posible verificar la cuenta de Google.');
 const maxAge=Number(response.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1]??300);
 keyCache={keys:body.keys,expires:Date.now()+Math.min(Math.max(maxAge,0),3600)*1000};
 return keyCache.keys;
}

export async function authorizeCalendarScript(req:Request){
 const audience=process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim();
 const email=process.env.GOOGLE_CALENDAR_SYNC_EMAIL?.trim().toLowerCase();
 if(!audience||!email)throw new HttpError(503,'SYNC_NOT_CONFIGURED','Configura la cuenta de Google y el ID público del proyecto.');
 const authorization=req.headers.get('authorization')||'';
 if(!authorization.startsWith('Bearer ')||authorization.length>16384)throw new HttpError(401,'AUTH_REQUIRED','Autoriza la cuenta de Google del script.');
 const token=authorization.slice(7),parts=token.split('.');
 const denied=()=>new HttpError(401,'GOOGLE_IDENTITY_INVALID','La identidad de Google no es válida para este calendario.');
 if(parts.length!==3||parts.some(part=>!part||!/^[A-Za-z0-9_-]+$/.test(part)))throw denied();
 let header,claims;
 try{header=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));claims=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'));}catch{throw denied();}
 if(!header||header.alg!=='RS256'||typeof header.kid!=='string'||!claims)throw denied();
 const key=(await googleKeys()).find(key=>key.kid===header.kid&&key.kty==='RSA'&&key.alg==='RS256'&&key.use==='sig');
 if(!key)throw denied();
 let valid=false;
 try{valid=verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),createPublicKey({key,format:'jwk'}),Buffer.from(parts[2],'base64url'));}catch{throw denied();}
 const now=Math.floor(Date.now()/1000);
 if(!valid||!['accounts.google.com','https://accounts.google.com'].includes(claims.iss)||claims.aud!==audience||
  typeof claims.sub!=='string'||!claims.sub||typeof claims.exp!=='number'||claims.exp<=now||
  typeof claims.iat!=='number'||claims.iat>now+60||claims.email_verified!==true||
  typeof claims.email!=='string'||claims.email.toLowerCase()!==email)throw denied();
}
