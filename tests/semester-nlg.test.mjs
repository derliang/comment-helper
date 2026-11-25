import test from 'node:test';import assert from 'node:assert/strict';import {deepGenerate,deepAlternatives,semesterCoverage,semesterPlan,semesterSemanticSignature,semesterLanguageInventory,semesterLexicalInventory,semesterToneSyntaxInventory,semesterWordingQuality,semesterStyleModel,semesterStyleFit} from '../deep-nlg.mjs';import {validate} from '../engine.mjs';
const s=[4,4,4,4,4,3];
test('semester evaluation abstracts incidents into enduring developmental concepts',()=>{for(const [note,concept,re] of [['待人有禮，但擅自離開教室','生活自律與規範',/自律|自我管理/],['熱心協助同學，但經常與同學爭執','人我調和',/人我|人際|相處/],['熱心協助同學，但經常遲到','時間管理',/守時/],['熱心協助同學，但忘記打掃','整潔與責任',/整潔|環境維護/]]){const x=deepGenerate(s,note);assert.match(x.comment,re);assert.ok(x.chosenGoals.some(e=>e.concept===concept));assert.deepEqual(x.coverage.missingGoals,[]);assert.deepEqual(x.issues,[]);assert.doesNotMatch(x.comment,/先向師長說明|先聽對方說完|擅自離開|將有助於|提早做好出門/);assert.equal(x.quality.level,'學期總結性評量');}});
test('explicit isolated incidents do not establish semester-wide defects or strengths',()=>{const p=semesterPlan([4,4,4,4,4,4],'待人有禮，但今天擅自離開教室，某次協助班級活動');assert.equal(p.deferred.length,2);assert.equal(p.focus,'延續優勢');assert.equal(p.observedGoals.length,0);assert.ok(!p.observed.some(e=>e.id==='classEvents'));const x=deepGenerate([4,4,4,4,4,4],'今天擅自離開教室');assert.equal(x.plan.focus,'延續優勢');assert.deepEqual(x.issues,[]);});
test('observed semantic aliases count as coverage, not just literal old goal wording',()=>{const note='熱心協助同學，但經常與同學爭執',x=deepGenerate(s,note);assert.equal(x.coverage.missingGoals.length,0);assert.deepEqual(semesterCoverage(note,s,x.comment).missingGoals,[]);assert.ok(!x.comment.includes('以平和方式與同學溝通'));});
test('high grades sustain strengths, low grades never invent positive character',()=>{const h=deepGenerate([5,5,5,5,5,5]);assert.equal(h.plan.focus,'延續優勢');assert.match(h.comment,/持續|延續/);const l=deepGenerate([1,1,1,1,1,1]);assert.equal(l.plan.strengths[0].source,'中性');assert.deepEqual(l.issues,[]);assert.doesNotMatch(l.comment,/熱心投入|待人誠懇|主動維護/);});
test('46 pupils remain distinct and exportable; alternatives use semester engine too',()=>{const h=[];for(let i=0;i<46;i++){const s=Array.from({length:6},(_,j)=>2+(i*17+j*13+i*j)%4),note=['','經常遲到','熱心協助同學','上課容易分心','忘記打掃','近期已有明顯進步'][i%6],x=deepGenerate(s,note,h);assert.deepEqual(x.issues,[],i+' '+x.comment);assert.deepEqual(validate(x.comment,h),[]);h.push(x.comment);}assert.equal(new Set(h).size,46);const a=deepGenerate(s,'經常遲到'),alt=deepAlternatives(s,'經常遲到',[],{},a.comment,3);assert.ok(alt.length);for(const c of alt){assert.match(c,/守時/);assert.doesNotMatch(c,/提早做好出門|將有助於/);}});

test('a single incident in the semester is not recurring evidence',()=>{const p=semesterPlan([4,4,4,4,4,4],'本學期有一次擅自離開教室');assert.equal(p.deferred.length,1);assert.equal(p.observedGoals.length,0);assert.equal(p.focus,'延續優勢');});
test('term praise avoids redundant life-routine pairs and retains sparse positive evidence',()=>{const h=deepGenerate([5,5,5,5,5,5]);assert.ok(!h.chosenStrengths.every(e=>['日常生活表現','自律自重'].includes(e.dimension)));const low=deepGenerate([1,2,3,2,1,2]);assert.match(low.comment,/禮節|應對/);assert.deepEqual(low.issues,[]);});
test('all-low, middle and excellent classes retain 46 compliant unique semester comments',()=>{for(const v of [1,3,5]){const h=[];for(let i=0;i<46;i++){const x=deepGenerate(Array(6).fill(v),'',h);assert.deepEqual(x.issues,[],v+' '+i+' '+x.comment);h.push(x.comment);}assert.equal(new Set(h).size,46);}});

test('a developmental expectation does not repeat the same interpersonal conclusion',()=>{const x=deepGenerate([4,4,4,4,4,3],'熱心協助同學，但經常與同學爭執');assert.deepEqual(x.issues,[]);assert.ok((x.comment.match(/相處/g)||[]).length<=1,x.comment);assert.deepEqual(x.coverage.missingGoals,[]);});

test('conditional semester advice has a complete consequence and avoids doubled modal verbs',()=>{
 const h=[];let conditional=0;
 for(let i=0;i<46;i++){
  const x=deepGenerate([4,4,4,4,4,3],['熱心協助同學，但經常與同學爭執','經常遲到','忘記打掃','待人有禮，但擅自離開教室'][i%4],h);
  assert.deepEqual(x.issues,[],x.comment);
  assert.doesNotMatch(x.comment,/能[^，；。]{0,18}更能/);
  if(x.comment.includes('若能')){conditional++;assert.match(x.comment,/若能[^；。]+，[^；。]*(?:將|相信)/);}
  h.push(x.comment);
 }
 assert.ok(conditional>0,'conditional wording must remain available');
});

test('semester portraits preserve observed evidence and only fuse supported strengths',()=>{
 const x=deepGenerate([4,4,4,4,4,3],'熱心協助同學，但經常與同學爭執');
 assert.equal(x.plan.portrait.basis,'觀察與評分');
 assert.ok(x.plan.portrait.observedStrengths.some(e=>e.id==='help'));
 assert.ok(x.plan.portrait.observedGrowth.some(e=>e.id==='peers'));
 assert.equal(x.quality.portrait.fused,true);
 assert.deepEqual(x.coverage.missingStrengths,[]);
 assert.deepEqual(x.coverage.missingGoals,[]);
 assert.doesNotMatch(x.comment,/調和人我|更臻成熟/);
 const low=deepGenerate([1,1,1,1,1,1]);
 assert.equal(low.plan.portrait.limited,true);
 assert.equal(low.quality.portrait.fused,false);
 assert.deepEqual(low.quality.portrait.strengthThemes,[]);
});
test('rating-only portraits do not infer unobserved personality or incidents',()=>{
 const x=deepGenerate([4,4,4,4,4,3]);
 assert.equal(x.plan.portrait.basis,'評分');
 assert.deepEqual(x.plan.portrait.observedStrengths,[]);
 assert.doesNotMatch(x.comment,/個性|天資|領導能力|活潑|內向/);
 const y=deepGenerate([4,4,4,4,4,4],'個性沉穩，熱心協助同學');
 assert.deepEqual(y.coverage.missingStrengths,[]);
 assert.match(y.comment,/個性沉靜/);
 assert.match(y.comment,/樂於協助同學/);
});

test('discourse bridge requires a selected observed strength and preserves goal coverage',()=>{
 const note='熱心協助同學，但經常與同學爭執',x=deepGenerate(s,note);
 assert.equal(x.quality.discourse.bridged,true);
 assert.equal(x.quality.discourse.relation,'優勢延伸');
 assert.match(x.comment,/延伸至/);
 assert.deepEqual(x.coverage.missingGoals,[]);
 assert.deepEqual(semesterCoverage(note,s,x.comment).missingGoals,[]);
 assert.deepEqual(x.coverage.missingStrengths,[]);
 const y=deepGenerate(s,'經常與同學爭執');
 assert.equal(y.quality.discourse.bridged,false);
 assert.doesNotMatch(y.comment,/將這份關懷|將助人的心意/);
});
test('discourse maintenance discourages repeated continuation phrases',()=>{
 const x=deepGenerate([4,4,4,4,4,4],'個性沉穩，熱心協助同學');
 assert.deepEqual(x.coverage.missingStrengths,[]);
 assert.doesNotMatch(x.comment,/(?:持續|繼續|延續)[^；。]{0,18}(?:發揮|展現)[^；。]{0,18}(?:持續|繼續|延續)[^；。]{0,18}(?:發揮|展現)/);
 assert.deepEqual(x.issues,[]);
});

test('semantic fingerprints group paraphrases and separate affirmation from development',()=>{
 const a=semesterSemanticSignature('待人有禮，熱心投入班級事務；期許能多體諒彼此的感受。');
 const b=semesterSemanticSignature('與人應對合宜，能盡責參與班級事務；希望能在人際相處中多一分包容。');
 assert.equal(a.pairKey,b.pairKey);
 assert.equal(a.lead,'期許');assert.equal(b.lead,'希望');
 assert.deepEqual(a.strengths,['待人相處','團體參與']);
 assert.deepEqual(a.goals,['待人相處']);
});
test('semantic diversity retains observed evidence even with repeated history topics',()=>{
 const h=[],note='熱心協助同學，但經常與同學爭執';
 for(let i=0;i<6;i++){const x=deepGenerate(s,note,h);assert.deepEqual(x.issues,[]);assert.deepEqual(x.coverage.missingStrengths,[]);assert.deepEqual(x.coverage.missingGoals,[]);assert.ok(x.quality.semantic.pairKey);h.push(x.comment);}
 assert.equal(new Set(h).size,6);
});

test('teacher-identified recurring weaknesses are explicitly acknowledged with a development direction',()=>{
 for(const [note,re,count] of [
 ['熱心協助同學，但經常與同學爭執',/相處.*(?:摩擦|改善)/,1],
 ['待人有禮，但經常遲到',/守時|時間管理/,1],
 ['待人有禮，但忘記打掃',/整潔/,1],
 ['待人有禮，但擅自離開教室',/自律|規範/,1],
 ['待人有禮，但經常遲到、忘記打掃',/守時|時間管理/,2],
 ['待人有禮，但上課容易分心',/學習專注/,1],
 ['待人有禮，但經常說謊',/誠信|言行一致/,1]
 ]){
  const x=deepGenerate(s,note);assert.deepEqual(x.issues,[],x.comment);assert.deepEqual(x.coverage.missingGoals,[],note);assert.equal(x.quality.warning.explicit.length,count,note);
  assert.match(x.comment,re);assert.match(x.comment,/仍|有待/);assert.doesNotMatch(x.comment,/懶惰|不誠實|說謊|不守規矩|擅自離開/);
 }
});
test('isolated and occasional shortcomings do not become sustained negative claims',()=>{
 for(const note of ['待人有禮，但今天擅自離開教室','待人有禮，但偶爾遲到']){
  const x=deepGenerate(s,note);assert.deepEqual(x.issues,[]);assert.deepEqual(x.quality.warning.explicit,[]);assert.deepEqual(x.coverage.missingWarnings,[]);
 }
});

test('typed connective variants retain semantic warning, goal and observation coverage',()=>{
 const h=[],note='熱心協助同學，但經常與同學爭執',leads=new Set(),transitions=new Set();
 for(let i=0;i<12;i++){
  const x=deepGenerate(s,note,h),sig=semesterSemanticSignature(x.comment);
  assert.deepEqual(x.issues,[]);assert.deepEqual(x.coverage.missingStrengths,[]);assert.deepEqual(x.coverage.missingGoals,[]);
  assert.equal(x.quality.warning.explicit.length,1);
  if(/(?:若能|如能|倘能|如果能|假如能|倘若能)/.test(x.comment))assert.match(x.comment,/(?:若能|如能|倘能|如果能|假如能|倘若能)[^；。]+，[^；。]*(?:將|相信)/);
  leads.add(sig.lead);transitions.add(sig.transition);h.push(x.comment);
 }
 assert.equal(new Set(h).size,12);assert.ok(leads.size+transitions.size>=6);
});
test('semantic fingerprints recognize connective variants and keep warning separate from affirmation',()=>{
 const a=semesterSemanticSignature('待人有禮，也能用心完成班級事務；但守時習慣仍不穩定，期盼今後能培養守時的習慣。');
 assert.equal(a.lead,'期盼今後');assert.equal(a.transition,'但');assert.equal(a.addition,'也能');
 assert.ok(a.goals.includes('生活條理'));assert.ok(!a.strengths.includes('生活條理'));
});


test('expanded language inventory doubles each connective resource family without counting combinations',()=>{
 const n=semesterLanguageInventory();assert.ok(n.wish>=14);assert.ok(n.conditional>=4);assert.ok(n.contrast>=8);assert.ok(n.addition>=6);assert.ok(n.goalJoiners>=2);
 for(const l of ['如果能','假如能','倘若能']){const a=semesterSemanticSignature('待人有禮；'+l+'培養守時習慣，生活將更有條理。');assert.equal(a.lead,l.slice(0,-1));}
 const b=semesterSemanticSignature('待人有禮，且能協助班務；只是守時習慣仍不穩定，盼今後能培養守時習慣。');assert.equal(b.transition,'只是');assert.equal(b.addition,'且能');assert.equal(b.lead,'盼今後');
});


test('development lexicon doubles each concept and grade resource family',()=>{
 const inv=semesterLexicalInventory();assert.equal(inv.observation.groups,22);assert.equal(inv.grades.groups,6);
 for(const row of [...inv.observationGroups,...inv.gradeGroups])assert.ok(row.after>=2*row.before,JSON.stringify(row));
 const a=semesterPlan([4,4,4,4,4,3],'經常遲到');assert.ok(a.observedGoals.some(g=>g.variants.includes('加強時間規劃與守時觀念')));
 const b=semesterPlan([2,4,4,4,4,4],'');assert.ok(b.goals.some(g=>g.variants.includes('重視生活作息與日常條理')));
});


test('tone and syntax resources retain explicit shortcomings and grade-appropriate intent',()=>{
 const inv=semesterToneSyntaxInventory();assert.ok(inv.toneGroups.every(r=>r.after>=2*r.before));assert.equal(inv.syntaxForms.length,8);
 const recurrent=semesterPlan(s,'經常遲到'),occasional=semesterPlan(s,'偶爾遲到');
 assert.equal(recurrent.observedGoals[0].tone,'明確警醒');assert.equal(occasional.observedGoals[0].tone,'精進引導');
 const h=[],forms=new Set();for(let i=0;i<12;i++){const x=deepGenerate(s,'熱心協助同學，但經常與同學爭執',h);assert.deepEqual(x.issues,[]);assert.deepEqual(x.coverage.missingGoals,[]);assert.deepEqual(x.coverage.missingStrengths,[]);assert.equal(x.quality.warning.explicit.length,1);forms.add(x.quality.syntax);h.push(x.comment);}assert.ok(forms.size>=2);
});


test('balanced composition respects evidence and all explicitly recorded weaknesses',()=>{
 const h=[];let ratio=0;for(let i=0;i<12;i++){const x=deepGenerate(s,'熱心協助同學，但經常與同學爭執',h);assert.deepEqual(x.issues,[]);assert.deepEqual(x.coverage.missingGoals,[]);assert.deepEqual(x.coverage.missingStrengths,[]);assert.ok(x.quality.balance.concern>0);ratio+=x.quality.balance.ratio;h.push(x.comment);}assert.ok(ratio/12>=.36);
 const low=deepGenerate([1,1,1,1,1,1]);assert.equal(low.quality.balance.positive,0);assert.equal(low.quality.balance.limited,true);assert.deepEqual(low.issues,[]);
 const multi=deepGenerate(s,'待人有禮，但經常遲到、忘記打掃');assert.deepEqual(multi.coverage.missingGoals,[]);assert.equal(multi.quality.warning.explicit.length,2);
 const conflict=deepGenerate([5,5,5,5,5,5],'經常說謊');assert.deepEqual(conflict.coverage.missingGoals,[]);assert.ok(conflict.quality.evidence.strengths.every(e=>e.source!=='等第'||!conflict.quality.evidence.blockedGradeDimensions.includes(e.dimension)));assert.doesNotMatch(conflict.comment.split(/[；。]|，(?:但|惟)/)[0],/言行誠懇|待人誠懇|重視誠信/);assert.match(conflict.comment,/誠信|言行一致/);
});


test('multi-goal composition preserves concrete domains and supports a distinct third affirmation',()=>{
 const x=deepGenerate(s,'待人有禮，但經常遲到、忘記打掃');assert.deepEqual(x.issues,[]);assert.deepEqual(x.coverage.missingGoals,[]);assert.deepEqual(x.coverage.missingStrengths,[]);assert.equal(x.quality.warning.explicit.length,2);assert.ok(x.quality.balance.ratio>.244,x.comment);assert.match(x.comment,/守時/);assert.match(x.comment,/整潔/);
 const f=deepGenerate(s,'上課容易分心');assert.match(f.comment,/學習專注/);for(const a of deepAlternatives(s,'上課容易分心',[],{},f.comment,3))assert.match(a,/學習專注/);
 const m=deepGenerate(s,'經常遲到、上課容易分心');assert.deepEqual(m.coverage.missingGoals,[]);assert.match(m.comment,/守時/);assert.match(m.comment,/學習專注/);
});


test('quality distinguishes repeated action from legitimate topic continuity',()=>{
 const repeated=semesterWordingQuality('能維持生活常規，也能配合班務',['時間管理仍須加強'],['加強時間管理']);
 const specific=semesterWordingQuality('生活常規良好，班級服務良好',['時間管理仍須加強'],['養成守時習慣']);
 assert.equal(repeated.warningEcho,1);assert.equal(specific.warningEcho,0);assert.ok(repeated.penalty>specific.penalty);
 const x=deepGenerate(s,'待人有禮，但經常遲到、忘記打掃');assert.deepEqual(x.coverage.missingGoals,[]);assert.deepEqual(x.coverage.missingStrengths,[]);assert.equal(x.quality.warning.explicit.length,2);assert.ok(x.quality.balance.ratio>.244);assert.ok(Number.isFinite(x.quality.wording.penalty));
});


test('local style learning uses structural categories only and requires enough independent samples',()=>{
 const samples=lead=>['培養自律習慣','增進時間觀念','加強整潔責任','重視團體規範','增進溝通能力','培養負責態度'].map(v=>'生活常規良好，待人有禮；'+lead+v+'，使日常表現更加穩定。');
 const a=samples('若能'),b=samples('期許能'),am=semesterStyleModel({examples:a}),bm=semesterStyleModel({examples:b});
 assert.ok(semesterStyleFit(a[0],am)>semesterStyleFit(b[0],am));assert.ok(semesterStyleFit(b[0],bm)>semesterStyleFit(a[0],bm));assert.equal(semesterStyleModel({examples:[a[0],a[0],a[0]]}).confidence,0);assert.doesNotMatch(JSON.stringify(am),/生活常規良好|待人有禮|時間觀念/);
 const p={examples:['增進自律','培養習慣','改善作息','重視規範','加強整潔','學習規劃'].map(v=>'擅長雕塑，具藝術創意；期許能'+v+'，使整體表現更好。')};
 const x=deepGenerate(s,'待人有禮，但經常遲到',[],p);assert.deepEqual(x.issues,[]);assert.deepEqual(x.coverage.missingGoals,[]);assert.deepEqual(x.coverage.missingStrengths,[]);assert.match(x.comment,/守時/);assert.doesNotMatch(x.comment,/雕塑|藝術創意/);assert.equal(x.quality.style.samples,6);
});


test('style adaptation changes actual choices only inside evidence and quality bounds',()=>{
 const examples=lead=>['培養自律習慣','增進時間觀念','加強整潔責任','重視團體規範','增進溝通能力','培養負責態度'].map(v=>'生活常規良好，待人有禮；'+lead+v+'，使日常表現更加穩定。');
 let changed=0;for(const note of ['待人有禮，但經常遲到','熱心協助同學，但經常與同學爭執','待人有禮，但經常遲到、忘記打掃','上課容易分心',''])for(const lead of ['若能','期許能','盼能']){const x=deepGenerate(s,note,[],{examples:examples(lead)});assert.deepEqual(x.issues,[]);assert.deepEqual(x.coverage.missingGoals,[]);assert.deepEqual(x.coverage.missingStrengths,[]);const a=x.quality.style.adaptation;if(a.applied){changed++;assert.equal(a.selected,a.preferred);assert.ok(a.scoreCost<=6);}}assert.ok(changed>0);
 const sparse=deepGenerate(s,'經常遲到',[],{examples:examples('若能').slice(0,2)});assert.equal(sparse.quality.style.adaptation.applied,false);
});
