import {requireStaff} from '@/server/auth';
import {listLeads} from '@/server/leads';
import {errorResponse} from '@/server/http';
export async function GET(){try{await requireStaff();return Response.json({leads:await listLeads()},{headers:{'Cache-Control':'private, no-store'}});}catch(e){return errorResponse(e);}}
