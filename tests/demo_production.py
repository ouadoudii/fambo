"""Post-deploy checks: empty first-run page, local connection assets and legacy privacy."""
import os,unittest
from urllib.request import urlopen
BASE=os.environ.get('FAMBO_BASE_URL','https://fambo.vercel.app').rstrip('/')
class Production(unittest.TestCase):
 def test_empty_first_run_and_connect_action(self):
  with urlopen(BASE+'/',timeout=20) as response:
   self.assertEqual(response.status,200);html=response.read().decode('utf8')
  self.assertIn('id="connection-form"',html)
  self.assertIn('id="schedules"',html)
  self.assertNotIn('Alex',html)
  self.assertNotIn('demo-banner',html)
  self.assertNotIn('auth-form',html)
 def test_connection_assets_exist_without_login(self):
  with urlopen(BASE+'/app.js',timeout=20) as response:
   self.assertEqual(response.status,200);script=response.read().decode('utf8')
  self.assertIn('localStorage',script)
  self.assertIn('/api/connect',script)
  self.assertNotIn("from './auth.js'",script)
if __name__=='__main__':unittest.main()
