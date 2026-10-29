import {revokeBasicSession} from '@/server/auth';
import {sameOrigin,errorResponse} from '@/server/http';
export async function POST(req:Request){try{sameOrigin(req);await revokeBasicSession();return Response.json({ok:true});}catch(e){return errorResponse(e);}}
