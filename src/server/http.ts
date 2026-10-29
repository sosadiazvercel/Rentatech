import 'server-only';
import { randomUUID, createHash } from 'node:crypto';
import { pool } from './db';
export class HttpError extends Error {
    constructor(public status: number, public code: string, message: string, options?: { cause?: unknown }) {
        super(message, options);
    }
}
export function sameOrigin(req: Request) {
    const origin = req.headers.get('origin');
    if (!origin || origin !== new URL(process.env.APP_BASE_URL || 'http://127.0.0.1:3000').origin) throw new HttpError(403, 'ORIGIN_REJECTED', 'Solicitud no autorizada');
}
export async function jsonBody(req: Request, maxBytes = 16384) {
    if (!req.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(400, 'INVALID_CONTENT_TYPE', 'Se requiere JSON');
    const reader = req.body?.getReader(); if (!reader) throw new HttpError(400, 'EMPTY_BODY', 'Faltan datos');
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > maxBytes) { await reader.cancel(); throw new HttpError(413, 'BODY_TOO_LARGE', 'Solicitud demasiado grande'); } chunks.push(value); }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new HttpError(400, 'INVALID_JSON', 'Datos inválidos'); }
}
export async function rateLimit(req: Request, scope: string, max = 10) {
    const ip = process.env.VERCEL === '1' ? req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown' : 'local';
    const key = createHash('sha256').update(scope + ':' + ip).digest('hex');
    const result = await pool().query(`INSERT INTO public.request_limit(key,window_start,hits) VALUES($1,now(),1)
 ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN request_limit.window_start < now()-interval '1 minute' THEN 1 ELSE request_limit.hits+1 END,
 window_start=CASE WHEN request_limit.window_start < now()-interval '1 minute' THEN now() ELSE request_limit.window_start END RETURNING hits`, [key]);
    if (result.rows[0].hits > max) throw new HttpError(429, 'RATE_LIMIT', 'Espera un minuto antes de volver a intentar');
}
// Log only recognized codes: database messages can contain credentials or row data.
const failureHints: Record<string, string> = {
    DATABASE_NOT_CONFIGURED: 'Falta DATABASE_URL en el entorno del servidor.',
    ECONNREFUSED: 'PostgreSQL rechazo la conexion; revisa DATABASE_URL y que no apunte a localhost.',
    ENOTFOUND: 'No se pudo resolver el servidor de PostgreSQL.',
    ENETUNREACH: 'Servidor de PostgreSQL inaccesible; revisa la conectividad y el pooler.',
    ETIMEDOUT: 'Se agoto el tiempo de conexion a PostgreSQL.',
    '28P01': 'PostgreSQL rechazo las credenciales de DATABASE_URL.',
    '3D000': 'La base de datos indicada no existe.',
    '42P01': 'Falta una tabla; revisa las migraciones de Supabase.',
    '42501': 'El usuario de PostgreSQL no tiene permisos suficientes.',
    SELF_SIGNED_CERT_IN_CHAIN: 'Revisa el certificado SSL de PostgreSQL.',
    DEPTH_ZERO_SELF_SIGNED_CERT: 'Revisa el certificado SSL de PostgreSQL.',
    UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'No se pudo verificar el certificado SSL de PostgreSQL.',
    CERT_HAS_EXPIRED: 'El certificado SSL de PostgreSQL ha expirado.',
};
function failureDiagnostic(error: unknown, depth = 0): { code: string; hint: string } | undefined {
    if (!error || typeof error !== 'object' || depth > 3) return;
    const item = error as { code?: unknown; message?: unknown; cause?: unknown; errors?: unknown };
    const code = typeof item.code === 'string' ? item.code : item.message === 'DATABASE_NOT_CONFIGURED' ? item.message : '';
    if (Object.hasOwn(failureHints, code)) return { code, hint: failureHints[code] };
    const nested = failureDiagnostic(item.cause, depth + 1);
    if (nested) return nested;
    if (Array.isArray(item.errors)) {
        for (const child of item.errors.slice(0, 5)) {
            const result = failureDiagnostic(child, depth + 1);
            if (result) return result;
        }
    }
}
export function errorResponse(e: unknown) {
    const requestId = randomUUID();
    if (e instanceof HttpError) {
        if (e.status >= 500) console.error('request_failed', { requestId, code: e.code, ...(failureDiagnostic(e.cause) ?? {}) });
        return Response.json({ error: { code: e.code, message: e.message }, requestId }, { status: e.status });
    }
    console.error('request_failed', { requestId, ...(failureDiagnostic(e) ?? { code: 'UNCLASSIFIED' }) });
    return Response.json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'No pudimos guardar los datos. Intenta de nuevo en unos minutos.' }, requestId }, { status: 503 });
}
