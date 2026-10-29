import pg from 'pg';
export async function seed(url: string) {
 const parsed=new URL(url);
 if(process.env.APP_ENV!=='development'||!['127.0.0.1','localhost'].includes(parsed.hostname)) throw new Error('Fixtures require local development');
 const db=new pg.Client({connectionString:url});await db.connect();
 try {
  await db.query(`INSERT INTO auth.users(id,email) VALUES
   ('00000000-0000-4000-8000-000000000001','admin@example.test'),('00000000-0000-4000-8000-000000000002','operador@example.test') ON CONFLICT DO NOTHING;
   INSERT INTO public.staff_profile(id,auth_user_id,role) VALUES
   ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000001','admin'),
   ('00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000002','operator') ON CONFLICT DO NOTHING;
   INSERT INTO public.equipment(code,name,slug) VALUES('QUEST2','Quest 2 Essential','meta-quest-2'),('QUEST3','Quest 3 Event','meta-quest-3') ON CONFLICT DO NOTHING;
   INSERT INTO public.inventory_unit(equipment_id,asset_tag,status,is_fixture,inspected_at)
   SELECT e.id,'TEST-'||e.code||'-'||lpad(n::text,2,'0'),'ready',true,now() FROM public.equipment e CROSS JOIN generate_series(1,14) n ON CONFLICT DO NOTHING;`);
 } finally {await db.end();}
}
