"""Issue #35 regression: 補齊評語 (#batch) must yield to the browser between students and show progress.
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
        browser=p.chromium.launch(headless=True);ctx=browser.new_context();ctx.set_default_timeout(60000)
        ctx.on('page',lambda pg:pg.on('dialog',lambda d:d.accept()))
        page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(base);page.locator('#menuTools summary').click();page.locator('#importBtn').click()
        page.locator('#rosterText').fill('座號,姓名\n1,測試甲\n2,測試乙\n3,測試丙');page.locator('#previewImport').click();page.locator('#applyImport').click()
        expect(page.locator('.row')).to_have_count(3)
        # Complete scores + a slow observation for everybody, with instant generation off so only #batch generates.
        page.evaluate('''(key)=>{const d=JSON.parse(localStorage.getItem(key));d.instant=false;for(const r of d.projects[0].students){r.scores=[4,4,4,4,4,4];r.note='常遲到，忘記帶課本';r.rated=true;}localStorage.setItem(key,JSON.stringify(d));}''',KEY)
        page.reload();expect(page.locator('.row')).to_have_count(3)
        # Record the longest time the main thread was blocked and every label the button showed.
        page.evaluate('''()=>{window.__ticks=[];window.__labels=new Set();setInterval(()=>window.__ticks.push(performance.now()),20);
          new MutationObserver(()=>window.__labels.add(document.querySelector('#batch small').textContent)).observe(document.querySelector('#batch small'),{childList:true,characterData:true,subtree:true});}''')
        t0=page.evaluate('performance.now()');page.locator('#menuTools summary').click();page.locator('#batch').click()
        expect(page.locator('#toast')).to_contain_text('已補齊 3 位')
        t1=page.evaluate('performance.now()')
        labels=page.evaluate('[...window.__labels]');ticks=page.evaluate('window.__ticks')
        assert any('補齊中 2 / 3' in l for l in labels),labels
        assert page.locator('#batch small').text_content()=='為評分完整者生成評語'
        # A timer scheduled every 20 ms can only run while the batch is still going if the loop yields between students;
        # a synchronous loop would leave a single block of several seconds with no tick inside it.
        # Ignore ticks right after the click and right before the end; only ticks in the middle prove the loop gave the browser a turn.
        inside=[x for x in ticks if t0+250<x<t1-250]
        assert len(inside)>=1,('main thread never got a turn during the batch',len(inside))
        data=json.loads(page.evaluate(f'localStorage.getItem("{KEY}")'))
        assert all(s['comment'] for s in data['projects'][0]['students'])
        assert not errors,errors
        browser.close()
    print('batch-yield OK')
finally:
    server.shutdown()
