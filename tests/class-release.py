"""46 synthetic pupils through the full browser workflow; no actual student data."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from openpyxl import Workbook, load_workbook
import tempfile, threading, zipfile, json, xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]/'site'
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kw):super().__init__(*args,directory=str(ROOT),**kw)
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}'
try:
    with tempfile.TemporaryDirectory() as tmp, sync_playwright() as p:
        tmp=Path(tmp); w=Workbook();s=w.active
        s.append(['座號','學號','姓名','日常生活表現','整潔習慣','禮節','班級服務','待人誠信','自律自重','補充觀察'])
        notes=['','經常遲到','熱心協助同學','上課容易分心','忘記打掃','近期已有明顯進步']
        for i in range(46):
            s.append([f'{i+1:02}',f'fixture-{i+1:03}',f'合成學生{i+1:02}',*[2+(i*17+j*13+i*j)%4 for j in range(6)],notes[i%6]])
        f=tmp/'class.xlsx';w.save(f)
        browser=p.chromium.launch(headless=True);ctx=browser.new_context(accept_downloads=True,viewport={'width':1280,'height':800});page=ctx.new_page();page.set_default_timeout(30000);errors=[];dialogs=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        def accept(d):
            dialogs.append(d.message);d.accept()
        page.on('dialog',accept)
        page.goto(url);page.locator('#menuTools summary').click();page.locator('#importBtn').click();page.locator('#rosterFile').set_input_files(f);page.locator('#previewImport').click();expect(page.locator('#importPreview')).to_contain_text('辨識 46 人');page.locator('#applyImport').click()
        page.wait_for_function("document.querySelector('#commentProgressText').textContent.includes('46 / 46')",timeout=120000)
        data=page.evaluate('JSON.parse(localStorage.getItem("comment-helper-v1"))');students=data['projects'][0]['students'];assert len(students)==46
        assert all(not r.get('confirmed') and 42<=len(r['comment'])<=50 for r in students);assert len({r['comment'] for r in students})==46
        before=len(dialogs)
        with page.expect_download() as dl:page.locator('#menuDl summary').click();page.locator('#excel').click()
        result=tmp/'formal.xlsx';dl.value.save_as(result)
        rows=list(load_workbook(result).active.values);assert len(rows)==47;assert rows[0]==('學號','座號','姓名','評語');assert [x[3] for x in rows[1:]]==[r['comment'] for r in students]
        with page.expect_download() as dl:page.locator('#menuDl summary').click();page.locator('#word').click()
        resultdoc=tmp/'formal.docx';dl.value.save_as(resultdoc)
        with zipfile.ZipFile(resultdoc) as z:
            root=ET.fromstring(z.read('word/document.xml'));ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'};assert len(root.findall('.//w:tr',ns))==47
        assert len(dialogs)==before,'unexpected confirmation after completed class'
        # Simulate a saved class with exactly one complete but missing comment. Restore must fill it.
        data['projects'][0]['students'][-1]['comment']='';data['projects'][0]['students'][-1]['manualDraft']=False;data['projects'][0]['students'][-1]['stale']=False
        restore=tmp/'restore.json';restore.write_text(json.dumps(data,ensure_ascii=False),encoding='utf-8')
        page.locator('[data-tab="settings"]').click();page.locator('#restore').set_input_files(restore);page.locator('[data-tab="work"]').click()
        page.wait_for_function("document.querySelector('#commentProgressText').textContent.includes('46 / 46')",timeout=120000)
        page.set_viewport_size({'width':375,'height':812});assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth+1'),page.evaluate("""Array.from(document.querySelectorAll('body *')).filter(e=>{const b=e.getBoundingClientRect();return b.width&&b.right>innerWidth+1}).slice(0,15).map(e=>[e.tagName,e.id,e.className?.toString(),Math.round(e.getBoundingClientRect().right)])""")
        page.locator('#menuTools summary').click();page.locator('#matrixBtn').click();expect(page.locator('.matrix tbody tr')).to_have_count(46);page.locator('#closeClassDialog').click()
        page.locator('#menuTools summary').click();page.locator('#classEditBtn').click();expect(page.locator('[data-class-comment]')).to_have_count(46);page.locator('#closeClassDialog').click()
        # Partial-rating continuation must stay on the current pupil and clear search.
        page.wait_for_timeout(2000);page.evaluate('''()=>{const k="comment-helper-v1",d=JSON.parse(localStorage.getItem(k)),p=d.projects[0];d.instant=false;p.open=p.students[0].id;p.students[0].scores=[3,null,null,null,null,null];p.students[0].stale=true;for(const r of p.students.slice(30)){r.scores=[null,null,null,null,null,null];r.stale=true;}localStorage.setItem(k,JSON.stringify(d));}''')
        page.reload();page.locator('#search').fill('合成學生01');page.locator('#primaryAct').click();expect(page.locator('.student.open .name')).to_have_text('合成學生01');expect(page.locator('#search')).to_have_value('');expect(page.locator('[data-prev]')).to_be_disabled();page.locator('[data-browse-next]').click();expect(page.locator('.student.open .name')).to_have_text('合成學生02');page.locator('[data-prev]').click();expect(page.locator('.student.open .name')).to_have_text('合成學生01')
        assert not errors,errors
        browser.close();print('PASS: 46-pupil end-to-end import, automatic formal comments, no confirmations, Excel/Word export, restore, mobile views')
finally:server.shutdown()
