export const dims=['日常生活表現','整潔習慣','禮節','班級服務','待人誠信','自律自重'];
export const levels=['亟待改進','需再加油','表現尚可','表現良好','表現優良'];
export const length=s=>Array.from(s).length;
export const complete=s=>Array.isArray(s)&&s.length===6&&s.every(v=>Number.isInteger(v)&&v>=1&&v<=5);
export const average=s=>complete(s)?s.reduce((a,b)=>a+b,0)/6:null;
export const normalize=s=>s.normalize('NFKC').replace(/[\p{P}\p{Z}\s]/gu,'');
const grams=s=>new Set(Array.from({length:Math.max(0,s.length-1)},(_,i)=>s.slice(i,i+2)));const features=s=>{const n=normalize(s);return {n,g:grams(n)};};const compare=(a,b)=>{if(a.n===b.n)return 1;let shared=0;for(const v of a.g)if(b.g.has(v))shared++;return a.g.size+b.g.size?2*shared/(a.g.size+b.g.size):0;};export function similarity(a,b){return compare(features(a),features(b));}
export function validate(s,history=[]){const issues=[];if(length(s)<42||length(s)>50)issues.push('字數須為 42–50 字');if(/[\r\n\t\p{Cc}\p{Extended_Pictographic}]/u.test(s)||s.trim()!==s)issues.push('評語須為單段文字，不含表情符號或前後空白');if(/不認真|散漫|不守規矩|缺乏責任感|態度差|不自律|不合群|不夠用心|再加油|要努力|更認真|缺乏努力|不夠認真|理解力弱|學習能力不好|程度差|不積極|不用心|太自我|成績落後/.test(s))issues.push('含不宜使用的措辭');if(history.some(h=>normalize(h)===normalize(s)))issues.push('完整評語重複');else if(history.some(h=>similarity(h,s)>.78))issues.push('與既有評語高度相似，請核對');return issues;}

/** Train a local character trigram distribution. Counts stay in this browser. */
const trigrams=s=>{const n=normalize(String(s));return Array.from({length:Math.max(0,n.length-2)},(_,i)=>n.slice(i,i+3));};
export function trainStyle(samples){const counts=Object.create(null);let total=0;for(const s of new Set(samples.filter(Boolean))){for(const g of trigrams(s)){counts[g]=(counts[g]||0)+1;total++;}}return {counts,total};}
export function structureFeatures(s){const clauses=s.split(/[，；。！？]/).filter(Boolean);return {length:length(s),clauses:clauses.length,semicolon:s.includes('；'),address:/[妳你]/.test(s),expectation:/若能|期許|期待|希望/.test(s),opening:clauses[0]?.length||0};}
export function trainStructure(samples){const fs=samples.filter(Boolean).map(structureFeatures),n=fs.length;if(!n)return null;const mean=k=>fs.reduce((a,f)=>a+Number(f[k]),0)/n;return Object.fromEntries(['length','clauses','semicolon','address','expectation','opening'].map(k=>[k,mean(k)]));}
export function structureFit(candidate,model){if(!model)return 0;const f=structureFeatures(candidate);return 1-(Math.abs(f.length-model.length)/50+Math.abs(f.clauses-model.clauses)/6+Math.abs(Number(f.semicolon)-model.semicolon)+Math.abs(Number(f.address)-model.address)+Math.abs(Number(f.expectation)-model.expectation)+Math.abs(f.opening-model.opening)/40)/6;}
export function styleFit(candidate,profile){const m=profile.model,grams=trigrams(candidate);const learned=m?.total&&grams.length?grams.reduce((n,g)=>n+Math.log1p(m.counts[g]||0),0)/grams.length:0;const explicit=(profile.preferred||[]).slice(0,12).reduce((n,w,i)=>n+(candidate.includes(w)?(12-i)/12:0),0);return learned+explicit*.12+structureFit(candidate,profile.structure)*.35;}

export function styleProfile(samples){const text=samples.join(''),count=samples.length;const preferred=['期待','若能','期許','更臻','持續','穩定','成熟','和睦','調和','希望','相信','值得肯定','妳','若能更','更有成效','有助於','善用','逐步','發揮所長','更進一步','盡責','主動'].map(word=>({word,count:text.split(word).length-1})).filter(x=>x.count).sort((a,b)=>b.count-a.count).map(x=>x.word);return {count,preferred,model:trainStyle(samples),structure:trainStructure(samples),examples:samples.slice(-12),features:{averageLength:count?Math.round(samples.reduce((a,b)=>a+length(b),0)/count):0,punctuation:Object.fromEntries(['，','；','。','！','「'].map(c=>[c,text.split(c).length-1])),usesDirectAddress:samples.filter(s=>s.includes('妳')||s.includes('你')).length,usesExpectation:samples.filter(s=>/若能|希望|期待|期許/.test(s)).length}};}

/** Local, explicitly bounded observation parser. No inference about motivation. */
const observations=[
 {id:'assignmentCare',dim:null,positive:/作業.{0,3}(用心|仔細|完整)|訂正.{0,3}(認真|確實)/,good:'能仔細完成學習任務'},
 {id:'discussion',dim:null,positive:/積極參與討論|主動參與討論|踴躍發言/,negative:/很少參與討論|不敢發言/,good:'樂於參與討論',goal:'逐步練習表達想法'},
 {id:'materials',dim:5,negative:/忘記帶.{0,6}(課本|用品|作業)|忘帶.{0,6}(課本|用品|作業)/,goal:'養成事前整理用品的習慣'},
 {id:'duties',dim:3,positive:/主動完成.{0,5}(公務|值日|分內工作)|值日.{0,4}(認真|負責)/,good:'能主動完成分內工作'},
 {id:'attendance',dim:5,negative:/未報備.{0,5}(離開|離校)|翹課|無故缺課/,goal:'落實出缺席與報備規範'},
 {id:'listeningPositive',dim:null,positive:/善於傾聽|願意聽取.{0,4}意見|尊重.{0,4}不同意見/,good:'願意傾聽不同意見'},

 {id:'leadership',dim:null,positive:/有領導能力|具領導能力|善於領導|帶領團隊|帶領同學/,good:'具備領導能力'},
 {id:'listening',dim:null,negative:/過於堅持己見|太堅持己見|不聽.{0,4}意見|忽略.{0,8}感受|不願聽取/,goal:'多傾聽他人的想法'},
 {id:'atmosphere',dim:null,positive:/帶動團體氣氛|帶動班級氣氛|活絡班級氣氛/,good:'能帶動團體氣氛'},
 {id:'persistence',dim:null,negative:/遇到挫折.{0,5}放棄|遇挫折.{0,5}放棄|遇困難.{0,5}放棄|容易放棄/,goal:'遇到困難時持續嘗試'},
 {id:'progress',dim:null,positive:/(近期|最近|近來|逐漸|本學期).{0,8}(明顯進步|有所進步|已有改善|表現改善|更加穩定)/,good:'近期表現已有進步'},
 {id:'initiative',dim:null,negative:/缺乏主動性|需要提醒才.{0,5}完成|較少主動表達/,goal:'逐步培養主動行動的習慣'},
 {id:'planning',dim:null,negative:/時間管理不佳|時間安排不當|拖延|做事缺乏規劃/,goal:'妥善規劃時間與工作'},
 {id:'teamwork',dim:null,positive:/善於合作|團隊合作良好|樂於合作/,negative:/不願合作|難以合作/,good:'樂於與人合作',goal:'練習與同伴協調合作'},

 {id:'punctualImproved',dim:5,positive:/不再遲到|守時情形已有改善|遲到情形已有改善/,good:'守時情形已有改善'},
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
// Match the evidence locally; a negated or merely proposed strength is not an observed strength.
function allowedPositive(clause,re){
 const m=re?.exec(clause);if(!m)return false;
 const before=clause.slice(0,m.index),near=before.slice(-10);
 if(/(?:沒|沒有|未|不|缺乏|無法|難以|很少|不太|尚未|不具備|不擅長|無意|不願意).{0,4}$/.test(near))return false;
 if(/(?:希望|期待|期許|建議|應該|需要|若能|如果能|可再|有待).{0,8}$/.test(near))return false;
 return true;
}
function allowedNegative(clause,re){
 const m=re?.exec(clause);if(!m)return false;
 return !/(?:沒有|未曾|從未|不曾|不再|沒有再|很少|並未).{0,5}$/.test(clause.slice(0,m.index));
}
export function analyzeObservation(note='',scores=[],custom=[]){
 const clauses=String(note).normalize('NFKC').split(/[，,。；;、\n！!]+|但是|但|然而|不過/).map(x=>x.trim()).filter(Boolean);
 const positives=[],goals=[],unknown=[],conflicts=[],goalDims=new Set(),positiveDims=new Set();
 for(const clause of clauses){
  // Old events alone do not establish a current behavior; keep them visible for manual review.
  if(/過去|以前|曾經|原本|一開始/.test(clause)&&!/(?:目前|現在|仍然|依然|本學期|近期|最近|近來)/.test(clause)){unknown.push(clause);continue;}
  let found=false;for(const r of observations){
  const neg=allowedNegative(clause,r.negative)&&!r.neutral?.test(clause)&&!/(?:不再|已不再|不曾|從未|沒有再).{0,8}(?:放棄|遲到|拖延|分心|違規|說謊)/.test(clause)&&!(r.id==='punctual'&&r.positive?.test(clause));
  const pos=allowedPositive(clause,r.positive)&&!neg&&!/(?:不|未|沒有|缺乏|無法|難以|需要|希望能).{0,3}(?:主動|熱心|專注|有禮|誠實|遵守|勇於)/.test(clause);
  if(neg&&r.goal){goals.push(r.goal);if(r.dim!==null)goalDims.add(r.dim);found=true;if(r.dim!==null&&scores[r.dim]===5)conflicts.push('補充觀察與'+dims[r.dim]+'滿分並存，請核對。');}
  else if(pos&&r.good){positives.push(r.good);if(r.dim!==null)positiveDims.add(r.dim);found=true;if(r.dim!==null&&scores[r.dim]<=2&&scores[r.dim]>=1)conflicts.push('補充觀察與'+dims[r.dim]+'低分並存，請核對。');}
  else if(r.neutral?.test(clause))found=true;
 }for(const r of custom.filter(validSemanticRule).sort((a,b)=>(b.priority||0)-(a.priority||0))){if(r.enabled===false)continue;
  const dim=Number.isInteger(r.dim)?r.dim:null;
  if(dim!==null&&r.grades?.length&&!r.grades.includes(scores[dim]))continue;
  if((r.exclusions||[]).some(k=>clause.includes(k)))continue;
  for(const k of r.keywords.slice().sort((a,b)=>b.length-a.length)){const at=clause.indexOf(k);if(at<0)continue;const before=clause.slice(0,at);
   if(/(?:沒有|不曾|不再|未曾|希望|期待|期許|建議|若能|不|未).{0,6}$/.test(before))continue;
   (r.kind==='positive'?positives:goals).push(r.phrase);if(dim!==null)(r.kind==='positive'?positiveDims:goalDims).add(dim);found=true;break;
  }
 }if(!found)unknown.push(clause);}
 return {positives:[...new Set(positives)],goals:[...new Set(goals)],unknown,conflicts:[...new Set([...conflicts,...[...goalDims].filter(i=>positiveDims.has(i)).map(i=>'同一向度有肯定與成長觀察：'+dims[i]+'，保留具體事實並核對。')])],goalDims:[...goalDims],positiveDims:[...positiveDims]};
}

const positive=[['日常生活表現成熟穩定','生活常規良好'],['主動維護環境整潔','能維持環境整潔'],['待人有禮且應對得宜','待人有禮'],['熱心投入班級事務','能盡責參與班級事務'],['待人誠懇且言行一致','待人誠懇'],['具備良好自我管理能力','能配合生活常規']];
const goals=['建立穩定的生活常規','主動維持環境整潔','精進人際應對方式','更主動參與班級事務','重視言行一致','培養自我管理習慣'];

/** Five-level, evidence-constrained local generation. Rows follow dims; columns are 1–5. */
export const gradeGuidance=[
 ['逐步建立基本生活常規','練習穩定的生活安排','鞏固日常生活常規','延續良好的生活習慣','持續發揮成熟表現'],
 ['逐步建立整理習慣','主動完成整潔工作','養成主動整理的習慣','延續良好整潔習慣','持續維護整潔環境'],
 ['練習有禮的應對方式','培養合宜的應對方式','精進人際應對方式','持續維持有禮的態度','延續良好的應對表現'],
 ['逐步參與班級事務','更主動參與班級事務','增進班級服務的主動性','持續參與班級事務','持續發揮服務精神'],
 ['逐步建立言行一致的習慣','重視言行一致','持續培養誠信習慣','延續誠懇的待人態度','持續展現誠信態度'],
 ['逐步建立自我管理習慣','培養自我管理習慣','提升自我管理的穩定度','延續良好的自我管理','持續發揮自律表現']
];
const goalAlternatives=[
 ['從日常安排建立基本常規','循序培養生活規律','按步建立生活秩序'],
 ['從每日整理培養整潔習慣','練習確實完成整潔工作','循序養成整理習慣'],
 ['從日常互動練習合宜應對','逐步練習尊重他人','培養平和有禮的互動'],
 ['從分內工作開始參與服務','循序培養班級服務習慣','練習承擔班級分內事務'],
 ['練習履行承諾並重視誠信','從日常言行培養誠信','逐步培養負責的言行'],
 ['從時間安排練習自我管理','逐步落實生活規範','循序培養自律習慣']
];
const endings=['日常表現將更臻成熟穩定','相信能逐步累積更穩定的表現','將有助於日常生活更加穩定','期待持續培養良好的生活習慣','在團體生活中逐步累積成長經驗','讓生活表現更具穩定性','將有助於建立更穩定的生活常規'];
const development=['日常生活可從具體小事累積經驗','團體生活提供許多練習的機會','日常作息與團體互動可逐步練習','從每天的生活安排著手較易持續'];
const maintenance=['在日常生活中展現良好的態度','能維持值得肯定的生活表現','日常生活態度值得肯定'];
export function draft(scores,note='',history=[],profile={preferred:[]}){
 if(!complete(scores))return '';
 const rank=scores.map((v,i)=>({v,i})).sort((a,b)=>b.v-a.v||a.i-b.i),low=Math.min(...scores),allStrong=low>=4;
 const observation=analyzeObservation(note,scores,profile.semanticRules||[]),specific=observation.positives,targets=observation.goals;
 const ranked=rank.filter(x=>x.v>=4&&!observation.goalDims.includes(x.i)).map(x=>positive[x.i][x.v===5?0:1]);
 const base=low===3?'日常表現大致符合基本常規':'日常生活可從具體小事逐步累積';
 const neutral=[base,'日常生活中仍有發展的機會','可從日常生活累積穩定表現'];
 const starters=[...new Set([...specific,...ranked,...(!specific.length&&!ranked.length?neutral:[])])];
 const weakest=rank.filter(x=>x.v===low);
 let gs=targets.length?[...targets]:weakest.map(x=>gradeGuidance[x.i][low-1]);
 if(!targets.length&&history.length&&low<=3)gs.push(...weakest.flatMap(x=>goalAlternatives[x.i]));
 if(!targets.length&&allStrong)gs.push('持續發揮所長','延續良好的生活習慣');
 if(targets.length>1)gs.unshift(targets.slice(0,2).join('並'));
 gs=[...new Set(gs)];
 const leads=[...new Set([...(profile.preferred||[]).map(w=>({'希望':'希望能','期待':'期待能','期許':'期許能','若能':'若能','若能更':'若能'})[w]).filter(Boolean),'若能','期待能','希望能','期許能','建議'])];
 const hf=history.map(features),styled=Boolean(profile.model?.total||profile.preferred?.length||profile.structure);
 let best='',bestKey=null;
 const considered=new Set(),maxPossible=specific.length+targets.length;
 const better=(a,b)=>!b||a.some((v,i)=>v!==b[i]&&a.slice(0,i).every((x,j)=>x===b[j])&&v>b[i]);
 const consider=s=>{
  const n=length(s);if(n<42||n>50||considered.has(s)||validate(s,[]).length)return false;considered.add(s);
  const coverage=[...specific,...targets].filter(x=>s.includes(x)).length;
  const cf=features(s);let risk=0;for(const h of hf){risk=Math.max(risk,compare(cf,h));if(risk===1)break;}
  const natural=naturalQuality(s);const key=[risk<1?1:0,coverage,risk<=.78?1:0,natural,history.length?-risk:0,n>=46?1:0,styled?styleFit(s,profile):0,-Math.abs(48-n)];
  if(better(key,bestKey)){best=s;bestKey=key;}
  return !history.length&&!styled&&coverage===maxPossible&&n>=46&&natural>=4;
 };
 const first=specific.length?specific:starters;
 const follow=[...new Set([...starters,...(allStrong&&!targets.length?maintenance:development)])];
 outer:for(const a of first)for(const b of follow){if(a===b)continue;for(const g of gs)for(const l of leads)for(const e of endings){
  if(consider(a+'，'+b+'，'+l+g+'，'+e+'。'))break outer;
  if(consider(a+'，'+b+'。'+l+g+'，'+e+'。'))break outer;
  if(profile.structure?.semicolon>.25&&consider(a+'，'+b+'；'+l+g+'，'+e+'。'))break outer;
 }}
 if(!best||bestKey[1]<maxPossible||bestKey[0]===0||bestKey[2]===0){
  for(const a of first)for(const b of follow)for(const g of gs)for(const l of leads){
   if(a===b)continue;consider(a+'，'+b+'，'+l+g+'。');
   for(const e of endings)consider(a+'，'+l+g+'，'+e+'。');
  }
 }
 if(best)return best;
 return '日常生活各方面仍有成長空間，期待逐步建立穩定的生活習慣，持續累積自我管理與團體生活經驗。';
}
export function parseRows(rows){if(!rows.length)return [];const header=rows[0].map(x=>String(x??'').trim());const find=(...keys)=>header.findIndex(x=>keys.includes(x));const ni=find('姓名','學生姓名','name'),si=find('座號','seat'),id=find('學號','studentId');const has=ni>=0;return (has?rows.slice(1):rows).filter(r=>r.some(x=>String(x??'').trim())).map((r,i)=>({id:crypto.randomUUID(),seat:String((has?r[si]:r.length>1?r[0]:i+1)??i+1).trim()||String(i+1),name:String((has?r[ni]:r.length>1?r[1]:r[0])??'').trim(),studentId:has?String(r[id]??''):'',scores:dims.map(d=>{const v=Number(r[header.indexOf(d)]);return v>=1&&v<=5&&Number.isInteger(v)?v:null}),note:'',comment:'',rated:false,confirmed:false})).filter(r=>r.name);}

/** Alternative drafts retain the same observation and rating constraints. */
export function alternativeDrafts(scores,note='',history=[],profile={},current='',limit=3){
 if(!complete(scores))return [];
 const excluded=[...history,...(current?[current]:[])],out=[];
 for(let i=0;i<Math.min(12,limit*3)&&out.length<limit;i++){
  const candidate=draft(scores,note,[...excluded,...out],profile);
  if(!candidate||excluded.includes(candidate)||out.includes(candidate))break;
  if(!validate(candidate,[...history,...out,...(current?[current]:[])]).length)out.push(candidate);
  else excluded.push(candidate);
 }
 return out;
}

/** Advisory coverage check. Never infer facts from a missing phrase. */
export function observationCoverage(note,scores,comment,custom=[]){
 const o=analyzeObservation(note,scores,custom);
 const strengths=o.positives.filter(p=>!comment.includes(p));
 const goals=o.goals.filter(p=>!comment.includes(p));
 return {recognized:o.positives.length+o.goals.length,missingStrengths:strengths,missingGoals:goals,unknown:o.unknown.length};
}

export const builtinSemanticTopics=observations.map(r=>r.good||r.goal).filter(Boolean);
export function validSemanticRule(r){return !!r&&typeof r.topic==='string'&&r.topic.trim().length>0&&r.topic.length<=50&&Array.isArray(r.keywords)&&r.keywords.length>0&&r.keywords.length<=20&&r.keywords.every(k=>typeof k==='string'&&k.trim()&&k.length<=30)&&['positive','goal'].includes(r.kind)&&(r.dim===undefined||r.dim===null||Number.isInteger(r.dim)&&r.dim>=0&&r.dim<6)&&(r.grades===undefined||Array.isArray(r.grades)&&r.grades.every(v=>Number.isInteger(v)&&v>=1&&v<=5))&&(r.priority===undefined||Number.isInteger(r.priority)&&r.priority>=0&&r.priority<=9)&&(r.exclusions===undefined||Array.isArray(r.exclusions)&&r.exclusions.length<=20&&r.exclusions.every(k=>typeof k==='string'&&k.trim()&&k.length<=30))&&typeof r.phrase==='string'&&length(r.phrase)>=3&&length(r.phrase)<=16&&!/[\r\n，。；！？]/.test(r.phrase)&&!validate(r.phrase.padEnd(42,'字'),[]).length;}

/** Explainable rhythm score, not an AI detector or objective measure of human writing. */
export function naturalQuality(s){
 const marker=/若能|期待能|希望能|期許能|建議/;
 const i=s.search(marker),head=i<0?s:s.slice(0,i),tail=i<0?'':s.slice(i);
 let n=0;if(i>=8)n+=2;if(!/若能|期待|希望|期許|建議/.test(head))n++;
 if((tail.match(/若能|期待|希望|期許|建議/g)||[]).length===1)n++;
 if(!/持續持續|逐步逐步|更加更|習慣.*習慣.*習慣|生活.*生活.*生活.*生活/.test(s))n++;
 if(/更臻成熟穩定|更具穩定性|累積成長經驗/.test(s))n--;
 if(/[，；]能[^，；。]{2,12}[，；]能/.test(s))n--;
 return n;
}
