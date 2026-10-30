import {afterEach,describe,expect,it,vi} from 'vitest';
import {basicAdminEmail,matchesBasicCredentials} from '@/server/auth';

afterEach(()=>vi.unstubAllEnvs());

describe('Basic staff credentials',()=>{
 it.each(['development','production'])('accepts the requested built-in login in %s without Supabase Auth',mode=>{
  vi.stubEnv('NODE_ENV',mode);
  vi.stubEnv('BASIC_ADMIN_EMAIL','');vi.stubEnv('BASIC_ADMIN_PASSWORD','');
  expect(basicAdminEmail()).toBe('admin@sosadiazeventos.com');
  expect(matchesBasicCredentials('admin@sosadiazeventos.com','518dd6c12c0877d3754e25fbf16d3b32d12268fccb1af9aa73e2ea3f61d976b1')).toBe(true);
  expect(matchesBasicCredentials('admin@sosadiazeventos.com','wrong-password')).toBe(false);
 });
 it('normalizes and accepts the configured administrator credentials',()=>{
  vi.stubEnv('BASIC_ADMIN_EMAIL',' Admin@Example.test ');vi.stubEnv('BASIC_ADMIN_PASSWORD','test-password');
  expect(basicAdminEmail()).toBe('admin@example.test');
  expect(matchesBasicCredentials(' ADMIN@example.TEST ','test-password')).toBe(true);
 });
 it('rejects an incorrect email or password',()=>{
  vi.stubEnv('BASIC_ADMIN_EMAIL','admin@example.test');vi.stubEnv('BASIC_ADMIN_PASSWORD','test-password');
  expect(matchesBasicCredentials('other@example.test','test-password')).toBe(false);
  expect(matchesBasicCredentials('admin@example.test','wrong-password')).toBe(false);
 });
});
