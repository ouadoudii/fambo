"""Public Fambo wall: real desktop/tablet/mobile navigation, no authentication or private requests."""
import os,unittest
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).parents[1]
class PublicWall(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.pw=sync_playwright().start()
  cls.browser=cls.pw.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or None,args=['--no-sandbox'])
 @classmethod
 def tearDownClass(cls):
  cls.browser.close();cls.pw.stop()
 def test_wall_opens_without_login_and_changes_weeks(self):
  for width,height in [(1440,900),(1024,600),(390,844)]:
   with self.subTest(width=width):
    page=self.browser.new_page(viewport={'width':width,'height':height})
    remote=[]
    def route(req):
     url=req.request.url
     if url.startswith('https://family.test'):
      path=url.split('?')[0].split('/')[-1] or 'index.html'
      if path in ('index.html','app.js','lib.js','demo.js','styles.css'):
       mime={'html':'text/html','js':'text/javascript','css':'text/css'}[path.split('.')[-1]]
       return req.fulfill(status=200,content_type=mime,body=(ROOT/path).read_bytes())
     remote.append(url);return req.abort()
    page.route('**/*',route)
    page.goto('https://family.test/')
    page.get_by_role('heading',name='Unsere Familienwand').wait_for()
    page.get_by_role('heading',name='Alex').wait_for()
    page.get_by_role('heading',name='Mila').wait_for()
    self.assertEqual(page.locator('.schedule').count(),2)
    self.assertTrue(page.get_by_text('Mathematik').first.is_visible())
    self.assertTrue(page.get_by_text('DEMO · Beispieldaten').is_visible())
    self.assertEqual(page.locator('input[type=password],#auth-form,#private-login,#logout').count(),0)
    self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width+1)
    old=page.locator('#week-label').inner_text()
    page.get_by_role('button',name='Nächste Woche').click()
    self.assertNotEqual(old,page.locator('#week-label').inner_text())
    page.get_by_role('button',name='Vorherige Woche').click()
    self.assertEqual(old,page.locator('#week-label').inner_text())
    page.reload()
    page.get_by_role('heading',name='Mila').wait_for()
    self.assertFalse(any('supabase' in url or '/api/' in url for url in remote))
    page.close()
if __name__=='__main__':unittest.main()
