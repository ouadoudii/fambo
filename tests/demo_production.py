"""Post-deploy checks: empty first-run page, local connection assets and legacy privacy."""
import os,unittest
from urllib.request import urlopen
BASE=os.environ.get('FAMBO_BASE_URL','https://fambo.dadda-3ettaa.workers.dev').rstrip('/')
class Production(unittest.TestCase):
 def test_empty_first_run_and_connect_action(self):
  with urlopen(BASE+'/',timeout=20) as response:
   self.assertEqual(response.status,200);html=response.read().decode('utf8')
  self.assertIn('id="connection-form"',html)
  self.assertNotIn('<iframe',html)
  self.assertIn('https://school.webuntis.com/',html)
  self.assertIn('id="webuntis-external"',html)
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
 def test_upstash_read_only_connection(self):
  import json
  with urlopen(BASE+'/api/agent/redis-health',timeout=20) as response:
   self.assertEqual(response.status,200)
   data=json.loads(response.read().decode('utf8'))
  self.assertEqual(data.get('available'),True)
  self.assertEqual(data.get('reason'),'ok')
 def test_native_cloudflare_browser_binding_ready(self):
  # Inspect the current provider without launching a billable browser session.
  import json
  with urlopen(BASE+'/api/agent/status',timeout=20) as response:
   self.assertEqual(response.status,200)
   data=json.loads(response.read().decode('utf8'))
  self.assertEqual(data,{'available':True})
if __name__=='__main__':unittest.main()
