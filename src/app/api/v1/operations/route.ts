import {requireStaff} from '@/server/auth';
import {mutate,operationsData} from '@/server/rental';
import {errorResponse,jsonBody,sameOrigin} from '@/server/http';
import {sendLeadEmails} from '@/server/email';
export async function GET(){try{await requireStaff();return Response.json(await operationsData(),{headers:{'Cache-Control':'no-store'}});}catch(e){return errorResponse(e);}}
export async function POST(req:Request){try{sameOrigin(req);const staff=await requireStaff('admin');const result=await mutate(await jsonBody(req),staff);if('leadId' in result&&typeof result.leadId==='string')try{await sendLeadEmails(result.leadId);}catch{console.error('lead_email_pending');}return Response.json(result);}catch(e){return errorResponse(e);}}
