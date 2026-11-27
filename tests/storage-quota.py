"""Issue #45 regression: a full localStorage is reported plainly, old handoff batches are trimmed and the retry succeeds.
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
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True);ctx=browser.new_context();ctx.set_default_timeout(15000)
        ctx.on('page',lambda pg:pg.on('dialog',lambda d:d.accept()))
        page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(base);page.locator('#menuTools summary').click();page.locator('#importBtn').click()
        page.locator('#rosterText').fill('座號,姓名\n1,測試甲');page.locator('#previewImport').click();page.locator('#applyImport').click()
        expect(page.locator('.row')).to_have_count(1);page.locator('.row').nth(0).click()
        # Seed 60 handoff batches (more than the cap of 50) and reload: loading trims to the most recent 50.
        page.evaluate("""(key)=>{const d=JSON.parse(localStorage.getItem(key)),pid=d.projects[0].id,s=d.projects[0].students[0];
          d.handoffBatches=Array.from({length:60},(_,i)=>({id:'B'+String(i).padStart(3,'0'),projectId:pid,task:'generate',at:'2026-11-27T00:00:00.000Z',mapping:[{code:'B'+i+'-S001',id:s.id,seat:'1',name:'測試甲',snapshot:'x'.repeat(400)}]}));
          localStorage.setItem(key,JSON.stringify(d));}""",KEY)
        page.reload();expect(page.locator('.row')).to_have_count(1);page.locator('.row').nth(0).click()
        # Emulate a full quota: any write larger than the size of a db holding only 10 batches fails.
        page.evaluate("""()=>{const real=Storage.prototype.setItem;window.__limit=Infinity;window.__quotaHits=0;
          Storage.prototype.setItem=function(k,v){if(String(v).length>window.__limit){window.__quotaHits++;throw new DOMException('full','QuotaExceededError');}return real.call(this,k,v);};}""")
        size10=page.evaluate("""(key)=>{const d=JSON.parse(localStorage.getItem(key));d.handoffBatches=d.handoffBatches.slice(-10);return JSON.stringify(d).length;}""",KEY)
        page.evaluate('(n)=>{window.__limit=n+4000;}',size10)
        page.locator('[data-score="1:4"]').click()
        expect(page.locator('#saved')).to_contain_text('已自動清掉較舊的交接檔記錄')
        data=json.loads(page.evaluate(f'localStorage.getItem("{KEY}")'))
        assert len(data['handoffBatches'])==10 and data['handoffBatches'][-1]['id']=='B059',len(data['handoffBatches'])
        assert data['projects'][0]['students'][0]['scores'][1]==4
        # Nothing left to trim: the user gets a plain message instead of a vague failure.
        page.evaluate('()=>{window.__limit=10;}')
        page.locator('[data-score="2:4"]').click()
        expect(page.locator('#saved')).to_contain_text('瀏覽器儲存空間已滿')
        assert not errors,errors
        browser.close()
    print('storage-quota OK')
finally:
    server.shutdown()
