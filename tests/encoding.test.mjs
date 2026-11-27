import test from 'node:test';import assert from 'node:assert/strict';
import {decodeText,mergeSheets} from '../importers.mjs';
import {parseReturnText} from '../roundtrip.mjs';
// Issue #38: Excel on zh-TW Windows saves CSV as Big5 (CP950). Decoding it as UTF-8 produced U+FFFD names and dropped the 學號 column silently.
const text='座號,姓名,學號\r\n1,王小明,A001\r\n2,李大華,A002\r\n';
// python: text.encode('big5').hex()
const big5=Uint8Array.from(Buffer.from('ae79b8b92ca96da6572cbec7b8b90d0a312ca4fda470a9fa2c413030310d0a322ca7f5a46ab5d82c413030320d0a','hex'));
const utf8=new TextEncoder().encode(text);
const withBom=Uint8Array.from([0xEF,0xBB,0xBF,...utf8]);
const utf16le=Uint8Array.from([0xFF,0xFE,...Buffer.from(text,'utf16le')]);
const records=t=>mergeSheets([parseReturnText(t)],{allowNames:true}).map(r=>[r.seat,r.name,r.studentId]);
test('issue #38: Big5 CSV is decoded and imported with names and 學號 intact',()=>{
 assert.equal(decodeText(big5.buffer),text);
 assert.deepEqual(records(decodeText(big5.buffer)),[['1','王小明','A001'],['2','李大華','A002']]);
});
test('issue #38: UTF-8 (with or without BOM) and UTF-16 files still decode',()=>{
 assert.equal(decodeText(utf8.buffer),text);
 assert.equal(decodeText(withBom.buffer),text);
 assert.equal(decodeText(utf16le.buffer),text);
 assert.equal(decodeText(new ArrayBuffer(0)),'');
});
test('issue #38: undecodable bytes or replacement characters are refused, never imported as garbage students',()=>{
 assert.throws(()=>decodeText(Uint8Array.from([0x41,0xA4,0x20,0x42,0xFF]).buffer),/編碼/);
 assert.throws(()=>decodeText(new TextEncoder().encode('座號,姓名\n1,王�明').buffer),/編碼/);
 // The old behaviour, for the record: a Big5 file read as UTF-8 yields U+FFFD names.
 assert.ok(new TextDecoder('utf-8').decode(big5).includes('�'));
});
// Issue #41: rows with a name but a blank / non-numeric seat were silently dropped; English headers were case-sensitive.
import {parseSheet,skippedSummary} from '../importers.mjs';
test('issue #41: rows skipped for a blank or non-numeric seat are reported with row numbers',()=>{
 const skipped=[];
 const rows=parseSheet([['座號','姓名'],['01','王小明'],['','李大華'],['A2','陳小美'],['0','零號'],['3','']],{skipped});
 assert.deepEqual(rows.map(r=>r.name),['王小明']);
 assert.deepEqual(skipped.map(x=>[x.row,x.name,x.reason]),[[3,'李大華','座號空白'],[4,'陳小美','座號「A2」不是純數字'],[5,'零號','座號須大於 0']]);
 assert.match(skippedSummary(skipped),/略過 3 列：第 3 列 李大華（座號空白）/);
 assert.equal(skippedSummary([]),'');
});
test('issue #41: headerless paste also reports rows whose seat is not a positive integer',()=>{
 const skipped=[];
 const rows=parseSheet([['1','王小明'],['甲01','李大華'],['2','陳小美']],{allowNames:true,skipped});
 assert.deepEqual(rows.map(r=>r.name),['王小明','陳小美']);
 assert.deepEqual(skipped.map(x=>[x.row,x.name]),[[2,'李大華']]);
});
test('issue #41: English headers are matched without regard to case',()=>{
 assert.deepEqual(parseSheet([['Seat','Name','Student ID'],['1','Amy','A001']]).map(r=>[r.seat,r.name,r.studentId]),[['1','Amy','A001']]);
 assert.deepEqual(parseSheet([['SEAT','NAME','StudentId'],['2','Bob','B002']]).map(r=>[r.seat,r.name,r.studentId]),[['2','Bob','B002']]);
 assert.equal(parseSheet([['座號','姓名'],['1','王小明']]).length,1); // seat rules unchanged
});
