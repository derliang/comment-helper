"""Mobile WebKit regression; Linux WebKit emulation is not a physical iPhone."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from openpyxl import Workbook, load_workbook
import tempfile, threading, zipfile, xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]/'site'
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kw):super().__init__(*args,directory=str(ROOT),**kw)
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}'
try:
    with tempfile.TemporaryDirectory() as t, sync_playwright() as p:
        tmp=Path(t);w=Workbook();s=w.active
        s.append(['座號','學號','姓名','日常生活表現','整潔習慣','禮節','班級服務','待人誠信','自律自重','補充觀察'])
        s.append(['01','fake-001','合成甲',5,4,5,4,5,3,'經常遲到'])
        s.append(['02','fake-002','合成乙',4,5,4,5,4,4,'熱心協助同學'])
        f=tmp/'mobile.xlsx';w.save(f)
        browser=p.webkit.launch(headless=True)
        ctx=browser.new_context(viewport={'width':375,'height':812},device_scale_factor=2,is_mobile=True,has_touch=True,accept_downloads=True)
        page=ctx.new_page();page.set_default_timeout(30000);errors=[];dialogs=[];external=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        def handle_dialog(d):dialogs.append(d.message);d.accept()
        page.on('dialog',handle_dialog)
        def local_only(route):
            if route.request.url.startswith(url+'/'):route.continue_()
            else:external.append(route.request.url);route.abort()
        ctx.route('http**/*',local_only)
        page.goto(url+'/');page.locator('#menuTools summary').tap();page.locator('#importBtn').tap();page.locator('#rosterFile').set_input_files(f);page.locator('#previewImport').tap();expect(page.locator('#importPreview')).to_contain_text('辨識 2 人');page.locator('#applyImport').tap()
        expect(page.locator('#commentProgressText')).to_contain_text('2 / 2',timeout=90000)
        def width_ok():assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1')
        width_ok();page.locator('.row').first.tap();width_ok()
        original=page.locator('[data-comment]').input_value();assert '守時' in original and 42<=len(original)<=50
        edited='熱心班級事務，待人誠懇且應對合宜；希望能掌握每日到校時間，事先做好準備，逐步養成守時的習慣。'
        page.locator('[data-comment]').fill(edited);page.locator('[data-note]').tap();expect(page.locator('[data-comment]')).to_have_value(edited)
        page.reload();expect(page.locator('[data-comment]')).to_have_value(edited);expect(page.locator('#commentProgressText')).to_contain_text('2 / 2');width_ok()
        before=len(dialogs)
        with page.expect_download(timeout=30000) as dl:page.locator('#menuDl summary').tap();page.locator('#excel').tap()
        result=tmp/'formal.xlsx';dl.value.save_as(result);rows=list(load_workbook(result).active.values);assert len(rows)==3 and rows[0]==('學號','座號','姓名','評語') and rows[1][3]==edited
        with page.expect_download(timeout=30000) as dl:page.locator('#menuDl summary').tap();page.locator('#word').tap()
        result=tmp/'formal.docx';dl.value.save_as(result)
        with zipfile.ZipFile(result) as z:
            root=ET.fromstring(z.read('word/document.xml'));assert edited in ''.join(root.itertext())
        assert len(dialogs)==before
        page.locator('#menuTools summary').tap();page.locator('#matrixBtn').tap();expect(page.locator('.matrix tbody tr')).to_have_count(2);width_ok();page.locator('#closeClassDialog').tap()
        page.locator('#menuTools summary').tap();page.locator('#classEditBtn').tap();expect(page.locator('[data-class-comment]')).to_have_count(2);width_ok();page.locator('#closeClassDialog').tap()
        assert not external,external
        assert not errors,errors
        browser.close();print('PASS: mobile WebKit import, touch rating views, automatic comments, edit persistence, local-only requests, Word and Excel downloads')
finally:server.shutdown()
