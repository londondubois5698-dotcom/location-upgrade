import fs from 'node:fs';
fs.rmSync('dist',{recursive:true,force:true});
fs.mkdirSync('dist',{recursive:true});
for(const file of ['index.html','app.js','styles.css'])fs.copyFileSync(file,'dist/'+file);
fs.cpSync('assets','dist/assets',{recursive:true});
console.log('Static cinematic site packaged successfully');
