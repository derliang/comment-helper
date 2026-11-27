"""Issue #37 regression: two tabs sharing localStorage must never silently overwrite each other.
Synthetic data only. Run after scripts/build-site.sh."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import threading, json
ROOT = Path(__file__).resolve().parents[1] / 'site'
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kw): super().__init__(*args,directory=str(ROOT),**kw)
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}'
KEY='comment-helper-v1'
NOTE_B='分頁B寫入的觀察紀錄'
def stored(page): return page.evaluate(f'localStorage.getItem("{KEY}")') or ''
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True);ctx=browser.new_context();ctx.set_default_timeout(12000)
        ctx.on('page',lambda pg:pg.on('dialog',lambda d:d.accept()));a=ctx.new_page();errors=[];a.on('pageerror',lambda e:errors.append(str(e)))
        a.goto(base);a.locator('#menuTools summary').click();a.locator('#importBtn').click()
        a.locator('#rosterText').fill('座號,姓名\n1,測試甲');a.locator('#previewImport').click();a.locator('#applyImport').click()
        expect(a.locator('.row')).to_have_count(1);a.locator('.row').nth(0).click()
        # Tab B opens the same data and writes an observation.
        b=ctx.new_page();b.goto(base);expect(b.locator('.row')).to_have_count(1);b.locator('.row').nth(0).click()
        b.locator('[data-note]').fill(NOTE_B);expect(b.locator('#saved')).to_contain_text('已儲存')
        assert NOTE_B in stored(a),'tab B write should reach localStorage'
        # Tab A (stale in-memory data) tries to save: it must NOT overwrite B's data.
        a.locator('[data-score="1:4"]').click()
        assert NOTE_B in stored(a),'tab A silently overwrote tab B (issue #37)'
        expect(a.locator('#saved')).to_contain_text('其他視窗')
        # After reloading A, it sees B's observation and saving works again.
        a.reload();a.locator('.row').nth(0).click();expect(a.locator('[data-note]')).to_have_value(NOTE_B)
        a.locator('[data-score="1:4"]').click();expect(a.locator('#saved')).to_contain_text('已儲存')
        data=json.loads(stored(a));st=data['projects'][0]['students'][0]
        assert st['note']==NOTE_B and st['scores'][1]==4,st
        # storage event: B writes again while A is idle -> A is warned immediately, before any local edit.
        b.reload();b.locator('.row').nth(0).click();b.locator('[data-note]').fill(NOTE_B+'二');expect(b.locator('#saved')).to_contain_text('已儲存')
        expect(a.locator('#saved')).to_contain_text('其他視窗')
        assert not errors,errors
        browser.close()
    print('multi-tab OK')
finally:
    server.shutdown()
