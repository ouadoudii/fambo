import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true}); for(const file of ['index.html','styles.css','app.js','calendar.js','lib.js']) await copyFile(file,`dist/${file}`); await mkdir('dist/lib',{recursive:true}); await copyFile('lib/ical.js','dist/lib/ical.js');console.log('Production build ready');
