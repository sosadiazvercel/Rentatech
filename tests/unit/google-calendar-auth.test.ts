import {generateKeyPairSync,sign} from 'node:crypto';
import {it,expect,vi,afterEach} from 'vitest';
import {authorizeCalendarScript} from '@/server/google-calendar-auth';

const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const key={...publicKey.export({format:'jwk'}),kid:'test-google-key',alg:'RS256',use:'sig'};
const email='calendar@example.test',audience='script-client.apps.googleusercontent.com';
const claims=()=>({sub:'google-account-123',email,email_verified:true,aud:audience,iss:'https://accounts.google.com',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600});
function request(patch:Record<string,unknown>={},signatureKey=privateKey){
 const header=Buffer.from(JSON.stringify({alg:'RS256',kid:key.kid})).toString('base64url');
 const body=Buffer.from(JSON.stringify({...claims(),...patch})).toString('base64url');
 const signature=sign('RSA-SHA256',Buffer.from(header+'.'+body),signatureKey).toString('base64url');
 return new Request('https://rentatech.co/api/v1/calendar-sync',{headers:{Authorization:'Bearer '+header+'.'+body+'.'+signature}});
}
function configure(){
 vi.stubEnv('GOOGLE_CALENDAR_SYNC_EMAIL',email);vi.stubEnv('GOOGLE_CALENDAR_CLIENT_ID',audience);
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({keys:[key]})));
}
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it('accepts the authorized Google account and intended script without a configured shared secret',async()=>{
 configure();await expect(authorizeCalendarScript(request())).resolves.toBeUndefined();
});
it('accepts the Google-compatible string representation of email_verified',async()=>{
 configure();await expect(authorizeCalendarScript(request({email_verified:'true'}))).resolves.toBeUndefined();
});
it.each([{aud:'another-script'},{email:'outsider@example.test'},{email_verified:false},{exp:0},{iss:'https://example.test'},{iat:Math.floor(Date.now()/1000)+86400}])('rejects invalid Google identity claims %j',async patch=>{
 configure();await expect(authorizeCalendarScript(request(patch))).rejects.toMatchObject({status:401});
});
it.each([
 [{aud:'another-script'},'GOOGLE_AUDIENCE_MISMATCH'],
 [{email:'outsider@example.test'},'GOOGLE_EMAIL_MISMATCH'],
 [{email_verified:false},'GOOGLE_EMAIL_UNVERIFIED'],
] as const)('reports a safe diagnostic code for rejected claims %j',async(patch,code)=>{
 configure();await expect(authorizeCalendarScript(request(patch))).rejects.toMatchObject({status:401,code});
});
it('rejects a forged signature even when the email and audience match',async()=>{
 configure();const attacker=generateKeyPairSync('rsa',{modulusLength:2048});
 await expect(authorizeCalendarScript(request({},attacker.privateKey))).rejects.toMatchObject({status:401});
});
it('rejects anonymous calls and fails closed when the authorized account is not configured',async()=>{
 configure();await expect(authorizeCalendarScript(new Request('https://rentatech.co/api/v1/calendar-sync'))).rejects.toMatchObject({status:401});
 vi.stubEnv('GOOGLE_CALENDAR_CLIENT_ID','');await expect(authorizeCalendarScript(request())).rejects.toMatchObject({status:503});
});
