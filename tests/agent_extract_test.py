import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parents[1]/'agent'))
from timetable import extract_lessons,is_school_timetable_response
class AgentExtract(unittest.TestCase):
 def test_nested_response_minimization(self):
  source={'data':{'result':{'data':{'elementPeriods':{'123':[{'date':20261021,'startTime':800,'endTime':845,'subjectName':'Mathe','room':'201','userToken':'must-not-copy','code':'cancelled'}]}}}}}
  rows=extract_lessons(source)
  self.assertEqual(len(rows),1)
  self.assertEqual(rows[0]['subject'],'Mathe')
  self.assertEqual(rows[0]['start'],'08:00')
  self.assertTrue(rows[0]['cancelled'])
  self.assertNotIn('must-not-copy',str(rows))
  self.assertEqual(set(rows[0]),{'date','start','end','subject','room','cancelled'})
 def test_multiple_periods(self):
  source={'elementPeriods':{'1':[{'date':'20261021','startTime':930,'endTime':1015,'elements':[{'type':3,'name':'Biologie'},{'type':4,'name':'C12'}]}]}}
  self.assertEqual(extract_lessons(source)[0]['subject'],'Biologie')
  self.assertEqual(extract_lessons(source)[0]['room'],'C12')
 def test_untrusted_response_hosts_rejected(self):
  self.assertTrue(is_school_timetable_response('https://school.webuntis.com/WebUntis/api/public/timetable/weekly/data','application/json'))
  for url in ('https://school.webuntis.com.evil.test/timetable','http://school.webuntis.com/timetable','https://webuntis.com/timetable','https://evil.test/path/webuntis.com/timetable','https://school.webuntis.com@evil.test/timetable'):
   self.assertFalse(is_school_timetable_response(url,'application/json'))
  self.assertFalse(is_school_timetable_response('https://school.webuntis.com/timetable','text/html'))
 def test_refuses_unrelated_private_payload(self):
  self.assertEqual(extract_lessons({'access_token':'secret','password':'secret'}),[])
  self.assertEqual(extract_lessons({'elementPeriods':{'1':[{'date':'wrong','startTime':'bad','subject':'Test'}]}}),[])
if __name__=='__main__':unittest.main()
