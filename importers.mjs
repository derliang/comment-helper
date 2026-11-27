import {newId,seatCompare} from './advanced.mjs';
import {dims,levels,length} from './engine.mjs';
const clean=v=>String(v??'').normalize('NFKC').replace(/\s+/g,'').trim();
const text=v=>String(v??'').trim();
// Decode an uploaded text file. Excel on zh-TW Windows writes CSV as Big5 (CP950), not UTF-8, and reading that as UTF-8 silently
// produced U+FFFD names and lost columns (issue #38). Try strict UTF-8 first, then Big5; refuse anything that still has U+FFFD.
export function decodeText(buffer){
 const u8=buffer instanceof Uint8Array?buffer:new Uint8Array(buffer);let t;
 if(u8.length>=2&&u8[0]===0xFF&&u8[1]===0xFE)t=new TextDecoder('utf-16le').decode(u8.subarray(2));
 else if(u8.length>=2&&u8[0]===0xFE&&u8[1]===0xFF)t=new TextDecoder('utf-16be').decode(u8.subarray(2));
 else{try{t=new TextDecoder('utf-8',{fatal:true}).decode(u8);}catch{try{t=new TextDecoder('big5').decode(u8);}catch{t='�';}}}
 t=t.replace(/^﻿/,'');
 if(t.includes('�'))throw Error('檔案編碼無法辨識（不是 UTF-8 或 Big5），內含無法解讀的字元。請在 Excel 另存為「CSV UTF-8」，或改用 .xlsx 匯入。');
 return t;
}
const header=v=>clean(v).toLowerCase().replace(/\(5[-–~至]1\)$/,'').replace(/\(1[-–~至]5\)$/,'');
const fields={seat:['座號','seat'],name:['姓名','學生姓名','name'],studentId:['學號','studentid']};
export const seatKey=v=>/^\d+$/.test(clean(v))?String(Number(clean(v))):clean(v);
export const score=v=>{const raw=clean(v).replace('須再加油','需再加油'),s=['優良','良好','尚可'].includes(raw)?'表現'+raw:raw;if(levels.includes(s))return levels.indexOf(s)+1;return /^[1-5]$/.test(s)?Number(s):null;};
const newRecord=(seat,name,studentId='')=>({id:newId(),seat:clean(seat),name:text(name),studentId:clean(studentId),scores:Array(6).fill(null),note:'',comment:'',rated:false,confirmed:false,legacy:{}});
const append=(a,b)=>[...new Set([a,b].filter(Boolean))].join('；');
// `skipped` (optional array) collects rows that had a name but were dropped because the seat is blank / not a positive integer (issue #41).
const seatProblem=v=>{const c=clean(v);return !c?'座號空白':!/^\d+$/.test(c)?'座號「'+c+'」不是純數字':Number(c)>0?'':'座號須大於 0';};
export function parseSheet(rows,{allowNames=false,skipped=null}={}){
 const hi=rows.findIndex(r=>r.some(v=>fields.name.includes(header(v))));
 if(hi<0){if(!allowNames)return [];return rows.map((r,row)=>({r,row})).filter(({r})=>r.some(v=>text(v))).map(({r,row},i)=>{let o;if(r.length>1)o=newRecord(r[0],r[1]);else{const value=text(r[0]),m=value.match(/^([0-9０-９]+)\s+(.+)$/u);o=m?newRecord(m[1],m[2]):newRecord(i+1,value);}o.row=row;return o;}).filter(o=>{const row=o.row;delete o.row;if(!o.name||/^\d+$/.test(clean(o.name)))return false;const why=seatProblem(o.seat);if(why){skipped?.push({row:row+1,name:o.name,reason:why});return false;}return true;});}
 const h=rows[hi].map(header),find=keys=>h.findIndex(v=>keys.includes(v));const ni=find(fields.name),si=find(fields.seat),ii=find(fields.studentId),ci=h.findIndex(v=>/評語/.test(v));
 return rows.slice(hi+1).map((r,k)=>({r,row:hi+1+k})).filter(({r,row})=>{if(!text(r[ni])||fields.name.includes(header(r[ni])))return false;if(si>=0){const why=seatProblem(r[si]);if(why){skipped?.push({row:row+1,name:text(r[ni]),reason:why});return false;}}return true;}).map(({r})=>r).map((r,i)=>{
  const o=newRecord(si>=0?r[si]:i+1,r[ni],ii>=0?r[ii]:'');
  o.scores=dims.map((d,j)=>{const k=find(j===0?[d,'日常表現']:[d]);return k>=0?score(r[k]):null;});
  o.comment=ci>=0?text(r[ci]):'';
  o.note=h.map((v,k)=>/^(性格特點|需要改進的地方|補充觀察|個別觀察|補充資料|備註)$/.test(v)&&text(r[k])?`${v}：${text(r[k])}`:'').filter(Boolean).join('；');
  for(const [k,v] of h.entries())if(/^(學習態度|品格人際|責任自律|潛能特質|情緒應對|學業努力程度)$/.test(v)&&text(r[k]))o.legacy[v]=text(r[k]);
  return o;
 });
}
export function mergeSheets(sheets,{allowNames=false,skipped=null}={}){
 const out=[];for(const rows of sheets){for(const r of parseSheet(rows,{allowNames:allowNames&&sheets.length===1,skipped})){
  const existing=out.find(x=>r.studentId&&x.studentId?clean(x.studentId).toUpperCase()===clean(r.studentId).toUpperCase():seatKey(x.seat)===seatKey(r.seat)&&clean(x.name)===clean(r.name));
  if(!existing){if(out.some(x=>seatKey(x.seat)===seatKey(r.seat)))throw Error('匯入名單座號衝突：'+r.seat+' '+r.name+'／'+out.find(x=>seatKey(x.seat)===seatKey(r.seat)).name);out.push(r);continue;}
   if(clean(existing.name)!==clean(r.name)||seatKey(existing.seat)!==seatKey(r.seat))throw Error('匯入資料身分衝突：'+existing.seat+' '+existing.name+'／'+r.seat+' '+r.name+'，請核對學號與座號');
  existing.studentId||=r.studentId;existing.scores=existing.scores.map((v,i)=>v??r.scores[i]);existing.note=append(existing.note,r.note);existing.legacy={...existing.legacy,...r.legacy};existing.comment||=r.comment;
 }}return out.sort(seatCompare);
}
// A printed school report has one pupil across five physical rows, with split ID and comment fragments.
export function parseReportTables(tables){const result=[];for(const rows of tables){if(!rows.some(r=>clean(r[3]).includes('日常生活表現'))||!rows.some(r=>clean(r[3])==='評量'))continue;let current=null;for(const row of rows){const r=row.map(text);if(/^\d+$/.test(clean(r[0]))&&text(r[2])){current=newRecord(r[0],r[2],r[1]);result.push(current);}else if(current&&/^\d+$/.test(clean(r[1])))current.studentId+=clean(r[1]);if(!current)continue;
 const m=clean(r[3]).match(/^(.+?)[:：](.+)$/);if(m){const j=dims.indexOf(m[1]);if(j>=0)current.scores[j]=score(m[2]);}if(r[7])current.comment+=r[7].replace(/\s+/g,'');
 }}return result;}
export function historyEntries(records,source=''){return records.filter(r=>r.comment).map(r=>({comment:r.comment,studentId:r.studentId||'',seat:r.seat||'',name:r.name||'',source,scores:Array.isArray(r.scores)?[...r.scores]:[],note:r.note||'',legacy:{...(r.legacy||{})}}));}
export function mergeHistory(old,entries){const key=r=>[r.source||'',r.name||'',seatKey(r.seat),clean(r.comment)].join('|');const out=old.map(r=>({...r}));for(const r of entries){if(!r.comment)continue;const k=key(r),existing=out.find(x=>key(x)===k&&(!x.studentId||!r.studentId||clean(x.studentId)===clean(r.studentId)));if(existing){existing.studentId||=r.studentId;if(Array.isArray(r.scores)){const s=Array.isArray(existing.scores)?existing.scores:[];existing.scores=r.scores.map((v,i)=>s[i]??v);}existing.note||=r.note;existing.legacy={...r.legacy,...existing.legacy};continue;}out.push({...r});}return out;}

// Human-readable summary of skipped rows for the import preview / confirmation.
export function skippedSummary(skipped,max=8){if(!skipped?.length)return '';const shown=skipped.slice(0,max).map(x=>'第 '+x.row+' 列 '+x.name+'（'+x.reason+'）').join('、');return '略過 '+skipped.length+' 列：'+shown+(skipped.length>max?'…等':'')+'。請補上座號後重新匯入。';}
