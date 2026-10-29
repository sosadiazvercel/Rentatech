import {requireStaff} from '@/server/auth';
import {ProductManager} from '@/components/product-manager';

export default async function Products(){const staff=await requireStaff();return <ProductManager isAdmin={staff.role==='admin'}/>;}
