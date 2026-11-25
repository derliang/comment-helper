import {dims,complete,length,similarity,validate ,validSemanticRule} from './engine.mjs';
export const VERSION='0.9.1-beta';
export const identity=v=>String(v??'').normalize('NFKC').replace(/\s+/g,'');
export const sameStudent=(a,b)=>Boolean(identity(a.studentId)&&identity(a.studentId)===identity(b.studentId));
export function relatedHistory(r,history,projects=[]){return [...history,...projects.flatMap(p=>p.students.filter(x=>x.id!==r.id&&x.comment&&x.confirmed).map(x=>({...x,source:p.name})))].filter(h=>sameStudent(r,h)&&h.comment);}
export function redact(text,people=[]){let s=String(text??'');const names=new Set();for(const p of people){const n=String(p.name??'').trim();if(n.length>=2){names.add(n);if(n.length>=3)names.add(n.slice(1));}const id=identity(p.studentId);if(id.length>=3)names.add(id);}for(const n of [...names].sort((a,b)=>b.length-a.length))s=s.split(n).join('學生');return s.replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g,'[電子郵件]').replace(/\d{5,}/g,'[數字]');}
export function adaptiveProfile(base,feedback=[]){const edits=feedback.filter(x=>x.raw&&x.final&&x.raw!==x.final);const words=base.preferred||[];const preferred=[...words].sort((a,b)=>{const delta=w=>edits.reduce((n,e)=>n+(e.final.includes(w)?1:0)-(e.raw.includes(w)?1:0),0);return delta(b)-delta(a);});return {...base,preferred,edits:edits.length};}
export function styleContext(r,profile,history,projects,share=false){const prior=relatedHistory(r,history,projects);const people=[r,...history,...projects.flatMap(p=>p.students)];const examples=share?[...new Set(selectStyleExamples(r,history,projects,profile.examples||[]).map(x=>redact(x,people)))].slice(-8):[];const avoid=share?[...new Set(prior.map(x=>redact(x.comment,people)))].slice(-8):[];const comparisonPool=share?[...new Set([...history,...projects.flatMap(p=>p.students.filter(x=>x.id!==r.id&&x.confirmed))].filter(x=>x.comment).map(x=>redact(x.comment,people)))]:[];return {observation:redact(r.note,people),style:{count:profile.count,preferred:(profile.preferred||[]).map(w=>redact(w,people)).filter(w=>!w.includes('學生')&&!w.includes('[')),edits:profile.edits||0,features:{...profile.features,structure:profile.structure||null},examples},avoid,comparisonPool};}
export function validEndpoint(url){try{const u=new URL(url);return !u.username&&!u.password&&(u.protocol==='https:'||(u.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(u.hostname)));}catch{return false;}}
export async function aiRequest(endpoint,token,payload,fetcher=fetch){if(!validEndpoint(endpoint))throw Error('請設定有效的 HTTPS 或本機端點');const response=await fetcher(endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(payload),signal:AbortSignal.timeout(45000),redirect:'error'});if(!response.ok)throw Error('AI 服務 HTTP '+response.status);const result=await response.json();if(typeof result.comment!=='string')throw Error('AI 服務回傳格式不符');return {comment:result.comment.trim(),warnings:Array.isArray(result.warnings)?result.warnings.filter(x=>typeof x==='string').slice(0,8):[],semanticChecked:result.semanticChecked===true,qualityChecked:result.qualityChecked===true};}
export async function generateAI({endpoint,token,rules,scores,context,history=[],fetcher}){if(!complete(scores))throw Error('請完成六個向度評分');if(!rules.trim())throw Error('原始評語指令尚未載入');const {comparisonPool=[],qualityCheck=false,...safeContext}=context;let issues=[],avoid=safeContext.avoid||[];for(let i=0;i<2;i++){const result=await aiRequest(endpoint,token,{mode:'generate',rules,override:'最新規則優先：六向度均為1–5分；日常生活表現、整潔習慣、禮節、班級服務、待人誠信、自律自重。無學習成效獨立向度；無證據勿推論學業。42–50字含標點；只描述已提供的觀察，不揭露身分。低分轉為具體成長期待，不虛構事蹟。',scores:Object.fromEntries(dims.map((d,j)=>[d,scores[j]])),...safeContext,avoid,issues},fetcher);issues=validate(result.comment,history);if(!issues.length&&(comparisonPool.length||avoid.length||qualityCheck)){const closest=comparisonPool.map(text=>({text,score:Math.max(similarity(text,result.comment),conceptOverlap(text,result.comment).shared>=2?conceptOverlap(text,result.comment).score*.85:0)})).sort((a,b)=>b.score-a.score).slice(0,6).map(x=>x.text);const samples=[...new Set([...avoid.slice(-8),...closest])].slice(0,14);try{const reviewed=await aiRequest(endpoint,token,{mode:'review',comment:result.comment,avoid:samples,...(qualityCheck?{quality:{scores:Object.fromEntries(dims.map((d,j)=>[d,scores[j]])),observation:safeContext.observation||''}}:{})},fetcher);if(reviewed.comment===result.comment){result.semanticChecked=Boolean(samples.length&&reviewed.semanticChecked);result.qualityChecked=Boolean(qualityCheck&&reviewed.qualityChecked);if(result.semanticChecked||result.qualityChecked)result.warnings=[...result.warnings,...reviewed.warnings];if(samples.length&&!result.semanticChecked)result.warnings.push('AI 端點未支援獨立語意核對');if(qualityCheck&&!result.qualityChecked)result.warnings.push('AI 端點未支援獨立品質核對，請人工確認');}else result.warnings.push('AI 核對回傳的文字不一致，請人工確認');}catch{result.warnings.push('AI 獨立核對未成功，請人工確認評語品質及重複性');}if(result.semanticChecked&&result.warnings.length)avoid=samples;}if(!issues.length&&!result.warnings.length)return result;if(i===1){if(length(result.comment)<42||length(result.comment)>50)throw Error('AI 未能符合字數限制，請重新生成');return result;}issues=[...issues,...result.warnings];}}
export function matchHistoricalId(history,index,value){const id=identity(value);if(!history[index])throw Error('找不到歷史紀錄');if(id&&!/^[\p{L}\p{N}][\p{L}\p{N}._-]{0,30}$/u.test(id))throw Error('學號格式不符');return history.map((h,i)=>i===index?{...h,studentId:id}:h);}

// Stable IDs take precedence. A seat collision with another ID is a conflict, not a merge.
export function mergeRoster(existing,incoming){const students=existing.map(r=>({...r,scores:[...r.scores],legacy:{...r.legacy}}));let added=0,updated=0,conflicts=0;for(const r of incoming){const seat=identity(r.seat).replace(/^0+(?=\d)/,''),sameSeat=students.find(x=>identity(x.seat).replace(/^0+(?=\d)/,'')===seat);const sameId=students.find(x=>sameStudent(x,r));const old=sameId||sameSeat;if(!old){students.push(r);added++;continue;}if(old.confirmed||identity(old.name)!==identity(r.name)||(old.studentId&&r.studentId&&!sameStudent(old,r))||(sameId&&sameSeat&&sameId!==sameSeat)){conflicts++;continue;}old.studentId||=r.studentId;old.scores=old.scores.map((v,i)=>v??r.scores[i]);old.note||=r.note;old.comment||=r.comment;old.legacy={...r.legacy,...old.legacy};updated++;}students.sort((a,b)=>Number(a.seat)-Number(b.seat));return {students,added,updated,conflicts};}

/** Transparent synonym-based local signals. Advisory only, not an embedding model. */
const concepts=[
 ['punctuality',/守時|準時|遲到|時間安排|安排時間|時間管理|重視時間/],
 ['cleanliness',/整潔|打掃|整理環境|環境清潔|整理習慣/],
 ['courtesy',/有禮|禮貌|應對得宜|應對方式|尊重師長/],
 ['service',/班級事務|班級服務|服務班級|公務|團體事務|服務團體/],
 ['integrity',/誠懇|誠信|言行一致|誠實|守信|真誠/],
 ['selfregulation',/自律|自我管理|生活常規|團體規範|團體規則/],
 ['peer',/同學|同儕|人我|相處和睦|人際互動/],
 ['study',/複習|讀書方法|學習方法|增加練習|學習實力/],
 ['attention',/專注|分心|注意力/],
 ['confidence',/自信|勇於表達|主動表達/],
 ['responsibility',/盡責|負責|份內|責任感/],['listening',/傾聽|聽取意見|堅持己見|他人感受/],['persistence',/持續嘗試|遇到困難|挫折|不輕言放棄/],['leadership',/領導|帶領團隊|帶動團體氣氛/],['planning',/規劃時間|工作規劃|拖延/]
];
const conceptSet=s=>new Set(concepts.filter(([,re])=>re.test(s)).map(([k])=>k));
export function conceptOverlap(a,b){const x=conceptSet(a),y=conceptSet(b);let n=0;for(const k of x)if(y.has(k))n++;return {shared:n,score:x.size+y.size?2*n/(x.size+y.size):0};}
export function localHistoryWarnings(comment,prior=[]){if(!comment)return [];const matches=prior.filter(h=>{const m=conceptOverlap(comment,h.comment||'');return m.shared>=2&&m.score>=.8&&directionOverlap(comment,h.comment||'').changed===0;});return matches.length?['與同學號過往評語有相近的觀察主題（'+matches.length+' 則），請核對是否仍符合本學期實況。']:[];}
export function approvedStyle(profile,versions=[]){const last=versions.at(-1);return last?{...profile,preferred:[...new Set([...last.preferred,...profile.preferred])],approvedVersion:last.version}:profile;}
export function saveStyleVersion(versions,preferred){const words=[...new Set(String(preferred).split(/[、，,\n]+/).map(s=>s.trim()).filter(Boolean))];if(!words.length||words.length>40||words.some(w=>length(w)>16))throw Error('請輸入 1～40 個偏好詞語，每個不超過 16 字');return [...versions,{version:(versions.at(-1)?.version||0)+1,preferred:words,createdAt:new Date().toISOString()}];}

// Five original school dimensions are transcribed verbatim; daily-life row is a proposed rubric.
export const RUBRIC=[["日常表現成熟穩定，能主動落實日常常規。","日常表現良好，能維持生活常規。","大致能配合日常規範，偶需提醒。","生活常規仍需較多提醒與協助。","需持續協助建立基本日常生活常規。"],["主動維護環境，負責區域一塵不染，是整潔的模範。","始終維持個人座位整潔，能按時且確實完成打掃工作。","能完成份內打掃工作，個人區域大致整潔，無重大疏失。","需提醒才能完成打掃，個人區域偶爾凌亂，有待改善。","環境維持極差，經常被記點，需大量督促。"],["舉止優雅，應對進退得宜，言談間展現極佳的尊重與修養。","尊重師長，與同學互動有禮，能始終遵守基本社交規範。","能遵守校園禮儀，對師長與同學保持基本禮貌。","偶爾因疏忽或情緒影響，禮節方面有失當之處。","經常對師長或同學失禮，無視基本校園規範。"],["積極爭取服務機會，樂於奉獻，是班級服務的領導者與熱心人。","擔任公職盡責，能主動分擔事務，對班級事務表現熱心。","能確實履行被分配到的班級工作，不推卸責任。","對班級公務略顯冷漠，需提醒才能完成或參與服務。","逃避服務工作，對班級事務漠不關心。"],["言行一致，高度誠實正直，無論有無監督皆能維持道德標準。","始終誠懇待人，能遵守承諾，是值得師長與同學信賴的人。","大致上誠實，不作弊，但在壓力下偶爾會試圖隱瞞小錯。","偶爾說謊或未能兌現承諾，信譽有待加強。","經常性有不誠實的行為，嚴重影響人際信任。"],["自我管理極佳，無須提醒即能恪守所有校規，是其他同學的榜樣。","能主動遵守校規，按時完成作業，展現良好的自我約束力。","能遵守大部分校規，遲交作業或違規情況偶爾發生。","違規行為（如服儀、遲到）較頻繁，需師長介入糾正。","嚴重違反校規，自律意識薄弱，需要強力介入輔導。"]];

export function validBackup(x){const str=v=>typeof v==='string',arr=Array.isArray;if(!x||x.version!==1||!arr(x.projects)||!x.projects.length||!arr(x.history)||!x.projects.every(p=>p&&str(p.id)&&str(p.name)&&arr(p.students)&&p.students.every(r=>r&&str(r.id)&&str(r.name)&&str(r.seat)&&str(r.comment)&&str(r.note)&&arr(r.scores)&&r.scores.length===6&&r.scores.every(v=>v===null||(Number.isInteger(v)&&v>=1&&v<=5)))))return false;if(new Set(x.projects.map(p=>p.id)).size!==x.projects.length)return false;if(!x.projects.every(p=>new Set(p.students.map(r=>r.id)).size===p.students.length))return false;if(!x.projects.every(p=>p.trash===undefined||(arr(p.trash)&&p.trash.every(r=>r&&str(r.id)&&str(r.name)&&str(r.seat)&&str(r.comment)&&str(r.note)&&arr(r.scores)&&r.scores.length===6&&r.scores.every(v=>v===null||(Number.isInteger(v)&&v>=1&&v<=5)))&&new Set([...p.students,...p.trash].map(r=>r.id)).size===p.students.length+p.trash.length)))return false;if(!x.history.every(h=>h&&str(h.comment)))return false;if(x.feedback!==undefined&&(!arr(x.feedback)||!x.feedback.every(f=>f&&str(f.raw)&&str(f.final))))return false;if(x.styleVersions!==undefined&&(!arr(x.styleVersions)||!x.styleVersions.every(v=>v&&Number.isInteger(v.version)&&str(v.createdAt)&&arr(v.preferred)&&v.preferred.every(str))))return false;if(x.endpoint&&!validEndpoint(x.endpoint))return false;if(x.semanticRules!==undefined&&(!arr(x.semanticRules)||!x.semanticRules.every(validSemanticRule)))return false;if(!x.projects.every(p=>[...p.students,...(p.trash||[])].every(r=>r.commentVersions===undefined||arr(r.commentVersions)&&r.commentVersions.every(v=>v&&str(v.comment)&&str(v.at)))))return false;if(x.handoffBatches!==undefined&&(!arr(x.handoffBatches)||new Set(x.handoffBatches.map(b=>b?.id)).size!==x.handoffBatches.length||!x.handoffBatches.every(b=>b&&str(b.id)&&str(b.projectId)&&str(b.at)&&['generate','polish','review','rewrite'].includes(b.task)&&arr(b.mapping)&&new Set(b.mapping.map(m=>m?.code)).size===b.mapping.length&&b.mapping.every(m=>m&&str(m.code)&&str(m.id)&&str(m.seat)&&str(m.name)&&str(m.snapshot)))))return false;return true;}
export function identityConflict(students,candidate,ignoreId){const seat=identity(candidate.seat).replace(/^0+(?=\d)/,'');if(!/^\d+$/.test(seat)||Number(seat)<1||!identity(candidate.name))return '請輸入正確座號及姓名';if(candidate.studentId&&!/^[\p{L}\p{N}][\p{L}\p{N}._-]{0,30}$/u.test(identity(candidate.studentId)))return '學號格式不符';if(students.some(r=>r.id!==ignoreId&&identity(r.seat).replace(/^0+(?=\d)/,'')===seat))return '本班已有相同座號';if(candidate.studentId&&students.some(r=>r.id!==ignoreId&&sameStudent(r,candidate)))return '本班已有相同學號';return '';}

/** Explainable local comparison, not an embedding or general semantic model. */
export function historyMatches(comment,records=[],limit=5){
 if(!comment)return [];
 return records.filter(h=>typeof h.comment==='string'&&h.comment.trim()).map(h=>{
  const textScore=similarity(comment,h.comment),m=conceptOverlap(comment,h.comment);
  const directions=directionOverlap(comment,h.comment),topicScore=m.shared>=2?m.score:0;
  return {...h,textScore,topicScore,shared:m.shared,directions,score:Math.max(textScore,topicScore*.85*(directions.changed?.75:1))};
 }).filter(h=>h.textScore>.55||h.topicScore>=.7).sort((a,b)=>b.score-a.score).slice(0,limit);
}
export function classReview(students,history=[],projects=[]){
 return students.map(r=>{
  const peers=students.filter(x=>x.id!==r.id&&x.comment);
  const prior=relatedHistory(r,history,projects);
  const all=[...history.map(h=>h.comment),...projects.flatMap(p=>p.students.filter(x=>x.id!==r.id&&x.comment).map(x=>x.comment)),...peers.map(x=>x.comment)].filter(Boolean);
  const hard=r.comment?validate(r.comment,all):[];
  const matches=historyMatches(r.comment,[...prior.map(h=>({...h,scope:'歷史'})),...peers.map(h=>({...h,scope:'同班'}))]);
  return {id:r.id,seat:r.seat,name:r.name,complete:complete(r.scores),confirmed:!!r.confirmed,stale:!!r.stale,hasComment:!!r.comment,hard,advisory:[...new Set([...(r.aiWarnings||[]),...localHistoryWarnings(r.comment,prior)])],matches};
 });
}

/** Select actual teacher examples near the current rating profile, excluding the target identity. */
export function selectStyleExamples(r,history=[],projects=[],fallback=[],limit=8){
 const candidates=[...history,...projects.flatMap(p=>p.students.filter(x=>x.confirmed&&(!x.aiOriginal||x.aiOriginal!==x.comment)))].filter(h=>h.comment&&h.id!==r.id&&!sameStudent(r,h));
 const scored=candidates.map(h=>{
  const pairs=Array.isArray(h.scores)&&Array.isArray(r.scores)?r.scores.map((v,i)=>[v,h.scores[i]]).filter(([a,b])=>Number.isInteger(a)&&Number.isInteger(b)&&a>=1&&a<=5&&b>=1&&b<=5):[];
  const distance=pairs.length?pairs.reduce((n,[a,b])=>n+Math.abs(a-b),0)/pairs.length:4;
  return {comment:h.comment,rank:pairs.length/6*(1-distance/4)};
 }).sort((a,b)=>b.rank-a.rank);
 const own=new Set(relatedHistory(r,history,projects).map(h=>h.comment));return [...new Set([...scored.map(x=>x.comment),...fallback])].filter(c=>!own.has(c)).slice(0,limit);
}
/** Distinguish observed strengths from future expectations; uncertain wording stays neutral. */
export function conceptDirections(s){
 const result=new Map(),clauses=String(s||'').split(/[，,。；;！？]/).filter(Boolean);
 let expectation=false;
 for(const clause of clauses){
  if(/若能|若可|期許|期待|希望|建議|宜|仍需|有待|可再/.test(clause))expectation=true;
  const direction=expectation?'goal':/能|具備|善於|熱心|樂於|主動|有禮|誠懇|真誠|穩定|良好|優良|進步|準時|守時|認真|盡責/.test(clause)?'strength':'neutral';
  for(const k of conceptSet(clause)){if(!result.has(k))result.set(k,new Set());result.get(k).add(direction);}
 }
 return result;
}
export function directionOverlap(a,b){
 const x=conceptDirections(a),y=conceptDirections(b);let shared=0,aligned=0,changed=0;
 for(const [k,ds] of x){const other=y.get(k);if(!other)continue;shared++;const strong=ds.has('strength')&&other.has('strength'),goal=ds.has('goal')&&other.has('goal');if(strong||goal)aligned++;else if((ds.has('strength')&&other.has('goal'))||(ds.has('goal')&&other.has('strength')))changed++;}
 return {shared,aligned,changed};
}
