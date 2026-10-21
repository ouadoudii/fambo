"""Browser response filter for the local, user-controlled WebUntis agent."""
from timetable import extract_lessons, is_school_timetable_response

def lessons_from_response(url,content_type,payload):
 """Consume lesson-shaped responses from trusted WebUntis origins only.

 Never return cookies, headers or unrelated payload fields.
 """
 if not is_school_timetable_response(url,content_type):
  return []
 return extract_lessons(payload)
