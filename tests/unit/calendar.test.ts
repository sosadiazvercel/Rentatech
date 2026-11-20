import {describe,expect,it} from 'vitest';
import {calendarUrl,parseCalendarId} from '@/lib/calendar';

describe('calendar settings',()=>{
 it('normalizes a Google Calendar identifier and builds the Bogotá embed URL',()=>{
  const id=parseCalendarId('  reservas@group.calendar.google.com  ');
  const url=new URL(calendarUrl(id));
  expect(id).toBe('reservas@group.calendar.google.com');
  expect(url.origin).toBe('https://calendar.google.com');
  expect(url.searchParams.get('src')).toBe(id);
  expect(url.searchParams.get('ctz')).toBe('America/Bogota');
 });
 it('allows disconnecting and rejects unsafe or malformed values',()=>{
  expect(parseCalendarId('')).toBe('');
  expect(()=>parseCalendarId('not-an-id')).toThrow();
  expect(()=>parseCalendarId('x@example.com\" onload=alert(1)')).toThrow();
 });
});
