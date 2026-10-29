import { cookies } from 'next/headers';
import { createBasicSession, matchesBasicCredentials, STAFF_SESSION_COOKIE } from '@/server/auth';
import { HttpError, errorResponse, jsonBody, rateLimit } from '@/server/http';
import { z } from 'zod';
export async function POST(req: Request) {
    try {
        try { await rateLimit(req, 'login', 5); }
        catch (error) {
            if (error instanceof HttpError) throw error;
            throw new HttpError(503, 'LOGIN_DATABASE_UNAVAILABLE', 'No pudimos consultar la base de datos del acceso.', { cause: error });
        }
        const credentials = z.object({ email: z.string().trim().toLowerCase().pipe(z.email()), password: z.string().min(1).max(200) }).safeParse(await jsonBody(req));
        if (!credentials.success) throw new HttpError(400, 'INVALID_LOGIN_DATA', 'Revisa el correo y la contraseña');
        const { email, password } = credentials.data;
        if(!matchesBasicCredentials(email,password))throw new HttpError(401,'INVALID_CREDENTIALS','Correo o contraseña incorrectos');
        let token;
        try{token=await createBasicSession();}
        catch(cause){if(cause instanceof HttpError)throw cause;throw new HttpError(503,'LOGIN_DATABASE_UNAVAILABLE','No pudimos crear la sesión de acceso.',{cause});}
        (await cookies()).set(STAFF_SESSION_COOKIE,token,{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',maxAge:28800,path:'/',priority:'high'});
        return Response.json({ ok: true });
    } catch (e) { return errorResponse(e); }
}
