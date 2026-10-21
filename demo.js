// Local, read-only demo data. No Supabase account or WebUntis credentials are used.
export const DEMO_CHILDREN=Object.freeze([{name:'Alex',url:''},{name:'Mila',url:''}]);
const SCHEDULES=[
 [['Mathematik','08:00','08:45','A101'],['Deutsch','09:00','09:45','B204'],['Sport','10:00','10:45','Halle']],
 [['Englisch','08:00','08:45','A107'],['Biologie','09:00','09:45','Labor']],
 [['Geschichte','08:00','08:45','C205'],['Musik','09:00','09:45','Musikraum']],
 [['Physik','08:00','08:45','Labor'],['Mathematik','09:00','09:45','A101']],
 [['Kunst','08:00','08:45','Atelier'],['Deutsch','09:00','09:45','B204']]
];
export function demoLessons(monday, childIndex) {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(monday))throw Error('Ungültige Demo-Woche');
 if(!Number.isInteger(childIndex)||childIndex<0||childIndex>1)throw Error('Unbekannter Demo-Stundenplan');
 const start=new Date(monday+'T12:00:00Z');
 if(!Number.isFinite(start.getTime()))throw Error('Ungültige Demo-Woche');
 return SCHEDULES.flatMap((periods,day)=>{
  const date=new Date(start);date.setUTCDate(date.getUTCDate()+day);
  const iso=date.toISOString().slice(0,10);
  const lessons=childIndex===0?periods:periods.map(([subject,from,to,room],idx)=>[idx===0?'Französisch':subject,from,to,room]);
  return lessons.map(([subject,from,to,room],idx)=>({
   id:`demo-${childIndex}-${day}-${idx}`,date:iso,start:from,end:to,subject,room,
   cancelled:day===3&&idx===1&&childIndex===0
  }));
 });
}
