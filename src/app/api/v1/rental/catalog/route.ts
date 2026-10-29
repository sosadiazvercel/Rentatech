import {catalog} from '@/server/rental';
import {errorResponse} from '@/server/http';
import {fallbackCatalog,isDatabaseUnavailable} from '@/server/rental-fallback';
export const dynamic='force-dynamic';
export async function GET(){try{return Response.json(await catalog(),{headers:{'Cache-Control':'no-store'}});}catch(e){if(isDatabaseUnavailable(e))return Response.json(fallbackCatalog(),{headers:{'Cache-Control':'no-store'}});return errorResponse(e);}}
