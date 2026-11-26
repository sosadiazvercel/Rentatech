import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {it,expect} from 'vitest';

it('syncs, recovers interrupted creates and removes only integration-owned events',()=>{
 const props:Record<string,string>={RENTATECH_URL:'https://rentatech.co',RENTATECH_CALENDAR_ID:'qa-calendar'};
 let feed:unknown={events:[{id:'qa-event',source:'manual',title:'Alquiler QA',start_at:'2035-10-15T15:00:00Z',end_at:'2035-10-15T23:00:00Z',location:'Bogotá',notes:'Técnico QA'}]};
 let nextId=0;
 const events=new Map<string,{description:string;title:string;deleted:boolean;getId:()=>string;getDescription:()=>string;setDescription:(v:string)=>void;setTitle:(v:string)=>void;setTime:()=>void;setLocation:()=>void;deleteEvent:()=>void}>();
 const calendar={getEventById:(id:string)=>events.get(id),getEvents:()=>[...events.values()],createEvent:(title:string,_start:Date,_end:Date,details:{description:string})=>{
  const id=String(++nextId),event={description:details.description,title,deleted:false,getId:()=>id,getDescription:()=>event.description,setDescription:(v:string)=>{event.description=v;},setTitle:(v:string)=>{event.title=v;},setTime:()=>{},setLocation:()=>{},deleteEvent:()=>{event.deleted=true;}};
  events.set(id,event);return event;
 }};
 const personal=calendar.createEvent('Personal',new Date(),new Date(),{description:'Evento personal'});
 const context:{syncRentatechCalendar?:()=>void}={};
 let identity='google-generated-identity';
 Object.assign(context,{ScriptApp:{getIdentityToken:()=>identity},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},PropertiesService:{getScriptProperties:()=>({getProperty:(key:string)=>props[key],setProperty:(key:string,value:string)=>{props[key]=value;},getProperties:()=>({...props}),deleteProperty:(key:string)=>{delete props[key];}})},UrlFetchApp:{fetch:(_url:string,options:{headers:{Authorization:string}})=>{expect(options.headers.Authorization).toBe('Bearer '+identity);return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(feed)};}},CalendarApp:{getCalendarById:()=>calendar}});
 runInNewContext(readFileSync('scripts/google-calendar.gs','utf8'),context);
 const sync=context.syncRentatechCalendar!;
 sync();identity='renewed-by-google';sync();expect(events.size).toBe(2);
 delete props['rentatech:qa-calendar:manual:qa-event'];
 sync();expect(events.size).toBe(2);
 feed={error:'Invalid snapshot'};expect(sync).toThrow();expect([...events.values()].every(event=>!event.deleted)).toBe(true);
 feed={events:[]};sync();expect(personal.deleted).toBe(false);expect(events.get('2')?.deleted).toBe(true);
});
