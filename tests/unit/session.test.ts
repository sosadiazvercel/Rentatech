import {describe,it,expect,afterEach,vi} from 'vitest';
import {localRoleForEmail,makeLocalSession,readLocalSession} from '@/server/auth';
const previous={app:process.env.APP_ENV,mode:process.env.AUTH_MODE,secret:process.env.SESSION_SECRET};
afterEach(()=>{vi.unstubAllEnvs();process.env.APP_ENV=previous.app;process.env.AUTH_MODE=previous.mode;process.env.SESSION_SECRET=previous.secret;});
describe('Local fixture session',()=>{
 it('accepts only the configured, normalized local email and refuses local identities in production',()=>{
  vi.stubEnv('APP_ENV','development');vi.stubEnv('AUTH_MODE','local');vi.stubEnv('LOCAL_ADMIN_EMAIL','admin@sosadiazeventos.com');vi.stubEnv('LOCAL_OPERATOR_EMAIL','operador@example.test');
  expect(localRoleForEmail(' ADMIN@SOSADIAZEVENTOS.COM ')).toBe('admin');expect(localRoleForEmail('operador@example.test')).toBe('operator');expect(localRoleForEmail('admin@example.test')).toBeNull();expect(localRoleForEmail('other@example.test')).toBeNull();
  vi.stubEnv('APP_ENV','production');expect(localRoleForEmail('admin@sosadiazeventos.com')).toBeNull();
 });
 it('rejects tampering and refuses local mode in production',()=>{
  process.env.APP_ENV='development';process.env.AUTH_MODE='local';process.env.SESSION_SECRET='test-session-secret-at-least-32-characters';
  const token=makeLocalSession('staff-id');expect(readLocalSession(token)).toBe('staff-id');expect(readLocalSession(token+'x')).toBeNull();
  const [payload,sig]=token.split('.');const changed=Buffer.from(JSON.stringify({...JSON.parse(Buffer.from(payload,'base64url').toString()),sub:'admin'})).toString('base64url');expect(readLocalSession(changed+'.'+sig)).toBeNull();
  process.env.APP_ENV='production';expect(readLocalSession(token)).toBeNull();expect(()=>makeLocalSession('staff-id')).toThrow();
 });
});
