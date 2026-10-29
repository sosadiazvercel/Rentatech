'use client';

import {useEffect,useRef,type ReactNode} from 'react';

type FitTitleProps={
 as?:'h1'|'h2'|'h3';
 children:ReactNode;
 className?:string;
 max:number;
 min:number;
};

export function FitTitle({as='h1',children,className,max,min}:FitTitleProps){
 const ref=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{
  const el=ref.current;
  if(!el)return;
  let frame=0;
  const fit=()=>{
   cancelAnimationFrame(frame);
   frame=requestAnimationFrame(()=>{
    el.style.fontSize=`${max}px`;
    const available=el.clientWidth;
    const needed=el.scrollWidth;
    const next=available&&needed>available?Math.max(min,Math.floor(max*(available/needed))-1):max;
    el.style.fontSize=`${next}px`;
   });
  };
  fit();
  const ro=new ResizeObserver(fit);
  ro.observe(el);
  return ()=>{cancelAnimationFrame(frame);ro.disconnect();};
 },[children,max,min]);
 const Heading=as;
 return <Heading ref={ref} className={className} style={{fontSize:`${max}px`}}>{children}</Heading>;
}
