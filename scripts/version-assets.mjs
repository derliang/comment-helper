import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export function stampAssets(files){
 const paths=Object.keys(files).sort(),hash=createHash('sha256');
 for(const path of paths)hash.update(path+'\0'+files[path]+'\0');
 const revision=hash.digest('hex').slice(0,16),out={...files};
 const asset=p=>Object.hasOwn(files,p)&&p!=='index.html';
 const add=p=>p+'?v='+revision;
 if(files['index.html'])out['index.html']=files['index.html'].replace(/(href|src)="([^"]+)"/g,(m,a,p)=>asset(p)?a+'="'+add(p)+'"':m);
 for(const path of paths.filter(p=>p.endsWith('.mjs')))out[path]=files[path].replace(/(\bfrom\s*|\bimport\s*)(['"])\.\/([a-zA-Z0-9_-]+\.mjs)\2/g,(m,a,q,p)=>asset(p)?a+q+'./'+add(p)+q:m);
 return {revision,files:out};
}
function main(){
 const root=resolve(fileURLToPath(new URL('..',import.meta.url)),'site');
 const paths=['index.html','style.css','app.mjs','engine.mjs','advanced.mjs','importers.mjs','handoff.mjs','roundtrip.mjs','vendor/xlsx.full.min.js','vendor/jszip.min.js'];
 const files=Object.fromEntries(paths.map(p=>[p,readFileSync(resolve(root,p),'utf8')]));
 const result=stampAssets(files);
 for(const p of paths)if(result.files[p]!==files[p])writeFileSync(resolve(root,p),result.files[p]);
 console.log('asset revision',result.revision);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
