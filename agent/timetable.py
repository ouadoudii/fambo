"""Normalize only minimum lesson fields from observed WebUntis timetable JSON.

The agent does not capture network request headers, cookies, tokens, or raw payloads.
"""
from datetime import datetime
import re
def _str(x):
 return x.strip() if isinstance(x,str) else ''
def _clock(value):
 value=str(value)
 if not re.fullmatch(r'\d{3,4}',value):return ''
 return value.zfill(4)[:2]+':'+value.zfill(4)[2:]
def extract_lessons(payload):
 root=payload
 if not isinstance(root,dict):return []
 for chain in [('data','result','data'),('data','data'),('result','data'),('data',)]:
  obj=payload
  for key in chain:
   obj=obj.get(key) if isinstance(obj,dict) else None
  if isinstance(obj,dict) and isinstance(obj.get('elementPeriods'),dict):
   root=obj
   break
 periods=root.get('elementPeriods') if isinstance(root,dict) else None
 if not isinstance(periods,dict):return []
 out=[]
 for rows in periods.values():
  if not isinstance(rows,list):continue
  for period in rows:
   if not isinstance(period,dict):continue
   stamp=str(period.get('date',period.get('day','')))
   day=stamp[:4]+'-'+stamp[4:6]+'-'+stamp[6:] if re.fullmatch(r'\d{8}',stamp) else stamp
   try: datetime.strptime(day,'%Y-%m-%d')
   except ValueError:continue
   start=_clock(period.get('startTime',''))
   end=_clock(period.get('endTime',''))
   if not start:continue
   elements=period.get('elements') if isinstance(period.get('elements'),list) else []
   subject=next((_str(e.get('name')) for e in elements if isinstance(e,dict) and e.get('type') in (3,'SUBJECT')),'')
   room=next((_str(e.get('name')) for e in elements if isinstance(e,dict) and e.get('type') in (4,'ROOM')),'')
   text=_str(period.get('subjectName')) or _str(period.get('subject')) or subject or 'Unterricht'
   out.append({'date':day,'start':start,'end':end,'subject':text[:100],'room':(_str(period.get('room')) or room)[:80],
               'cancelled':period.get('code')=='cancelled' or period.get('isCancelled') is True or period.get('cellState')=='CANCEL'})
 return sorted(out,key=lambda x:(x['date'],x['start'],x['subject']))
