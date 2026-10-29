import { cookies } from 'next/headers';
import { isLocalAuth, localRoleForEmail, makeLocalSession, matchesPassword, supabaseServer, currentStaff } from '@/server/auth';
import { HttpError, errorResponse, jsonBody, rateLimit, sameOrigin } from '@/server/http';
import { z } from 'zod';
export async function POST(req: Request) {
    try {
        sameOrigin(req); await rateLimit(req, 'login', 5);
        const { email, password } = z.object({ email: z.string().trim().toLowerCase().pipe(z.email()), password: z.string().min(1).max(200) }).parse(await jsonBody(req));
        if (isLocalAuth()) {
            const role = localRoleForEmail(email);
            if (!role || !matchesPassword(password, role === 'admin' ? process.env.LOCAL_ADMIN_PASSWORD : process.env.LOCAL_OPERATOR_PASSWORD)) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos');
            (await cookies()).set('nk_local_session', makeLocalSession(role === 'admin' ? '00000000-0000-4000-8000-000000000001' : '00000000-0000-4000-8000-000000000002'), { httpOnly: true, sameSite: 'strict', secure: false, maxAge: 28800, path: '/' });
        } else {
            const client = await supabaseServer(); const { error } = await client.auth.signInWithPassword({ email, password });
            if (error) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos');
            if (!await currentStaff()) { await client.auth.signOut(); throw new HttpError(403, 'STAFF_REQUIRED', 'Se requiere invitación del equipo y MFA para producción'); }
        }
        return Response.json({ ok: true });
    } catch (e) { return errorResponse(e); }
}
