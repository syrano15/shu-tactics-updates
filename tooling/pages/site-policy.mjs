import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

export const MAX_PAGES_BYTES=1_000_000_000;
export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function safePath(value){
 assert.ok(typeof value==='string'&&value.length&&!path.isAbsolute(value)&&!/[\\:\0]/.test(value),'Unsafe relative path');
 assert.ok(!value.split('/').some(part=>!part||part==='.'||part==='..'),'Unsafe relative path');
 assert.ok(!/(?:^|\/)(?:\.git|\.github|node_modules|qa|outputs|private-user-save|source-art|credentials)(?:\/|$)/i.test(value),'Private or development path');
 return value;
}
export function checkedManifest(file){
 const manifest=JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
 assert.equal(manifest.format,1);assert.match(manifest.version,/^\d+\.\d+\.\d+$/);assert.ok(Array.isArray(manifest.files)&&manifest.files.length);
 const seen=new Set();let bytes=0;
 for(const row of manifest.files){safePath(row.path);const lower=row.path.toLowerCase();assert.ok(!seen.has(lower),'Duplicate or case-colliding path: '+row.path);seen.add(lower);assert.ok(Number.isSafeInteger(row.bytes)&&row.bytes>=0&&row.bytes<=128*1024*1024);assert.match(row.sha256,/^[a-f0-9]{64}$/);bytes+=row.bytes;}
 assert.ok(bytes<MAX_PAGES_BYTES,'Latest-only site exceeds the conservative 1 GB bound');
 assert.ok(manifest.files.some(row=>row.path==='index.html'));return {manifest,bytes,manifestSHA256:digest(fs.readFileSync(file))};
}
export function verifyFile(file,row){const stat=fs.lstatSync(file);assert.ok(stat.isFile()&&!stat.isSymbolicLink(),'Expected a regular file: '+file);const bytes=fs.readFileSync(file);assert.equal(bytes.length,row.bytes,'Length mismatch: '+row.path);assert.equal(digest(bytes),row.sha256,'Hash mismatch: '+row.path);return bytes;}
export function exactFiles(dir,prefix=''){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{assert.ok(!entry.isSymbolicLink());const relative=prefix+entry.name;return entry.isDirectory()?exactFiles(path.join(dir,entry.name),relative+'/'):[relative];}).sort();}
