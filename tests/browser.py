"""Authenticated family flows in a real Chromium browser at desktop/tablet/mobile sizes."""
import json, unittest, os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).parents[1]
class AuthFlows(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.pw=sync_playwright().start()
  cls.browser=cls.pw.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or None,args=['--no-sandbox'])
 @classmethod
 def tearDownClass(cls):
  cls.browser.close()
  cls.pw.stop()
 def test_demo_is_isolated_and_mobile_responsive(self):
  for width,height in [(1440,900),(1024,600),(390,844)]:
   with self.subTest(width=width):
    page=self.browser.new_page(viewport={'width':width,'height':height})
    calls=[]
    def route(request):
     url=request.request.url
     if url.startswith('https://family.test'):
      path=url.split('?')[0].split('/')[-1] or 'index.html'
      if path in ('index.html','app.js','auth.js','lib.js','demo.js','styles.css'):
       mime={'html':'text/html','js':'text/javascript','css':'text/css'}[path.split('.')[-1]]
       return request.fulfill(status=200,content_type=mime,body=(ROOT/path).read_bytes())
     calls.append(url)
     return request.abort()
    page.route('**/*',route)
    page.goto('https://family.test/')
    page.get_by_role('heading',name='Alex').wait_for()
    page.get_by_text('DEMO · Beispieldaten').wait_for()
    page.get_by_role('heading',name='Alex').wait_for()
    page.get_by_role('heading',name='Mila').wait_for()
    self.assertTrue(page.get_by_text('Mathematik').first.is_visible())
    self.assertFalse(page.locator('#settings').is_visible())
    self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width+1)
    page.get_by_role('button',name='Nächste Woche').click()
    page.get_by_role('heading',name='Mila').wait_for()
    self.assertFalse(any('/api/timetable' in url or '/rest/v1/family_plans' in url for url in calls))
    page.get_by_role('button',name='Privates Konto').click()
    page.get_by_role('button',name='Anmelden',exact=True).wait_for()
    self.assertFalse(page.locator('#dashboard').is_visible())
    page.close()

 def test_register_login_save_reload_logout_and_private_access(self):
  for width,height in [(1440,900),(1024,600),(390,844)]:
   with self.subTest(width=width):
    page=self.browser.new_page(viewport={'width':width,'height':height})
    families={}
    current={'email':''}
    def json_response(route, data, status=200):
     route.fulfill(status=status, content_type='application/json',body=json.dumps(data))
    def routes(route):
     req=route.request
     url=req.url
     if url.endswith('/api/config'):
      return json_response(route,{'url':'https://project.supabase.co','key':'public-anon'})
     if '/auth/v1/signup' in url:
      return json_response(route,{'user':{'id':'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'},'access_token':None})
     if '/auth/v1/token?' in url:
      current['email']=req.post_data_json.get('email','')
      return json_response(route,{'user':{'id':'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'},'access_token':'ey.fake.token','refresh_token':'ref','expires_at':9999999999})
     if '/auth/v1/logout' in url:
      return json_response(route,{})
     if '/rest/v1/family_plans' in url:
      if req.method=='GET':return json_response(route,[{'children':families[current['email']]}] if current['email'] in families else [])
      families[current['email']]=req.post_data_json['children']
      return json_response(route,[{'children':families[current['email']]}])
     if '/api/timetable?' in url:
      return json_response(route,{'lessons':[{'id':'a','date':'2026-10-19','start':'08:00','end':'08:45','subject':'Mathematik','room':'101','cancelled':False}]})
     if url.startswith('https://family.test'):
      path=url.split('?')[0].split('/')[-1] or 'index.html'
      if path in ('index.html','app.js','auth.js','lib.js','demo.js','styles.css'):
       mime={'html':'text/html','js':'text/javascript','css':'text/css'}[path.split('.')[-1]]
       return route.fulfill(status=200,content_type=mime,body=(ROOT/path).read_bytes())
     return route.abort()
    page.route('**/*',routes)
    page.goto('https://family.test/')
    page.get_by_role('heading',name='Alex').wait_for()
    page.get_by_role('button',name='Privates Konto').click()
    page.get_by_role('button',name='Anmelden',exact=True).wait_for(state='visible')
    page.get_by_role('button',name='Noch kein Konto? Registrieren').click()
    page.locator('#auth-email').fill('one@example.com')
    page.locator('#auth-password').fill('password123')
    page.get_by_role('button',name='Registrieren',exact=True).click()
    page.get_by_text('Prüfe dein E-Mail-Postfach').wait_for()
    page.get_by_role('button',name='Bereits registriert? Anmelden').click()
    page.get_by_role('button',name='Anmelden',exact=True).click()
    page.locator('.schedule').nth(1).wait_for(state='visible')
    self.assertEqual(page.locator('.schedule').count(),2)
    page.get_by_role('button',name='Einstellungen').click()
    page.locator('[name="name1"]').fill('Maya')
    page.locator('[name="url1"]').fill('https://demo.webuntis.com/WebUntis?school=demo#/basic/timetablePublic/my-student?entityId=1234')
    page.get_by_role('button',name='Speichern und anzeigen').click()
    page.get_by_role('heading',name='Maya').wait_for()
    page.reload()
    page.get_by_role('heading',name='Maya').wait_for()
    page.get_by_text('Mathematik').first.wait_for()
    page.get_by_role('button',name='Nächste Woche').click()
    self.assertTrue(page.locator('#week-label').inner_text())
    self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width+1)
    page.get_by_role('button',name='Zur Demo').click()
    page.get_by_role('heading',name='Alex').wait_for()
    page.get_by_role('button',name='Privates Konto').click()
    page.locator('#auth-email').fill('two@example.com')
    page.locator('#auth-password').fill('password456')
    page.get_by_role('button',name='Anmelden',exact=True).click()
    page.locator('.schedule').nth(1).wait_for()
    self.assertFalse(page.get_by_role('heading',name='Maya').count())
    self.assertTrue(page.get_by_role('heading',name='Kind 2').is_visible())
    page.close()

if __name__=='__main__':
 unittest.main()
