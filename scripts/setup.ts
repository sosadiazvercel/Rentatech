import {existsSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {parse} from 'dotenv';
if(!existsSync('.env')){
 const secret=()=>randomBytes(32).toString('hex');
 writeFileSync('.env',[
  'APP_ENV=development','APP_BASE_URL=http://127.0.0.1:3000',
  `DATABASE_URL=postgresql://postgres:${secret()}@127.0.0.1:55432/nexokit_dev`,
  'DATABASE_SSL=false','AUTH_MODE=local','LOCAL_ADMIN_EMAIL=admin@sosadiazeventos.com','LOCAL_OPERATOR_EMAIL=operador@example.test',`LOCAL_ADMIN_PASSWORD=${secret()}`,`LOCAL_OPERATOR_PASSWORD=${secret()}`,
  `SESSION_SECRET=${secret()}`,`TOKEN_SECRET=${secret()}`,'COMMERCIAL_ENABLED=true','NEXT_TELEMETRY_DISABLED=1'
 ].join('\n')+'\n',{mode:0o600});
}
const env=parse(readFileSync('.env'));
if(env.APP_ENV!=='development'||env.AUTH_MODE!=='local')throw new Error('Existing environment is not local development. Left unchanged.');
mkdirSync('.local',{recursive:true});
writeFileSync('.local/ACCESO.md',`# Acceso privado al CRM\n\nURL: http://127.0.0.1:3000/acceso\n\nCorreo: ${env.BASIC_ADMIN_EMAIL||'admin@sosadiazeventos.com'}\n\nPassword: ${env.BASIC_ADMIN_PASSWORD||'Usar la clave acordada del administrador.'}\n\nEl acceso basico funciona en local y en produccion. Las variables LOCAL_* no controlan el login.\n`,{mode:0o600});
console.log('Entorno local listo. Credenciales en .local/ACCESO.md; no se imprimen secretos.');
