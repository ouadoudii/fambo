"""Real desktop/mobile WebUntis connect flow, local-only persistence and browser separation."""
import json,os,unittest
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).parents[1]
LINK='https://demo.webuntis.com/WebUntis?school=demo#/basic/timetablePublic/my-student?entityId=1234'
class ConnectFlows(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.pw=sync_playwright().start()
  cls.browser=cls.pw.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or None,args=['--no-sandbox'])
 @classmethod
 def tearDownClass(cls):cls.browser.close();cls.pw.stop()
 def test_connect_persists_only_in_current_browser_and_disconnects(self):
  for width,height in [(1440,900),(390,844)]:
   with self.subTest(width=width):
    context=self.browser.new_context(viewport={'width':width,'height':height})
    page=context.new_page()
    api=[]
    def route(r):
     url=r.request.url
     if url.endswith('/api/connect'):
      api.append(r.request.post_data_json)
      return r.fulfill(status=200,content_type='application/json',body=json.dumps({'lessons':[{'id':'1','date':'2026-10-19','subject':'Mathematik','start':'08:00','end':'08:45','room':'101','cancelled':False}]}))
     if url.startswith('https://family.test'):
      name=url.split('?')[0].split('/')[-1] or 'index.html'
      if name in ('index.html','app.js','styles.css','lib.js'):
       mime={'html':'text/html','js':'text/javascript','css':'text/css'}[name.split('.')[-1]]
       return r.fulfill(status=200,content_type=mime,body=(ROOT/name).read_bytes())
     if url.startswith('https://school.webuntis.com/'):
      return r.fulfill(status=200,content_type='text/html',body='<title>WebUntis Schulwahl</title><h1>Schule wählen</h1>')
     return r.abort()
    page.route('**/*',route)
    page.goto('https://family.test/')
    self.assertEqual(page.get_by_role('button',name='WebUntis verbinden').count(),2)
    self.assertEqual(page.locator('input[type=password],#auth-form').count(),0)
    self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width+1)
    page.get_by_role('button',name='WebUntis verbinden').first.click()
    # A real browser click opens the canonical school finder, not a blocked iframe.
    self.assertEqual(page.locator('iframe').count(),0)
    school=page.locator('#webuntis-external')
    self.assertEqual(school.get_attribute('href'),'https://school.webuntis.com/')
    self.assertIn('noopener',school.get_attribute('rel'))
    with page.expect_popup() as popup:
     school.click()
    self.assertEqual(popup.value.url.split('?')[0].rstrip('/'),'https://school.webuntis.com')
    popup.value.close()
    page.locator('#child-name').fill('Mein Kind')
    page.locator('#child-url').fill(LINK)
    page.get_by_role('button',name='Verbinden',exact=True).click()
    page.get_by_role('heading',name='Mein Kind').wait_for()
    self.assertEqual(api[-1]['url'],LINK)
    page.reload()
    page.get_by_role('heading',name='Mein Kind').wait_for()
    self.assertEqual(page.get_by_role('button',name='WebUntis verbinden').count(),1)
    page.get_by_role('button',name='Nächste Woche').click()
    self.assertTrue(api[-1]['date'])
    # A second independent browser context has no connection.
    other=self.browser.new_context(viewport={'width':width,'height':height})
    second=other.new_page();second.route('**/*',route);second.goto('https://family.test/')
    self.assertEqual(second.get_by_role('button',name='WebUntis verbinden').count(),2)
    self.assertEqual(second.get_by_role('heading',name='Mein Kind').count(),0)
    other.close()
    page.get_by_role('button',name='Verbindung verwalten').click()
    page.get_by_role('button',name='Verbindung auf diesem Gerät entfernen').click()
    self.assertEqual(page.get_by_role('button',name='WebUntis verbinden').count(),2)
    page.reload()
    self.assertEqual(page.get_by_role('heading',name='Mein Kind').count(),0)
    context.close()
 def test_validation_rejects_external_host(self):
  page=self.browser.new_page()
  def route(r):
   name=r.request.url.split('?')[0].split('/')[-1] or 'index.html'
   if r.request.url.startswith('https://family.test') and name in ('index.html','app.js','styles.css','lib.js'):
    mime={'html':'text/html','js':'text/javascript','css':'text/css'}[name.split('.')[-1]]
    return r.fulfill(status=200,content_type=mime,body=(ROOT/name).read_bytes())
   return r.abort()
  page.route('**/*',route);page.goto('https://family.test/')
  page.get_by_role('button',name='WebUntis verbinden').first.click()
  page.locator('#child-name').fill('Person')
  page.locator('#child-url').fill('https://attacker.example/?school=x#/a?entityId=4')
  page.get_by_role('button',name='Verbinden',exact=True).click()
  page.get_by_text('Nur sichere WebUntis-Links sind erlaubt.').wait_for()
  self.assertEqual(page.get_by_role('button',name='WebUntis verbinden').count(),2)
  page.close()
 def test_private_browser_connect_mobile_and_desktop(self):
  for width,height in [(1440,900),(390,844)]:
   with self.subTest(width=width):
    context=self.browser.new_context(viewport={'width':width,'height':height})
    page=context.new_page()
    calls=[]
    def route(r):
     u=r.request.url
     if u.endswith('/api/agent/status'):
      return r.fulfill(status=200,content_type='application/json',body='{"available":true}')
     if u.endswith('/api/agent/start'):
      calls.append('start')
      return r.fulfill(status=201,content_type='application/json',body='{"status":"created"}')
     if u.endswith('/api/agent/session'):
      if r.request.method=='DELETE':
       calls.append('stop')
       return r.fulfill(status=200,content_type='application/json',body='{"closed":true}')
      calls.append('view')
      return r.fulfill(status=200,content_type='application/json',body='{"viewer":"https://www.browserbase.com/debug/secure-session","expiresAt":9999999999}')
     if u.startswith('https://family.test'):
      name=u.split('?')[0].split('/')[-1] or 'index.html'
      if name in ('index.html','app.js','styles.css','lib.js'):
       mime={'html':'text/html','js':'text/javascript','css':'text/css'}[name.split('.')[-1]]
       return r.fulfill(status=200,content_type=mime,body=(ROOT/name).read_bytes())
     return r.abort()
    page.route('**/*',route);page.goto('https://family.test/')
    page.get_by_role('button',name='WebUntis verbinden').first.click()
    start=page.get_by_role('button',name='Geschützten Browser öffnen')
    start.wait_for(state='visible')
    page.get_by_text('Bereit für eine geschützte Browser-Sitzung.').wait_for()
    self.assertTrue(start.is_enabled())
    start.click()
    page.locator('#cloud-viewer:not([hidden])').wait_for()
    self.assertEqual(page.locator('#cloud-viewer').get_attribute('href'),'https://www.browserbase.com/debug/secure-session')
    self.assertEqual(page.locator('#cloud-viewer').get_attribute('referrerpolicy'),'no-referrer')
    self.assertEqual(calls,['start','view'])
    page.get_by_role('button',name='Browser-Sitzung beenden').click()
    page.locator('#cloud-stop[hidden]').wait_for()
    self.assertIn('stop',calls)
    self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width+1)
    context.close()
 def test_cloud_browser_not_available_without_server_approval(self):
  page=self.browser.new_page()
  def route(r):
   u=r.request.url
   if u.endswith('/api/agent/status'):return r.fulfill(status=200,content_type='application/json',body='{"available":false}')
   if u.startswith('https://family.test'):
    name=u.split('?')[0].split('/')[-1] or 'index.html'
    if name in ('index.html','app.js','styles.css','lib.js'):
     mime={'html':'text/html','js':'text/javascript','css':'text/css'}[name.split('.')[-1]]
     return r.fulfill(status=200,content_type=mime,body=(ROOT/name).read_bytes())
   return r.abort()
  page.route('**/*',route);page.goto('https://family.test/')
  page.get_by_role('button',name='WebUntis verbinden').first.click()
  page.get_by_text('Cloud-Browser momentan noch nicht verfügbar.').wait_for()
  self.assertFalse(page.get_by_role('button',name='Geschützten Browser öffnen').is_enabled())
  page.close()
if __name__=='__main__':unittest.main()
