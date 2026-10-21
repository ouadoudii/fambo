"""Verify that the one-click demo is present on the deployed Fambo page."""
import os
import unittest
from urllib.request import urlopen

BASE=os.environ.get('FAMBO_BASE_URL','https://fambo.vercel.app').rstrip('/')
class DemoProduction(unittest.TestCase):
 def test_demo_button_on_live_login(self):
  with urlopen(BASE+'/',timeout=20) as response:
   self.assertEqual(response.status,200)
   html=response.read().decode('utf-8')
  self.assertIn('id="demo-start"',html)
  self.assertIn('Demo ohne Anmeldung ausprobieren',html)
  self.assertIn('id="demo-banner"',html)
 def test_demo_script_available(self):
  with urlopen(BASE+'/demo.js',timeout=20) as response:
   self.assertEqual(response.status,200)
   script=response.read().decode('utf-8')
  self.assertIn('DEMO_CHILDREN',script)
  self.assertNotIn('supabase.co',script.lower())
if __name__=='__main__':unittest.main()
