import {it,expect,vi,afterEach} from 'vitest';
import {eventSchema} from '@/lib/rental';
import {serviceCountdown} from '@/lib/products';
import {GET} from '@/app/api/v1/calendar-sync/route';

afterEach(()=>vi.unstubAllEnvs());
const event={equipment:'QUEST3',quantity:3,days:1,date:'2035-11-28',start:'10:00',durationHours:8,city:'Bogota',address:'Lugar QA',contentStatus:'ready'};
it('requires three glasses while other equipment may start at one, for one day',()=>{
 expect(eventSchema.safeParse({...event,quantity:2}).success).toBe(false);
 expect(eventSchema.safeParse(event).success).toBe(true);
 expect(eventSchema.safeParse({...event,equipment:'PROJECTOR',quantity:1}).success).toBe(true);
});
it('highlights fewer than seven calendar days using Bogota dates across UTC midnight',()=>{
 expect(serviceCountdown('2035-11-28T15:00:00Z',new Date('2035-11-21T23:59:00-05:00'))).toMatchObject({days:7,urgent:false});
 expect(serviceCountdown('2035-11-28T15:00:00Z',new Date('2035-11-22T00:00:00-05:00'))).toMatchObject({days:6,urgent:true});
 expect(serviceCountdown('2035-11-28T15:00:00Z',new Date('2035-11-28T00:00:00-05:00')).label).toBe('El servicio es hoy');
});
it('keeps the calendar feed private, including when setup is incomplete',async()=>{
 vi.stubEnv('GOOGLE_CALENDAR_SYNC_EMAIL','calendar@example.test');
 vi.stubEnv('GOOGLE_CALENDAR_CLIENT_ID','script-client.apps.googleusercontent.com');
 expect((await GET(new Request('https://rentatech.co/api/v1/calendar-sync'))).status).toBe(401);
 expect((await GET(new Request('https://rentatech.co/api/v1/calendar-sync',{headers:{Authorization:'Bearer wrong'}}))).status).toBe(401);
});
