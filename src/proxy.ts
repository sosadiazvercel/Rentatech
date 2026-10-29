import {NextResponse} from 'next/server';
export function proxy(){
 const response=NextResponse.next();response.headers.set('Cache-Control','private, no-store');return response;
}
export const config={matcher:['/admin/:path*','/acceso','/api/v1/admin/:path*','/api/auth/:path*']};
