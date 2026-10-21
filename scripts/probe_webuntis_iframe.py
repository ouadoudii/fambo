"""Public WebUntis embedding diagnostic: no credentials or pupil data."""
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
 page=browser.new_page()
 errors=[]
 page.on('console',lambda msg: errors.append(msg.text) if msg.type=='error' else None)
 page.goto('https://example.com',wait_until='domcontentloaded',timeout=30000)
 page.set_content('<iframe id="school" src="https://webuntis.com/" style="width:900px;height:600px"></iframe>')
 page.wait_for_timeout(7500)
 frame=page.frame_locator('#school')
 frames=[f for f in page.frames if f!=page.main_frame]
 print('WEBUNTIS_IFRAME_NAVIGATED:',any('webuntis.com' in f.url for f in frames))
 print('WEBUNTIS_IFRAME_BLOCKED:',any('frame' in e.lower() and ('refused' in e.lower() or 'denied' in e.lower() or 'ancestor' in e.lower()) for e in errors))
 print('WEBUNTIS_IFRAME_COUNT:',len(frames))
 browser.close()
