import test from 'node:test';import assert from 'node:assert/strict';import {parseReturnRows,parseReturnText,previewReturn,snapshot} from '../roundtrip.mjs';import {draft} from '../engine.mjs';
const r={id:'a',seat:'01',name:'甲',scores:[5,4,5,4,5,3],note:'經常遲到',comment:'',studentId:'001'};
const p={id:'p',students:[r]};const b={id:'B1',projectId:'p',task:'polish',mapping:[{code:'B1-S001',id:r.id,seat:r.seat,name:r.name,snapshot:snapshot(r)}]};const c=draft(r.scores,r.note);
test('valid return matches exact code and seat; no mutation',()=>{const rows=parseReturnRows([['資料代碼','座號','姓名','評語'],['B1-S001','01','',c]]);assert.deepEqual(previewReturn(rows,[b],p).entries[0].errors,[]);assert.equal(r.comment,'');});
test('return rejects stale, wrong class, unknown code, duplicate and protected',()=>{const x={code:'B1-S001',seat:'01',comment:c};assert.ok(previewReturn([x],[b],{...p,students:[{...r,note:'changed'}]}).entries[0].errors.some(x=>x.includes('變更')));assert.ok(previewReturn([x],[b],{...p,id:'other'}).entries[0].errors.includes('非目前班級'));assert.ok(previewReturn([{...x,code:'unknown'}],[b],p).entries[0].errors.includes('未知交接代碼'));assert.ok(previewReturn([x,x],[b],p).entries[0].errors.includes('重複資料代碼'));assert.ok(previewReturn([x],[b],{...p,students:[{...r,confirmed:true}]}).entries[0].errors.includes('評語已保護'));assert.ok(previewReturn([x],[{...b,task:'review'}],p).entries[0].errors.includes('覆評任務不覆寫原評語'));});

test('CSV and TSV preserve seat padding and quotes, Excel numeric seat is equivalent only with exact code',()=>{assert.deepEqual(parseReturnText('\uFEFF資料代碼,座號,姓名,評語\r\nB1-S001,01,,"甲,乙"\r\n')[1],['B1-S001','01','','甲,乙']);assert.equal(parseReturnText('資料代碼\t座號\t評語\nB1-S001\t01\t'+c)[1][1],'01');assert.deepEqual(previewReturn([{code:'B1-S001',seat:'1',comment:c}],[b],p).entries[0].errors,[]);assert.ok(previewReturn([{code:'B1-S001',seat:'02',comment:c}],[b],p).entries[0].errors.includes('座號不一致'));assert.throws(()=>parseReturnText('a,b\n"bad,2'));});
test('similar historical comments remain blocked and a changed return is rechecked',()=>{assert.ok(previewReturn([{code:'B1-S001',seat:'01',comment:c}],[b],p,[c]).entries[0].errors.includes('完整評語重複'));});

test('explicit AI review failure is blocked and pending review requires opt-in',async()=>{const {parseReturnAudit}=await import('../roundtrip.mjs');const x={code:'B1-S001',seat:'01',comment:c};let a=parseReturnAudit([['資料代碼','結果'],[x.code,'未通過']]);assert.ok(previewReturn([x],[b],p,[],a).entries[0].errors.includes('AI 覆核未通過或紀錄衝突'));a=parseReturnAudit([['資料代碼','結果'],[x.code,'待教師核對']]);const row=previewReturn([x],[b],p,[],a).entries[0];assert.equal(row.errors.length,0);assert.ok(row.advisories.length);});

test('issue #46: export file names carry the class name and date, strip illegal characters, and fall back to the plain name',async()=>{
 const {exportFileName}=await import('../roundtrip.mjs');
 assert.equal(exportFileName('三年甲班','期末評語','xlsx','2026-11-28'),'三年甲班_期末評語_20261128.xlsx');
 assert.equal(exportFileName('三/年:甲*班?"<>|\\','期末評語','docx','2026-11-28'),'三年甲班_期末評語_20261128.docx');
 assert.equal(exportFileName('  A  班 ','教師內部紀錄','xlsx','2026-01-05'),'A 班_教師內部紀錄_20260105.xlsx');
 assert.equal(exportFileName('','期末評語','xlsx','2026-11-28'),'期末評語.xlsx');
 assert.equal(exportFileName(undefined,'期末評語','xlsx','2026-11-28'),'期末評語.xlsx');
 assert.equal(exportFileName('/:*?','期末評語','xlsx','2026-11-28'),'期末評語.xlsx');
 assert.equal(exportFileName('..','期末評語','xlsx','2026-11-28'),'期末評語.xlsx');
 assert.equal(exportFileName('班','期末評語','xlsx'),'班_期末評語.xlsx');
 assert.ok(exportFileName('長'.repeat(100),'期末評語','xlsx','2026-11-28').startsWith('長'.repeat(40)+'_'));
});
