export default function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({error:'Methode nicht erlaubt'});
  const url=process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_ANON_KEY;
  if(!url||!key)return res.status(503).json({error:'Die Registrierung wird eingerichtet. Bitte später erneut versuchen.'});
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url))return res.status(503).json({error:'Ungültige Auth-Konfiguration'});
  return res.status(200).json({url,key}); // Anon/public key only; never a service role key
}
