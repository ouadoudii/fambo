"""Local WebUntis browser agent – interactive sign-in, never collects passwords.

Run on a trusted computer with: python agent/run.py
A local browser profile stays on this computer. Only normalized lesson data is exported.
This proof-of-concept does NOT yet synchronize with the hosted Fambo web app.
"""
import json, os, sys
from datetime import datetime, timedelta
from pathlib import Path
from playwright.sync_api import sync_playwright
from timetable import extract_lessons

ROOT=Path.home()/'.fambo-webuntis'
PROFILE=ROOT/'browser-profile'
OUTPUT=ROOT/'lessons.json'
LOGIN='https://school.webuntis.com/'
def main():
 ROOT.mkdir(mode=0o700,parents=True,exist_ok=True)
 try: ROOT.chmod(0o700)
 except OSError: pass
 with sync_playwright() as p:
  context=p.chromium.launch_persistent_context(str(PROFILE),headless=False,accept_downloads=False)
  page=context.pages[0] if context.pages else context.new_page()
  seen=[]
  def on_response(response):
   if 'webuntis.com' not in response.url or not any(x in response.url.lower() for x in ('timetable','weekly','period')):return
   if 'json' not in (response.headers.get('content-type') or '').lower():return
   try:
    payload=response.json()
    found=extract_lessons(payload)
    if found:seen.extend(found)
   except (ValueError,TypeError,KeyError,RuntimeError):pass
  page.on('response',on_response)
  page.goto(LOGIN,wait_until='domcontentloaded')
  print('Melde dich im geöffneten Browser direkt bei WebUntis an.')
  print('Öffne dort deinen persönlichen Stundenplan. Drücke dann hier ENTER.')
  input()
  for _ in range(3):
   if seen:break
   page.wait_for_timeout(1000)
  # Deduplicate across responses; do not store raw cookies or API responses.
  lessons=list({(x['date'],x['start'],x['subject'],x['room']):x for x in seen}.values())
  if not lessons:
   print('Noch keine verwertbaren Stundenplandaten erkannt. Keine Daten exportiert.')
   print('WebUntis verwendet möglicherweise ein anderes Antwortformat.')
   context.close()
   return 2
  data={'format':'fambo-lessons-v1','exportedAt':datetime.utcnow().isoformat()+'Z','lessons':lessons}
  temporary=OUTPUT.with_suffix('.tmp')
  temporary.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
  try:temporary.chmod(0o600)
  except OSError:pass
  temporary.replace(OUTPUT)
  print('Stundenplandaten wurden lokal gespeichert unter: '+str(OUTPUT))
  print('Keine Anmeldung und kein Sitzungstoken wurden exportiert.')
  context.close()
  return 0
if __name__=='__main__':sys.exit(main())
