import {dims,complete,length,validate,similarity,styleFit,gradeGuidance,analyzeObservation,builtinSemanticRules,validSemanticRule,draft} from './engine.mjs';
export const NLG_VERSION='1.0.2';

// Only these rated descriptions may be inferred from a score. No invented incident.
const gradePraise=[
 [[],[],['日常生活大致有序','能配合基本生活常規'],['日常生活表現良好','能維持良好的生活常規'],['日常生活表現成熟穩定','生活常規表現值得肯定']],
 [[],[],['大致能維持周遭整潔','整潔習慣已有基本表現'],['能維持周遭環境整潔','整潔習慣良好'],['主動維護環境整潔','整潔習慣值得肯定']],
 [[],[],['與人應對大致合宜','大致能維持基本禮節'],['待人有禮','與人應對合宜'],['待人有禮且應對得宜','言談應對得體']],
 [[],[],['大致能配合班級事務','班級服務已有基本表現'],['能盡責參與班級事務','班級服務態度良好'],['熱心投入班級事務','對班級事務熱心盡責']],
 [[],[],['待人誠信大致合宜','日常言行大致合宜'],['待人誠懇','能重視誠信'],['待人誠懇且言行一致','言行誠懇值得肯定']],
 [[],[],['大致能配合團體規範','自我管理已有基本表現'],['能配合團體生活規範','日常自律表現良好'],['具備良好自我管理能力','能自律並配合團體規範']]
];
const neutral=['日常生活中的每次練習都是成長的機會','日常生活可從具體小事逐步累積','生活中的每次練習都值得重視','團體生活提供許多練習的機會','日常生活是培養良好習慣的起點'];
const extension=[
 ['從每日生活安排著手','使日常生活更有條理','讓生活步調更加從容','讓每一天的生活更加有序'],
 ['從每日整理做起','讓周遭環境更加舒適','讓良好習慣落實在日常生活中','與同學共同維護舒適的環境'],
 ['從日常相處中的小事著手','讓彼此相處更加融洽','讓自己的想法更容易被理解','使團體互動更加和諧'],
 ['從分內工作開始練習','為班級生活多盡一份心力','讓團體工作進行得更順利','在團體中發揮自己的力量'],
 ['從日常言行逐步落實','在相處中建立彼此的信任','讓言行更值得信賴','使彼此的信任更加穩固'],
 ['從每日應辦事項著手','讓日常生活安排更有條理','使自己的生活步調更加穩定','逐步養成適合自己的好習慣']
];
const continuation=['讓這份用心延續在日常生活中','在團體生活中繼續發揮所長','讓良好的生活態度持續展現','將這份用心融入日常生活','相信能在團體生活中持續展現所長'];
const genericOutcome=['在日常生活中慢慢累積更穩定的表現','讓良好的生活習慣一步步落實在日常生活中','讓日常表現更加穩定','在日常生活中逐步落實','從每天的小事開始練習','讓良好的習慣逐步養成'];
const maintenanceGoals=['延續良好的生活習慣','持續維護環境整潔','延續有禮的待人態度','持續發揮服務精神','持續展現誠信態度','延續良好的自我管理'];
const unique=a=>[...new Set(a)];
const dimensionOf=s=>dims.indexOf(s);
const clauses=note=>String(note??'').normalize('NFKC').split(/[，,。；;、\n！!]+|但是|但|然而|不過|而且|並且|(?=現在|目前|近期|最近)/).map(s=>s.trim()).filter(Boolean);
const frequency=s=>/經常|常常|屢次|反覆|多次|總是|每次/.test(s)?'反覆':/偶爾|有時|偶有|不時/.test(s)?'偶發':'未明';
const timeState=s=>/不再|已有改善|已改善|有所改善|明顯改善|已有進步|明顯進步/.test(s)?'改善':/現在|目前|仍然|依然|近期|最近|本學期/.test(s)?'近期':'未明';
const strengthOf=(phrase,kind,raw,rules,idx)=>{
 const matches=rules.filter(r=>kind==='strength'?(r.strength===phrase||r.progress===phrase):r.goal===phrase);
 const matched=matches[0],dim=matched?dimensionOf(matched.dimension):-1;
 return {id:matched?.id||'observation-'+idx,kind,phrase,dim,source:'觀察',evidence:raw.join('；'),frequency:frequency(raw.join('；')),time:timeState(raw.join('；')),priority:Math.max(...matches.map(r=>r.priority||0),0)};
};

// 1. Evidence extraction and 2. concept mapping. Global parser is authoritative;
// clause-local matches provide provenance, never introduce rejected claims.
export function extractEvidence(scores,note='',profile={}){
 if(!complete(scores))return {complete:false,strengths:[],goals:[],unknown:[],conflicts:[],goalDims:[]};
 const custom=(profile.semanticRules||[]).filter(validSemanticRule).filter(r=>r.enabled!==false);
 const rules=[...builtinSemanticRules,...custom.map((r,i)=>({id:'custom-'+i,dimension:dims[r.dim]||'不限向度',strength:r.kind==='positive'?r.phrase:'',goal:r.kind==='goal'?r.phrase:'',priority:r.priority||0}))];
 const o=analyzeObservation(note,scores,custom),parts=clauses(note).map(raw=>({raw,parsed:analyzeObservation(raw,scores,custom)}));
 const map=(phrase,kind,i)=>strengthOf(phrase,kind,parts.filter(p=>(kind==='strength'?p.parsed.positives:p.parsed.goals).includes(phrase)).map(p=>p.raw),rules,i);
 return {complete:true,strengths:o.positives.map((p,i)=>map(p,'strength',i)),goals:o.goals.map((p,i)=>map(p,'goal',i)),unknown:o.unknown,conflicts:o.conflicts,goalDims:o.goalDims};
}

const evidenceWeight=e=>100+e.priority*3+(e.frequency==='反覆'?12:e.frequency==='偶發'?-4:0)+(e.time==='改善'?8:0);
const sortEvidence=(a,b)=>evidenceWeight(b)-evidenceWeight(a)||a.phrase.localeCompare(b.phrase,'zh-Hant');
// 3. Student profile and 4. educational decisions. Explicit goals beat generic score goals.
export function planComment(scores,note='',profile={}){
 const evidence=extractEvidence(scores,note,profile);
 if(!evidence.complete)return {evidence,strengths:[],goals:[],focus:'評分未完成'};
 const rank=scores.map((v,dim)=>({v,dim})).sort((a,b)=>b.v-a.v||a.dim-b.dim),low=Math.min(...scores);
 const observed=[...evidence.strengths].sort(sortEvidence),observedGoals=[...evidence.goals].sort(sortEvidence);
 // Cross-dimension overlap: punctuality/attendance and daily routine both
 // support broad life-routine praise. Preserve specific observed strengths.
 const blocked=new Set(evidence.goalDims);
 for(const g of observedGoals){
  if(g.dim===5&&/守時|出缺席|報備|生活規範|自我管理|事前準備|生活常規/.test(g.phrase))blocked.add(0);
  if(g.dim===0&&/守時|集合|回座|事前準備|生活常規/.test(g.phrase))blocked.add(5);
 }
 const allowed=rank.filter(x=>x.v>=3&&!blocked.has(x.dim));
 const high=allowed.filter(x=>x.v>=4),pool=high.length?high:allowed;
 const strengths=[...observed,...pool.flatMap(({v,dim})=>gradePraise[dim][v-1].map(phrase=>({id:'grade-'+dim,kind:'strength',phrase,dim,source:'等第',grade:v})))];
 if(!strengths.length)strengths.push(...neutral.map(phrase=>({id:'neutral',kind:'strength',phrase,dim:-1,source:'中性'})));
 const mode=observedGoals.length?'具體成長':low>=4?'延續優勢':'等第成長';
 const goals=observedGoals.length?observedGoals:rank.filter(x=>x.v===low).map(({v,dim})=>({id:'grade-goal-'+dim,kind:'goal',phrase:mode==='延續優勢'?maintenanceGoals[dim]:gradeGuidance[dim][v-1],dim,source:'等第',grade:v}));
 return {evidence,focus:mode,strengths,goals,observed,observedGoals,low,blockedGradeDimensions:[...blocked]};
}
const starts=/^(?:若能|期待能|希望能|期許能|建議|也盼|盼能)/;
const leadList=profile=>unique([...(profile.preferred||[]).map(w=>({'若能':'若能','希望':'希望能','期許':'期許能','期待':'期待能'})[w]).filter(Boolean),'若能','期待能','希望能','期許能','盼能','也盼']);
function outcomes(goal,focus){
 if(focus==='延續優勢')return continuation;
 const g=goal.phrase;
 if(/守時|時間|作息/.test(g))return ['讓每天的作息安排更從容','讓時間的安排更有條理，也能從容參與各項活動','使日常生活安排更加有序','讓每天到校與各項活動的安排更加從容','從每日作息著手，逐步建立時間觀念',...genericOutcome];
 if(/專注|複習|作業|學習|請教|求助|嘗試/.test(g))return ['讓學習過程更加扎實','使自己的學習步調更加穩定','從每日學習中的小事著手，培養穩定的學習步調',...genericOutcome];
 if(/歸還|承諾|約定|據實|誠信/.test(g))return extension[4];
 if(/傾聽|溝通|應對|尊重|語氣|表達|感受/.test(g))return extension[2];
 return goal.dim>=0?[...extension[goal.dim],...genericOutcome]:genericOutcome;
}
function distinct(a,b){return a.phrase!==b.phrase&&a.id!==b.id&&(a.dim!==b.dim||a.dim<0||a.source==='觀察'&&b.source==='觀察')&&similarity(a.phrase,b.phrase)<=.52;}
const splitText=s=>s.split(/[，；。！？]/).filter(Boolean);
const repeatedWord=s=>/(日常生活|生活常規|團體生活|穩定|習慣|所長|逐步|良好|成熟).{0,18}\1/.test(s);
function riskAgainst(s,history){
 let max=0;for(const h of history){max=Math.max(max,similarity(s,h));if(max>.78)break;}return max;
}
function diversityIndex(history){
 const openings=new Map(),endings=new Map(),shapes=new Map();
 for(const s of history){const parts=splitText(s),open=parts[0],end=parts.at(-1),shape=(s.match(/[，；。！？]/g)||[]).join('');
  for(const [map,key] of [[openings,open],[endings,end],[shapes,shape]])map.set(key,(map.get(key)||0)+1);
 }return {openings,endings,shapes};
}
// 5. Microplanning and 6. linguistic realization. Slots are typed, not shuffled strings.
// Bounded pool is deterministic and only combines evidence-approved phrases.
function realize(plan,profile){
 const {strengths,goals,observed,observedGoals,focus}=plan,leads=leadList(profile),out=new Map();
 const first=(observed.length?observed:strengths).slice(0,14),second=strengths.slice(0,18),goalsToUse=goals.slice(0,8);
 const goalGroups=goalsToUse.map(g=>[g]);
 for(let i=0;i<Math.min(observedGoals.length,5);i++)for(let j=i+1;j<Math.min(observedGoals.length,5);j++){
  if(observedGoals[i].id!==observedGoals[j].id&&similarity(observedGoals[i].phrase,observedGoals[j].phrase)<.6)goalGroups.unshift([observedGoals[i],observedGoals[j]]);
 }
 const add=(text,ss,gg,form)=>{
  const n=length(text);if(n<42||n>50||out.has(text))return;
  if(validate(text,[]).length||starts.test(text))return;
  out.set(text,{text,ss,gg,form,n});
 };
 for(const a of first)for(const gg of goalGroups){
  const g=gg.map(x=>x.phrase).join('並'),ends=gg.length>1&&gg[0].dim!==gg[1].dim?['讓日常生活更有條理','讓這些好習慣逐步落實在生活中','從每日生活中的小事逐步做起']:outcomes(gg[0],focus);
  for(const l of leads){
   for(const end of ends){
    add(a.phrase+'，'+l+g+'，'+end+'。',[a],gg,'肯定－期許－結果');
    add(a.phrase+'。'+l+g+'，'+end+'。',[a],gg,'雙句銜接');
    add(a.phrase+'；'+l+g+'，'+end+'。',[a],gg,'分號銜接');
   }
   for(const b of second){if(!distinct(a,b))continue;
    const head=a.phrase+'，'+b.phrase;
    add(head+'；'+l+g+'。',[a,b],gg,'雙肯定－期許');
    add(head+'。'+l+g+'。',[a,b],gg,'雙肯定－雙句');
    for(const end of ends){
     add(head+'，'+l+g+'，'+end+'。',[a,b],gg,'雙肯定－期許－結果');
     add(head+'；'+l+g+'，'+end+'。',[a,b],gg,'雙肯定－分號期許');
    }
   }
  }
 }
 return [...out.values()];
}
// 7. Automatic quality ranking. Evidence coverage dominates surface style.
// History wording is used only to assess similarity, never as evidence for a new student.
function rankCandidate(c,plan,profile,div){
 const covered=[...plan.observed,...plan.observedGoals].filter(e=>[...c.ss,...c.gg].some(x=>x.kind===e.kind&&x.phrase===e.phrase));
 const coverage=covered.length,priority=covered.reduce((n,e)=>n+evidenceWeight(e),0);
 const parts=splitText(c.text),shape=(c.text.match(/[，；。！？]/g)||[]).join('');
 const diversity=-(div.openings.get(parts[0])||0)*2-(div.endings.get(parts.at(-1))||0)*1.5-(div.shapes.get(shape)||0)*.12;
 const natural=3-(repeatedWord(c.text)?2:0)-(parts.some(p=>length(p)>27)?1:0)+(c.form.includes('雙句')||c.form.includes('分號') ? .2 : 0)-(plan.focus==='延續優勢'&&/若能/.test(c.text)?1.1:0)-(c.gg.length>1&&/習慣並.{0,10}習慣/.test(c.text)?1:0);
 const strength=c.ss.reduce((n,x)=>n+(x.source==='觀察'?4:x.source==='等第'?x.grade-2:0),0);
 const goalImportance=c.gg.reduce((n,x)=>n+(x.source==='觀察'?evidenceWeight(x)/100:6-(x.grade||4)),0);
 const style=profile.model?.total||profile.structure||profile.preferred?.length?styleFit(c.text,profile):0;
 const score=natural*3+strength+goalImportance+diversity+style*2-Math.abs(c.n-46)*.3;
 return {...c,coverage,priority,natural,diversity,style,score};
}
function explain(text,plan,source,ranked,history,profile){
 const chosenStrengths=(ranked?ranked.ss:plan.strengths.filter(e=>text.includes(e.phrase))).map(e=>({phrase:e.phrase,source:e.source,dimension:dims[e.dim]||'補充觀察'}));
 const chosenGoals=(ranked?ranked.gg:plan.goals.filter(e=>text.includes(e.phrase))).map(e=>({phrase:e.phrase,source:e.source,dimension:dims[e.dim]||'補充觀察',frequency:e.frequency||'未明'}));
 const missingStrengths=plan.observed.filter(e=>!chosenStrengths.some(x=>x.phrase===e.phrase)).map(e=>e.phrase),missingGoals=plan.observedGoals.filter(e=>!chosenGoals.some(x=>x.phrase===e.phrase)).map(e=>e.phrase);
 return {comment:text,source,characters:length(text),plan,chosenStrengths,chosenGoals,coverage:{recognized:plan.observed.length+plan.observedGoals.length,missingStrengths,missingGoals,unknown:plan.evidence.unknown.length},issues:validate(text,history),quality:{form:ranked?.form||'相容生成',natural:ranked?.natural??null,diversity:ranked?.diversity??null,style:ranked?.style??null}};
}
// 8. Teacher-style adaptation is driven by existing approved profile and feedback.
// Compatibility engine is retained for exceptional coverage or a saturated history.
export function deepGenerate(scores,note='',history=[],profile={}){
 const plan=planComment(scores,note,profile);
 if(!plan.evidence.complete)return {comment:'',source:'incomplete',characters:0,plan,chosenStrengths:[],chosenGoals:[],issues:['評分未完成'],coverage:{recognized:0,missingStrengths:[],missingGoals:[],unknown:0},quality:{}};
 const div=diversityIndex(history);
 const candidates=realize(plan,profile).map(c=>rankCandidate(c,plan,profile,div)).sort((a,b)=>b.coverage-a.coverage||b.priority-a.priority||b.score-a.score);
 let chosen,ranked;
 // Search ranked candidates; avoid excessive history comparisons, with fallback below.
 for(const c of candidates.slice(0,900)){if(riskAgainst(c.text,history)>.78)continue;chosen=c.text;ranked=c;break;}
 const total=plan.observed.length+plan.observedGoals.length;
 if(!chosen||ranked.coverage<total){
  const fallback=draft(scores,note,history,profile),hard=validate(fallback,history);
  const fallbackCoverage=[...plan.observed,...plan.observedGoals].filter(e=>fallback.includes(e.phrase)).length;
  // Legacy fallback may have broader grade-only praise than the new plan.
  const opening=fallback.split(/若能|期待能|希望能|期許能|建議|盼能/)[0];
  const crossConflict=plan.blockedGradeDimensions.includes(0)&&!plan.evidence.goalDims.includes(0)&&/日常生活表現成熟穩定|生活常規良好|生活常規的自我要求良好|日常生活常規表現良好|日常生活表現穩定|能維持良好的日常作息/.test(opening)&&!plan.observed.some(e=>opening.includes(e.phrase)&&e.dim===0);
  // Do not replace a valid candidate with a fallback that loses recognized evidence.
  if(!hard.length&&!crossConflict&&(!chosen||fallbackCoverage>ranked.coverage))return explain(fallback,plan,'compatibility',null,history,profile);
 }
 if(chosen)return explain(chosen,plan,'deep',ranked,history,profile);
 // Never hand an invalid candidate to the application as a formal comment.
 return {...explain('',plan,'unavailable',null,history,profile),issues:['暫無符合字數及去重規範的候選評語']};
}
export const deepDraft=(scores,note='',history=[],profile={})=>deepGenerate(scores,note,history,profile).comment;
export function deepAlternatives(scores,note='',history=[],profile={},current='',limit=3){
 const out=[],excluded=[...history,...(current?[current]:[])];
 for(let i=0;i<Math.min(6,limit);i++){const c=deepDraft(scores,note,[...excluded,...out],profile);if(!c||validate(c,[...excluded,...out]).length)break;out.push(c);}return out;
}
