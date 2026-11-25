import test from 'node:test';import assert from 'node:assert/strict';import {analyzeObservation,builtinSemanticRules,draft,validate} from '../engine.mjs';
const cases=[
  {
    "id": "queue",
    "dim": 0,
    "good": "排隊能遵守秩序",
    "goal": "養成依序排隊的習慣",
    "progress": "排隊秩序已有改善",
    "positiveExample": "依序排隊",
    "negativeExample": "插隊"
  },
  {
    "id": "mealRoutine",
    "dim": 0,
    "good": "用餐時能維持秩序",
    "goal": "留意用餐時的秩序",
    "progress": "用餐秩序已有改善",
    "positiveExample": "用餐有序",
    "negativeExample": "用餐時大聲喧嘩"
  },
  {
    "id": "assemblySpeed",
    "dim": 0,
    "good": "能迅速完成集合",
    "goal": "養成迅速集合的習慣",
    "progress": "集合速度已有改善",
    "positiveExample": "集合迅速",
    "negativeExample": "集合拖拉"
  },
  {
    "id": "assemblyOrder",
    "dim": 0,
    "good": "集合時能維持秩序",
    "goal": "留意集合與行進的秩序",
    "progress": "集合秩序已有改善",
    "positiveExample": "集合有序",
    "negativeExample": "集合時喧鬧"
  },
  {
    "id": "sharedSpace",
    "dim": 0,
    "good": "能愛惜公物",
    "goal": "養成愛護公物的習慣",
    "progress": "使用公物的態度已有改善",
    "positiveExample": "愛惜公物",
    "negativeExample": "不愛惜公物"
  },
  {
    "id": "dailyPreparation",
    "dim": 0,
    "good": "能事先備妥用品",
    "goal": "養成事前準備的習慣",
    "progress": "事前準備已有改善",
    "positiveExample": "事先備妥用品",
    "negativeExample": "生活用品準備不足"
  },
  {
    "id": "returnSeat",
    "dim": 0,
    "good": "能按時回到座位",
    "goal": "養成鐘響即回座的習慣",
    "progress": "回座情形已有改善",
    "positiveExample": "鐘響即回座",
    "negativeExample": "鐘響後仍在聊天"
  },
  {
    "id": "deskOrganization",
    "dim": 1,
    "good": "能維持個人區域整齊",
    "goal": "養成隨手整理個人區域的習慣",
    "progress": "個人區域整理已有改善",
    "positiveExample": "桌面整齊",
    "negativeExample": "抽屜雜亂"
  },
  {
    "id": "waste",
    "dim": 1,
    "good": "能妥善處理垃圾",
    "goal": "落實垃圾分類與清理",
    "progress": "垃圾處理習慣已有改善",
    "positiveExample": "確實垃圾分類",
    "negativeExample": "亂丟垃圾"
  },
  {
    "id": "mealCleanup",
    "dim": 1,
    "good": "餐後能妥善收拾",
    "goal": "養成餐後收拾的習慣",
    "progress": "餐後收拾情形已有改善",
    "positiveExample": "餐後清理桌面",
    "negativeExample": "餐具未收拾"
  },
  {
    "id": "cleanTools",
    "dim": 1,
    "good": "能將清潔用具歸位",
    "goal": "養成清潔用具歸位的習慣",
    "progress": "掃具收放已有改善",
    "positiveExample": "掃具歸位",
    "negativeExample": "掃具亂放"
  },
  {
    "id": "cleanFinish",
    "dim": 1,
    "good": "能妥善維護責任區",
    "goal": "確實完成責任區清潔",
    "progress": "責任區清潔已有改善",
    "positiveExample": "仔細清理責任區",
    "negativeExample": "打掃草率"
  },
  {
    "id": "greeting",
    "dim": 2,
    "good": "能主動向人問好",
    "goal": "養成主動問候的習慣",
    "progress": "問候禮節已有改善",
    "positiveExample": "主動問好",
    "negativeExample": "見到師長不打招呼"
  },
  {
    "id": "speechTone",
    "dim": 2,
    "good": "說話能留意分寸",
    "goal": "練習以溫和語氣表達",
    "progress": "說話語氣已有改善",
    "positiveExample": "說話有分寸",
    "negativeExample": "語氣不耐煩"
  },
  {
    "id": "interrupt",
    "dim": 2,
    "good": "能耐心聽完他人發言",
    "goal": "練習聽完再表達想法",
    "progress": "傾聽表現已有改善",
    "positiveExample": "耐心聽完同學發言",
    "negativeExample": "打斷同學發言"
  },
  {
    "id": "respectBoundary",
    "dim": 2,
    "good": "能尊重他人的界線",
    "goal": "留意他人的感受與界線",
    "progress": "尊重他人的表現已有改善",
    "positiveExample": "尊重他人界線",
    "negativeExample": "取笑他人"
  },
  {
    "id": "emotion",
    "dim": 2,
    "good": "能平和表達意見",
    "goal": "練習冷靜表達不同意見",
    "progress": "情緒表達已有改善",
    "positiveExample": "冷靜處理分歧",
    "negativeExample": "一言不合就生氣"
  },
  {
    "id": "apology",
    "dim": 2,
    "good": "願意表達歉意",
    "goal": "練習適時表達歉意",
    "progress": "表達歉意的態度已有改善",
    "positiveExample": "主動道歉",
    "negativeExample": "不願道歉"
  },
  {
    "id": "taskFollowthrough",
    "dim": 3,
    "good": "能確實完成交辦事項",
    "goal": "養成確實完成交辦事項的習慣",
    "progress": "交辦事項完成情形已有改善",
    "positiveExample": "按時完成班級交辦",
    "negativeExample": "值日工作未完成"
  },
  {
    "id": "division",
    "dim": 3,
    "good": "能配合團體分工",
    "goal": "練習承擔分配的工作",
    "progress": "團體分工表現已有改善",
    "positiveExample": "主動分擔工作",
    "negativeExample": "拒絕分工"
  },
  {
    "id": "classEvents",
    "dim": 3,
    "good": "能協助班級活動",
    "goal": "確實完成活動分工",
    "progress": "活動分工表現已有改善",
    "positiveExample": "協助班級活動",
    "negativeExample": "班級活動分工未落實"
  },
  {
    "id": "handover",
    "dim": 3,
    "good": "能妥善交接或回報工作",
    "goal": "養成清楚交接與回報的習慣",
    "progress": "工作交接已有改善",
    "positiveExample": "確實交接",
    "negativeExample": "工作交接不清楚"
  },
  {
    "id": "carePeers",
    "dim": 3,
    "good": "能關懷同學",
    "goal": "",
    "progress": "",
    "positiveExample": "主動關心同學",
    "negativeExample": ""
  },
  {
    "id": "accountability",
    "dim": 4,
    "good": "願意面對自身疏失",
    "goal": "練習誠實面對自身疏失",
    "progress": "面對疏失的態度已有改善",
    "positiveExample": "主動承認疏失",
    "negativeExample": "推卸責任"
  },
  {
    "id": "promise",
    "dim": 4,
    "good": "能履行與他人的約定",
    "goal": "養成履行約定的習慣",
    "progress": "履行約定的情形已有改善",
    "positiveExample": "遵守約定",
    "negativeExample": "未遵守約定"
  },
  {
    "id": "assessmentIntegrity",
    "dim": 4,
    "good": "能重視評量規範",
    "goal": "重視評量與作業的誠信",
    "progress": "評量誠信表現已有改善",
    "positiveExample": "遵守考試規則",
    "negativeExample": "考試作弊"
  },
  {
    "id": "borrowing",
    "dim": 4,
    "good": "能按時歸還借用物品",
    "goal": "養成按約歸還借用物品的習慣",
    "progress": "歸還物品情形已有改善",
    "positiveExample": "如期歸還借用物品",
    "negativeExample": "借用物品未歸還"
  },
  {
    "id": "reportFacts",
    "dim": 4,
    "good": "能如實說明情況",
    "goal": "練習據實說明事情經過",
    "progress": "說明事情的態度已有改善",
    "positiveExample": "如實說明情況",
    "negativeExample": "隱瞞事實"
  },
  {
    "id": "uniform",
    "dim": 5,
    "good": "能遵守服儀規範",
    "goal": "落實學校的服儀規範",
    "progress": "服儀表現已有改善",
    "positiveExample": "服儀符合規定",
    "negativeExample": "服儀違規"
  },
  {
    "id": "phone",
    "dim": 5,
    "good": "能配合手機使用規範",
    "goal": "養成依規範使用手機的習慣",
    "progress": "手機使用情形已有改善",
    "positiveExample": "依規定使用手機",
    "negativeExample": "違規使用手機"
  },
  {
    "id": "reminders",
    "dim": 5,
    "good": "能自行完成例行工作",
    "goal": "練習主動完成例行工作",
    "progress": "主動完成工作的情形已有改善",
    "positiveExample": "無須提醒即完成",
    "negativeExample": "經多次提醒才完成"
  },
  {
    "id": "priorities",
    "dim": 5,
    "good": "能安排工作先後順序",
    "goal": "練習安排事項的先後順序",
    "progress": "工作安排已有改善",
    "positiveExample": "善於安排工作順序",
    "negativeExample": "常漏掉應辦事項"
  },
  {
    "id": "selfCheck",
    "dim": 5,
    "good": "能主動檢查完成的工作",
    "goal": "養成完成後自我檢查的習慣",
    "progress": "自我檢查習慣已有改善",
    "positiveExample": "完成後主動檢查",
    "negativeExample": "完成後未檢查"
  },
  {
    "id": "requestPermission",
    "dim": 5,
    "good": "能配合報備規範",
    "goal": "養成事先報備的習慣",
    "progress": "報備情形已有改善",
    "positiveExample": "離開前先報備",
    "negativeExample": "擅自離開教室"
  },
  {
    "id": "classNoise",
    "dim": 5,
    "good": "上課能維持秩序",
    "goal": "留意上課時的言談與秩序",
    "progress": "上課秩序已有改善",
    "positiveExample": "上課能維持安靜",
    "negativeExample": "上課聊天"
  },
  {
    "id": "askHelp",
    "dim": null,
    "good": "遇到問題能主動請教",
    "goal": "練習適時提出問題與求助",
    "progress": "求助與提問表現已有改善",
    "positiveExample": "主動請教",
    "negativeExample": "遇到困難不敢請教"
  },
  {
    "id": "reflect",
    "dim": null,
    "good": "願意聽取建議",
    "goal": "練習聽取建議並調整做法",
    "progress": "接受建議的態度已有改善",
    "positiveExample": "願意接受建議",
    "negativeExample": "拒絕接受建議"
  },
  {
    "id": "selfReflection",
    "dim": null,
    "good": "能反思自己的做法",
    "goal": "",
    "progress": "",
    "positiveExample": "主動反思",
    "negativeExample": ""
  }
];
const scores=[4,4,4,4,4,4];
test('expanded semantic library retains old topics and covers all six dimensions',()=>{assert.equal(builtinSemanticRules.length,67);assert.equal(new Set(builtinSemanticRules.map(r=>r.id)).size,builtinSemanticRules.length);assert.ok(builtinSemanticRules.some(r=>r.id==='punctual'));assert.equal(new Set(cases.filter(r=>r.dim!==null).map(r=>r.dim)).size,6);});
for(const f of cases)test('semantic evidence: '+f.id,()=>{const a=analyzeObservation(f.positiveExample,scores);assert.ok(a.positives.includes(f.good),JSON.stringify(a));const p=draft(scores,f.positiveExample);assert.ok(p.includes(f.good),p);assert.deepEqual(validate(p),[]);if(!f.negativeExample)return;const b=analyzeObservation(f.negativeExample,scores);assert.ok(b.goals.includes(f.goal),JSON.stringify(b));if(f.dim!==null)assert.ok(b.goalDims.includes(f.dim));const no=analyzeObservation('沒有'+f.negativeExample,scores);assert.ok(!no.goals.includes(f.goal));const better=analyzeObservation('不再'+f.negativeExample,scores);assert.ok(!better.goals.includes(f.goal));assert.ok(better.positives.includes(f.progress),JSON.stringify(better));const both=analyzeObservation(f.positiveExample+'，但'+f.negativeExample,scores);assert.ok(!both.positives.includes(f.good));assert.ok(both.goals.includes(f.goal));assert.ok(both.conflicts.some(x=>x.includes('同一觀察主題')));assert.ok(!analyzeObservation('希望能'+f.positiveExample,scores).positives.includes(f.good));const c=draft(scores,'待人有禮，但'+f.negativeExample);assert.ok(c.includes(f.goal),c);assert.ok(c.includes('待人有禮'),c);assert.deepEqual(validate(c),[]);});
test('explicit permission, historical context, and unresolved observations are not guessed',()=>{assert.ok(!analyzeObservation('上課使用手機',scores).goals.some(g=>g.includes('手機')));assert.equal(analyzeObservation('曾經插隊',scores).goals.length,0);assert.ok(analyzeObservation('插隊情形已有改善',scores).positives.includes('排隊秩序已有改善'));assert.ok(analyzeObservation('不再插隊，但經常忘記打掃',scores).goals.includes('主動完成整潔工作'));assert.ok(!analyzeObservation('希望能遵守約定',scores).positives.includes('能履行與他人的約定'));});
