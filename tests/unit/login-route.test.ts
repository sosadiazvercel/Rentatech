import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const mocks=vi.hoisted(()=>({query:vi.fn(),set:vi.fn()}));
vi.mock('@/server/db',()=>({pool:()=>({query:mocks.query})}));
vi.mock('next/headers',()=>({cookies:async()=>({set:mocks.set})}));
import {POST} from '@/app/api/auth/login/route';

function request(password='518dd6c12c0877d3754e25fbf16d3b32d12268fccb1af9aa73e2ea3f61d976b1',origin='https://rentatech.example'){
 return new Request('https://rentatech.example/api/auth/login',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({email:'admin@sosadiazeventos.com',password})});
}
beforeEach(()=>{
 vi.stubEnv('BASIC_ADMIN_EMAIL','');vi.stubEnv('BASIC_ADMIN_PASSWORD','');
 mocks.query.mockResolvedValue({rows:[{hits:1}],rowCount:1});
});
afterEach(()=>{vi.unstubAllEnvs();vi.resetAllMocks();});

describe('Basic login endpoint',()=>{
 it.each(['development','production'])('creates a database session and the appropriate cookie in %s',async mode=>{
  vi.stubEnv('NODE_ENV',mode);
  expect((await POST(request())).status).toBe(200);
  expect(mocks.set).toHaveBeenCalledWith('nk_staff_session',expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),expect.objectContaining({httpOnly:true,secure:mode==='production',sameSite:'strict',maxAge:28800,path:'/'}));
  const sessionCall=mocks.query.mock.calls.find(([sql])=>sql.includes('INSERT INTO public.staff_session'));
  expect(sessionCall?.[1]).toEqual([expect.stringMatching(/^[a-f0-9]{64}$/),'admin@sosadiazeventos.com']);
 });
 it('rejects wrong credentials without creating a session',async()=>{
  expect((await POST(request('wrong'))).status).toBe(401);
  expect(mocks.query).toHaveBeenCalledTimes(1);
  expect(mocks.set).not.toHaveBeenCalled();
 });
 it('rejects cross-site login before accessing the database',async()=>{
  expect((await POST(request(undefined,'https://other.example'))).status).toBe(403);
  expect(mocks.query).not.toHaveBeenCalled();
  expect(mocks.set).not.toHaveBeenCalled();
 });
});
