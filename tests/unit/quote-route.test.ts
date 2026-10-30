import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';

const mocks=vi.hoisted(()=>({createQuote:vi.fn(),sendQuoteEmail:vi.fn(),rateLimit:vi.fn()}));
vi.mock('@/server/rental',()=>({createQuote:mocks.createQuote}));
vi.mock('@/server/email',()=>({sendQuoteEmail:mocks.sendQuoteEmail}));
vi.mock('@/server/http',async importOriginal=>{
 const actual=await importOriginal<typeof import('@/server/http')>();
 return {...actual,rateLimit:mocks.rateLimit};
});
import {POST} from '@/app/api/v1/rental/quotes/route';

const body={equipment:'QUEST3',quantity:3,days:1,date:'2031-10-16',start:'10:00',durationHours:8,city:'Bogotá',address:'Recinto QA',contentStatus:'ready',name:'Cliente QA',company:'',email:'qa@example.test',phone:'+573001234567',nit:'',notes:'',privacy:true};
function request(){return new Request('https://rentatech.example/api/v1/rental/quotes',{method:'POST',headers:{origin:'https://rentatech.example','content-type':'application/json','idempotency-key':'12345678-1234-4123-8123-123456789012'},body:JSON.stringify(body)});}

beforeEach(()=>{
 vi.stubEnv('COMMERCIAL_ENABLED','true');
 mocks.rateLimit.mockResolvedValue(undefined);
 mocks.createQuote.mockResolvedValue({id:'00000000-0000-4000-8000-000000000099',number:'RT-000099'});
 mocks.sendQuoteEmail.mockResolvedValue(undefined);
});
afterEach(()=>{vi.unstubAllEnvs();vi.resetAllMocks();});

describe('Quote submission route',()=>{
 it('persists and confirms a quote in production when commercial intake is enabled',async()=>{
  vi.stubEnv('APP_ENV','production');
  const response=await POST(request());
  expect(response.status).toBe(201);
  expect(await response.json()).toMatchObject({number:'RT-000099'});
  expect(mocks.createQuote).toHaveBeenCalledWith(body,'12345678-1234-4123-8123-123456789012');
  expect(mocks.sendQuoteEmail).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000099');
 });
 it('blocks submissions when the explicit commercial switch is disabled',async()=>{
  vi.stubEnv('COMMERCIAL_ENABLED','false');
  const response=await POST(request());
  expect(response.status).toBe(503);
  expect((await response.json()).error.code).toBe('COMMERCIAL_DISABLED');
  expect(mocks.createQuote).not.toHaveBeenCalled();
 });
 it('returns an error instead of claiming an unsaved fallback quote',async()=>{
  mocks.createQuote.mockRejectedValue(Object.assign(new Error('database unavailable'),{code:'ECONNREFUSED'}));
  const response=await POST(request());
  expect(response.status).toBe(503);
  expect((await response.json()).error.code).toBe('SERVICE_UNAVAILABLE');
  expect(mocks.sendQuoteEmail).not.toHaveBeenCalled();
 });
});
