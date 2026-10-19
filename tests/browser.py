"""Real browser user-flow checks, desktop and tablet viewport."""
import json, unittest, os
from pathlib import Path
from playwright.sync_api import sync_playwright

class AppFlows(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.pw=sync_playwright().start()
  cls.browser=cls.pw.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or None,args=['--no-sandbox'])
 @classmethod
 def tearDownClass(cls):
  cls.browser.close();cls.pw.stop()
 def test_flows(self):
  for width,height in [(1440,900),(1024,600),(390,844)]:
   with self.subTest(width=width):
    page=self.browser.new_page(viewport={'width':width,'height':height})
    def stub(route):
     route.fulfill(status=200,content_type='application/json',body=json.dumps({'lessons':[{'id':'1','date':'2026-10-19','start':'08:00','end':'08:45','subject':'Mathematik','room':'101','cancelled':False}]}))
    def serve(route):
     path=route.request.url.split('?')[0].split('/')[-1] or 'index.html'
     if path in ('index.html','app.js','lib.js','styles.css'):
      mime={'html':'text/html','js':'text/javascript','css':'text/css'}[path.split('.')[-1]]
      route.fulfill(status=200,content_type=mime,body=(Path(__file__).parents[1]/path).read_bytes())
     else: route.abort()
    page.route('https://family.test/**',serve)
    page.route('**/api/timetable?**',stub)
    page.goto('https://family.test/')
    page.locator('.schedule').nth(1).wait_for(state='visible')
    self.assertEqual(page.locator('.schedule').count(),2)
    self.assertTrue(page.get_by_text('Familienwand').count())
    page.get_by_role('button',name='Einstellungen').click()
    page.locator('[name="name1"]').fill('Maya')
    page.locator('[name="url1"]').fill('https://avh-gym-konstanz.webuntis.com/WebUntis?school=avh-gym-konstanz#/basic/timetablePublic/my-student?date=2026-10-19&entityId=1234')
    page.get_by_role('button',name='Speichern und anzeigen').click()
    self.assertEqual(page.locator('.schedule').count(),2)
    self.assertTrue(page.get_by_role('heading',name='Maya').is_visible())
    page.reload()
    self.assertTrue(page.get_by_role('heading',name='Maya').is_visible())
    self.assertTrue(page.get_by_text('Mathematik').count() >= 1)
    page.get_by_role('button',name='Nächste Woche').click()
    self.assertTrue(page.locator('#week-label').inner_text())
    self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width+1)
    page.close()

if __name__=='__main__':unittest.main()
