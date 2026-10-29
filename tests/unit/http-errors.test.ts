import {afterEach, describe, expect, it, vi} from 'vitest';
import {errorResponse} from '@/server/http';

afterEach(() => vi.restoreAllMocks());

describe('Server error diagnostics', () => {
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
});
