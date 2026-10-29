export function ArrowIcon({direction='right'}:{direction?:'right'|'down'}){
 return direction==='down'
  ? <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m5 9 7 7 7-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
  : <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
