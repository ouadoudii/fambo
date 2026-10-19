"""Investigate WebUntis browser behavior without querying identifiable student timetables."""
from collections import Counter
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

BASE = "https://avh-gym-konstanz.webuntis.com"
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(locale="de-DE",viewport={"width":1280,"height":900})
    requests=[]
    def record(resp):
        parts=urlsplit(resp.url)
        if parts.hostname != "avh-gym-konstanz.webuntis.com":
            return
        if resp.request.resource_type in ("fetch","xhr"):
            path=parts.path
            # Path only; never print query strings, fragment, payload, cookies or content.
            requests.append((resp.status,path))
    page.on("response",record)
    try:
        response=page.goto(BASE+"/WebUntis?school=avh-gym-konstanz#/basic/timetablePublic",wait_until="domcontentloaded",timeout=30000)
        page.wait_for_timeout(10000)
        print("BROWSER_PUBLIC_PAGE: status="+str(response.status if response else "no_response"))
        print("BROWSER_FINAL_HOST: "+str(urlsplit(page.url).hostname))
        print("BROWSER_TITLE_PRESENT: "+str(bool(page.title())))
        print("BROWSER_API_REQUESTS: "+str(len(requests)))
        for (status,path),count in Counter(requests).most_common(25):
            print(f"BROWSER_API: status={status}, path={path}, count={count}")
        print("BROWSER_IFRAMES: "+str(len(page.frames)))
        print("BROWSER_LOGIN_HINT: "+str(any(s in page.locator("body").inner_text(timeout=5000).lower() for s in ["anmelden","login","einloggen"])))
    except Exception as exc:
        print("BROWSER_ERROR_TYPE: "+type(exc).__name__)
    finally:
        browser.close()
