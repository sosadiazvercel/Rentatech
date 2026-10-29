import {describe,it,expect} from 'vitest';
import {leadSchema,reviewReasons,leadUpdateSchema} from '@/lib/lead-schema';
import {validLead} from '../fixture';
describe('Server input rules',()=>{
 it('accepts a complete request and normalizes email',()=>{expect(leadSchema.parse({...validLead,email:'CLIENTE@example.test'}).email).toBe('cliente@example.test');});
 it.each([{privacy:false},{quantity:0},{quantity:2.5},{email:'bad'},{phone:'3001234567'},{date:'2030-02-30'},{end:'09:00'},{date:'2020-01-01'},{technicianCount:0},{totalCop:1}])('rejects invalid or injected input %j',patch=>{expect(leadSchema.safeParse({...validLead,...patch}).success).toBe(false);});
 it('captures out-of-scope requests for human review',()=>{const input=leadSchema.parse({...validLead,city:'Medellín',quantity:25,content:'custom',extraTechnician:true});expect(reviewReasons(input)).toContain('Cobertura fuera de Bogotá');expect(reviewReasons(input)).toContain('Cantidad fuera del paquete estándar');});
 it('does not declare new venues or client content verified',()=>{expect(reviewReasons(leadSchema.parse(validLead))).toContain('Lugar y contenido pendientes de validación');});
 it('requires reason when lost and prevents manual won',()=>{const v={stage:'lost',ownerId:null,estimatedValue:null,nextAction:null,lossReason:'',note:''};expect(leadUpdateSchema.safeParse(v).success).toBe(false);expect(leadUpdateSchema.safeParse({...v,lossReason:'Sin fecha'}).success).toBe(true);expect(leadUpdateSchema.safeParse({...v,stage:'won'}).success).toBe(false);});
});
