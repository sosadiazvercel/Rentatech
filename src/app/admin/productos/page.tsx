import {requireStaff} from '@/server/auth';
import {ProductManager} from '@/components/product-manager';

export default async function Products({searchParams}:{searchParams:Promise<{modelo?:string}>}){const {modelo}=await searchParams;const staff=await requireStaff();return <ProductManager isAdmin={staff.role==='admin'} initialCode={modelo}/>;}
