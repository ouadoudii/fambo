"""Public WebUntis connectivity diagnostics without revealing pupil timetable data."""
import json
import urllib.error
import urllib.parse
import urllib.request

HOST = "https://avh-gym-konstanz.webuntis.com"
requests = [
    ("public_portal", f"{HOST}/WebUntis?school=avh-gym-konstanz"),
    ("public_weekly_api_without_pupil", f"{HOST}/WebUntis/api/public/timetable/weekly/data?elementType=5&elementId=0&date=2026-10-19&formatId=1"),
    ("public_timetable_page_without_pupil", f"{HOST}/WebUntis?school=avh-gym-konstanz#/basic/timetablePublic"),
]

print("WEBUNTIS DIAGNOSTIC; no student IDs, login details or timetable contents are logged",flush=True)
for name,url in requests:
    request=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (Fambo diagnostic; no personal data)","Accept":"application/json,text/html;q=0.9,*/*;q=0.5"})
    try:
        with urllib.request.urlopen(request,timeout=20) as response:
            status=response.status
            content_type=response.headers.get("Content-Type","").split(";")[0]
            final_url=response.geturl()
            body=response.read(65536)
            response_type = "json" if content_type == "application/json" else "html" if "html" in content_type else "other"
            top_keys=[]
            if response_type == "json":
                try:
                    data=json.loads(body)
                    if isinstance(data,dict):top_keys=list(data)[:8]
                except (ValueError,UnicodeDecodeError):response_type="malformed_json"
            print(f"{name}: http={status}, type={response_type}, content_type={content_type}, keys={top_keys}, redirected={final_url != url}",flush=True)
    except urllib.error.HTTPError as error:
        print(f"{name}: http={error.code}, type=error, response content withheld",flush=True)
    except Exception as error:
        print(f"{name}: network_error={type(error).__name__}, response content withheld",flush=True)
