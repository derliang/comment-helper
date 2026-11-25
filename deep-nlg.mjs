import {dims,complete,length,validate,similarity,styleFit,gradeGuidance,analyzeObservation,builtinSemanticRules,validSemanticRule,draft} from './engine.mjs';
export const NLG_VERSION='1.1.1';

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
function riskAgainst(s,history){
 let max=0;for(const h of history){max=Math.max(max,similarity(s,h));if(max>.78)break;}return max;
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
      for(const b of second){if(distinct(a,b))add(a.phrase+'，'+b.phrase+'；'+t+'。',[a,b],gg,'雙肯定－具體行動',action,surface);}
     }
    }
   }
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
