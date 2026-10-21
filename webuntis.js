/**
 * Anonymous WebUntis timetable adapter.
 * Builds a school-scoped browser session before the weekly request.
 * This does not bypass school permissions: a 403 remains an explicit failure.
 */
function cookiesFrom(response) {
  const headers=response.headers;
  const values=typeof headers.getSetCookie==='function' ? headers.getSetCookie() : [headers.get?.('set-cookie')].filter(Boolean);
  return values.flatMap(value=>String(value).split(/,(?=\s*[^;,=\s]+=)/)).map(value=>value.split(';',1)[0]?.trim()).filter(value=>/^[!#$%&'*+.^_`|~\w-]+=/.test(value));
}
export async function publicTimetable({origin,school,entityId},day,{fetcher=fetch,timeout=10000}={}) {
  const portal=new URL('/WebUntis',origin);
  portal.searchParams.set('school',school);
  const init=await fetcher(portal.toString(),{
    headers:{Accept:'text/html,application/xhtml+xml'},
    redirect:'follow',signal:AbortSignal.timeout(timeout)
  });
  if(!init.ok)throw Error('WebUntis-Schulportal ist nicht erreichbar ('+init.status+').');
  const cookies=cookiesFrom(init);
  const schoolCookie='schoolname=_'+Buffer.from(school,'utf8').toString('base64');
  const jar=[schoolCookie,...cookies.filter(c=>!c.startsWith('schoolname='))].join('; ');
  const url=new URL('/WebUntis/api/public/timetable/weekly/data',origin);
  url.search=new URLSearchParams({elementType:'5',elementId:String(entityId),date:day,formatId:'1'}).toString();
  const upstream=await fetcher(url.toString(),{
    headers:{Accept:'application/json','X-Requested-With':'XMLHttpRequest',Referer:portal.toString(),Cookie:jar},
    redirect:'error',signal:AbortSignal.timeout(timeout)
  });
  if(upstream.status===401||upstream.status===403)throw Error('WebUntis erlaubt diesen Schüler-Stundenplan ohne Schul-Anmeldung nicht.');
  if(!upstream.ok)throw Error('WebUntis antwortet mit Status '+upstream.status+'.');
  const type=upstream.headers?.get?.('content-type')||'';
  if(!/json/i.test(type))throw Error('WebUntis hat keinen JSON-Stundenplan zurückgegeben.');
  const result=await upstream.json();
  if(result?.data?.error||result?.error)throw Error('WebUntis hat den Zugriff auf den Stundenplan abgelehnt.');
  return result;
}
