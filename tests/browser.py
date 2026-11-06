"""Real desktop/mobile iCal subscription, local ICS import, browser privacy and Google Calendar flows."""
import json,os,unittest
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).parents[1]
LINK='https://school.webuntis.com/WebUntis/ical?token=example'
ICS='BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART;TZID=Europe/Berlin:20261109T080000\nDTEND;TZID=Europe/Berlin:20261109T084500\nSUMMARY:Mathematik\nLOCATION:A12\nEND:VEVENT\nEND:VCALENDAR'
class ConnectFlows(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.pw=sync_playwright().start()
  cls.browser=cls.pw.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or None,args=['--no-sandbox'])
 @classmethod
 def tearDownClass(cls):cls.browser.close();cls.pw.stop()
 def fixtures(self,request):
  u=request.request.url
  if u.startswith('https://family.test/'):
   path=urlparse(u).path.lstrip('/') or 'index.html'
   if path in ('index.html','app.js','styles.css','lib.js','calendar.js','lib/ical.js'):
    return request.fulfill(status=200,content_type={'html':'text/html','js':'text/javascript','css':'text/css'}[path.split('.')[-1]],body=(ROOT/path).read_bytes())
  return request.abort()
 def test_connect_persists_only_in_current_browser_and_disconnects(self):
  for width,height in [(1440,900),(390,844)]:
   with self.subTest(width=width):
    ctx=self.browser.new_context(viewport={'width':width,'height':height});page=ctx.new_page();seen=[]
    def route(r):
     if r.request.url.endswith('/api/ical'):
      seen.append(r.request.post_data_json)
      return r.fulfill(status=200,content_type='application/json',body=json.dumps({'lessons':[{'id':'1','date':'2026-11-09','subject':'Mathematik','start':'08:00','end':'08:45','room':'A12','cancelled':False}]}))
     return self.fixtures(r)
    page.route('**/*',route);page.goto('https://family.test/')
    self.assertEqual(page.get_by_role('button',name='WebUntis verbinden').count(),2)
    self.assertEqual(page.locator('input[type=password],#cloud-start').count(),0)
    page.get_by_role('button',name='WebUntis verbinden').first.click()
    self.assertIn('iCal',page.locator('#connection-dialog').inner_text())
    page.locator('#child-name').fill('Mein Kind')
    page.locator('#child-url').fill(LINK)
    page.get_by_role('button',name='iCal verbinden').click()
    page.get_by_role('heading',name='Mein Kind').wait_for()
    self.assertEqual(seen[-1]['url'],LINK)
    page.reload();page.get_by_role('heading',name='Mein Kind').wait_for()
    page.get_by_role('button',name='Nächste Woche').click()
    self.assertEqual(seen[-1]['url'],LINK)
    self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width+1)
    other=self.browser.new_context();second=other.new_page();second.route('**/*',route);second.goto('https://family.test/')
    self.assertEqual(second.get_by_role('heading',name='Mein Kind').count(),0);other.close()
    page.get_by_role('button',name='Verbindung verwalten').click()
    page.get_by_role('button',name='Verbindung auf diesem Gerät entfernen').click()
    page.reload();self.assertEqual(page.get_by_role('heading',name='Mein Kind').count(),0);ctx.close()
 def test_ics_file_import_offline_desktop_and_mobile(self):
  for width,height in [(1440,900),(390,844)]:
   with self.subTest(width=width):
    ctx=self.browser.new_context(viewport={'width':width,'height':height});page=ctx.new_page()
    page.route('**/*',self.fixtures);page.goto('https://family.test/')
    page.get_by_role('button',name='WebUntis verbinden').first.click()
    page.locator('#child-name').fill('Mein Kind')
    page.locator('#ical-file').set_input_files({'name':'stundenplan.ics','mimeType':'text/calendar','buffer':ICS.encode()})
    page.get_by_role('heading',name='Mein Kind').wait_for()
    page.get_by_text('Mathematik').wait_for()
    page.reload();page.get_by_text('Mathematik').wait_for()
    self.assertEqual(page.locator('#cloud-start').count(),0)
    self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width+1);ctx.close()
 def test_invalid_private_calendar_host_is_rejected(self):
  page=self.browser.new_page();page.route('**/*',self.fixtures);page.goto('https://family.test/')
  page.get_by_role('button',name='WebUntis verbinden').first.click()
  page.locator('#child-name').fill('Kind')
  page.locator('#child-url').fill('https://webuntis.com.evil.test/private.ics')
  page.get_by_role('button',name='iCal verbinden').click()
  page.get_by_text('Nur sichere WebUntis-Links sind erlaubt.').wait_for()
  self.assertEqual(page.get_by_role('button',name='WebUntis verbinden').count(),2);page.close()
 def test_no_cloud_browser_quota_or_api_calls_on_schedule_import(self):
  page=self.browser.new_page();calls=[]
  def route(r):
   if r.request.url.startswith('https://family.test/api/agent/'):calls.append(r.request.url);return r.abort()
   return self.fixtures(r)
  page.route('**/*',route);page.goto('https://family.test/')
  page.get_by_role('button',name='WebUntis verbinden').first.click()
  self.assertEqual(page.get_by_role('button',name='Geschützten Browser öffnen').count(),0)
  self.assertEqual(page.locator('#ical-file').count(),1)
  self.assertEqual(calls,[]);page.close()
 def test_private_google_calendar_is_visible_and_disconnects_on_mobile_and_desktop(self):
  for width,height in [(1440,900),(390,844)]:
   with self.subTest(width=width):
    context=self.browser.new_context(viewport={'width':width,'height':height})
    page=context.new_page()
    def route(r):
     u=r.request.url
     if u.endswith('/api/calendar/config'):
      return r.fulfill(status=200,content_type='application/json',body='{"clientId":"123456-demo.apps.googleusercontent.com"}')
     if u.startswith('https://accounts.google.com/gsi/client'):
      return r.fulfill(status=200,content_type='text/javascript',body="""window.google={accounts:{oauth2:{initTokenClient:()=>({requestAccessToken:()=>window.googleCallback({access_token:'test-short-token'})}),revoke:(_,cb)=>cb()}}};Object.defineProperty(window.google.accounts.oauth2,'initTokenClient',{value:(opts)=>{window.googleCallback=opts.callback;return {requestAccessToken:()=>opts.callback({access_token:'test-short-token'})}}});""")
     if '/calendar/v3/users/me/calendarList' in u:
      self.assertEqual(r.request.headers.get('authorization'),'Bearer test-short-token')
      return r.fulfill(status=200,content_type='application/json',body='{"items":[{"id":"primary","selected":true}]}')
     if '/calendar/v3/calendars/primary/events' in u:
      self.assertEqual(r.request.headers.get('authorization'),'Bearer test-short-token')
      return r.fulfill(status=200,content_type='application/json',body='{"items":[{"id":"one","summary":"Familienausflug","start":{"dateTime":"2026-10-27T09:00:00+01:00"}}]}')
     if u.startswith('https://family.test'):
      name=u.split('?')[0].split('/')[-1] or 'index.html'
      if name in ('index.html','app.js','calendar.js','styles.css','lib.js','ical.js'):
       return r.fulfill(status=200,content_type={'html':'text/html','js':'text/javascript','css':'text/css'}[name.split('.')[-1]],body=(ROOT/('lib/ical.js' if name=='ical.js' else name)).read_bytes())
     return r.abort()
    page.route('**/*',route);page.goto('https://family.test/')
    page.get_by_role('button',name='Google-Kalender verbinden').click()
    page.get_by_text('Familienausflug').wait_for()
    self.assertIn('Kalender verbunden',page.locator('#calendar-status').inner_text())
    # Real interaction: deselect and select the calendar, not just a static page assertion.
    choices=page.locator('#calendar-choices input[type=checkbox]')
    self.assertEqual(choices.count(),1)
    choices.uncheck()
    page.get_by_text('Keine Termine in den nächsten 14 Tagen.').wait_for()
    self.assertEqual(page.get_by_text('Familienausflug').count(),0)
    choices.check()
    page.get_by_text('Familienausflug').wait_for()
    self.assertNotIn('test-short-token',page.evaluate("JSON.stringify(localStorage)"))
    self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width+1)
    page.get_by_role('button',name='Kalender trennen').click()
    self.assertEqual(page.get_by_text('Familienausflug').count(),0)
    context.close()
if __name__=='__main__':unittest.main()
