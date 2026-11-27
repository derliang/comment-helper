"""Issues #39/#40 browser regression: workflow-rail steps work from the keyboard and every form control has an accessible name.
Synthetic data only. Run after scripts/build-site.sh."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import threading
ROOT = Path(__file__).resolve().parents[1] / 'site'
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kw): super().__init__(*args,directory=str(ROOT),**kw)
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}'
UNNAMED='''()=>[...document.querySelectorAll('input:not([type=hidden]),select,textarea,button')]
 .filter(e=>!e.hidden&&e.getAttribute('aria-hidden')!=='true')
 .filter(e=>!(e.getAttribute('aria-label')||e.getAttribute('aria-labelledby')||e.closest('label')||(e.id&&document.querySelector(`label[for="${e.id}"]`))||e.title||(e.tagName==='BUTTON'&&e.textContent.trim())))
 .map(e=>e.tagName+'#'+e.id+'.'+e.className)'''
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True);ctx=browser.new_context();ctx.set_default_timeout(15000)
        ctx.on('page',lambda pg:pg.on('dialog',lambda d:d.accept()))
        page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(base);page.locator('#menuTools summary').click();page.locator('#importBtn').click()
        page.locator('#rosterText').fill('座號,姓名\n1,測試甲');page.locator('#previewImport').click();page.locator('#applyImport').click()
        expect(page.locator('.row')).to_have_count(1);page.locator('.row').nth(0).click()
        # #39: Enter / Space on the focused rail steps behave like a click.
        steps=page.locator('#rail [data-goto]');expect(steps).to_have_count(2)
        steps.nth(0).focus();page.keyboard.press('Enter');expect(page.locator('#auditDialog')).to_have_attribute('open','')
        page.keyboard.press('Escape');expect(page.locator('#auditDialog')).not_to_have_attribute('open','')
        page.locator('#rail [data-goto="2"]').focus();page.keyboard.press('Space');expect(page.locator('#auditDialog')).to_have_attribute('open','')
        page.keyboard.press('Escape')
        page.locator('#rail [data-goto="3"]').focus();page.keyboard.press('Enter');expect(page.locator('#menuDl')).to_have_attribute('open','')
        # #40: no unnamed form control on the workbench, the import dialog or the history page.
        page.locator('.row').nth(0).click();bad=page.evaluate(UNNAMED);assert not bad,('workbench',bad)
        page.locator('#menuTools summary').click();page.locator('#importBtn').click();bad=page.evaluate(UNNAMED);assert not bad,('import dialog',bad)
        page.keyboard.press('Escape')
        page.locator('[data-tab="history"]').click();bad=page.evaluate(UNNAMED);assert not bad,('history',bad)
        assert not errors,errors
        browser.close()
    print('accessibility OK')
finally:
    server.shutdown()
