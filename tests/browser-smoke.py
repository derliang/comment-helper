"""Headless browser release gate; synthetic fixtures only. Run after scripts/build-site.sh."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from openpyxl import Workbook, load_workbook
import threading, tempfile, zipfile, json, xml.etree.ElementTree as ET
ROOT = Path(__file__).resolve().parents[1] / 'site'
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kw): super().__init__(*args,directory=str(ROOT),**kw)
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}'
try:
    with tempfile.TemporaryDirectory() as tmp, sync_playwright() as p:
        tmp=Path(tmp); fixture=tmp/'synthetic.xlsx'; w=Workbook(); ws=w.active;ws.append(['座號','學號','姓名','整潔習慣 (5-1)']);ws.append(['01','000123','測試甲',4]);ws.append(['02','000124','測試乙',None]);ws2=w.create_sheet('補充');ws2.append(['座號','學號','姓名','補充觀察']);ws2.append(['01','000123','測試甲','服務熱心']);w.save(fixture)
        browser=p.chromium.launch(headless=True);ctx=browser.new_context(accept_downloads=True);page=ctx.new_page();page.set_default_timeout(12000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept('測試學期' if d.type=='prompt' else None))
        page.goto(base);expect(page.locator('h1 [data-version]')).to_have_text('v0.2.2-beta');expect(page.locator('footer [data-version]')).to_have_text('v0.2.2-beta');assert page.title().endswith('v0.2.2-beta');assert page.evaluate('typeof XLSX!=="undefined" && typeof JSZip!=="undefined"')
        page.locator('#importBtn').click();page.locator('#rosterFile').set_input_files(fixture);page.locator('#applyImport').click();expect(page.locator('article.student')).to_have_count(2)
        page.locator('article.student').nth(0).locator('[data-toggle]').click();expect(page.locator('[data-score="1:4"]')).to_have_attribute('aria-pressed','true');expect(page.locator('[data-note]')).to_have_value('補充觀察：服務熱心');page.locator('[data-all="5"]').click();page.locator('[data-score="5:3"]').click();page.locator('[data-note]').fill('經常遲到');page.wait_for_function("document.querySelector('[data-comment]').value.includes('守時')");original=page.locator('[data-comment]').input_value();assert 42<=len(original)<=50
        page.locator('[data-confirm]').click();expect(page.locator('[data-comment]')).to_have_js_property('readOnly',True);expect(page.locator('[data-score="5:3"]')).to_be_disabled();expect(page.locator('[data-note]')).to_have_js_property('readOnly',True)
        with page.expect_download() as d:page.locator('#word').click()
        word=tmp/'formal.docx';d.value.save_as(word)
        with zipfile.ZipFile(word) as z:xml=ET.fromstring(z.read('word/document.xml'));assert '測試甲' in ''.join(xml.itertext());assert original in ''.join(xml.itertext())
        with page.expect_download() as d:page.locator('#excel').click()
        xlsx=tmp/'formal.xlsx';d.value.save_as(xlsx);rows=list(load_workbook(xlsx,read_only=True).active.values);assert rows[0]==('座號','姓名','評語');assert rows[1][1:] == ('測試甲',original);assert len(rows)==2
        with page.expect_download() as d:page.locator('#fullExcel').click()
        full=tmp/'full.xlsx';d.value.save_as(full);rows=list(load_workbook(full,read_only=True).active.values);assert len(rows)==3 and '整體星等' in rows[0] and '學號' in rows[0]
        page.reload();expect(page.locator('article.student')).to_have_count(2);expect(page.locator('[data-comment]')).to_have_value(original);expect(page.locator('[data-score="5:3"]')).to_be_disabled();page.locator('[data-confirm]').click();edited=original.replace('若能','期許',1) if '若能' in original else original.replace('期待能','希望能',1);assert edited!=original;page.locator('[data-comment]').fill(edited);page.locator('[data-confirm]').click();expect(page.locator('[data-comment]')).to_have_js_property('readOnly',True)
        page.locator('[data-tab="history"]').click();page.locator('#historyFile').set_input_files(word);page.locator('#addHistory').click();expect(page.locator('.historyItem')).to_have_count(1);page.locator('[data-history-id]').fill('000123');page.locator('[data-history-id]').press('Tab');expect(page.locator('[data-history-id]')).to_have_value('000123');expect(page.locator('#profile')).to_contain_text('人工修訂學習：1 筆');page.locator('#historyFile').set_input_files(word);page.locator('#addHistory').click();expect(page.locator('#toast')).to_contain_text('新增 0 則');expect(page.locator('.historyItem')).to_have_count(1)
        page.locator('[data-tab="work"]').click();expect(page.locator('.prior')).to_contain_text('1 則');page.locator('[data-tab="settings"]').click();page.locator('#endpoint').fill(base+'/generate');page.locator('#accessToken').fill('synthetic-token');page.locator('#saveEndpoint').click();requests=[]
        def fake(route):
            data=route.request.post_data_json;requests.append(data);assert route.request.headers.get('authorization')=='Bearer synthetic-token';route.fulfill(status=200,content_type='application/json',body=json.dumps({'comment':'待人有禮，能盡責完成班級事務，生活常規穩定，若能養成守時習慣，將有助於日常表現更加成熟。','warnings':[]}))
        page.route('**/generate',fake);page.locator('#testAI').click();expect(page.locator('#aiTestResult')).to_contain_text('連線成功');assert 'synthetic-token' not in page.evaluate('JSON.stringify(localStorage)');assert requests and 'studentId' not in requests[0]
        with page.expect_download() as d:page.locator('#backup').click()
        backup=tmp/'backup.json';d.value.save_as(backup);data=json.loads(backup.read_text());assert len(data['projects'][0]['students'])==2;assert data['history'][0]['studentId']=='000123';assert len(data['feedback'])==1
        page.locator('#restore').set_input_files(backup);expect(page.locator('#accessToken')).to_have_value('');page.locator('[data-tab="work"]').click();expect(page.locator('article.student')).to_have_count(2);assert not errors,errors
        browser.close();print('PASS: release browser gate — real XLSX import/export, DOCX import/export, rating, lock, feedback, history, backup, version, mock AI')
finally: server.shutdown()
