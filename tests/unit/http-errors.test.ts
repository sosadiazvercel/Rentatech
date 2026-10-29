import {afterEach, describe, expect, it, vi} from 'vitest';
import {errorResponse, HttpError, sameOrigin} from '@/server/http';

afterEach(() => vi.restoreAllMocks());

describe('Server error diagnostics', () => {
    it('accepts the public origin forwarded by Vercel and rejects another site', () => {
        const headers={origin:'https://rentatech.sosadiazeventos.com','x-forwarded-host':'rentatech.sosadiazeventos.com','x-forwarded-proto':'https'};
        expect(()=>sameOrigin(new Request('https://internal.vercel.app/api/auth/login',{headers}))).not.toThrow();
        expect(()=>sameOrigin(new Request('https://internal.vercel.app/api/auth/login',{headers:{...headers,origin:'https://evil.example'}}))).toThrowError(HttpError);
    });
    it('logs missing database configuration while keeping the public response generic', async () => {
        const log = vi.spyOn(console, 'error').mockImplementation(() => {});
        const response = errorResponse(new Error('DATABASE_NOT_CONFIGURED'));
        const body = await response.json();
        expect(response.status).toBe(503);
        expect(body.error.code).toBe('SERVICE_UNAVAILABLE');
        expect(log).toHaveBeenCalledWith('request_failed', expect.objectContaining({requestId: body.requestId, code: 'DATABASE_NOT_CONFIGURED'}));
        expect(JSON.stringify(body)).not.toContain('DATABASE_NOT_CONFIGURED');
    });

    it('finds connection codes in aggregate errors without logging sensitive details', () => {
        const log = vi.spyOn(console, 'error').mockImplementation(() => {});
        const child = Object.assign(new Error('postgresql://user:secret@private-host/db'), {code: 'ECONNREFUSED', detail: 'private row'});
        errorResponse(new AggregateError([child], 'private credentials'));
        expect(log).toHaveBeenCalledWith('request_failed', expect.objectContaining({code: 'ECONNREFUSED'}));
        expect(JSON.stringify(log.mock.calls)).not.toMatch(/secret|private-host|private row|private credentials/);
    });

    it('does not log arbitrary messages or unknown codes', () => {
        const log = vi.spyOn(console, 'error').mockImplementation(() => {});
        errorResponse(Object.assign(new Error('secret'), {code: 'private-code'}));
        expect(log).toHaveBeenCalledWith('request_failed', expect.objectContaining({code: 'UNCLASSIFIED'}));
        expect(JSON.stringify(log.mock.calls)).not.toMatch(/secret|private-code/);
    });

    it('returns and logs a safe code for an expected service failure', async () => {
        const log = vi.spyOn(console, 'error').mockImplementation(() => {});
        const response = errorResponse(new HttpError(503, 'AUTH_PROVIDER_UNAVAILABLE', 'No pudimos conectar con Supabase Auth.', {cause: new Error('secret')}));
        const body = await response.json();
        expect(body.error).toEqual({code: 'AUTH_PROVIDER_UNAVAILABLE', message: 'No pudimos conectar con Supabase Auth.'});
        expect(log).toHaveBeenCalledWith('request_failed', expect.objectContaining({requestId: body.requestId, code: 'AUTH_PROVIDER_UNAVAILABLE'}));
        expect(JSON.stringify(log.mock.calls)).not.toContain('secret');
    });
});
