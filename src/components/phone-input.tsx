'use client';
import Image from 'next/image';

const countries=[['+57','CO','Colombia','🇨🇴'],['+1','US','Estados Unidos / Canadá','🇺🇸'],['+52','MX','México','🇲🇽'],['+34','ES','España','🇪🇸'],['+54','AR','Argentina','🇦🇷'],['+55','BR','Brasil','🇧🇷'],['+56','CL','Chile','🇨🇱'],['+51','PE','Perú','🇵🇪'],['+593','EC','Ecuador','🇪🇨'],['+58','VE','Venezuela','🇻🇪'],['+507','PA','Panamá','🇵🇦'],['+506','CR','Costa Rica','🇨🇷'],['+598','UY','Uruguay','🇺🇾'],['+595','PY','Paraguay','🇵🇾'],['+591','BO','Bolivia','🇧🇴'],['+44','GB','Reino Unido','🇬🇧'],['+49','DE','Alemania','🇩🇪'],['+33','FR','Francia','🇫🇷']];

export function PhoneInput({country,value,onCountry,onChange}:{country:string;value:string;onCountry:(code:string)=>void;onChange:(value:string)=>void}){
 const selected=countries.find(c=>c[0]===country)??countries[0];
 return <div className="phone-field"><label className="phone-label" htmlFor="rental-phone">Teléfono / WhatsApp</label><div className="phone-control"><div className="phone-country"><Image src={`/images/flags/${selected[1].toLowerCase()}.svg`} width={24} height={18} alt="" unoptimized/><span aria-hidden="true">{country} ▾</span><select aria-label="Código internacional" value={country} onChange={e=>onCountry(e.target.value)}>{countries.map(([code,,name])=><option key={code} value={code}>{name} ({code})</option>)}</select></div><input id="rental-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" value={value} onChange={e=>onChange(e.target.value.replace(/\D/g,''))}/></div></div>;
}
