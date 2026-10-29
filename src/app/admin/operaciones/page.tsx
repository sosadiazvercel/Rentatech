import {Operations} from '@/components/operations';
import {requireStaff} from '@/server/auth';
export default async function Page(){const staff=await requireStaff();return <Operations isAdmin={staff.role==='admin'}/>;}
