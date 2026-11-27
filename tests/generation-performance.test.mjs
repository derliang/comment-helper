import test from 'node:test';import assert from 'node:assert/strict';
import {deepGenerate} from '../deep-nlg.mjs';
// Issue #35: observations such as 常遲到 used to take 5–10 s per deepGenerate (synchronous, so the page froze).
// Candidate scoring is now lazy by evidence tier and impossible lengths are pruned early; the output must stay byte-identical.
const SLOW_LIMIT_MS=5000;
test('issue #35: slow-observation cases finish quickly and keep the same comment',()=>{
 for(const [scores,note] of [[[4,4,4,4,4,4],"常遲到，忘記帶課本"],[[4,2,4,5,4,4],"常遲到，忘記帶課本"],[[5,4,5,4,2,4],"常遲到，忘記帶課本"]]){
  const t=performance.now(),r=deepGenerate(scores,note,[],{}),ms=performance.now()-t;
  assert.equal(r.source,'deep');assert.ok(r.comment&&r.issues.length===0,scores.join('')+' must produce a valid comment');
  assert.ok(ms<SLOW_LIMIT_MS,scores.join('')+' took '+Math.round(ms)+' ms (limit '+SLOW_LIMIT_MS+')');
 }
});
// Snapshot taken from the implementation before the optimisation (same inputs, same history). Any change here means ranking changed.
const snapshots=[
 {
  "scores": [
   4,
   4,
   4,
   4,
   4,
   4
  ],
  "note": "",
  "history": [
   "待人有禮，也能維持周遭環境整潔；守時習慣仍不穩定。"
  ],
  "first": "班級服務態度良好，也能維持良好的生活常規；期許能持續發揮服務精神，讓各項優勢更加穩固。",
  "second": "日常自律表現良好，也能盡責參與班級事務；若能延續良好的自我管理，各項優勢將更為穩固。"
 },
 {
  "scores": [
   4,
   2,
   4,
   5,
   4,
   4
  ],
  "note": "常遲到，忘記帶課本",
  "history": [],
  "first": "熱心投入班級事務，亦能重視誠信；守時習慣仍不穩定，盼能加強時間管理，並增進生活準備與自我管理的能力。",
  "second": "與人應對合宜，班級服務表現亦良好；守時仍須改善。期許能加強時間管理，並增進生活準備與自我管理的能力。"
 },
 {
  "scores": [
   5,
   5,
   1,
   5,
   2,
   1
  ],
  "note": "重複遲到。重複遲到。",
  "history": [
   "待人有禮，也能維持周遭環境整潔；守時習慣仍不穩定。"
  ],
  "first": "主動維護環境整潔，對班級事務熱心盡責；守時仍須改善。期許能加強時間管理，並逐步練習有禮的應對方式。",
  "second": "整潔習慣值得肯定，對班級事務熱心盡責；值得留意的是，守時方面仍須切實改進，期許能加強時間管理。"
 },
 {
  "scores": [
   5,
   1,
   2,
   1,
   1,
   4
  ],
  "note": "",
  "history": [],
  "first": "日常生活表現成熟穩定；期許能更主動參與班級事務，盡好自己的責任，在團體中發揮更多力量。",
  "second": "生活常規表現值得肯定；希望能培養言行一致與履行承諾的基本責任感，讓彼此的信任更加穩固。"
 },
 {
  "scores": [
   3,
   3,
   2,
   5,
   4,
   2
  ],
  "note": "重複遲到。重複遲到。",
  "history": [],
  "first": "對班級事務熱心盡責，亦能重視誠信；然而，守時仍須改善，期許能加強時間管理，並培養合宜的應對方式。",
  "second": "雖待人誠懇，班級服務表現亦良好，惟守時仍須改善；期許能加強時間管理，並培養合宜的應對方式。"
 },
 {
  "scores": [
   4,
   2,
   1,
   5,
   4,
   4
  ],
  "note": "服務熱心，樂於助人",
  "history": [],
  "first": "熱心投入班級事務，同時也能維持良好的生活常規；期許能逐步培養尊重他人與合宜應對的基本態度。",
  "second": "熱心投入班級事務，也能配合團體生活規範。希望能逐步培養尊重他人與合宜應對的基本態度。"
 }
];
test('issue #35: optimised candidate search returns exactly the previous comments (including history re-rank)',()=>{
 for(const x of snapshots){
  const first=deepGenerate(x.scores,x.note,x.history,{});
  assert.equal(first.comment,x.first,x.scores.join('')+' first');
  const second=deepGenerate(x.scores,x.note,[...x.history,first.comment],{});
  assert.equal(second.comment,x.second,x.scores.join('')+' second (history contains the first comment)');
 }
});
