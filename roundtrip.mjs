import {complete,validate,normalize,similarity} from './engine.mjs';
export const snapshot=r=>JSON.stringify([r.scores,r.note,r.comment,r.studentId||'']);
// RFC 4180-style quoted CSV/TSV, preserving leading zeros and literal text.
export function parseReturnText(text){
 const s=String(text).replace(/^\uFEFF/,'');if(!s.trim())throw Error('沒有可讀取的資料');
 const sep=s.split(/\r?\n/,1)[0].includes('\t')?'\t':',';
 const rows=[];let row=[],field='',quoted=false,closed=false;
 for(let i=0;i<s.length;i++){const c=s[i];
  if(quoted){if(c==='"'){if(s[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=c;continue;}
  if(c===sep||c==='\n'||c==='\r'){row.push(field);field='';closed=false;if(c!==sep){rows.push(row);row=[];if(c==='\r'&&s[i+1]==='\n')i++;}continue;}
  if(closed)throw Error('引號欄位格式錯誤');
  if(c==='"'&&!field){quoted=true;continue;}field+=c;
 }
 if(quoted)throw Error('引號未結束');if(row.length||field||closed){row.push(field);rows.push(row);}
 return rows;
}
const seatEquivalent=(a,b)=>a===b||(/^\d+$/.test(a)&&/^\d+$/.test(b)&&a.replace(/^0+(?=\d)/,'')===b.replace(/^0+(?=\d)/,''));
export function parseReturnRows(rows){
 if(!Array.isArray(rows)||!rows.length)throw Error('沒有可讀取的資料');
 const header=rows[0].map(x=>String(x??'').replace(/^\uFEFF/,'').trim()),ci=header.indexOf('資料代碼'),si=header.indexOf('座號'),ti=header.indexOf('評語');
 if(ci<0||si<0||ti<0)throw Error('必須包含資料代碼、座號、評語欄');
 return rows.slice(1).filter(r=>r.some(x=>String(x??'').trim())).map(r=>({code:String(r[ci]??'').trim(),seat:String(r[si]??'').trim(),comment:String(r[ti]??'')}));
}
export function parseReturnAudit(rows){
 const result=new Map();if(!Array.isArray(rows)||!rows.length)return result;
 const header=rows[0].map(x=>String(x??'').trim()),ci=header.indexOf('資料代碼'),ri=header.indexOf('結果');
 if(ci<0||ri<0)return result;
 for(const row of rows.slice(1)){const code=String(row[ci]??'').trim(),status=String(row[ri]??'').trim();if(!code)continue;
  const cols=['A','B','C','D','E','F','G','H'].map(k=>header.findIndex(h=>h===k||h.startsWith(k+' ')));const values=cols.map(i=>i<0?'':String(row[i]??'').trim());let verified=status;if(values.includes('0'))verified='未通過';else if(status==='通過'&&(!values.every(v=>v==='2')||/未提供/.test(String(row[header.indexOf('歷史範圍')]??''))))verified='待教師核對';result.set(code,result.has(code)?'重複覆核紀錄':verified);
 }
 return result;
}
export function previewReturn(rows,batches,project,history=[],audit=new Map()){
 const counts=new Map();for(const x of rows)counts.set(x.code,(counts.get(x.code)||0)+1);
 const proposalCounts=new Map();for(const x of rows)if(x.comment){const n=normalize(x.comment);proposalCounts.set(n,(proposalCounts.get(n)||0)+1);}
 const entries=rows.map(x=>{
  const batch=batches.find(b=>Array.isArray(b.mapping)&&b.mapping.some(m=>m.code===x.code)),m=batch?.mapping.find(m=>m.code===x.code),r=project.students.find(y=>y.id===m?.id);
  const errors=[],advisories=[];const verdict=audit.get(x.code);if(verdict==='未通過'||verdict==='重複覆核紀錄')errors.push('AI 覆核未通過或紀錄衝突');else if(verdict==='待教師核對')advisories.push('AI 標記待教師核對，請閱讀後自行勾選採用');else if(verdict!=='通過')advisories.push('缺少有效 AI 覆核紀錄，請閱讀後自行勾選採用');
  if(counts.get(x.code)>1)errors.push('重複資料代碼');
  if(!batch||!m)errors.push('未知交接代碼');
  if(batch&&batch.projectId!==project.id)errors.push('非目前班級');
  if(!r)errors.push('學生不存在');
  if(m&&!seatEquivalent(x.seat,m.seat))errors.push('座號不一致');
  if(r&&m&&(r.seat!==m.seat||r.name!==m.name||snapshot(r)!==m.snapshot))errors.push('交接後學生資料已變更');
  if(r?.confirmed)errors.push('評語已保護');
  if(r&&!complete(r.scores))errors.push('評分未完成');
  if(batch?.task==='review')errors.push('覆評任務不覆寫原評語');
  if(!x.comment)errors.push('無可採用評語');
  if(x.comment&&proposalCounts.get(normalize(x.comment))>1)errors.push('回傳評語完全重複');else if(x.comment&&rows.some(y=>y!==x&&y.comment&&similarity(x.comment,y.comment)>.78))errors.push('回傳評語彼此高度相似');
  if(x.comment)errors.push(...validate(x.comment,[...history,...project.students.filter(y=>y.id!==r?.id&&y.comment).map(y=>y.comment)]));
  return {...x,id:r?.id,name:r?.name||'',old:r?.comment||'',batchId:batch?.id||'',errors:[...new Set(errors)],advisories};
 });
 const used=new Set(entries.map(x=>x.batchId).filter(Boolean));if(used.size>1)for(const e of entries)e.errors.push('一次只接受同一交接批次');
 const batch=batches.find(b=>used.has(b.id));const missing=batch?batch.mapping.filter(m=>!counts.has(m.code)).map(m=>m.code):[];
 return {entries,missing};
}

// Export file name: 班級名_項目_YYYYMMDD.ext. Characters Windows/macOS do not allow in file names are dropped; with no usable class name the
// original plain name (項目.ext) is kept (issue #46). `date` is an ISO date string such as 2026-11-28 (or empty to omit it).
export function exportFileName(className,base,ext,date=''){
 const name=String(className??'').replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g,'').replace(/\s+/g,' ').trim().replace(/^\.+|\.+$/g,'').slice(0,40).trim();
 if(!name)return base+'.'+ext;
 const stamp=String(date||'').replace(/\D/g,'');
 return name+'_'+base+(stamp?'_'+stamp:'')+'.'+ext;
}
