"""Production smoke: no user data or credentials required."""
import json, os, unittest
from urllib.request import Request, urlopen
from urllib.error import HTTPError
BASE=os.environ.get('FAMBO_BASE_URL','https://fambo.vercel.app').rstrip('/')
def fetch(path,headers=None):
 req=Request(BASE+path,headers={'User-Agent':'Fambo-QA/1.0',**(headers or {})})
 try:
  with urlopen(req,timeout=20) as resp:return resp.status,resp.read().decode('utf-8'),resp.headers.get('content-type','')
 except HTTPError as err:return err.code,err.read().decode('utf-8'),err.headers.get('content-type','')
class ProductionSmoke(unittest.TestCase):
 def test_login_page(self):
  code,body,_=fetch('/')
  self.assertEqual(code,200,'Production login page must be reachable')
  self.assertIn('Familienzeit, ganz privat',body)
  self.assertIn('auth-form',body)
  self.assertIn('demo-start',body)
 def test_supabase_public_config(self):
  code,body,_=fetch('/api/config')
  self.assertEqual(code,200,'Supabase config API must be available')
  data=json.loads(body)
  self.assertRegex(data['url'],r'^https://[a-z0-9-]+\.supabase\.co$')
  self.assertTrue(data['key'].startswith(('sb_publishable_','eyJ')))
  self.assertEqual(set(data),{'url','key'})
 def test_anonymous_calendar_denied(self):
  code,body,_=fetch('/api/timetable?slot=0&date=2026-10-19')
  self.assertEqual(code,401,'Anonymous calendars must not be exposed')
  self.assertIn('anmelden',body.lower())
 def test_invalid_session_denied(self):
  code,_,_=fetch('/api/timetable?slot=0&date=2026-10-19',{'Authorization':'Bearer invalid.jwt.token'})
  self.assertEqual(code,401,'Invalid tokens must not access private timetable data')
if __name__=='__main__':unittest.main()
