import {cookies} from 'next/headers';
import {isLocalAuth,supabaseServer} from '@/server/auth';
import {sameOrigin,errorResponse} from '@/server/http';
export async function POST(req:Request){try{sameOrigin(req);if(isLocalAuth())(await cookies()).delete('nk_local_session');else await (await supabaseServer()).auth.signOut();return Response.json({ok:true});}catch(e){return errorResponse(e);}}
