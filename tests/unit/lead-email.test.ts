import {describe,it,expect} from 'vitest';
import {initialMail,stageMail} from '@/lib/lead-email';

const request={name:'Sebastián <script>',email:'cliente@example.test',company:'Evento & Co.',phone:'+573001234567',nit:'900123456',equipment:'QUEST3',quantity:3,days:1,date:'2030-10-29',start:'10:00',city:'Bogotá',address:'Calle 100',notes:'Montaje < temprano'};
const estimate={hardware:660000,staff:400000,transport:null,content:null,tax:null,total:1060000,pending:['Transporte por confirmar'],equipmentName:'Meta Quest 3'};

describe('correos de alquiler',()=>{
 it('crea un correo HTML de marca, responsivo y seguro sin perder el texto alternativo',()=>{
  const mail=initialMail(request,'RT-Q-000002',false,estimate);
  expect(mail.html).toContain('<!doctype html>');
  expect(mail.html).toContain('RENTA TECH');
  expect(mail.html).toContain('Total estimado');
  expect(mail.html).toContain('$ 1.060.000');
  expect(mail.html).toContain('Sebastián &lt;script&gt;');
  expect(mail.html).not.toContain('Sebastián <script>');
  expect(mail.text).toContain('Total estimado: $ 1.060.000');
 });

 it('separa el destinatario del cliente del destinatario administrativo',()=>{
  process.env.EMAIL_NOTIFICATION_TO='jorgesosadiaz@sosadiazbros.com';
  const customer=initialMail(request,'RT-Q-000002',false,estimate);
  const admin=initialMail(request,'RT-Q-000002',true,estimate);
  expect(customer.to).toEqual(['cliente@example.test']);
  expect(admin.to).toEqual(['jorgesosadiaz@sosadiazbros.com']);
  expect(customer.subject).toContain('Recibimos tu solicitud');
  expect(admin.subject).toContain('Nueva solicitud de alquiler');
 });

 it('incluye un botón de pago y conserva el enlace en texto plano',()=>{
  const mail=stageMail('awaiting_payment',request,'lead-qa','https://example.test/pagar?a=1&b=2');
  expect(mail.html).toContain('Ir al pago seguro');
  expect(mail.html).toContain('https://example.test/pagar?a=1&amp;b=2');
  expect(mail.text).toContain('https://example.test/pagar?a=1&b=2');
 });
});
