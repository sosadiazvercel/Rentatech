import {afterEach,describe,expect,it,vi} from 'vitest';
import {basicAdminEmail,matchesBasicCredentials} from '@/server/auth';

afterEach(()=>vi.unstubAllEnvs());

describe('Basic staff credentials',()=>{
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
