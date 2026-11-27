"""Issues #38/#41 browser regression: Big5 CSV imports intact, undecodable files are refused, skipped rows are reported.
Synthetic data only. Run after scripts/build-site.sh."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import threading, tempfile
ROOT = Path(__file__).resolve().parents[1] / 'site'
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kw): super().__init__(*args,directory=str(ROOT),**kw)
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}'
try:
    with tempfile.TemporaryDirectory() as tmp, sync_playwright() as p:
        tmp=Path(tmp)
        big5=tmp/'big5.csv';big5.write_bytes('座號,姓名,學號\r\n1,王小明,A001\r\n2,李大華,A002\r\n'.encode('big5'))
        bad=tmp/'bad.csv';bad.write_bytes(b'A\xa4 B\xff,\xa4 \r\n1,2\r\n')
        gaps=tmp/'gaps.csv';gaps.write_bytes('Seat,Name,Student ID\r\n1,Amy,A001\r\n,Bob,A002\r\nB3,Cathy,A003\r\n'.encode('utf-8'))
        browser=p.chromium.launch(headless=True);ctx=browser.new_context();ctx.set_default_timeout(15000)
        ctx.on('page',lambda pg:pg.on('dialog',lambda d:d.accept()))
        page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(base);page.locator('#menuTools summary').click();page.locator('#importBtn').click()
        # #38 Big5 CSV: names and 學號 survive, no replacement characters.
        page.locator('#rosterFile').set_input_files(big5);page.locator('#previewImport').click()
        expect(page.locator('#importPreview')).to_contain_text('辨識 2 人');expect(page.locator('#importPreview')).to_contain_text('王小明');expect(page.locator('#importPreview')).to_contain_text('李大華')
        assert '�' not in page.locator('#importPreview').inner_text()
        page.locator('#applyImport').click();expect(page.locator('.row')).to_have_count(2)
        stored=page.evaluate('localStorage.getItem("comment-helper-v1")');assert 'A001' in stored and 'A002' in stored and '�' not in stored
        # #38 undecodable file: refused with an encoding message, nobody imported.
        page.locator('#menuTools summary').click();page.locator('#importBtn').click();page.locator('#rosterFile').set_input_files(bad);page.locator('#previewImport').click()
        expect(page.locator('#importPreview')).to_contain_text('編碼')
        # #41 blank / non-numeric seats are reported; English headers are case-insensitive.
        page.locator('#rosterFile').set_input_files(gaps);page.locator('#previewImport').click()
        expect(page.locator('#importPreview')).to_contain_text('辨識 1 人');expect(page.locator('#importPreview')).to_contain_text('略過 2 列')
        expect(page.locator('#importPreview')).to_contain_text('第 3 列 Bob（座號空白）');expect(page.locator('#importPreview')).to_contain_text('第 4 列 Cathy')
        assert not errors,errors
        browser.close()
    print('import-encoding OK')
finally:
    server.shutdown()
