import test from 'node:test';import assert from 'node:assert/strict';
import {validate,similarity,normalize,length} from '../engine.mjs';
// Issue #36: every render validated each student's comment against the whole history, re-normalising and re-slicing bigrams for
// every history entry every time (1000 history comments ≈ 0.6 s per 46-student pass). Features are now cached; results must not change.
const words='熱心 負責 主動 守時 整潔 合作 誠信 尊重 專注 自律 服務 穩定 成熟 細心 勇於 表達 友善 互助'.split(' ');
let seed=11;const rnd=()=>(seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff;
const make=()=>Array.from({length:22},()=>words[Math.floor(rnd()*words.length)]).join('')+'，期許能持續發揮所長。';
// The pre-optimisation algorithm, kept here as the reference.
const reference=(s,history)=>{
 const issues=[];
 if(length(s)<42||length(s)>50)issues.push('字數須為 42–50 字');
 if(/[\r\n\t\p{Cc}\p{Extended_Pictographic}]/u.test(s)||s.trim()!==s)issues.push('評語須為單段文字，不含表情符號或前後空白');
 if(history.some(h=>normalize(h)===normalize(s)))issues.push('完整評語重複');
 else if(history.some(h=>similarity(h,s)>.78))issues.push('與既有評語高度相似，請核對');
 return issues;
};
test('issue #36: validate() with cached features gives the same verdicts as the plain algorithm',()=>{
 const history=Array.from({length:300},make);
 const near=history[7].slice(0,-3)+'，繼續。'; // high but not identical similarity
 const samples=[...Array.from({length:40},make),history[3],near,'太短',' 前後有空白'+make(),make()+'\n'];
 for(const s of samples)assert.deepEqual(validate(s,history),reference(s,history),s);
 // Same comment validated twice (second call is served from the cache) and after the history changed.
 assert.deepEqual(validate(near,history),validate(near,history));
 assert.deepEqual(validate(history[3],history.slice(4)),reference(history[3],history.slice(4)));
});
test('issue #36: a 46-student pass against 1000 history comments is no longer slow',()=>{
 const history=Array.from({length:1000},make),students=Array.from({length:46},make);
 const t=performance.now();let issues=0;
 for(let pass=0;pass<2;pass++)for(const s of students)issues+=validate(s,[...history,...students.filter(x=>x!==s)]).length;
 const ms=performance.now()-t;
 assert.ok(issues>=0);
 // Before the cache one pass took ≈ 0.4–0.6 s (two passes ≈ 1.2 s); with it two passes take well under 0.15 s.
 assert.ok(ms<600,'two 46×1000 validation passes took '+Math.round(ms)+' ms');
});
