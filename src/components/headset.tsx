import Image from 'next/image';
export function Headset({model='QUEST3',image,title}:{model?:string;image?:string;title?:string}) {
 const version=model==='QUEST2'?'2':'3';
 return <Image src={image??(['QUEST2','QUEST3'].includes(model)?`/images/meta-quest-${version}-cutout.png`:'/images/product-placeholder.svg')} alt={title??`Meta Quest ${version}`} width={1200} height={800} sizes="(max-width: 760px) 100vw, 560px" style={{display:'block',width:'100%',height:'auto'}}/>;
}
