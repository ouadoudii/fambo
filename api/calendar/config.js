/** Only the public OAuth client ID is exposed. Tokens never reach Fambo's API. */
export default function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Methode nicht erlaubt'});
 const id=(req.runtimeEnv||process.env).GOOGLE_CALENDAR_CLIENT_ID||'';
 if(!/^[0-9]+-[a-z0-9_-]+\.apps\.googleusercontent\.com$/.test(id))return res.status(503).json({error:'Google-Kalender-Anbindung noch nicht konfiguriert.'});
 return res.status(200).json({clientId:id});
}
