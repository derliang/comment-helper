import {newId} from './advanced.mjs';
import {dims,levels,length} from './engine.mjs';
const clean=v=>String(v??'').normalize('NFKC').replace(/\s+/g,'').trim();
const text=v=>String(v??'').trim();
const header=v=>clean(v).replace(/\(5[-–~至]1\)$/,'').replace(/\(1[-–~至]5\)$/,'');
const fields={seat:['座號','seat'],name:['姓名','學生姓名','name'],studentId:['學號','studentId']};
export const seatKey=v=>/^\d+$/.test(clean(v))?String(Number(clean(v))):clean(v);
export const score=v=>{const raw=clean(v).replace('須再加油','需再加油'),s=['優良','良好','尚可'].includes(raw)?'表現'+raw:raw;if(levels.includes(s))return levels.indexOf(s)+1;return /^[1-5]$/.test(s)?Number(s):null;};
const newRecord=(seat,name,studentId='')=>({id:newId(),seat:clean(seat),name:text(name),studentId:clean(studentId),scores:Array(6).fill(null),note:'',comment:'',rated:false,confirmed:false,legacy:{}});
const append=(a,b)=>[...new Set([a,b].filter(Boolean))].join('；');
export function parseSheet(rows,{allowNames=false}={}){
 const hi=rows.findIndex(r=>r.some(v=>fields.name.includes(header(v))));
 if(hi<0){if(!allowNames)return [];return rows.filter(r=>r.some(v=>text(v))).map((r,i)=>{if(r.length>1)return newRecord(r[0],r[1]);const value=text(r[0]),m=value.match(/^([0-9０-９]+)\s+(.+)$/u);return m?newRecord(m[1],m[2]):newRecord(i+1,value);}).filter(r=>r.name&&!/^\d+$/.test(clean(r.name))&&/^\d+$/.test(clean(r.seat))&&Number(clean(r.seat))>0);}
 const h=rows[hi].map(header),find=keys=>h.findIndex(v=>keys.includes(v));const ni=find(fields.name),si=find(fields.seat),ii=find(fields.studentId),ci=h.findIndex(v=>/評語/.test(v));
 return rows.slice(hi+1).filter(r=>text(r[ni])&&!fields.name.includes(header(r[ni]))&&(si<0||/^\d+$/.test(clean(r[si]))&&Number(clean(r[si]))>0)).map((r,i)=>{
  const o=newRecord(si>=0?r[si]:i+1,r[ni],ii>=0?r[ii]:'');
  o.scores=dims.map((d,j)=>{const k=find(j===0?[d,'日常表現']:[d]);return k>=0?score(r[k]):null;});
  o.comment=ci>=0?text(r[ci]):'';
  o.note=h.map((v,k)=>/^(性格特點|需要改進的地方|補充觀察|個別觀察|補充資料|備註)$/.test(v)&&text(r[k])?`${v}：${text(r[k])}`:'').filter(Boolean).join('；');
  for(const [k,v] of h.entries())if(/^(學習態度|品格人際|責任自律|潛能特質|情緒應對|學業努力程度)$/.test(v)&&text(r[k]))o.legacy[v]=text(r[k]);
  return o;
 });
}
export function mergeSheets(sheets,{allowNames=false}={}){
 const out=[];for(const rows of sheets){for(const r of parseSheet(rows,{allowNames:allowNames&&sheets.length===1})){
  const existing=out.find(x=>r.studentId&&x.studentId?clean(x.studentId).toUpperCase()===clean(r.studentId).toUpperCase():seatKey(x.seat)===seatKey(r.seat)&&clean(x.name)===clean(r.name));
  if(!existing){if(out.some(x=>seatKey(x.seat)===seatKey(r.seat)))throw Error('匯入名單座號衝突：'+r.seat+' '+r.name+'／'+out.find(x=>seatKey(x.seat)===seatKey(r.seat)).name);out.push(r);continue;}
   if(clean(existing.name)!==clean(r.name)||seatKey(existing.seat)!==seatKey(r.seat))throw Error('匯入資料身分衝突：'+existing.seat+' '+existing.name+'／'+r.seat+' '+r.name+'，請核對學號與座號');
  existing.studentId||=r.studentId;existing.scores=existing.scores.map((v,i)=>v??r.scores[i]);existing.note=append(existing.note,r.note);existing.legacy={...existing.legacy,...r.legacy};existing.comment||=r.comment;
 }}return out.sort((a,b)=>Number(a.seat)-Number(b.seat));
}
// A printed school report has one pupil across five physical rows, with split ID and comment fragments.
export function parseReportTables(tables){const result=[];for(const rows of tables){if(!rows.some(r=>clean(r[3]).includes('日常生活表現'))||!rows.some(r=>clean(r[3])==='評量'))continue;let current=null;for(const row of rows){const r=row.map(text);if(/^\d+$/.test(clean(r[0]))&&text(r[2])){current=newRecord(r[0],r[2],r[1]);result.push(current);}else if(current&&/^\d+$/.test(clean(r[1])))current.studentId+=clean(r[1]);if(!current)continue;
 const m=clean(r[3]).match(/^(.+?)[:：](.+)$/);if(m){const j=dims.indexOf(m[1]);if(j>=0)current.scores[j]=score(m[2]);}if(r[7])current.comment+=r[7].replace(/\s+/g,'');
 }}return result;}
export function historyEntries(records,source=''){return records.filter(r=>r.comment).map(r=>({comment:r.comment,studentId:r.studentId||'',seat:r.seat||'',name:r.name||'',source,scores:Array.isArray(r.scores)?[...r.scores]:[],note:r.note||'',legacy:{...(r.legacy||{})}}));}
export function mergeHistory(old,entries){const key=r=>[r.source||'',r.name||'',seatKey(r.seat),clean(r.comment)].join('|');const out=old.map(r=>({...r}));for(const r of entries){if(!r.comment)continue;const k=key(r),existing=out.find(x=>key(x)===k&&(!x.studentId||!r.studentId||clean(x.studentId)===clean(r.studentId)));if(existing){existing.studentId||=r.studentId;if(Array.isArray(r.scores)){const s=Array.isArray(existing.scores)?existing.scores:[];existing.scores=r.scores.map((v,i)=>s[i]??v);}existing.note||=r.note;existing.legacy={...r.legacy,...existing.legacy};continue;}out.push({...r});}return out;}
