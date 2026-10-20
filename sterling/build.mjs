import {mkdir,copyFile,cp,readdir,readFile,writeFile,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
// Retain the existing static integration pages and Titan assets unchanged.
for(const entry of await readdir('.',{withFileTypes:true})){
 const name=entry.name;
 if(name.startsWith('.')||['dist','api','node_modules','tests','package.json','package-lock.json','vercel.json','build.mjs','README.md','QA.md'].includes(name))continue;
 if(entry.isDirectory())await cp(name,'dist/'+name,{recursive:true});
 else if(/\.(html|css|js|json|webmanifest|ico)$/.test(name))await copyFile(name,'dist/'+name);
}
await writeFile('dist/qa-failure.html',(await readFile('index.html','utf8')).replace('assets/sterling-cinematic.mp4','assets/deliberately-missing-test-video.mp4'));
