"""46 synthetic students, real browser release gate; no real student data."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright, expect
from openpyxl import Workbook, load_workbook
import tempfile, threading, json, zipfile, xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1] / 'site'
class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, *args): pass

def run(browser, url, tmp, mobile):
    ctx = browser.new_context(viewport={'width':375 if mobile else 1440,'height':812 if mobile else 900}, accept_downloads=True, is_mobile=mobile, has_touch=mobile)
    page = ctx.new_page()
    page.set_default_timeout(30000)
    errors, external = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('dialog', lambda d: d.accept('4' if d.type=='prompt' else None))
    def route_local(route):
        if route.request.url.startswith(url + '/'): route.continue_()
        else:
            external.append(route.request.url)
            route.abort()
    ctx.route('http**/*', route_local)
    def tool(id):
        page.locator('#menuTools summary').click()
        page.locator('#'+id).click()
    def width_ok():
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1')
    def download(menu, id, name):
        with page.expect_download(timeout=60000) as d:
            if menu: page.locator(menu+' summary').click()
            page.locator('#'+id).click()
        path=tmp/name
        d.value.save_as(path)
        return path
    try:
        page.goto(url+'/')
        tool('importBtn')
        page.locator('#rosterFile').set_input_files(tmp/'class.xlsx')
        page.locator('#previewImport').click()
        expect(page.locator('#importPreview')).to_contain_text('辨識 46 人')
        page.locator('#applyImport').click()
        expect(page.locator('.row')).to_have_count(46)
        expect(page.locator('#progressText')).to_contain_text('29 / 46')
        width_ok()
        page.locator('[data-seg="doing"]').click()
        expect(page.locator('.row')).to_have_count(1)
        page.locator('[data-seg="all"]').click()
        page.locator('#search').fill('合成學生01')
        expect(page.locator('.row')).to_have_count(1)
        page.locator('.row').first.click()
        page.locator('[data-all="4"]').click()
        page.locator('[data-undo]').click()
        page.locator('[data-all="4"]').click()
        page.locator('[data-next]').click()
        # Known issue #27: navigation may retain search. Reset explicitly
        # for the remaining independent workflow; do not claim it is fixed.
        if mobile: page.locator('[data-back]').click()
        page.locator('#search').fill('')
        page.locator('[data-seg="all"]').click()
        tool('baseline')
        expect(page.locator('#progressText')).to_contain_text('46 / 46')
        expect(page.locator('#commentProgressText')).to_contain_text('46 / 46',timeout=240000)
        tool('matrixBtn')
        expect(page.locator('.matrix tbody tr')).to_have_count(46)
        width_ok()
        page.locator('#closeClassDialog').click()
        tool('classEditBtn')
        expect(page.locator('[data-class-comment]')).to_have_count(46)
        width_ok()
        page.locator('#closeClassDialog').click()
        if mobile and page.locator('[data-back]').is_visible(): page.locator('[data-back]').click()
        page.locator('.row').first.click()
        original=page.locator('[data-comment]').input_value()
        assert 42<=len(original)<=50
        page.reload()
        expect(page.locator('[data-comment]')).to_have_value(original)
        excel=download('#menuDl','excel','formal.xlsx')
        rows=list(load_workbook(excel).active.values)
        assert len(rows)==47 and rows[0]==('學號','座號','姓名','評語')
        assert len({r[1] for r in rows[1:]})==46
        assert all(42<=len(r[3])<=50 for r in rows[1:])
        word=download('#menuDl','word','formal.docx')
        with zipfile.ZipFile(word) as z:
            body=''.join(ET.fromstring(z.read('word/document.xml')).itertext())
        assert all(r[2] in body and r[3] in body for r in rows[1:])
        tool('auditBtn')
        expect(page.locator('#auditSummary')).to_contain_text('46 / 46')
        page.locator('#closeAudit').click()
        page.locator('[data-go="settings"]' if mobile else '[data-tab="settings"]').click()
        page.locator('[data-sec="backup"]').click()
        backup=download(None,'backup','backup.json')
        data=json.loads(backup.read_text(encoding='utf-8'))
        assert len(data['projects'][0]['students'])==46
        page.locator('#restore').set_input_files(backup)
        page.locator('[data-go="work"]' if mobile else '[data-tab="work"]').click()
        if mobile and page.locator('[data-back]').is_visible(): page.locator('[data-back]').click()
        expect(page.locator('.row')).to_have_count(46)
        assert not errors, errors
        assert not external, external
        print('PASS: classroom 46', 'mobile WebKit' if mobile else 'desktop Chromium', flush=True)
    finally:
        ctx.close()

def main():
    server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    url=f'http://127.0.0.1:{server.server_port}'
    try:
        with tempfile.TemporaryDirectory() as t, sync_playwright() as p:
            tmp=Path(t)
            w=Workbook(); s=w.active
            s.append(['座號','學號','姓名','日常生活表現','整潔習慣','禮節','班級服務','待人誠信','自律自重'])
            for n in range(1,47):
                scores=[4,None,None,None,None,None] if n==1 else [4]*6 if n<=30 else [None]*6
                s.append([f'{n:02}',f'fixture-{n:03}',f'合成學生{n:02}',*scores])
            w.save(tmp/'class.xlsx')
            for engine,mobile in [(p.chromium,False),(p.webkit,True)]:
                browser=engine.launch(headless=True)
                try: run(browser,url,tmp,mobile)
                finally: browser.close()
    finally: server.shutdown()

if __name__=='__main__': main()
