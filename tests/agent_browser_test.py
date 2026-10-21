"""End-to-end Chromium probe with stubbed WebUntis replies; never uses live credentials."""
import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parents[1]/'agent'))
from capture import lessons_from_response
from playwright.sync_api import sync_playwright

SCHOOL='https://example.webuntis.com'
ENDPOINT=SCHOOL+'/WebUntis/api/public/timetable/weekly/data'
DUMMY={'data':{'result':{'data':{'elementPeriods':{'42':[{'date':20261021,'startTime':800,'endTime':845,'elements':[{'type':3,'name':'Mathe'},{'type':4,'name':'101'}],'sessionToken':'NEVER_EXPORT'}]}}}}}

class BrowserAgentProbe(unittest.TestCase):
 def test_browser_extracts_only_lessons(self):
  with sync_playwright() as p:
   browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
   try:
    page=browser.new_page()

    page.route('**/*',lambda route: route.fulfill(status=200,content_type='application/json',json=DUMMY) if route.request.url==ENDPOINT else (route.fulfill(status=200,content_type='text/html',body='<html><body>Stundenplan</body></html>') if route.request.url==SCHOOL+'/' else route.abort()))
    page.goto(SCHOOL+'/')
    with page.expect_response(lambda response: response.url==ENDPOINT) as received:
     page.evaluate("""async (url) => { const r=await fetch(url); await r.json(); }""",ENDPOINT)
    response=received.value
    observed=lessons_from_response(response.url,response.headers.get('content-type',''),response.json())
    self.assertEqual(len(observed),1)
    self.assertEqual(observed[0]['subject'],'Mathe')
    self.assertEqual(observed[0]['room'],'101')
    self.assertNotIn('NEVER_EXPORT',str(observed))
    self.assertEqual(lessons_from_response('https://example.webuntis.com.evil.test/timetable','application/json',DUMMY),[])
   finally:browser.close()
if __name__=='__main__':unittest.main()
