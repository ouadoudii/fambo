"""Verify no login UI is present on deployed public Fambo wall."""
import os,unittest
from urllib.request import urlopen
BASE=os.environ.get('FAMBO_BASE_URL','https://fambo.vercel.app').rstrip('/')
class PublicProduction(unittest.TestCase):
 def test_live_wall_has_no_login(self):
  with urlopen(BASE+'/',timeout=20) as resp:
   self.assertEqual(resp.status,200)
   html=resp.read().decode('utf-8')
  self.assertIn('id="dashboard"',html)
  self.assertIn('id="demo-banner"',html)
  for forbidden in ('id="auth-form"','id="private-login"','id="auth-email"','id="logout"','id="demo-start"'):
   self.assertNotIn(forbidden,html)
 def test_local_demo_is_deployed(self):
  with urlopen(BASE+'/demo.js',timeout=20) as resp:
   self.assertEqual(resp.status,200)
   script=resp.read().decode('utf-8')
  self.assertIn('DEMO_CHILDREN',script)
  self.assertNotIn('supabase.co',script.lower())
 def test_no_auth_module_in_public_app(self):
  with urlopen(BASE+'/app.js',timeout=20) as resp:
   self.assertEqual(resp.status,200)
   script=resp.read().decode('utf-8')
  self.assertNotIn("from './auth.js'",script)
  self.assertNotIn('initAuth()',script)
if __name__=='__main__':unittest.main()
