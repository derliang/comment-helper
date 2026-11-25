export const dims=['日常生活表現','整潔習慣','禮節','班級服務','待人誠信','自律自重'];
export const levels=['亟待改進','需再加油','表現尚可','表現良好','表現優良'];
export const length=s=>Array.from(s).length;
export const complete=s=>Array.isArray(s)&&s.length===6&&s.every(v=>Number.isInteger(v)&&v>=1&&v<=5);
export const average=s=>complete(s)?s.reduce((a,b)=>a+b,0)/6:null;
export const normalize=s=>s.normalize('NFKC').replace(/[\p{P}\p{Z}\s]/gu,'');
const grams=s=>new Set(Array.from({length:Math.max(0,s.length-1)},(_,i)=>s.slice(i,i+2)));const features=s=>{const n=normalize(s);return {n,g:grams(n)};};const compare=(a,b)=>{if(a.n===b.n)return 1;let shared=0;for(const v of a.g)if(b.g.has(v))shared++;return a.g.size+b.g.size?2*shared/(a.g.size+b.g.size):0;};export function similarity(a,b){return compare(features(a),features(b));}
export function validate(s,history=[]){const issues=[];if(length(s)<42||length(s)>50)issues.push('字數須為 42–50 字');if(/不認真|散漫|不守規矩|缺乏責任感|態度差|不自律|不合群|不夠用心|再加油|要努力/.test(s))issues.push('含不宜使用的措辭');if(history.some(h=>normalize(h)===normalize(s)))issues.push('完整評語重複');else if(history.some(h=>similarity(h,s)>.78))issues.push('與既有評語高度相似，請核對');return issues;}

/** Train a local character trigram distribution. Counts stay in this browser. */
const trigrams=s=>{const n=normalize(String(s));return Array.from({length:Math.max(0,n.length-2)},(_,i)=>n.slice(i,i+3));};
export function trainStyle(samples){const counts=Object.create(null);let total=0;for(const s of new Set(samples.filter(Boolean))){for(const g of trigrams(s)){counts[g]=(counts[g]||0)+1;total++;}}return {counts,total};}
export function styleFit(candidate,profile){const m=profile.model,grams=trigrams(candidate);const learned=m?.total&&grams.length?grams.reduce((n,g)=>n+Math.log1p(m.counts[g]||0),0)/grams.length:0;const explicit=(profile.preferred||[]).slice(0,12).reduce((n,w,i)=>n+(candidate.includes(w)?(12-i)/12:0),0);return learned+explicit*.12;}

export function styleProfile(samples){const text=samples.join(''),count=samples.length;const preferred=['期待','若能','期許','更臻','持續','穩定','成熟','和睦','調和','希望','相信','值得肯定','妳','若能更','更有成效','有助於','善用','逐步','發揮所長','更進一步','盡責','主動'].map(word=>({word,count:text.split(word).length-1})).filter(x=>x.count).sort((a,b)=>b.count-a.count).map(x=>x.word);return {count,preferred,model:trainStyle(samples),examples:samples.slice(-12),features:{averageLength:count?Math.round(samples.reduce((a,b)=>a+length(b),0)/count):0,punctuation:Object.fromEntries(['，','；','。','！','「'].map(c=>[c,text.split(c).length-1])),usesDirectAddress:samples.filter(s=>s.includes('妳')||s.includes('你')).length,usesExpectation:samples.filter(s=>/若能|希望|期待|期許/.test(s)).length}};}

/** Local, explicitly bounded observation parser. No inference about motivation. */
const observations=[
 {id:'punctual',dim:5,positive:/從不遲到|不曾遲到|沒有遲到|向來守時|十分守時|非常守時|準時到校|總是準時/,negative:/遲到|不守時/,good:'能維持守時習慣',goal:'養成守時習慣',neutral:/很少遲到|不常遲到/},
 {id:'clean',dim:1,positive:/主動.{0,5}(打掃|整理|維護整潔)|整潔表現佳|打掃認真|打掃很認真/,negative:/忘記打掃|不打掃|打掃不確實|座位凌亂|環境凌亂/,good:'主動維護環境整潔',goal:'主動完成整潔工作',neutral:/沒有忘記打掃|不曾忘記打掃/},
 {id:'service',dim:3,positive:/服務熱心|熱心服務|熱心.{0,5}班級事務|幹部.{0,8}(認真|盡責|負責)|股長.{0,8}(認真|盡責|負責)|班長.{0,8}(認真|盡責|負責)/,negative:/不願服務|逃避.{0,4}(班級|公務)|不太主動.{0,5}(服務|班級)|不主動.{0,5}(服務|班級)|不參與班級/,good:'熱心投入班級事務',goal:'更主動參與班級事務'},
 {id:'help',dim:3,positive:/熱心.{0,4}(協助|幫助)同學|主動.{0,4}(協助|幫助)同學|樂於.{0,4}(協助|幫助)同學/,good:'樂於協助同學'},
 {id:'courtesy',dim:2,positive:/待人有禮|有禮貌|尊重師長/,negative:/沒禮貌|不尊重師長|對師長失禮/,good:'待人有禮',goal:'精進人際應對方式'},
 {id:'honesty',dim:4,positive:/言行一致|待人誠懇|很誠實/,negative:/說謊|不誠實|未兌現承諾/,good:'待人誠懇',goal:'重視言行一致'},
 {id:'rules',dim:5,positive:/遵守.{0,3}(團體規範|校規)|很自律/,negative:/不守規矩|違反校規|經常違規|服儀不整|不配合團體|不遵守團體規範/,good:'能配合團體規範',goal:'落實團體生活規範'},
 {id:'focus',dim:null,positive:/上課.{0,3}專注|學習專注|專心聽講/,negative:/分心|不專注|專注不足|注意力不集中/,good:'上課專注',goal:'提升專注的穩定度',neutral:/不易分心|不曾分心/},
 {id:'work',dim:null,positive:/按時.{0,3}(繳交|完成)作業/,negative:/遲交作業|不交作業|忘記交作業|作業未完成/,good:'能按時完成作業',goal:'養成按時完成作業的習慣'},
 {id:'peers',dim:null,positive:/與同學相處和睦|人際互動良好|待人和善/,negative:/與同學吵架|同儕衝突|常和同學爭執/,good:'與同學相處和睦',goal:'以平和方式與同學溝通'},
 {id:'personality',dim:null,positive:/有主見|有自己的想法|獨立思考/,good:'有自己的想法'},
 {id:'quiet',dim:null,positive:/個性內向|沉穩內斂|個性安靜|文靜|個性沉穩/,good:'個性沉靜'},
 {id:'confidence',dim:null,negative:/缺乏自信|不夠自信|需要.{0,4}自信|不敢表達|希望.{0,4}勇於表達/,positive:/勇於表達|有自信/,good:'能主動表達想法',goal:'逐步建立自信並勇於表達'},
 {id:'study',dim:null,negative:/讀書方法.{0,4}(不佳|需調整)|需要.{0,3}複習|成績退步|成績不好|成績需提升/,positive:/成績優秀|成績很好|學習成果亮眼|成績出色/,good:'學習成果亮眼',goal:'建立規律複習習慣'}
];
export function analyzeObservation(note='',scores=[]){
 const clauses=String(note).normalize('NFKC').split(/[，,。；;、\n！!]+|但是|但|然而|不過/).map(x=>x.trim()).filter(Boolean);
 const positives=[],goals=[],unknown=[],conflicts=[];
 for(const clause of clauses){let found=false;for(const r of observations){
  const neg=r.negative?.test(clause)&&!r.neutral?.test(clause)&&!(r.id==='punctual'&&r.positive?.test(clause));
  const pos=r.positive?.test(clause)&&!neg&&!/(?:不|未|沒有|缺乏|無法|難以|需要|希望能).{0,3}(?:主動|熱心|專注|有禮|誠實|遵守|勇於)/.test(clause);
  if(neg&&r.goal){goals.push(r.goal);found=true;if(r.dim!==null&&scores[r.dim]===5)conflicts.push('補充觀察與'+dims[r.dim]+'滿分並存，請核對。');}
  else if(pos&&r.good){positives.push(r.good);found=true;if(r.dim!==null&&scores[r.dim]<=2&&scores[r.dim]>=1)conflicts.push('補充觀察與'+dims[r.dim]+'低分並存，請核對。');}
  else if(r.neutral?.test(clause))found=true;
 }if(!found)unknown.push(clause);}
 return {positives:[...new Set(positives)],goals:[...new Set(goals)],unknown,conflicts:[...new Set(conflicts)]};
}

const positive=[['日常生活表現成熟穩定','生活常規良好'],['主動維護環境整潔','能維持環境整潔'],['待人有禮且應對得宜','待人有禮'],['熱心投入班級事務','能盡責參與班級事務'],['待人誠懇且言行一致','待人誠懇'],['具備良好自我管理能力','能配合生活常規']];
const goals=['建立穩定的生活常規','主動維持環境整潔','精進人際應對方式','更主動參與班級事務','重視言行一致','培養自我管理習慣'];
export function draft(scores,note='',history=[],profile={preferred:[]}){if(!complete(scores))return '';const rank=scores.map((v,i)=>({v,i})).sort((a,b)=>b.v-a.v);const positives=rank.filter(x=>x.v>=4);const observation=analyzeObservation(note,scores);const goal=observation.goals[0]||(scores.every(v=>v===5)?'持續發揮優良表現':goals[rank[5].i]);const goalOptions=observation.goals.length||!history.length?[goal]:[...new Set([goal,...(scores.every(v=>v===5)?['持續發揮所長','延續良好的生活習慣']:rank.filter(x=>x.v===rank[5].v).map(x=>goals[x.i]))])];const ranked=positives.map(x=>positive[x.i][x.v===5?0:1]);const starters=[...new Set([...observation.positives,...ranked])];if(!starters.length)starters.push('日常生活仍有成長空間',...(history.length?['生活常規仍可逐步穩定','日常表現尚有成長空間']:[]));const endings=['日常表現將更臻成熟穩定','相信能逐步累積更穩定的表現','將有助於日常生活更加穩定','期待持續培養良好的生活習慣'];const lead=[...new Set([...(profile.preferred||[]).map(w=>({'希望':'希望能','期待':'期待能','期許':'期許能','若能':'若能','若能更':'若能'})[w]).filter(Boolean),'若能','期待能','希望能'])];const candidates=[];for(const a of observation.positives.length?observation.positives:starters)for(const b of [...starters.filter(x=>x!==a),'期待持續累積生活經驗','期盼在日常生活中逐步累積成長經驗'])for(const g of goalOptions)for(const l of lead)for(const e of endings){const s=`${a}，${b}，${l}${g}，${e}。`;if(length(s)>=42&&length(s)<=50)candidates.push(s);}const hf=history.map(features);let best='',risk=Infinity,fit=-Infinity;const styled=Boolean(profile.model?.total||profile.preferred?.length);for(const candidate of new Set(candidates)){const cf=features(candidate);let max=0;for(const h of hf){max=Math.max(max,compare(cf,h));if(max>risk)break;}if(max>risk)continue;const f=styled?styleFit(candidate,profile):0;if(max<risk||(max===risk&&f>fit)){best=candidate;risk=max;fit=f;}if(risk===0&&!styled)break;}if(best)return best;for(const a of starters)for(const e of ['期待日常生活表現更加穩定成熟','期待在團體生活中持續累積成長經驗','相信能逐步培養更穩定成熟的生活習慣','期待持續累積日常生活經驗與自我管理能力']){const s=`${a}，若能${goal}，${e}。`;if(length(s)>=42&&length(s)<=50)return s;}return note?draft(scores,'',history,profile):'日常生活各方面仍有成長空間，期待逐步建立穩定的生活習慣，持續累積自我管理與團體生活經驗。';}
export function parseRows(rows){if(!rows.length)return [];const header=rows[0].map(x=>String(x??'').trim());const find=(...keys)=>header.findIndex(x=>keys.includes(x));const ni=find('姓名','學生姓名','name'),si=find('座號','seat'),id=find('學號','studentId');const has=ni>=0;return (has?rows.slice(1):rows).filter(r=>r.some(x=>String(x??'').trim())).map((r,i)=>({id:crypto.randomUUID(),seat:String((has?r[si]:r.length>1?r[0]:i+1)??i+1).trim()||String(i+1),name:String((has?r[ni]:r.length>1?r[1]:r[0])??'').trim(),studentId:has?String(r[id]??''):'',scores:dims.map(d=>{const v=Number(r[header.indexOf(d)]);return v>=1&&v<=5&&Number.isInteger(v)?v:null}),note:'',comment:'',rated:false,confirmed:false})).filter(r=>r.name);}
