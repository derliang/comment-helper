import test from 'node:test';import assert from 'node:assert/strict';import {deepGenerate,deepAlternatives,semesterCoverage,semesterPlan} from '../deep-nlg.mjs';import {validate} from '../engine.mjs';
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
