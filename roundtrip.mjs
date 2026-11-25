import {complete,validate,normalize} from './engine.mjs';
export const snapshot=r=>JSON.stringify([r.scores,r.note,r.comment,r.studentId||'']);
export function parseReturnRows(rows){
 if(!Array.isArray(rows)||!rows.length)throw Error('沒有可讀取的資料');
 const header=rows[0].map(x=>String(x??'').replace(/^\uFEFF/,'').trim()),ci=header.indexOf('資料代碼'),si=header.indexOf('座號'),ti=header.indexOf('評語');
 if(ci<0||si<0||ti<0)throw Error('必須包含資料代碼、座號、評語欄');
 return rows.slice(1).filter(r=>r.some(x=>String(x??'').trim())).map(r=>({code:String(r[ci]??'').trim(),seat:String(r[si]??'').trim(),comment:String(r[ti]??'')}));
}
export function previewReturn(rows,batches,project,history=[]){
 const counts=new Map();for(const x of rows)counts.set(x.code,(counts.get(x.code)||0)+1);
 const proposalCounts=new Map();for(const x of rows)if(x.comment){const n=normalize(x.comment);proposalCounts.set(n,(proposalCounts.get(n)||0)+1);}
 const entries=rows.map(x=>{
  const batch=batches.find(b=>b.mapping.some(m=>m.code===x.code)),m=batch?.mapping.find(m=>m.code===x.code),r=project.students.find(y=>y.id===m?.id);
  const errors=[];
  if(counts.get(x.code)>1)errors.push('重複資料代碼');
  if(!batch||!m)errors.push('未知交接代碼');
  if(batch&&batch.projectId!==project.id)errors.push('非目前班級');
  if(!r)errors.push('學生不存在');
  if(m&&x.seat!==m.seat)errors.push('座號不一致');
  if(r&&m&&(r.seat!==m.seat||r.name!==m.name||snapshot(r)!==m.snapshot))errors.push('交接後學生資料已變更');
  if(r?.confirmed)errors.push('評語已保護');
  if(r&&!complete(r.scores))errors.push('評分未完成');
  if(batch?.task==='review')errors.push('覆評任務不覆寫原評語');
  if(!x.comment)errors.push('無可採用評語');
  if(x.comment&&proposalCounts.get(normalize(x.comment))>1)errors.push('回傳評語完全重複');
  if(x.comment)errors.push(...validate(x.comment,[...history,...project.students.filter(y=>y.id!==r?.id&&y.comment).map(y=>y.comment)]));
  return {...x,id:r?.id,name:r?.name||'',old:r?.comment||'',batchId:batch?.id||'',errors:[...new Set(errors)]};
 });
 const used=new Set(entries.map(x=>x.batchId).filter(Boolean));if(used.size>1)for(const e of entries)e.errors.push('一次只接受同一交接批次');
 const batch=batches.find(b=>used.has(b.id));const missing=batch?batch.mapping.filter(m=>!counts.has(m.code)).map(m=>m.code):[];
 return {entries,missing};
}
