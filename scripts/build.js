import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true}); for(const file of ['index.html','styles.css','app.js','lib.js','auth.js']) await copyFile(file,`dist/${file}`);console.log('Production build ready');
