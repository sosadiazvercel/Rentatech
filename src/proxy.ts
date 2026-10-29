import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
export async function proxy(request:NextRequest){
 let response=NextResponse.next({request});
 if(process.env.AUTH_MODE==='local'||!process.env.NEXT_PUBLIC_SUPABASE_URL)return response;
 const client=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{cookies:{
  getAll:()=>request.cookies.getAll(),setAll(items){items.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});items.forEach(({name,value,options})=>response.cookies.set(name,value,options));}
 }});
 await client.auth.getClaims();response.headers.set('Cache-Control','private, no-store');return response;
}
export const config={matcher:['/admin/:path*','/acceso','/api/v1/admin/:path*','/api/auth/:path*']};
