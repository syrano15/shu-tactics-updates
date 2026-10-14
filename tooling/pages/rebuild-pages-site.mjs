import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {checkedManifest,safePath,verifyFile,exactFiles} from './site-policy.mjs';

export function rebuildPagesSite({updates,out,report,supplement=null}){
 updates=path.resolve(updates);out=path.resolve(out);
 assert.ok(!fs.existsSync(out),'Site output must be new; existing files are never deleted');
 assert.ok(out!==updates&&!updates.startsWith(out+path.sep)&&!out.startsWith(path.join(updates,'files')+path.sep),'Unsafe output location');
 const {manifest,bytes,manifestSHA256}=checkedManifest(path.join(updates,'latest.json'));
 // Verify ALL inputs before creating a partial site. Old updater objects remain
 // in the repository, but only current manifest paths enter this artifact.
 const objectFor=row=>{const primary=path.join(updates,'files',row.sha256);return fs.existsSync(primary)?primary:supplement?path.join(path.resolve(supplement),'files',row.sha256):primary;};
 for(const row of manifest.files)verifyFile(objectFor(row),row);
 fs.mkdirSync(out,{recursive:true});
 for(const row of manifest.files){const target=path.join(out,safePath(row.path));fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(objectFor(row),target);verifyFile(target,row);}
 assert.deepEqual(exactFiles(out),manifest.files.map(row=>row.path).sort());
 const result={passed:true,version:manifest.version,files:manifest.files.length,bytes,manifestSHA256,everyPathLengthAndSHA256Verified:true,latestFilesOnly:true,oldObjectsExcluded:true,duplicateDistExcluded:true,externalDeploymentPerformed:false};
 if(report)fs.writeFileSync(report,JSON.stringify(result,null,2)+'\n');return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);assert.equal(args.length,4,'Usage: --updates <updates-directory> --out <new-site-directory>');assert.equal(args[0],'--updates');assert.equal(args[2],'--out');console.log(JSON.stringify(rebuildPagesSite({updates:args[1],out:args[3]})));
}
