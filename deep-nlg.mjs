import {dims,complete,length,normalize,validate,similarity,styleFit,gradeGuidance,analyzeObservation,builtinSemanticRules,validSemanticRule,draft} from './engine.mjs';
export const NLG_VERSION='2.7.0';

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
const frequency=s=>/經常|常常|屢次|反覆|多次|總是|每次|長期|持續|時常|頻繁|一向|向來/.test(s)?'反覆':/偶爾|有時|偶有|不時/.test(s)?'偶發':'未明';
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
// A practical action is a recommendation, never a claim about the student.
// Match the approved goal, not arbitrary words in the teacher's note.
const actionRules=[
 ['punctual',/守時|時間觀念|時間管理|妥善規劃時間|掌握時間/,['預留準備與移動的時間','事先安排每日的作息','留意各項活動的開始時間','提早做好出門與上課的準備']],
 ['clean',/整潔工作|責任區清潔|打掃|清潔用具|個人區域|整理桌面|垃圾分類|餐後收拾/,['記住分內的清潔工作','完成後再檢查負責的區域','每天留一些時間整理周遭環境','把整理與清潔列入每日應辦事項']],
 ['return',/報備|請假程序/,['離開前先向師長說明去向','有臨時狀況時先向師長說明','事先確認離開時應辦的程序']],
 ['queue',/依序排隊|集合與行進|迅速集合|鐘響即回座|用餐時的秩序/,['留意團體活動的時間與順序','聽到集合或上課提醒便做好準備','在團體活動中留意彼此的空間']],
 ['greeting',/主動問候/,['遇見師長或同學時主動打聲招呼','從每天見面時的問候做起']],
 ['apology',/表達歉意/,['有疏失時試著向對方說明','遇到誤會時先聆聽對方的感受']],
 ['boundaries',/感受與界線/,['借用或碰觸他人物品前先詢問','與同學相處時留意對方的感受']],
 ['peers',/平和方式與同學溝通|平和有禮的互動|人際應對|溫和語氣|冷靜表達|聽完再表達|感受與界線|表達歉意|主動問候/,['先聽對方說完再表達自己的想法','遇到意見不同時先冷靜聆聽','說話時多留意對方的感受','遇到分歧時耐心說明自己的想法']],
 ['service',/班級事務|完成交辦事項|承擔分配|活動分工|交接與回報|服務精神|服務工作/,['記下自己負責的工作與時間','有分工時先確認自己的責任','完成工作後主動回報進度','從分內的小事做起']],
 ['honesty',/言行一致|誠信|據實說明|面對自身疏失/,['遇到問題時如實說明經過','對自己的言行多一分留意','有疏失時願意說明並承擔']],
 ['promise',/履行約定|歸還借用物品|按時歸還/,['記下與他人約定的時間','事先確認需要履行的事項','在約定時間前做好準備']],
 ['focus',/專注|學習步調|專心/,['上課時將注意力放在當下的學習','把容易分心的物品先收好','每次先專心完成一項學習任務']],
 ['homework',/完成作業|規律複習|學習方法/,['將應完成的事項分段安排','預留每天整理與複習的時間','先確認應完成的作業及期限']],
 ['confidence',/自信|勇於表達|提出問題與求助/,['先從熟悉的問題練習表達','有疑問時試著向師長或同學請教','從小組討論開始練習說出想法']],
 ['reflection',/聽取建議|調整做法/,['聽完建議後試著調整一項做法','遇到困難時想想還有哪些做法','從每次經驗中找出可以調整的地方']],
 ['phone',/手機/,['事先確認可以使用手機的時機','需要專心時先將手機妥善收好','依照團體約定安排手機使用時間']],
 ['uniform',/服儀/,['出門前先檢查服裝是否合宜','事先備妥符合規定的服裝','每天留意學校的服儀要求']],
 ['initiative',/主動完成例行工作|事項的先後順序|自我檢查|自我管理|團體生活規範/,['每天先確認應辦的事項','完成一項工作後再確認是否有遺漏','把應辦的事情依序安排','從自己能掌握的例行工作開始']],
 ['noise',/上課時的言談與秩序/,['上課時留意自己的音量與發言時機','想與同學交談時先等到適當時機']],
 ['public',/愛護公物/,['使用公共物品後妥善收好','使用公物時多留意保管與歸位']]
];
const gradeActions=[
 ['先確認每日應遵守的生活常規','從每天的作息與準備做起'],
 ['每天留一些時間整理自己的座位','完成清潔後再檢查周遭環境'],
 ['與人交談時多留意對方的感受','先聽完他人的想法再回應'],
 ['先確認自己分內的工作','將交辦事項依序完成'],
 ['留意自己答應他人的事項','遇到疏失時如實說明'],
 ['每天先確認應辦的事項','完成工作後再檢查有無遺漏']
];
export function actionFor(goal,focus){
 if(focus==='延續優勢')return [];
 const matched=actionRules.find(([,re])=>re.test(goal.phrase));
 return matched?matched[2]:goal.source==='等第'&&goal.dim>=0?gradeActions[goal.dim]:[];
}
// Learn only grammatical construction preferences from actual edits; do not
// reuse text fragments as facts. Sparse feedback is shrunk toward neutral.
export function learnDiscourse(feedback=[]){
 const rows=feedback.filter(e=>typeof e?.raw==='string'&&typeof e?.final==='string'&&e.raw!==e.final&&!validate(e.final,[]).length);
 const signals={semicolon:s=>s.includes('；'),twoSentences:s=>(s.match(/。/g)||[]).length>1,conditional:s=>/若能/.test(s),directWish:s=>/希望|期許|期待|盼能/.test(s),action:s=>/事先|先確認|先聽|預留|記下|完成後|出門前/.test(s)};
 const weights={};for(const [key,fn] of Object.entries(signals))weights[key]=rows.reduce((n,r)=>n+Number(fn(r.final))-Number(fn(r.raw)),0)/(rows.length+4);
 return {samples:rows.length,weights};
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
// Exactly the same normalization and bigram Dice calculation as engine.validate.
function similarityFeatures(s){const n=normalize(s);return {n,g:new Set(Array.from({length:Math.max(0,n.length-1)},(_,i)=>n.slice(i,i+2)))};}
function riskAgainst(s,history){
 const a=similarityFeatures(s);let max=0;
 for(const b of history){if(a.n===b.n)return 1;let shared=0;for(const g of a.g)if(b.g.has(g))shared++;
  max=Math.max(max,a.g.size+b.g.size?2*shared/(a.g.size+b.g.size):0);if(max>.78)break;
 }return max;
}
function diversityIndex(history){
 const openings=new Map(),endings=new Map(),shapes=new Map(),connectives=new Map();
 for(const s of history){const parts=splitText(s),open=parts[0],end=parts.at(-1),shape=(s.match(/[，；。！？]/g)||[]).join('');
  for(const [map,key] of [[openings,open],[endings,end],[shapes,shape],[connectives,connectiveFamily(s)]])map.set(key,(map.get(key)||0)+1);
 }return {openings,endings,shapes,connectives};
}
// 5. Microplanning and 6. linguistic realization. Slots are typed, not shuffled strings.
// Bounded pool is deterministic and only combines evidence-approved phrases.
// Move situational modifiers outside the modal, and preserve both the
// canonical recommendation and the actual realized words.
export function realizeAdvice(lead,action,goal){
 const m=action.match(/^((?:有臨時狀況|有疏失|遇到[^，。；]{1,12}|遇見[^，。；]{1,12}|與同學相處|上課)時|出門前|完成工作後|完成後|每天)(?=先|多|再|將|留|試|主動|如實|願意|確認|檢查|把)(.+)$/);
 const contextual=m?{context:m[1],body:m[2]}:null;
 const direct=lead!=='若能';
 const head=contextual?(direct?lead.replace(/能$/,'')+contextual.context+'能'+contextual.body:contextual.context+'若能'+contextual.body):lead+action;
 const surface=contextual?contextual.context+(direct?'能':'若能')+contextual.body:action;
 const bridge=/^(養成|建立|培養|落實|提升)/.test(goal)?'逐步':'';
 const tails=direct?[head+'，'+bridge+goal,head+'，'+goal]:[head+'，也能'+bridge+goal,head+'，將有助於'+goal,head+'，可'+bridge+goal];
 const result=unique(tails).map(text=>({text,surface}));
 if(direct)result.push({text:lead+goal+'，'+action,surface:action});
 return result;
}
const connectiveFamily=s=>/將有助於/.test(s)?'有助於':/也能/.test(s)?'也能':/若能/.test(s)?'條件':/期許/.test(s)?'期許':/希望/.test(s)?'希望':/期待/.test(s)?'期待':/盼/.test(s)?'盼':'其他';
function realize(plan,profile){
 const {strengths,goals,observed,observedGoals,focus}=plan,leads=leadList(profile),out=new Map();
 const first=(observed.length?observed:strengths).slice(0,14),second=strengths.slice(0,18),goalsToUse=goals.slice(0,8);
 const goalGroups=goalsToUse.map(g=>[g]);
 for(let i=0;i<Math.min(observedGoals.length,5);i++)for(let j=i+1;j<Math.min(observedGoals.length,5);j++){
  if(observedGoals[i].id!==observedGoals[j].id&&similarity(observedGoals[i].phrase,observedGoals[j].phrase)<.6)goalGroups.unshift([observedGoals[i],observedGoals[j]]);
 }
 const add=(text,ss,gg,form,action='',actionSurface=action)=>{
  const n=length(text);if(n<42||n>50||out.has(text))return;
  if(validate(text,[]).length||starts.test(text)||/(?:若能|希望能|期許能|期待能|盼能)(?:有臨時狀況時|遇到[^，。；]{1,12}時|遇見[^，。；]{1,12}時|上課時|出門前|完成工作後|完成後)|逐步逐步|能能|養成養成|每天，/.test(text))return;
  out.set(text,{text,ss,gg,form,n,action,actionSurface});
 };
 const compatible=new Map(first.map(a=>[a,second.filter(b=>distinct(a,b))]));
 for(const a of first)for(const gg of goalGroups){
  const g=gg.map(x=>x.phrase).join('並'),ends=gg.length>1&&gg[0].dim!==gg[1].dim?['讓日常生活更有條理','讓這些好習慣逐步落實在生活中','從每日生活中的小事逐步做起']:outcomes(gg[0],focus);
  for(const l of leads){
   // Concrete means-to-goal relations. The conditional form has a consequence,
   // direct wishes have parallel verb phrases, not a stranded conditional.
   if(gg.length===1){
    for(const action of actionFor(gg[0],focus)){
     for(const {text:t,surface} of realizeAdvice(l,action,g)){
      add(a.phrase+'；'+t+'。',[a],gg,'肯定－具體行動－期許',action,surface);
      add(a.phrase+'。'+t+'。',[a],gg,'雙句具體行動',action,surface);
      for(const b of compatible.get(a)){add(a.phrase+'，'+b.phrase+'；'+t+'。',[a,b],gg,'雙肯定－具體行動',action,surface);}
     }
    }
   }
   for(const end of ends){
    add(a.phrase+'，'+l+g+'，'+end+'。',[a],gg,'肯定－期許－結果');
    add(a.phrase+'。'+l+g+'，'+end+'。',[a],gg,'雙句銜接');
    add(a.phrase+'；'+l+g+'，'+end+'。',[a],gg,'分號銜接');
   }
   for(const b of compatible.get(a)){
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
// A small RAM-only LRU of candidate pools for repeated equivalent plans.
// Retain only canonical slot fields, never the original observation, history,
// identity or complete teacher profile. History ranking is always recomputed.
const poolCache=new Map();
const slot=e=>({id:e.id,kind:e.kind,phrase:e.phrase,dim:e.dim,source:e.source,grade:e.grade,frequency:e.frequency,time:e.time,priority:e.priority});
export function clearCandidateCache(){poolCache.clear();termCache.clear();}
function candidatePool(plan,profile){
 const slim={focus:plan.focus,strengths:plan.strengths.map(slot),goals:plan.goals.map(slot),observed:plan.observed.map(slot),observedGoals:plan.observedGoals.map(slot)};
 const key=JSON.stringify([slim,leadList(profile)]);
 if(poolCache.has(key)){const value=poolCache.get(key);poolCache.delete(key);poolCache.set(key,value);return value;}
 const value=realize(slim,profile);
 if(key.length<=12000&&value.length<=5000){poolCache.set(key,value);while(poolCache.size>6)poolCache.delete(poolCache.keys().next().value);}
 return value;
}
// 7. Automatic quality ranking. Evidence coverage dominates surface style.
// History wording is used only to assess similarity, never as evidence for a new student.
function rankCandidate(c,plan,profile,div){
 const covered=[...plan.observed,...plan.observedGoals].filter(e=>[...c.ss,...c.gg].some(x=>x.kind===e.kind&&x.phrase===e.phrase));
 const coverage=covered.length,priority=covered.reduce((n,e)=>n+evidenceWeight(e),0);
 const parts=splitText(c.text),shape=(c.text.match(/[，；。！？]/g)||[]).join('');
 const diversity=-Math.min(5,(div.openings.get(parts[0])||0)*.65)-Math.min(4,(div.endings.get(parts.at(-1))||0)*.55)-Math.min(2,(div.shapes.get(shape)||0)*.07)-Math.min(3,(div.connectives.get(connectiveFamily(c.text))||0)*.35);
 const natural=3-(repeatedWord(c.text)?2:0)-(parts.some(p=>length(p)>27)?1:0)+(c.form.includes('雙句')||c.form.includes('分號') ? .2 : 0)-(plan.focus==='延續優勢'&&/若能/.test(c.text)?1.1:0)-(c.gg.length>1&&/習慣並.{0,10}習慣/.test(c.text)?1:0);
 const strength=c.ss.reduce((n,x)=>n+(x.source==='觀察'?4:x.source==='等第'?x.grade-2:0),0);
 const goalImportance=c.gg.reduce((n,x)=>n+(x.source==='觀察'?evidenceWeight(x)/100:6-(x.grade||4)),0);
 const style=profile.model?.total||profile.structure||profile.preferred?.length?styleFit(c.text,profile):0;
 const w=profile.discourse?.weights||{};const learned=(w.semicolon||0)*Number(c.text.includes('；'))+(w.twoSentences||0)*Number((c.text.match(/。/g)||[]).length>1)+(w.conditional||0)*Number(c.text.includes('若能'))+(w.directWish||0)*Number(/希望|期許|期待|盼能/.test(c.text))+(w.action||0)*Number(Boolean(c.action));
 const generic=genericOutcome.some(x=>c.text.includes(x))?2.5:0;
 const stranded=/若能[^。；]+，從[^。；]+(?:著手|做起|練習)。$/.test(c.text)?4:0;
 const actionBonus=c.action?7:0;
 const formulaPenalty=/將有助於/.test(c.text)?2.5:0;
 const redundant=/例行工作.{0,15}例行工作|整潔工作.{0,15}整潔工作|時間.{0,15}時間.{0,15}時間|逐步.{0,18}逐步/.test(c.text)?2.5:0;
 const directBonus=c.action&&!/若能/.test(c.text)?1.5:0;
 const maintenancePenalty=plan.focus==='延續優勢'&&c.ss.some(s=>c.gg.some(g=>s.dim>=0&&s.dim===g.dim))?1.5:0;
 const score=natural*3+strength+goalImportance+diversity+style*2+learned*2+actionBonus+directBonus-formulaPenalty-redundant-generic-stranded-maintenancePenalty-Math.abs(c.n-46)*.25;
 return {...c,coverage,priority,natural,diversity,style,score};
}
function explain(text,plan,source,ranked,history,profile){
 const chosenStrengths=(ranked?ranked.ss:plan.strengths.filter(e=>text.includes(e.phrase))).map(e=>({phrase:e.phrase,source:e.source,dimension:dims[e.dim]||'補充觀察'}));
 const chosenGoals=(ranked?ranked.gg:plan.goals.filter(e=>text.includes(e.phrase))).map(e=>({phrase:e.phrase,source:e.source,dimension:dims[e.dim]||'補充觀察',frequency:e.frequency||'未明'}));
 const missingStrengths=plan.observed.filter(e=>!chosenStrengths.some(x=>x.phrase===e.phrase)).map(e=>e.phrase),missingGoals=plan.observedGoals.filter(e=>!chosenGoals.some(x=>x.phrase===e.phrase)).map(e=>e.phrase);
 return {comment:text,source,characters:length(text),plan,chosenStrengths,chosenGoals,coverage:{recognized:plan.observed.length+plan.observedGoals.length,missingStrengths,missingGoals,unknown:plan.evidence.unknown.length},issues:validate(text,history),quality:{form:ranked?.form||'相容生成',natural:ranked?.natural??null,diversity:ranked?.diversity??null,style:ranked?.style??null,action:ranked?.action||'',actionSurface:ranked?.actionSurface||'',connective:connectiveFamily(text),learnedSamples:profile.discourse?.samples||0}};
}
// 8. Teacher-style adaptation is driven by existing approved profile and feedback.
// Compatibility engine is retained for exceptional coverage or a saturated history.
// Previous incident/action-based engine retained for compatibility regression only.
export function eventGenerate(scores,note='',history=[],profile={}){
 const plan=planComment(scores,note,profile);
 if(!plan.evidence.complete)return {comment:'',source:'incomplete',characters:0,plan,chosenStrengths:[],chosenGoals:[],issues:['評分未完成'],coverage:{recognized:0,missingStrengths:[],missingGoals:[],unknown:0},quality:{}};
 const div=diversityIndex(history),historyFeatures=history.map(similarityFeatures);
 const candidates=candidatePool(plan,profile).map(c=>rankCandidate(c,plan,profile,div)).sort((a,b)=>b.coverage-a.coverage||b.priority-a.priority||b.score-a.score);
 let chosen,ranked;
 // Search ranked candidates; avoid excessive history comparisons, with fallback below.
 for(const c of candidates.slice(0,900)){if(riskAgainst(c.text,historyFeatures)>.78)continue;chosen=c.text;ranked=c;break;}
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
export const eventDraft=(scores,note='',history=[],profile={})=>eventGenerate(scores,note,history,profile).comment;
export function eventAlternatives(scores,note='',history=[],profile={},current='',limit=3){
 const out=[],excluded=[...history,...(current?[current]:[])];
 for(let i=0;i<Math.min(6,limit);i++){const c=eventDraft(scores,note,[...excluded,...out],profile);if(!c||validate(c,[...excluded,...out]).length)break;out.push(c);}return out;
}


// NLG 2.0: term-level developmental evaluation. Rule IDs remain evidence;
// the realization vocabulary expresses a semester-level development concept.
const termGroups=[
 ['materials dailyPreparation','生活準備','增進生活準備與自我管理的能力','在生活安排上更有計畫與自我要求','使日常生活的準備更有條理'],
 ['attendance requestPermission rules uniform phone classNoise','生活自律與規範','在生活自律與團體規範的實踐上更加成熟','更重視生活規範與自我管理的責任','增進自我管理與遵守團體規範的自覺','在生活規範與自我管理上更有自我要求','在自律與團體生活中展現更成熟的態度'],
 ['punctual','時間管理','在時間安排與守時習慣上更有自我要求','增進時間管理能力並培養穩定的守時習慣','使時間安排與守時表現更加穩定','更能掌握時間，養成良好的守時習慣'],
 ['queue mealRoutine assemblyOrder returnSeat','團體秩序','在團體生活中更能自我要求並維持秩序','增進團體生活的秩序觀念與自律能力','使團體規範的實踐更加穩定'],
 ['assemblySpeed','團體配合','增進時間觀念與團體活動的配合度','在團體生活的時間安排上更加主動'],
 ['sharedSpace','公共責任','在公共環境與公物的維護上更具責任感','增進愛護公物與維護公共環境的自覺'],
 ['clean deskOrganization waste mealCleanup cleanTools cleanFinish','整潔與責任','在整潔習慣與環境維護上更加主動','增進主動整理與維護環境的習慣','培養更穩定的整潔習慣與責任感','使環境維護與整潔工作更加確實'],
 ['courtesy greeting speechTone apology','人際修養','在人際應對與待人接物上更加成熟','增進人際應對的合宜性與待人修養','在待人態度與日常應對上更有自我要求'],
 ['peers interrupt listening emotion respectBoundary','人我調和','在人我互動中多一分包容與尊重','在人際溝通與團體相處上更加成熟','增進人我調和與相互尊重的能力','在與同學相處時更能兼顧彼此的感受','在團體生活中多一分包容與體諒','在尊重彼此與調和人我關係上更加成熟'],
 ['service division taskFollowthrough classEvents handover','服務與責任','在班級事務的參與及責任承擔上更加主動','增進服務的主動性與完成分內工作的責任感','使班級事務的參與與執行更加穩定'],
 ['honesty accountability reportFacts','誠信與承擔','在言行一致與責任承擔上更有自我要求','更加重視誠信與對自身言行的責任','增進言行一致與誠實面對責任的能力'],
 ['promise borrowing','承諾與信任','在履行承諾與待人誠信上更加成熟','更加重視對他人的承諾與責任','培養更穩定的守信習慣與責任感'],
 ['assessmentIntegrity','評量誠信','在學習與評量中更能實踐誠信原則','增進對學習規範與誠信的自我要求'],
 ['reminders initiative','主動與責任','在日常事務與責任承擔上更加主動','增進處事的主動性與自我管理能力','培養主動負責的態度與穩定的生活習慣'],
 ['priorities selfCheck planning','處事與規劃','在時間規劃與處事條理上更加成熟','增進生活規劃與自我檢核的能力','使處事更有條理，日常表現更加穩定'],
 ['focus','學習專注','在學習專注與自我管理上更有自我要求','增進學習專注的穩定度與持續性','使學習過程更為專注而穩定'],
 ['work','學習責任','在學習安排與作業完成上更有自我要求','使學習責任的實踐更加穩定','培養有條理的學習安排與作業習慣'],
 ['study','學習習慣','在學習安排與規律複習上更有自我要求','培養穩定而有條理的學習習慣','增進學習規劃與自我管理的能力'],
 ['confidence discussion askHelp','表達與學習','在表達想法與學習參與上更加主動','增進表達與主動請益的能力','在團體互動與學習中更勇於表達想法'],
 ['teamwork','合作與調和','增進與人合作及協調的能力','在團體合作中更能調和彼此的想法'],
 ['persistence','持續學習','在面對學習挑戰時更能持續探索與嘗試','培養穩定而持續的學習態度'],
 ['reflect','反思與成長','在自我反思與接受建議上更加成熟','增進反思與調整自身做法的能力']
];
const termById=new Map(termGroups.flatMap(([ids,label,...variants])=>ids.split(' ').map(id=>[id,{label,variants}])));
const termGrade=[
 ['逐步建立有秩序的生活習慣','在生活常規上增進自我要求','使日常生活安排更加有條理'],
 ['逐步建立整理與維護環境的習慣','增進整潔工作的確實度與主動性','培養更穩定的整潔習慣與責任感'],
 ['逐步培養合宜的人際應對與待人態度','在人際應對與待人接物上更加成熟','增進人我調和與相互尊重的能力'],
 ['逐步建立參與班級事務的責任感','在班級事務與責任承擔上更加主動','增進班級服務的主動性與責任感'],
 ['逐步建立重視誠信與責任的態度','在言行一致與責任承擔上更有自我要求','使言行與承諾更加一致'],
 ['逐步建立生活自律與自我管理的習慣','在自我管理與團體規範上更加成熟','增進自律與團體規範的實踐']
];
const termNeutral=['日常生活的各項習慣仍在養成中','生活常規與自我管理仍有發展空間','目前各項日常表現仍有成長空間','日常生活的基本表現仍可逐步累積'];
const termEnd=[
 ['使日常表現更加穩定','讓生活步調更有條理','使生活態度更臻成熟'],
 ['使生活習慣更為成熟','讓周遭環境更加舒適','使整潔與責任的表現更為穩定'],
 ['使人我關係更為調和','與同學的相處將更為融洽','使團體互動更加和諧'],
 ['在團體中發揮更多力量','使班級服務表現更臻成熟','為團體生活增添助益'],
 ['讓彼此的信任更加穩固','使待人處事更值得信賴','使言行表現更臻成熟'],
 ['使整體表現更臻成熟','讓個人與團體生活更為調和','使日常表現更加穩健']
];
const eventWording=/(?:有臨時狀況時|先向師長說明|先聽對方說完|再表達自己的想法|記下與他人約定的時間|提早做好出門|完成後再檢查|每天留一些時間|把整理與清潔列入|上課時能將注意力|遇見師長或同學時|打聲招呼|先確認應辦|出門前先|養成事先報備的習慣|養成鐘響即回座的習慣|養成依序排隊的習慣|養成按約歸還借用物品的習慣|練習聽完再表達想法|將有助於)/;
const harshWording=/(?:欠缺|缺乏|散漫|不守規矩|不自律|不合群|懶惰|不誠實|說謊|作弊|擅自離開|插隊|忘記打掃|經常遲到|拒絕分工|推卸責任)/;
const isolated=/(?:今天|今日|昨天|昨日|當天|當時|那天|某次|有一次|曾有一次|單次|一次事件|這次|那次|某天|上週某天|上次|上週[一二三四五六日]|某一節|僅一次|只有一次|曾有一回|某一回)/;
const recurrent=/(?:經常|常常|屢次|反覆|多次|每次|總是|向來|一向|平時|長期|持續|時常|頻繁|偶爾|有時)/;
function termNotes(note){
 const retained=[],deferred=[];
 for(const c of clauses(note)){
  if(isolated.test(c)&&!recurrent.test(c)){deferred.push(c);continue;}
  retained.push(c);
 }
 return {note:retained.join('，'),deferred};
}
// Evidence-backed semester portrait; score-only data never implies personality.
const portraitThemes=['生活條理','環境責任','待人相處','團體參與','誠信承擔','生活自律'];
const portraitTheme=e=>e.dim>=0?portraitThemes[e.dim]:['personality','quiet','confidence','discussion','leadership','atmosphere','listeningPositive','listening','teamwork'].includes(e.id)?'個人特質與互動':['focus','study','work','assignmentCare','askHelp','persistence'].includes(e.id)?'學習態度':'個別觀察';
function portraitModel(p){
 const strengths=p.strengths.filter(e=>e.source!=='中性');
 return {strengthThemes:unique(strengths.map(portraitTheme)),growthThemes:unique(p.goals.map(portraitTheme)),observedStrengths:p.observed.map(e=>({id:e.id,phrase:e.phrase,theme:portraitTheme(e)})),observedGrowth:p.observedGoals.map(e=>({id:e.id,concept:e.label,theme:portraitTheme(e)})),basis:p.observed.length||p.observedGoals.length?'觀察與評分':'評分',limited:!strengths.length};
}
const naturalGoals=new Map([
 ['生活自律與規範',['在生活上多一分自律，重視團體規範','培養自律的生活態度，兼顧團體規範','在自我管理上多一分用心，尊重團體規範']],
 ['人我調和',['多體諒同學的感受，培養尊重彼此的態度','在人際相處中多一分體諒與包容','學著尊重不同的想法，增進與人相處的能力','多留意彼此的感受，培養包容的待人態度']],
 ['人際修養',['在待人接物上多一分體貼與禮貌','逐漸養成合宜的應對與待人態度']],
 ['時間管理',['多用心安排時間，培養守時的好習慣','在時間安排上更加用心，養成守時的習慣','培養守時的習慣，讓自己的生活更有條理']],
 ['整潔與責任',['更主動整理生活環境，養成負責的整潔習慣','在整潔工作上多一分用心與主動','養成主動整理環境的習慣，盡好分內責任']],
 ['服務與責任',['更主動參與班級事務，盡好自己的責任','對班級事務多一分用心，培養負責的態度']],
 ['誠信與承擔',['更加重視自己的言行，勇於承擔應盡的責任']],
 ['承諾與信任',['更重視對他人的承諾，培養守信負責的態度']],
 ['學習專注',['在學習上多一分專注，逐漸養成穩定的學習習慣']],
 ['學習習慣',['用心安排自己的學習，培養規律的複習習慣']],
 ['表達與學習',['在學習與團體生活中更勇於表達自己的想法']]
]);
// Generic language resources authored independently of any student record.
const expandedTermLexicon=new Map([
 [
  "生活準備",
  "妥善安排日常所需",
  "培養有條理的準備習慣",
  "增進生活準備的周全性",
  "在日常事務上做好規劃"
 ],
 [
  "生活自律與規範",
  "養成自律守規的生活態度",
  "落實自我管理與生活常規",
  "增進遵守團體規範的自覺",
  "在生活規範上提高自我要求",
  "培養對共同規範的尊重",
  "兼顧個人行為與團體秩序",
  "建立穩定自律的生活習慣",
  "以負責的態度遵守生活規範",
  "加強日常自律與守規意識"
 ],
 [
  "時間管理",
  "養成穩定的守時習慣",
  "加強時間規劃與守時觀念",
  "建立準時有序的生活習慣",
  "妥善掌握時間並重視守時",
  "培養良好的時間觀念與自律",
  "重視日常作息的安排與守時",
  "在守時與作息管理上多加努力",
  "提升時間運用的自覺"
 ],
 [
  "團體秩序",
  "尊重團體活動的共同秩序",
  "加強維護秩序的自覺",
  "培養守序與自我約束的習慣",
  "以自律態度參與團體生活"
 ],
 [
  "團體配合",
  "增進團體活動中的配合與效率",
  "養成準時配合團體活動的習慣",
  "重視集體活動的時間與步調"
 ],
 [
  "公共責任",
  "主動愛護公物與公共環境",
  "培養維護公共空間的責任感",
  "珍惜共同使用的環境與資源"
 ],
 [
  "整潔與責任",
  "培養自發維護整潔的習慣",
  "落實分內的環境維護工作",
  "重視整潔工作與應盡的責任",
  "養成主動維護周遭整潔的態度",
  "在環境整理上多加自我要求",
  "建立確實負責的清潔習慣",
  "加強環境整潔的自覺與行動",
  "以負責的態度做好整潔工作"
 ],
 [
  "人際修養",
  "培養合宜有禮的待人態度",
  "重視日常言談與待人分寸",
  "在應對進退上多加用心",
  "增進待人禮節與尊重",
  "養成體貼有禮的相處習慣",
  "以適切的言語表達尊重"
 ],
 [
  "人我調和",
  "增進與同儕互動時的理解與尊重",
  "培養尊重不同意見的態度",
  "以包容的態度面對人際分歧",
  "在與人互動中多加體諒",
  "學習理性溝通與相互尊重",
  "重視彼此感受並妥善處理分歧",
  "培養平和而有分寸的溝通態度",
  "增進同儕相處中的包容與理解",
  "以尊重的態度看待彼此差異",
  "在人際關係中養成體諒的習慣",
  "學習接納不同立場與意見"
 ],
 [
  "服務與責任",
  "主動分擔團體事務並盡責完成",
  "培養對班級工作的責任感",
  "確實承擔自己應盡的分工",
  "以主動負責的態度參與班務",
  "在團體工作中落實分內責任",
  "增進參與班務的主動與責任心"
 ],
 [
  "誠信與承擔",
  "養成誠實面對自身言行的態度",
  "重視言行一致與責任承擔",
  "以誠信態度面對自己的責任",
  "增進對言行負責的自覺",
  "培養誠實自省並承擔責任的習慣"
 ],
 [
  "承諾與信任",
  "重視約定並確實履行承諾",
  "培養對承諾負責的態度",
  "以守信態度維護彼此信任",
  "養成言行相符與守約的習慣",
  "在履行承諾上提高自我要求"
 ],
 [
  "評量誠信",
  "恪守學習與評量的誠信原則",
  "以誠實負責的態度面對評量",
  "培養尊重評量規範的自覺"
 ],
 [
  "主動與責任",
  "養成主動完成分內事務的習慣",
  "以負責的態度安排日常工作",
  "增進處事的自發性與責任心",
  "在日常事務上主動承擔責任"
 ],
 [
  "處事與規劃",
  "培養有條理的處事習慣",
  "妥善規劃生活中的各項事務",
  "養成自我檢視與安排的習慣",
  "重視事務的先後順序與規劃"
 ],
 [
  "學習專注",
  "養成穩定專注的學習態度",
  "增進學習時的專注與自我管理",
  "培養持續投入學習的習慣",
  "在學習專注上多加自我要求",
  "重視學習過程中的專心與投入"
 ],
 [
  "學習責任",
  "確實履行應盡的學習責任",
  "建立按時完成作業的習慣",
  "培養對學習事務負責的態度",
  "妥善安排並完成學習工作"
 ],
 [
  "學習習慣",
  "建立規律而有計畫的學習習慣",
  "妥善規劃複習與學習進度",
  "培養自主管理學習的能力",
  "在學習安排上多加自我要求",
  "養成有條理的複習與學習習慣"
 ],
 [
  "表達與學習",
  "更主動參與學習與意見交流",
  "培養表達想法與請益的勇氣",
  "增進主動提問及參與討論的意願",
  "在學習互動中勇於表達意見",
  "練習主動分享自己的思考"
 ],
 [
  "合作與調和",
  "培養互相協調與合作的態度",
  "增進團體合作中的理解與配合",
  "重視共同目標與彼此的想法"
 ],
 [
  "持續學習",
  "培養持續探索與努力的學習態度",
  "以耐心與毅力面對學習挑戰",
  "養成面對學習困難時持續嘗試的習慣"
 ],
 [
  "反思與成長",
  "培養自我檢視與調整的態度",
  "以開放的心態接納合宜建議",
  "增進反思自身做法的能力"
 ]
].map(([label,...variants])=>[label,variants]));
const expandedGradeLexicon=[
 [
  "重視生活作息與日常條理",
  "培養規律有序的生活態度",
  "增進生活安排的自主性",
  "在生活常規上多加自我要求",
  "養成妥善規劃日常事務的習慣"
 ],
 [
  "落實日常整理與整潔工作",
  "培養維護周遭環境的責任心",
  "在整潔習慣上更主動負責",
  "重視環境維護工作的確實性",
  "建立自發整理生活空間的習慣"
 ],
 [
  "培養合宜的言談與應對習慣",
  "增進待人接物的禮節與分寸",
  "以尊重的態度與人互動",
  "重視日常應對中的體貼與禮貌",
  "在待人態度上多加自我要求"
 ],
 [
  "培養主動參與班務的態度",
  "確實履行班級分工的責任",
  "增進團體事務的參與與投入",
  "在班級工作上多加用心",
  "養成對分內工作負責的習慣"
 ],
 [
  "以誠信態度面對自身言行",
  "重視約定與應盡的責任",
  "培養言行相符的自我要求",
  "在誠信與責任上持續精進",
  "養成誠實守信的生活態度"
 ],
 [
  "重視自律與共同生活規範",
  "培養自我約束與管理的習慣",
  "在日常生活上增進自律意識",
  "以負責的態度遵守團體規範",
  "逐步落實自我管理與生活常規"
 ]
];
const naturalGrade=[
 ['養成有條理的生活習慣','對日常生活多一分用心與自我要求'],
 ['養成主動整理環境的習慣','在整潔工作上多一分主動與用心'],
 ['在待人接物上多一分體諒與禮貌','逐漸養成合宜的待人態度'],
 ['更主動參與班級事務，盡好自己的責任','培養主動分擔工作的責任感'],
 ['培養言行一致、守信負責的態度','更加重視自己的言行與承諾'],
 ['培養自律的生活態度，兼顧團體規範','對自己的生活多一分自我要求']
];
// Both claims must be independently supported. Observed evidence stays literal
// for coverage; grade paraphrases remain within the rating's meaning.
const integratedPraiseByDim=[
 ['日常生活表現良好','平時的生活常規亦能維持良好'],
 ['整潔習慣良好','在環境整潔方面亦有良好表現'],
 ['日常禮節合宜','與人應對也能保持合宜'],
 ['班級服務表現良好','在班級服務方面也有良好表現'],
 ['誠信表現良好','日常言行亦能重視誠信'],
 ['自律表現良好','在生活自律方面亦有良好表現']
];
function integratedPraise(a,b){
 if(a.source==='中性'||b.source!=='等第'||b.grade!==4||a.dim===b.dim)return [];
 const v=integratedPraiseByDim[b.dim]?.[1];if(!v)return [];
 return [{ss:[a,b],text:a.phrase+'，'+v,fused:true,integratedPraise:true}];
}
function portraitHeads(a,b){
 if(a.source==='中性'||b.source==='中性')return [];
 const related=(a.dim===2&&[3,4].includes(b.dim))||(a.dim===3&&[2,4].includes(b.dim))||(a.dim===4&&[2,3].includes(b.dim))||([0,1,5].includes(a.dim)&&[0,1,5].includes(b.dim))||(['help','carePeers','teamwork','listeningPositive','personality','quiet'].includes(a.id)&&[2,3,4].includes(b.dim));
 if(related){
  const phrase=b.source==='等第'&&b.grade>=4?({0:'日常生活表現亦良好',1:'也能維持環境整潔',2:'與人應對亦合宜',3:'班級服務表現亦良好',4:'亦能重視誠信',5:'自律表現亦良好'}[b.dim]):null;
  if(phrase)return [{ss:[a,b],text:a.phrase+'，'+phrase,fused:true}];
  if(!/^(亦|也)/.test(b.phrase))return [{ss:[a,b],text:a.phrase+'，也'+b.phrase,fused:true}];
 }else if(b.source==='等第'&&/^能/.test(b.phrase))return [{ss:[a,b],text:a.phrase+'，也'+b.phrase,fused:true}];
 return [];
}
// Discourse links require a selected, observed strength as an anchor.
const discourseBridges=[
 {ids:['help','carePeers'],labels:['人我調和'],variants:['將這份關懷延伸至人際相處中的理解與包容','將助人的心意延伸至人際相處，多體諒彼此的感受','將助人的心意延伸至包容與尊重','將助人之心延伸至人際相處']},
 {ids:['personality'],labels:['人我調和'],variants:['在表達自己的想法之餘，多理解不同意見，增進人際相處']},
 {ids:['quiet'],labels:['表達與學習'],variants:['在保有沉靜特質之餘，更勇於表達自己的想法']},
 {ids:['help','carePeers','duties','service'],labels:['時間管理'],variants:['將這份用心也帶入時間安排，培養守時的習慣']},
 {ids:['help','carePeers','duties','service'],labels:['整潔與責任'],variants:['將這份用心延伸至整潔工作，養成主動整理的習慣']},
 {ids:['help','carePeers','duties','service'],labels:['生活自律與規範'],variants:['將這份用心延伸至自我管理，兼顧團體生活規範']}
];
const bridgesFor=g=>g.source==='觀察'?discourseBridges.filter(b=>b.labels.includes(g.label)):[];
const anchorFor=(head,bridge)=>head.ss.some(e=>e.source==='觀察'&&bridge.ids.includes(e.id));
function discourseRelation(c,focus){
 if(c.bridge)return '優勢延伸';
 if(c.ss.every(e=>e.source==='中性'))return '基礎養成';
 if(focus==='延續優勢'&&c.gg.some(g=>c.ss.some(e=>e.dim>=0&&e.dim===g.dim)))return '延續所長';
 return '並列發展';
}
const repetitionFamilies=[/持續|繼續|延續/,/發揮|展現/,/時間安排|安排時間|規劃時間/,/人際關係|人際相處|與同儕相處|與同學相處/,/更加成熟|更臻成熟|更為成熟/,/整潔|整理環境/,/責任|負責/];
function consequenceOverlap(surfaces,tail){
 if(!tail)return 0;
 const goal=surfaces.join('，');
 return repetitionFamilies.reduce((n,re)=>n+(re.test(goal)&&re.test(tail)?2.2:0),0);
}
// Sustained shortcomings: state the area of concern and the direction of
// development. Never infer a personality defect, motive, or single-event pattern.
const warningRules=[
 ['punctual',/遲到|不守時|時間觀念不佳|時間觀念薄弱/,['守時習慣仍不穩定','守時觀念仍須加強','時間管理仍有不足'],['養成守時的習慣','加強時間管理','重視守時與自我要求']],
 ['peers',/爭執|衝突|吵架|口角|相處不睦/,['與同學相處仍有摩擦','人際相處仍有摩擦','與同儕的相處仍待改善'],['多體諒彼此的感受','培養包容與尊重的態度','學習平和溝通與包容']],
 ['interrupt listening emotion respectBoundary',/插話|打斷|情緒|界線|不尊重|不聆聽|不耐煩/,['人際互動仍有待調整','待人相處仍須多加自省'],['增進尊重與體諒','培養平和溝通的態度']],
 ['clean deskOrganization waste mealCleanup cleanTools cleanFinish',/忘記打掃|未打掃|不打掃|整潔不佳|髒亂|清潔不|不整理|未整理|垃圾亂/,['整潔工作仍未能確實完成','整潔責任的落實仍不穩定','整潔習慣仍須加強'],['養成主動整理的習慣','確實盡好整潔責任','主動維護環境整潔']],
 ['attendance requestPermission rules uniform phone classNoise',/擅自|未報備|未請假|不守規|違規|翹課|服儀|手機|上課.*吵|曠課/,['遵守團體規範仍有不足','生活自律仍須加強','團體規範的遵行仍不穩定'],['培養自律與責任感','加強自我管理與規範意識','重視團體規範與自律']],
 ['service division taskFollowthrough classEvents handover',/不負責|未完成|不完成|推卸|拒絕|敷衍|忘記|不配合/,['分內工作的落實仍不穩定','班級事務的責任感仍須加強'],['主動承擔分內責任','確實完成班級工作']],
 ['honesty accountability reportFacts',/說謊|不誠實|欺瞞|隱瞞|推卸|不認錯|不據實/,['言行誠信仍有待加強','面對自身責任仍有不足','言行一致的態度仍須加強'],['重視誠信並勇於承擔','培養誠實負責的態度','誠實面對自己的言行與責任','以誠實的態度面對自身疏失並承擔責任']],
 ['promise borrowing',/不守信用|不履行|未履行|不還|未歸還|忘記/,['履行承諾仍不夠確實','守信的態度仍須加強'],['重視承諾與責任','養成守信負責的習慣']],
 ['focus',/分心|不專心|注意力不集中/,['學習專注度仍不夠穩定','學習專注仍須加強'],['培養專注的學習習慣','加強學習上的自我管理']],
 ['work study',/不交|未交|拖延|不複習|未完成|不完成/,['學習責任的落實仍不穩定','學習習慣仍須加強'],['培養規律負責的學習態度','確實完成應盡的學習責任']]
];
const expandedWarningTone=[["守時習慣仍待鞏固","守時表現仍有待改善","守時方面仍須切實改進"],["與同儕相處仍有待調整","與同學相處仍須改善","人際相處的摩擦仍須改善"],["人際互動仍不夠穩定","與人互動的分寸仍須調整","人際應對仍須切實改善"],["整潔責任仍待落實","整潔工作仍須做得更確實","整潔責任仍須切實履行"],["生活規範的遵守仍待改善","自律習慣仍不夠穩定","遵守團體規範仍須切實改善"],["班級分工仍待確實落實","分內責任仍須加強","班級工作的責任仍須切實承擔"],["言行一致仍有待改善","誠信態度仍須加強","言行誠信仍須切實改善"],["承諾的履行仍待改善","守約表現仍不夠穩定","履行承諾仍須切實改進"],["學習專注仍有待改善","專注的習慣仍不夠穩定","學習專注仍須切實加強"],["學習責任仍待落實","學習習慣仍不夠穩定","學習責任仍須切實履行"]];
const warningToneOf=text=>/仍須切實|仍須|仍需/.test(text)?'明確警醒':'委婉提醒';
function goalTone(e,scores,focus){
 if(focus==='延續優勢')return '肯定延續';
 if(e.source==='等第')return e.grade<=2?'基礎養成':'精進引導';
 if(e.time==='改善')return '鞏固進步';
 if(e.frequency==='偶發')return '精進引導';
 return e.frequency==='反覆'||(e.dim>=0&&scores[e.dim]<=2)?'明確警醒':'委婉提醒';
}
const compactWarningPairs=[["守時仍須改善","培養守時習慣"],["同儕相處仍須改善","培養包容與尊重"],["互動分寸仍須調整","增進尊重與體諒"],["整潔仍待加強","盡好整潔責任"],["生活自律仍須加強","尊重團體規範"],["分內責任仍須加強","確實完成班務"],["言行誠信仍須改善","培養誠信態度"],["守約表現仍須改善","重視履行承諾"],["學習專注仍須加強","培養學習專注的習慣"],["學習責任仍待落實","培養負責態度"]];
function warningSpec(e){
 if(e.source!=='觀察'||e.time==='改善'||e.frequency==='偶發')return null;
 const r=warningRules.find(([ids,re])=>ids.split(' ').includes(e.id)&&re.test(e.evidence||''));
 return r?{warnings:unique([...r[2],...expandedWarningTone[warningRules.indexOf(r)],compactWarningPairs[warningRules.indexOf(r)][0]]),directions:unique([...r[3],compactWarningPairs[warningRules.indexOf(r)][1]])}:null;
}
function termGoal(e,focus){
 if(e.source==='等第'){
  const vs=focus==='延續優勢'?[e.phrase,...(e.dim===3?['延續對班級事務的用心','持續在團體中發揮服務精神']:e.dim===5?['持續展現自律與自我要求','延續成熟的生活態度']:['持續保持這份良好的表現','延續這份用心與自我要求'])]:unique([e.phrase,termGrade[e.dim][Math.max(0,Math.min(2,e.grade-1))],...termGrade[e.dim].slice(1),...(e.grade===1?['從基本生活常規著手，逐步培養有條理的生活習慣','逐步建立整理與環境維護的基本習慣','逐步培養尊重他人與合宜應對的基本態度','逐步建立承擔分內工作與參與團體事務的習慣','培養言行一致與履行承諾的基本責任感','逐步建立生活自律與遵守團體規範的習慣'].slice(e.dim,e.dim+1):[])]);
  return {...e,label:dims[e.dim],variants:unique([...vs,...(focus==='延續優勢'?[]:[...naturalGrade[e.dim],...expandedGradeLexicon[e.dim]])])};
 }
 const m=termById.get(e.id);
 const goal={...e,label:m?.label||dims[e.dim]||'個別發展',variants:unique([...(naturalGoals.get(m?.label)||[]),...(m?.variants||[e.phrase]),...(expandedTermLexicon.get(m?.label)||[])])};
 const warning=warningSpec(e);
 return {...goal,variants:unique([...(warning?.directions||[]),...goal.variants]),warningVariants:warning?.warnings||[],warningDirections:warning?.directions||[],bridgeVariants:bridgesFor(goal).flatMap(b=>b.variants)};
}
export function semesterPlan(scores,note='',profile={}){
 const n=termNotes(note),p=planComment(scores,n.note,profile);
 if(!p.evidence.complete)return {...p,deferred:n.deferred};
 const conflicts=new Set(p.observedGoals.map(e=>e.id));
 const before=p.observed.length;
 p.observed=p.observed.filter(e=>!conflicts.has(e.id));
 if(before!==p.observed.length)p.evidence.conflicts.push('同一主題正反觀察並存，保留成長方向並避免矛盾肯定。');
 p.evidence.strengths=p.observed;
 p.strengths=p.strengths.filter(e=>e.source!=='觀察'||p.observed.includes(e));
 // Add alternative grade-supported descriptions; retain existing vocabulary for sparse evidence.
 const added=[['生活常規良好','平時生活表現穩定'],['整潔習慣良好','整潔方面表現良好'],['應對進退合宜','日常禮節表現良好'],['班級服務表現良好','能配合班級事務'],['日常誠信表現良好','能重視誠信'],['自律表現良好','生活上能自我要求']];
 for(const e of [...p.strengths])if(e.source==='等第'&&e.grade===4)for(const phrase of added[e.dim])if(!p.strengths.some(s=>s.phrase===phrase))p.strengths.push({...e,phrase});
 if(!p.strengths.length||p.strengths.every(e=>e.source==='中性'))p.strengths=termNeutral.map(phrase=>({id:'neutral',kind:'strength',phrase,dim:-1,source:'中性'}));
 p.goals=p.goals.map(e=>({...termGoal(e,p.focus),tone:goalTone(e,scores,p.focus)}));p.observedGoals=p.goals.filter(e=>e.source==='觀察');p.evidence.goals=p.observedGoals;p.deferred=n.deferred;p.portrait=portraitModel(p);
 return p;
}
function termOutcomes(g,focus){
 if(focus==='延續優勢')return [...(g.dim===3?['為班級生活帶來更多正向的力量','讓班級生活因彼此的合作而更加融洽','為班級生活帶來更多助益']:[]),'在團體生活中持續發揮所長','使良好的表現持續展現','讓各項優勢更加穩固'];
 if(g.dim>=0)return termEnd[g.dim];
 if(/學習/.test(g.label))return ['使學習表現更加穩定','讓學習與個人成長更具發展性'];
 return ['使整體表現更臻成熟','使個人的發展更加穩定'];
}
// A conditional expectation needs an independent consequent, not an unfinished wish.
function termConsequences(g,focus){
 if(focus==='延續優勢')return [...(g.dim===3?['班級生活將因彼此的合作而更加融洽']:[]),'相信能持續發揮所長','各項優勢將更為穩固'];
 if(g.label==='時間管理')return ['時間安排將更有條理','生活步調將更加從容'];
 if(g.dim===0)return ['生活步調將更有條理','日常表現將更加穩定'];
 if(g.dim===1)return ['整潔表現將更為穩定','生活習慣將更為成熟'];
 if(g.dim===2)return ['人際關係將更為融洽','與同儕相處將更為和諧'];
 if(g.dim===3)return ['相信能為團體多盡心力','服務表現將更為成熟'];
 if(g.dim===4)return ['彼此的信任將更加穩固','言行表現將更臻成熟'];
 if(g.dim===5)return ['整體表現將更加穩健','生活安排將更有條理'];
 return /學習/.test(g.label)?['學習表現將更為穩定']:['整體表現將更臻成熟'];
}
const termLeads=p=>unique([...(p.count&&p.features?.usesDirectAddress/p.count>=.6?['期許妳能','希望妳能','期待妳能']:[]),'若能','期許能','希望能','期待能','盼能','期盼能','期望能','也盼能']);
// Typed connective lexicon: variants retain the assertion and goal, and
// are introduced one slot at a time to avoid combinatorial candidate growth.
const termSurfaceLeads=['盼望能','期許日後能','期盼今後能','希望日後能','也期盼能','期望日後能','亦盼能','期盼日後能','期許今後能','希望今後能','盼今後能','盼日後能','期望今後能','期許未來能','期待日後能'];
const termConditionalLeads=['如能','倘能','如果能','假如能','倘若能'];
const termContrastLeads=['但','然而，','不過，','惟','只是','另一方面，','值得留意的是，','須留意的是，'];
const termAdditions=['亦能','並能','同時也能','且能','又能','並且能','同時能'];
const termGoalJoiners=['，並','，並且','，同時','，亦能'];
const termConditionPattern=/(?:若能|如能|倘能|如果能|假如能|倘若能)/;
// Count unique authored resources by conceptual group, not possible combinations.
export function semesterLexicalInventory(){
 const observation=termGroups.map(([,label,...base])=>{const original=unique([...base,...(naturalGoals.get(label)||[])]);const expanded=unique([...original,...(expandedTermLexicon.get(label)||[])]);return {label,before:original.length,after:expanded.length};});
 const grades=termGrade.map((base,i)=>{const original=unique([...base,...naturalGrade[i]]);return {dimension:dims[i],before:original.length,after:unique([...original,...expandedGradeLexicon[i]]).length};});
 const summary=rows=>({before:rows.reduce((n,r)=>n+r.before,0),after:rows.reduce((n,r)=>n+r.after,0),groups:rows.length});
 return {observation:summary(observation),grades:summary(grades),observationGroups:observation,gradeGroups:grades};
}
const semesterSyntaxForms=['並列雙句','分號連貫','提醒後期許','提醒後條件','轉折收束','提醒另句','承接雙段','讓步轉折'];
export function semesterToneSyntaxInventory(){return {toneGroups:warningRules.map((r,i)=>({concept:r[0],before:r[2].length,after:unique([...r[2],...expandedWarningTone[i]]).length})),syntaxForms:semesterSyntaxForms.slice()};}
export const semesterLanguageInventory=()=>({wish:termSurfaceLeads.length,conditional:termConditionalLeads.length,contrast:termContrastLeads.length,addition:termAdditions.length,goalJoiners:termGoalJoiners.length});
function termDistinct(a,b){if(a.source==='等第'&&b.source==='等第'&&[0,5].includes(a.dim)&&[0,5].includes(b.dim))return false;if(a.source==='觀察'&&['help','carePeers'].includes(a.id)&&b.source==='等第'&&b.dim===3)return similarity(a.phrase,b.phrase)<.45;return distinct(a,b);}
const jointDevelopmentRules=[
 {ids:['punctual','clean'],theme:'生活習慣',variants:[
  ['日常自我要求仍須加強','養成守時與維護整潔的習慣'],
  ['生活習慣仍待調整','在守時與整潔工作上更加自律'],
  ['日常生活的自律仍須提升','培養守時且確實維護整潔的習慣'],
  ['生活常規仍須落實','以負責的態度守時並維護環境整潔'],
  ['守時與整潔習慣仍須加強','在日常生活中落實自律與責任']
 ]},
 {ids:['punctual','focus'],theme:'作息與學習',variants:[
  ['自我管理仍須加強','養成守時與學習專注的習慣'],
  ['日常自我要求仍待提升','在守時與學習專注上多加用心'],
  ['生活與學習習慣仍須調整','重視守時並提升學習專注度'],
  ['守時與學習專注仍須加強','逐步建立有條理的自我管理習慣']
 ]},
 {ids:['clean','service'],theme:'責任實踐',variants:[
  ['分內責任仍須落實','確實做好整潔與班級服務工作'],
  ['日常責任的落實仍待加強','主動維護整潔並盡好班級分工']
 ]},
 {ids:['punctual','rules'],theme:'生活規範',variants:[
  ['生活常規仍須加強','養成守時與遵守團體規範的習慣'],
  ['日常自律仍須提升','重視守時並確實遵守生活規範']
 ]},
 {ids:['focus','work'],theme:'學習責任',variants:[
  ['學習態度仍須加強','養成專注且確實完成學習工作的習慣'],
  ['學習專注與作業責任仍須改善','逐步建立規律負責的學習習慣']
 ]},
 {ids:['peers','honesty'],theme:'人際修養',variants:[
  ['與人相處的態度仍須自省','以包容與誠信的態度待人'],
  ['待人處事仍有改善空間','多體諒同儕並重視言行誠信']
 ]}
];
const jointLeads=['期許能','盼能','期盼能','希望能','期待能','期盼日後能','期許今後能'];
function jointDevelopmentFor(goals){
 if(goals.length!==2||goals.some(g=>g.source!=='觀察'||!g.warningVariants?.length))return [];
 return jointDevelopmentRules.filter(r=>r.ids.every(id=>goals.some(g=>g.id===id))).flatMap(r=>r.variants.map(([warning,direction])=>({ids:r.ids,theme:r.theme,warning,direction}))).filter(r=>!goals.some(g=>g.tone==='明確警醒')||warningToneOf(r.warning)==='明確警醒');
}
// Require the entire approved joint realization, including both concrete directions.
function jointDevelopmentCoverage(goals,comment){
 const covered=new Set();
 for(let i=0;i<goals.length;i++)for(let j=i+1;j<goals.length;j++)for(const r of jointDevelopmentFor([goals[i],goals[j]])){
  if(jointLeads.some(l=>comment.includes(r.warning+'，'+l+r.direction)))for(const id of r.ids)covered.add(id);
 }
 return covered;
}
function termPool(p,profile){
 const out=new Map(),leads=termLeads(profile),first=(p.observed.length?p.observed:p.strengths).slice(0,12),second=p.strengths.slice(0,20);
 const groups=p.goals.map(g=>[g]);
 for(let i=0;i<Math.min(p.goals.length,6);i++)for(let j=i+1;j<Math.min(p.goals.length,6);j++){
  const a=p.goals[i],b=p.goals[j];if((p.observedGoals.length>=2||p.low<=2&&a.source==='等第'&&b.source==='等第')&&a.label!==b.label&&(a.dim!==b.dim||a.source==='觀察'&&b.source==='觀察'))groups.push([a,b]);
 }
 const heads=[];
 for(const a of first){
  heads.push({ss:[a],text:a.phrase});
  for(const b of second)if(termDistinct(a,b)){heads.push({ss:[a,b],text:a.phrase+'，'+b.phrase});heads.push(...portraitHeads(a,b));if(p.observedGoals.length>=2)heads.push(...integratedPraise(a,b));}
 }
 // A third assertion is allowed only when independently supported by a distinct
 // rubric dimension. Limit candidates to the shortest approved wording per dimension.
 const multi=p.observedGoals.length>=2;
 if(multi){
  const shortByDim=new Map();
  for(const e of p.strengths.filter(e=>e.source==='等第'&&e.grade>=3)){
   const old=shortByDim.get(e.dim);if(!old||length(e.phrase)<length(old.phrase))shortByDim.set(e.dim,e);
  }
  for(const h of heads.slice()){
   if(h.ss.length!==2||h.ss.some(e=>e.source==='中性'))continue;
   if(h.ss[0].dim===h.ss[1].dim)continue;
   for(const c of shortByDim.values()){
    if(h.ss.some(e=>e.dim===c.dim||!termDistinct(e,c)))continue;
    const text=h.text+'，'+c.phrase;
    if(length(text)<=22)heads.push({ss:[...h.ss,c],text,fused:!!h.fused,multiOnly:true});
    const alternative=c.grade>=4?['日常常規良好','整潔習慣良好','日常禮節合宜','班級服務良好','誠信表現良好','自律表現良好'][c.dim]:null;
    if(alternative){const v=h.text+'，'+alternative;if(length(v)<=22)heads.push({ss:[...h.ss,c],text:v,fused:!!h.fused,multiOnly:true});}
   }
  }
 }
 const record=(head,gg,surfaces,lead,tail,sep,bridge=false,warnings=[],contrast='',variant=false,goalJoiner='，並',syntax='',joint=null)=>{
  if(!head.ss.filter(e=>e.source==='觀察').every(e=>head.text.includes(e.phrase)))return;
  if(head.ss.some(e=>e.source==='等第'&&(e.grade<3||p.blockedGradeDimensions.includes(e.dim))))return;
  const goal=joint?joint.direction:surfaces.join(goalJoiner),warning=joint?joint.warning:warnings.map(w=>w.text).join('，'),expectation=lead+goal+(tail?'，'+tail:'')+'。';
  // Keep exact evidence phrases; only rearrange grammatical, compatible slots.
  let text=head.text+sep+(warning?contrast+warning+'，':'')+expectation;
  if(syntax==='轉折收束')text=head.text+'，但'+warning+'；'+expectation;
  if(syntax==='提醒另句')text=head.text+'；'+warning+'。'+expectation;
  if(syntax==='承接雙段')text=head.text+'。'+warning+'；'+expectation;
  if(syntax==='讓步轉折')text='雖'+head.text+'，惟'+warning+'；'+expectation;
  const n=length(text);
  // Punctuality must name the actual habit, not disappear into generic time management.
  if(gg.some((g,i)=>{const domain=g.id==='punctual'?/守時/:g.id==='focus'?/學習專注/:null;return domain&&!domain.test((warnings.find(w=>w.id===g.id)?.text||'')+surfaces[i]);}))return;
  if(syntax&&(!warning||head.ss.some(e=>e.source==='中性')))return;
  if(p.focus==='延續優勢'&&tail&&/持續|繼續|延續/.test(goal)&&/持續|繼續|延續/.test(tail)&&/發揮|展現/.test(goal)&&/發揮|展現/.test(tail))return;
  if(n<42||n>50||out.has(text)||eventWording.test(text)||harshWording.test(text)||/能[^，；。]{0,18}更能/.test(text)||validate(text,[]).length)return;
  out.set(text,{text,ss:head.ss,gg,surfaces,form:warnings.length?'明確提醒與發展':bridge?'優勢延伸篇章':sep==='。'?'雙句學期期許':'分號學期期許',n,headText:head.text,headLen:length(head.text),tail,fused:!!head.fused,integratedPraise:!!head.integratedPraise,bridge,warnings,variant,joint,syntax:syntax||(warnings.length?(termConditionPattern.test(lead)?'提醒後條件':'提醒後期許'):(sep==='。'?'並列雙句':'分號連貫'))});
 };
 const add=(head,gg,surfaces,lead,tail,sep,bridge=false,warnings=[])=>{
  record(head,gg,surfaces,lead,tail,sep,bridge,warnings);
  // Add only independent surface variants, not the Cartesian product.
  if(sep!=='；')return;
  if(lead==='期許能'&&!tail){
   for(const l of termSurfaceLeads)record(head,gg,surfaces,l,tail,sep,bridge,warnings,'',true);
   if(warnings.length&&head.ss.some(e=>e.source!=='中性')){
    for(const c of termContrastLeads)record(head,gg,surfaces,lead,tail,sep,bridge,warnings,c,true);
    // Additional realizations are independent, not Cartesian products.
    if(warnings.length===1)for(const form of semesterSyntaxForms.slice(4))record(head,gg,surfaces,lead,tail,sep,bridge,warnings,'',true,'，並',form);
   }
   if(head.ss.length===2&&head.text.includes('，也能'))for(const a of termAdditions)record({...head,text:head.text.replace('，也能','，'+a)},gg,surfaces,lead,tail,sep,bridge,warnings,'',true);
   if(surfaces.length===2)for(const joiner of termGoalJoiners.slice(1))record(head,gg,surfaces,lead,tail,sep,bridge,warnings,'',true,joiner);
  }
  if(lead==='若能'&&tail)for(const l of termConditionalLeads)record(head,gg,surfaces,l,tail,sep,bridge,warnings,'',true);
 };
 for(const head of heads)for(const gg of groups){
  if(head.multiOnly&&gg.length<2)continue;
  // One shared concern, one coherent developmental direction, two evidence links.
  for(const joint of jointDevelopmentFor(gg))for(const lead of jointLeads)for(const sep of ['；','。']){
   if(head.ss.length>2)continue; // Avoid a praise checklist as well.
   record(head,gg,gg.map(()=>joint.direction),lead,'',sep,false,gg.map(g=>({id:g.id,text:joint.warning,joint:true})),'',true,'，並','',joint);
  }
  const a=gg[0],vs=gg.length===1?a.variants.map(v=>[v]):a.variants.slice(0,2).flatMap(x=>gg[1].variants.slice(0,2).map(y=>[x,y]));
  if(gg.length===1)for(const bridge of bridgesFor(a))if(anchorFor(head,bridge))for(const v of bridge.variants)for(const l of ['期許能','期盼能','希望能','期待能']){add(head,gg,[v],l,'','；',true);add(head,gg,[v],l,'','。',true);}
  const flagged=gg.filter(g=>g.warningVariants?.length);
  if(flagged.length){
   const warningSets=flagged.length===1?flagged[0].warningVariants.map(text=>[{id:flagged[0].id,text}]):[...flagged[0].warningVariants.slice(0,2),flagged[0].warningVariants.at(-1)].flatMap(x=>[...flagged[1].warningVariants.slice(0,2),flagged[1].warningVariants.at(-1)].map(y=>[{id:flagged[0].id,text:x},{id:flagged[1].id,text:y}]));
   const directions=gg.length===1?(a.warningDirections?.length?a.warningDirections:a.variants.slice(0,3)).map(v=>[v]):(a.warningDirections?.length?unique([...a.warningDirections.slice(0,2),a.warningDirections.at(-1)]):a.variants.slice(0,2)).flatMap(x=>(gg[1].warningDirections?.length?unique([...gg[1].warningDirections.slice(0,2),gg[1].warningDirections.at(-1)]):gg[1].variants.slice(0,2)).map(y=>[x,y]));
   for(const warnings of warningSets){
    for(const surfaces of directions){
     for(const l of ['期許能','盼能','期盼能','希望能','期待能']){add(head,gg,surfaces,l,'','；',false,warnings);add(head,gg,surfaces,l,'','。',false,warnings);}
     if(gg.length===1)for(const tail of termConsequences(a,p.focus))add(head,gg,surfaces,'若能',tail,'；',false,warnings);
    }
    if(gg.length===1)for(const bridge of bridgesFor(a))if(anchorFor(head,bridge))for(const v of bridge.variants)for(const l of ['期許能','盼能','希望能'])add(head,gg,[v],l,'','；',true,warnings);
   }
  }
  for(const surfaces of vs){
   // Count the invariant string once before enumerating connectors.
   const base=length(head.text+surfaces.join('，並'))+2;
   for(const l of leads){
    const size=base+length(l);
    if(l!=='若能'&&size>=42&&size<=50)for(const sep of ['；','。'])add(head,gg,surfaces,l,'',sep);
    if(gg.length===1&&size<50)for(const tail of (l==='若能'?termConsequences(a,p.focus):termOutcomes(a,p.focus))){
     if(size+1+length(tail)>=42&&size+1+length(tail)<=50)add(head,gg,surfaces,l,tail,'；');
    }
   }
  }
 }
 return [...out.values()];
}
const termCache=new Map();
function termCandidates(p,profile){
 const small={focus:p.focus,low:p.low,blockedGradeDimensions:p.blockedGradeDimensions||[],strengths:p.strengths.map(slot),observed:p.observed.map(slot),goals:p.goals.map(e=>({...slot(e),label:e.label,variants:e.variants,warningVariants:e.warningVariants,warningDirections:e.warningDirections,tone:e.tone})),observedGoals:p.observedGoals.map(slot)};
 const key=JSON.stringify([small,termLeads(profile)]);
 if(termCache.has(key)){const a=termCache.get(key);termCache.delete(key);termCache.set(key,a);return a;}
 const a=termPool(small,profile).map(c=>termStatic(c,small));if(a.length<=48000&&key.length<=16000){termCache.set(key,a);let total=[...termCache.values()].reduce((n,v)=>n+v.length,0);while(termCache.size>8||total>55000){const k=termCache.keys().next().value;total-=termCache.get(k).length;termCache.delete(k);}}return a;
}
// History-only semantic fingerprints. Neither history nor fingerprint tags
// add any student evidence. Distinct paraphrases of the same topic count once.
const semesterTopicRules=[
 ['生活條理',/生活常規|生活習慣|生活安排|日常生活|生活步調|處事條理|生活準備|生活大致有序|時間安排|安排時間|守時/],
 ['環境責任',/整潔|環境維護|維護環境|整理環境|周遭環境|愛護公物|清潔/],
 ['待人相處',/待人|應對|禮節|禮貌|人際|相處|體諒|包容|尊重彼此|同儕|不同的想法|不同意見/],
 ['團體參與',/班級事務|班級服務|班級生活|服務精神|服務表現|分內工作|分擔工作|協助同學|助人|關懷同學|合作/],
 ['誠信承擔',/誠信|誠懇|言行一致|守信|承諾|信任|信賴/],
 ['生活自律',/自律|自我管理|團體規範|團體生活規範|自我要求|團體秩序/],
 ['學習態度',/學習|複習|作業|專注|請益/],
 ['個人特質',/個性|沉靜|沉穩|勇於表達|活潑|領導/]
];
const semesterTopics=s=>semesterTopicRules.filter(([,re])=>re.test(s)).map(([k])=>k);
export function semesterSemanticSignature(text){
 const s=String(text||''),m=/[，；。]((?:若能|如能|倘能|如果能|假如能|倘若能)|(?:期許|希望|期待|期盼|期望|也期盼|也盼|亦盼|盼望|盼)(?:日後|今後|未來)?(?:妳|你)?能)/.exec(s);
 let opening=m?s.slice(0,m.index):s,development=m?s.slice(m.index+m[0].length):'';
 const warn=opening.match(/^(.*?)(?:[；。]|，(?:但|惟))([^；。]+(?:仍|有待)[^；。]*)$/);if(warn){opening=warn[1];development=warn[2]+'，'+development;}
 const strengths=semesterTopics(opening),goals=semesterTopics(development);
 const lead=m?m[1].replace(/(?:妳|你)?能$/,''):'其他';
 const strengthKey=strengths.join('+')||'未分類',goalKey=goals.join('+')||'未分類';
 const transition=s.match(/[；。，](值得留意的是|須留意的是|另一方面|然而|不過|只是|但|惟)(?:，)?/)?.[1]||'無明示';
 const addition=opening.match(/，(同時也能|並且能|同時能|也能|亦能|並能|且能|又能)/)?.[1]||'無明示';
 return {strengths,goals,strengthKey,goalKey,pairKey:strengthKey+'→'+goalKey,lead,transition,addition};
}
function semesterHistoryDiversity(history){
 const div=diversityIndex(history),strengths=new Map(),goals=new Map(),pairs=new Map(),leads=new Map(),transitions=new Map(),additions=new Map(),forms=new Map(),praiseParts=new Map();
 for(const text of history){
  const s=semesterSemanticSignature(text),syntax=semesterStructure(text);
  forms.set(syntax.form,(forms.get(syntax.form)||0)+1);
  for(const part of syntax.headParts)praiseParts.set(part,(praiseParts.get(part)||0)+1);
  for(const [map,key] of [[strengths,s.strengthKey],[goals,s.goalKey],[pairs,s.pairKey],[leads,s.lead],[transitions,s.transition],[additions,s.addition]])map.set(key,(map.get(key)||0)+1);
 }
 return {...div,forms,praiseParts,semantic:{strengths,goals,pairs,leads,transitions,additions}};
}
function semanticDiversityPenalty(s,div){
 const d=div.semantic;if(!d)return 0;
 // Bounded soft ranking: explicit observations and hard validation still win.
 const pair=s.strengthKey==='未分類'&&s.goalKey==='未分類'?0:Math.min(5,(d.pairs.get(s.pairKey)||0)*1.5);
 const strength=s.strengthKey==='未分類'?0:Math.min(2.8,(d.strengths.get(s.strengthKey)||0)*.65);
 const goal=s.goalKey==='未分類'?0:Math.min(1.8,(d.goals.get(s.goalKey)||0)*.3);
 return pair+strength+goal+Math.min(2.4,(d.leads.get(s.lead)||0)*.55)+Math.min(1.4,(d.transitions.get(s.transition)||0)*.24)+Math.min(1.2,(d.additions.get(s.addition)||0)*.20);
}
// Measure substantive evidence and developmental content, not transition filler.
const contentLength=s=>String(s||'').replace(/[\s，。；、！？：]/g,'').length;
function semesterBalance(c,p){
 const positive=c.ss.some(e=>e.source!=='中性')?contentLength(c.headText):0;
 const concern=c.joint?contentLength(c.joint.warning):(c.warnings||[]).reduce((n,w)=>n+contentLength(w.text),0);
 const development=(c.joint?contentLength(c.joint.direction):c.surfaces.reduce((n,v)=>n+contentLength(v),0))+contentLength(c.tail);
 const total=positive+concern+development,ratio=total?positive/total:0;
 const available=p.strengths.some(e=>e.source!=='中性');
 const target=!available?0:p.focus==='延續優勢'?.52:c.gg.length>1?.40:.46;
 const penalty=available?Math.max(0,target-ratio)*42+Math.max(0,.34-ratio)*55+Math.max(0,ratio-.65)*8:0;
 return {positive,concern,development,ratio,target,penalty,limited:!available};
}
function semesterStructure(text){
 const s=String(text||''),head=s.split(/[；。]|，(?:但|惟)/)[0].replace(/^雖/,'');
 const warning=/(?:仍須|仍需|仍待|仍有|仍不|仍未|有待)/;
 let form='分號連貫';
 if(/^雖.+，惟/.test(s))form='讓步轉折';
 else if(/，但[^；。]+；/.test(s))form='轉折收束';
 else if(/；[^；。]+。[^；。]+。$/.test(s)&&warning.test(s.split('；')[1]?.split('。')[0]||''))form='提醒另句';
 else if(/。[^；。]+；/.test(s)&&warning.test(s.split('。')[1]?.split('；')[0]||''))form='承接雙段';
 else if(warning.test(s.slice(head.length)))form=termConditionPattern.test(s)?'提醒後條件':'提醒後期許';
 else if(s.split('。').length>2)form='並列雙句';
 return {form,headParts:splitText(head).map(x=>normalize(x).replace(/^(?:同時也|並且|同時|亦|也|並|且|又)(?=能)/,'')).filter(Boolean)};
}
// Explainable quality signals for wording, not additional claims about pupils.
const improvementActions=[['加強',/加強|增強|強化/],['改善',/改善|改進|調整/],['培養',/培養|養成|建立/],['重視',/重視|留意|注重/],['履責',/盡好|履行|落實|承擔|完成/],['理解',/理解|體諒|包容|尊重/],['規劃',/規劃|安排|掌握/],['延續',/延續|持續|保持/]];
const wordingTopics=s=>unique([...semesterTopics(s),...(/時間管理|時間觀念|守時|時間規劃/.test(s)?['守時與時間']:[])]);
const sameWordingTopic=(a,b)=>wordingTopics(a).some(t=>wordingTopics(b).includes(t));
export function semesterWordingQuality(head,warnings=[],directions=[],tail=''){
 const warningEcho=warnings.reduce((n,w,i)=>{
  const v=directions[i]||'',a=improvementActions.find(([,re])=>re.test(w))?.[0],b=improvementActions.find(([,re])=>re.test(v))?.[0];
  // Required concepts can recur; only the same action plus same topic is redundant.
  return n+Number(!!a&&a===b&&sameWordingTopic(w,v));
 },0);
 const modalCount=String(head||'').split('，').filter(t=>/^(?:也|亦|並且|並|且|又|同時也|同時)?能/.test(t)).length;
 const stacked=(String(head||'').match(/(?:並且|同時)能[^，；。]{0,10}(?:並|同時)/g)||[]).length;
 const tailEcho=tail?improvementActions.filter(([,re])=>re.test(tail)&&directions.some(v=>re.test(v)&&sameWordingTopic(tail,v))).length:0;
 const repeatedAction=directions.length>1?Number(improvementActions.some(([,re])=>directions.every(v=>re.test(v)))):0;
 const penalty=Math.min(12,warningEcho*3.8+Math.max(0,modalCount-1)*2.4+stacked*2+tailEcho*1.2+repeatedAction*1.4);
 return {warningEcho,modalCount,stacked,tailEcho,repeatedAction,penalty};
}
// Local, closed-vocabulary style learning. Historical samples are analyzed for
// structure only: no source text, student fact, topic, or name enters this model.
const semesterStyleKeys=['form','leadFamily','transition','cadence','address','temporal','sentenceCount','lengthBand'];
function semesterStyleFeatures(text,structure=semesterStructure(text),semantic=semesterSemanticSignature(text)){
 const lead=semantic.lead;
 return {form:structure.form,leadFamily:/^(若|如|倘|如果|假如)/.test(lead)?'條件':/^(希望|期望)/.test(lead)?'希望':/^(期許|期待)/.test(lead)?'期許':/盼/.test(lead)?'盼望':'其他',
 transition:semantic.transition==='無明示'?'無明示':'明示',cadence:structure.headParts.length<=1?'單項':structure.headParts.length===2?'雙項':'多項',
 address:/[妳你]/.test(text)?'直接':'間接',temporal:/日後|今後|未來/.test(lead)?'有時間語':'無時間語',
 sentenceCount:(text.match(/。/g)||[]).length>1?'雙句':'單句',lengthBand:length(text)<=45?'短':length(text)<=48?'中':'長'};
}
export function semesterStyleModel(profile={}){
 const samples=unique((Array.isArray(profile.examples)?profile.examples:[]).filter(t=>typeof t==='string'&&length(t)>=20&&length(t)<=120)).slice(-12);
 const counts=Object.fromEntries(semesterStyleKeys.map(k=>[k,{}]));
 for(const text of samples){const f=semesterStyleFeatures(text);for(const k of semesterStyleKeys)counts[k][f[k]]=(counts[k][f[k]]||0)+1;}
 const n=samples.length;
 return {samples:n,confidence:n<3?0:Math.min(1,(n-2)/6),counts};
}
function semesterStyleFeatureFit(f,model){
 if(!model?.confidence)return 0;
 const weights={form:1.8,leadFamily:1.7,transition:.8,cadence:1,address:1,temporal:.6,sentenceCount:1,lengthBand:.5};
 const score=semesterStyleKeys.reduce((n,k)=>{
  const v=model.counts[k][f[k]]||0,peak=Math.max(0,...Object.values(model.counts[k]));
  // Compare to the strongest style choice; Laplace smoothing keeps rare choices viable.
  return n+weights[k]*Math.log((v+1)/(peak+1));
 },0);
 return Math.max(-4,score*.55*model.confidence);
}
export const semesterStyleFit=(text,model)=>semesterStyleFeatureFit(semesterStyleFeatures(text),model);
function termStatic(c,p){
 const selected=[...c.ss,...c.gg],covered=[...p.observed,...p.goals.filter(x=>x.source==='觀察')].filter(e=>selected.some(x=>x.kind===e.kind&&x.id===e.id&&x.phrase===e.phrase)||e.kind==='goal'&&c.surfaces.some(v=>e.variants?.includes(v)||c.bridge&&bridgesFor(e).some(b=>b.variants.includes(v))));
 const parts=splitText(c.text),shape=(c.text.match(/[，；。！？]/g)||[]).join(''),dup=['生活','穩定','成熟','責任','表現','習慣','自我要求','更加','持續','團體','待人','逐步','相處','人際','互動','能維持','人我','整潔','規範','言行','守時','承擔','主動','學習'].reduce((n,w)=>n+Math.max(0,c.text.split(w).length-2),0);
 const grade=c.ss.filter(e=>e.source==='等第').reduce((n,e)=>n+e.grade-2,0),balance=c.ss.every(x=>x.source==='中性')?0:-Math.abs(c.headLen-22)*.3,mismatch=p.focus==='延續優勢'&&c.ss.some(e=>c.gg.some(g=>g.dim===e.dim))?1:0;
 let coherence=0;
 if(c.ss.some(e=>e.source==='觀察'))for(const b of c.ss.filter(e=>e.source==='等第')){
  if(b.dim===3&&c.ss.some(e=>['help','carePeers'].includes(e.id)))coherence+=3;
  if(b.dim===3&&c.ss.some(e=>e.dim===2&&e.source==='觀察'))coherence+=1.8;
  if(b.dim===1&&c.gg.some(e=>e.dim!==1))coherence-=1.2;
 }
 const redundantOutcome=c.tail&&(/更臻成熟|更加成熟|更為成熟/.test(c.tail)&&/更加成熟|更臻成熟/.test(c.surfaces.join('')))?2.5:0;
 const degreePenalty=c.gg.reduce((n,e,i)=>n+(e.source==='等第'&&e.grade===1&&!/逐步|建立|基本|培養/.test(c.surfaces[i])?3:0),0);
 const repeatedDevelopment=/逐步[^。；]{0,30}逐步/.test(c.text)?4:0;
 const parallelModal=c.ss.length===2&&c.ss.every(e=>e.phrase.startsWith('能'))?1.4:0;
 const repeatedCausative=c.tail&&/^[使讓]/.test(c.tail)&&c.surfaces.some(v=>/^[使讓]/.test(v))?2:0;
 const bureaucratic=(c.text.match(/更臻成熟|人我調和|調和人我|人我互動|更具發展性|確實度|規範的實踐|責任的實踐|應對的合宜性|表現的穩定度/g)||[]).length*4;
 const genericTail=/^(?:使|讓)(?:整體|個人|日常)表現|^整體表現將/.test(c.tail||'')?1.8:0;
 const natural=c.surfaces.reduce((n,v,i)=>n+((naturalGoals.get(c.gg[i].label)||[]).includes(v)||c.gg[i].source==='等第'&&naturalGrade[c.gg[i].dim]?.includes(v)?2.6:0),0);
 const overlap=c.ss.filter(e=>e.source==='等第'&&[0,5].includes(e.dim)&&c.gg.some(g=>g.source==='等第'&&[0,5].includes(g.dim)&&p.focus!=='延續優勢')).length*2;
 const repeatedTail=c.tail?['時間安排','持續','發揮','團體','用心','守時','整潔','相處','責任'].reduce((n,w)=>n+(c.tail.includes(w)&&c.surfaces.some(v=>v.includes(w))?2:0),0):0;
 const relation=discourseRelation(c,p.focus),crossClause=consequenceOverlap(c.surfaces,c.tail),composition=semesterBalance(c,p),structure=semesterStructure(c.text),wording=semesterWordingQuality(c.headText,c.joint?[c.joint.warning]:c.gg.map(g=>c.warnings?.find(w=>w.id===g.id)?.text||''),c.joint?[c.joint.direction]:c.surfaces,c.tail);
 const toneFit=(c.warnings||[]).reduce((n,w)=>{const g=c.gg.find(g=>g.id===w.id);return n+(g?.tone===warningToneOf(w.text)?3.2:0);},0);
 const portraitBonus=(c.fused?2.2:0)+natural+(c.bridge?8:0)+(relation==='延續所長'?2.5:0)+toneFit;
 const semantic=semesterSemanticSignature(c.text),styleFeatures=semesterStyleFeatures(c.text,structure,semantic);
 return {...c,composition,structure,wording,semantic,styleFeatures,warningCoverage:c.warnings?.length||0,goalCoverage:covered.filter(e=>e.kind==='goal').length,coverage:covered.length,priority:covered.reduce((n,e)=>n+evidenceWeight(e),0),open:parts[0],end:parts.at(-1),shape,connector:connectiveFamily(c.text),base:grade+balance+coherence-dup*1.6-mismatch-Math.abs(c.n-48)*.25-(c.tail?0.6:0)-redundantOutcome-repeatedDevelopment-degreePenalty-parallelModal-repeatedCausative-bureaucratic-genericTail-overlap-repeatedTail-crossClause+portraitBonus-composition.penalty-wording.penalty+(c.joint?12:0)+(c.joint&&c.integratedPraise?2.4:0)-(c.warnings?.length>1&&!c.joint?5:0)-(c.variant?.35:0),relation,semicolon:c.text.includes('；'),twoSentences:c.text.split('。').length>2,conditional:termConditionPattern.test(c.text),wish:/希望|期許|期待|期盼|盼望|盼能|期望/.test(c.text)};
}
function termScore(c,profile,div,localStyle){
 const diversity=-(div.openings.get(c.open)||0)*.8-(div.endings.get(c.end)||0)*.6-(div.connectives.get(c.connector)||0)*.15-(div.shapes.get(c.shape)||0)*.05;
 const style=profile.model?.total||profile.structure||profile.preferred?.length?styleFit(c.text,profile):0;
 const w=profile.discourse?.weights||{},learn=(w.semicolon||0)*Number(c.semicolon)+(w.twoSentences||0)*Number(c.twoSentences)+(w.conditional||0)*Number(c.conditional)+(w.directWish||0)*Number(c.wish);
 const syntaxPenalty=Math.min(5,(div.forms.get(c.structure.form)||0)*.85);
 const praisePenalty=c.structure.headParts.reduce((n,part)=>n+Math.min(2.4,(div.praiseParts.get(part)||0)*.38),0);
 return c.base+diversity+style*2+learn-semanticDiversityPenalty(c.semantic,div)-syntaxPenalty-praisePenalty+semesterStyleFeatureFit(c.styleFeatures,localStyle);
}
export function semesterCoverage(note,scores,comment,custom=[]){
 const p=semesterPlan(scores,note,{semanticRules:custom});
 if(!p.evidence.complete)return {recognized:0,missingStrengths:[],missingGoals:[],deferred:p.deferred||[]};
 const joint=jointDevelopmentCoverage(p.observedGoals,comment);
 return {recognized:p.observed.length+p.observedGoals.length,missingStrengths:p.observed.filter(e=>!comment.includes(e.phrase)).map(e=>e.phrase),missingGoals:p.observedGoals.filter(e=>!joint.has(e.id)&&(![...e.variants,...(e.bridgeVariants||[])].some(v=>comment.includes(v))||e.warningVariants?.length&&!e.warningVariants.some(v=>comment.includes(v)))).map(e=>e.phrase),missingWarnings:p.observedGoals.filter(e=>!joint.has(e.id)&&e.warningVariants?.length&&!e.warningVariants.some(v=>comment.includes(v))).map(e=>e.phrase),deferred:p.deferred};
}
// Style is a tie-breaker within an evidence-equivalent, quality-bounded pool.
// Do not force an unsuitable style just because the teacher often uses it.
function selectSemesterCandidate(ranked,hf,model){
 const first=ranked.find(x=>riskAgainst(x.c.text,hf)<=.78);
 if(!first)return {best:null,adaptation:{applied:false,reason:'無合規候選'}};
 const ref=first.c,counts=model.counts.leadFamily||{},preferred=Object.entries(counts).filter(([k])=>k!=='其他').sort((a,b)=>b[1]-a[1])[0];
 const reliable=model.samples>=6&&preferred&&preferred[1]/model.samples>=.75;
 const baseInfo={applied:false,preferred:reliable?preferred[0]:null,baseline:ref.styleFeatures.leadFamily,selected:ref.styleFeatures.leadFamily,reason:reliable?'原候選符合偏好':'樣本不足或偏好未集中'};
 if(!reliable||ref.styleFeatures.leadFamily===preferred[0])return {best:ref,adaptation:baseInfo};
 const toneMatches=c=>(c.warnings||[]).filter(w=>c.gg.find(g=>g.id===w.id)?.tone===warningToneOf(w.text)).length;
 const signature=c=>c.ss.map(e=>e.source==='觀察'?e.id+':'+e.phrase:'').filter(Boolean).sort().join('|')+'→'+c.gg.filter(e=>e.source==='觀察').map(e=>e.id).sort().join('|');
 const sig=signature(ref),tone=toneMatches(ref);
 let chosen=null,eligible=0;
 for(const x of ranked){
  const c=x.c;
  if(c.warningCoverage!==ref.warningCoverage||c.goalCoverage!==ref.goalCoverage||c.coverage!==ref.coverage||c.priority!==ref.priority)continue;
  if(x.score<first.score-6)break;
  if(c.styleFeatures.leadFamily!==preferred[0]||signature(c)!==sig||toneMatches(c)<tone||c.composition.ratio<ref.composition.ratio-.035||c.wording.penalty>ref.wording.penalty+1||ref.bridge&&!c.bridge||ref.fused&&!c.fused||ref.joint&&!c.joint)continue;
  eligible++;
  if(riskAgainst(c.text,hf)>.78)continue;
  chosen=x;break;
 }
 if(!chosen)return {best:ref,adaptation:{...baseInfo,reason:'無同等證據與品質的偏好候選',eligible}};
 return {best:chosen.c,adaptation:{...baseInfo,applied:true,selected:chosen.c.styleFeatures.leadFamily,reason:'同等證據且品質界限內',eligible,scoreCost:first.score-chosen.score}};
}
export function deepGenerate(scores,note='',history=[],profile={}){
 const p=semesterPlan(scores,note,profile);
 if(!p.evidence.complete)return {comment:'',source:'incomplete',characters:0,plan:p,chosenStrengths:[],chosenGoals:[],issues:['評分未完成'],coverage:{recognized:0,missingStrengths:[],missingGoals:[],deferred:p.deferred},quality:{}};
 const div=semesterHistoryDiversity(history),hf=history.map(similarityFeatures),localStyle=semesterStyleModel(profile);
 const ranked=termCandidates(p,profile).map(c=>({c,score:termScore(c,profile,div,localStyle)})).sort((a,b)=>b.c.warningCoverage-a.c.warningCoverage||b.c.goalCoverage-a.c.goalCoverage||b.c.coverage-a.c.coverage||b.c.priority-a.c.priority||b.score-a.score);
 const selection=selectSemesterCandidate(ranked,hf,localStyle),best=selection.best,comment=best?.text||'';
 const coverage=semesterCoverage(note,scores,comment,profile.semanticRules||[]);
 const chosenStrengths=(best?.ss||[]).map(e=>({phrase:e.phrase,source:e.source,dimension:dims[e.dim]||'補充觀察'}));
 const chosenGoals=(best?.gg||[]).map((e,i)=>({phrase:best.surfaces[i],canonical:e.phrase,concept:e.label,source:e.source,dimension:dims[e.dim]||'補充觀察',frequency:e.frequency||'未明'}));
 return {comment,source:best?'deep':'unavailable',characters:length(comment),plan:p,chosenStrengths,chosenGoals,coverage:{...coverage,unknown:p.evidence.unknown.length},issues:best?validate(comment,history):['暫無符合學期評量及字數去重規範的候選評語'],quality:{level:'學期總結性評量',evidence:best?{strengths:best.ss.map(e=>({source:e.source,dimension:e.dim,grade:e.grade??null,concept:e.id,canonical:e.phrase})),blockedGradeDimensions:p.blockedGradeDimensions||[],unresolved:p.evidence.unknown.length}:null,form:best?.form||'',syntax:best?.syntax||'',balance:best?.composition||null,wording:best?.wording||null,style:best?{samples:localStyle.samples,confidence:localStyle.confidence,fit:semesterStyleFeatureFit(best.styleFeatures,localStyle),features:best.styleFeatures,adaptation:selection.adaptation}:null,tone:best?best.gg.map(g=>({concept:g.label,target:g.tone,realized:best.warnings?.find(w=>w.id===g.id)?warningToneOf(best.warnings.find(w=>w.id===g.id).text):g.tone})):[],action:'',connective:connectiveFamily(comment),learnedSamples:profile.discourse?.samples||0,openingLength:best?.headLen||0,portrait:best?{fused:best.fused,strengthThemes:unique(best.ss.filter(e=>e.source!=='中性').map(portraitTheme)),growthThemes:unique(best.gg.map(portraitTheme))}:null,discourse:best?{relation:best.relation,bridged:best.bridge,crossClauseOverlap:consequenceOverlap(best.surfaces,best.tail)}:null,warning:best?{explicit:best.warnings||[],missing:coverage.missingWarnings||[],realizedClauses:best.joint?1:(best.warnings||[]).length}:null,integration:best?.joint?{theme:best.joint.theme,concepts:best.joint.ids,warning:best.joint.warning,direction:best.joint.direction,integratedPraise:best.integratedPraise}:null,semantic:best?{...best.semantic,historyPenalty:semanticDiversityPenalty(best.semantic,div)}:null}};
}
export const deepDraft=(scores,note='',history=[],profile={})=>deepGenerate(scores,note,history,profile).comment;
export function deepAlternatives(scores,note='',history=[],profile={},current='',limit=3){
 const out=[],excluded=[...history,...(current?[current]:[])];for(let i=0;i<Math.min(6,limit);i++){const c=deepDraft(scores,note,[...excluded,...out],profile);if(!c||validate(c,[...excluded,...out]).length)break;out.push(c);}return out;
}
