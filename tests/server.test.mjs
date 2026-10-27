import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO/8LREAAAAASUVORK5CYII=';
let proc,dir,base,cookie='';
async function call(endpoint,method='GET',payload=null,headers={}){
 const res=await fetch(base+endpoint,{method,headers:{...(payload?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...headers},body:payload?JSON.stringify(payload):undefined});
 const json=await res.json().catch(()=>({}));return {status:res.status,json,headers:res.headers};
}
async function setup(){dir=await mkdtemp(path.join(os.tmpdir(),'aarc-test-'));const port=30000+Math.floor(Math.random()*20000);base=`http://127.0.0.1:${port}`;
 proc=spawn(process.execPath,['--disable-warning=ExperimentalWarning','server.mjs'],{cwd:root,env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DATA_DIR:dir,OPENAI_API_KEY:''},stdio:'ignore'});
 for(let i=0;i<80;i++){try{const r=await call('/api/bootstrap');if(r.status===200)return;}catch{}await new Promise(r=>setTimeout(r,60));}
 throw new Error('Test server did not start');
}
async function teardown(){proc?.kill('SIGTERM');await new Promise(r=>setTimeout(r,200));await rm(dir,{recursive:true,force:true});}

test('secure setup, project/finance/slip workflows and import remain independent',async()=>{
 await setup();try{
  let r=await call('/api/bootstrap');assert.equal(r.json.needsSetup,true);
  r=await call('/api/state');assert.equal(r.status,401);
  r=await call('/api/auth/setup','POST',{email:'treasurer@example.com',password:'my-test-password-1234'});assert.equal(r.status,201);
  r=await call('/api/auth/setup','POST',{email:'another@example.com',password:'other-test-password-456'});assert.equal(r.status,409);
  r=await call('/api/auth/login','POST',{email:'treasurer@example.com',password:'wrong-password'});assert.equal(r.status,401);
  r=await call('/api/auth/login','POST',{email:'treasurer@example.com',password:'my-test-password-1234'});assert.equal(r.status,200);
  cookie=r.headers.get('set-cookie').split(';')[0];assert.ok(cookie.startsWith('aarc_session='));
  r=await call('/api/state');assert.equal(r.status,200);
  assert.equal(r.json.projects.find(p=>p.name==='Crab Beach')?.id,'crab-beach');
  assert.equal(r.json.projects.filter(p=>p.parentId==='crab-beach').length,6);
  assert.ok(r.json.categories.includes('Hut Materials'));
  let record={kind:'income',projectId:'eid-malhi-2025',amount:25000,date:'2026-04-14',category:'Sponsorship',description:'DEMO INV/2026/001',party:'AARC',status:'Pending',reference:'TEST230491820183',fromAccountNo:'7710000012345',toAccountNo:'7700000054321',documentType:'Transfer Slip'};
  r=await call('/api/entries','POST',record);assert.equal(r.status,201);const id=r.json.id;
  r=await call('/api/entries','POST',record);assert.equal(r.status,409,'duplicate reference/date/amount blocked');
  r=await call('/api/receipts/'+id,'POST',{content:png,contentType:'image/png',name:'BML slip.png'});assert.equal(r.status,201);
  r=await call('/api/state');let line=r.json.entries.find(e=>e.id===id);assert.equal(line.hasReceipt,true);assert.equal(line.fromAccountNo,'7710000012345');
  r=await call('/api/receipts/'+id,'DELETE');assert.equal(r.status,200);assert.equal(r.json.entryPreserved,true);
  r=await call('/api/state');line=r.json.entries.find(e=>e.id===id);assert.equal(line.hasReceipt,false);assert.equal(line.amount,25000);
  r=await call('/api/entries/'+id,'PUT',{...record,status:'Confirmed'});assert.equal(r.status,200);
  r=await call('/api/categories','POST',{name:'Custom Hut Category'});assert.equal(r.status,201);
  const backup={exportedAt:'2026-10-27',projects:[{id:'old-crab',name:'Crab Beach',parentId:'',budget:100},{id:'old-hut',name:'Hut Project 2026',parentId:'old-crab',budget:100}],categories:['Additional'],entries:[{id:'old-slip-1',projectId:'old-hut',kind:'expense',date:'2026-04-20',amount:120,description:'Construction material',category:'Additional',status:'Confirmed'}]};
  r=await call('/api/import','POST',{backup,confirm:'NOT_IMPORT'});assert.equal(r.status,400);
  r=await call('/api/import','POST',{backup,confirm:'IMPORT'});assert.equal(r.status,200);assert.equal(r.json.newProjects,0);assert.equal(r.json.newEntries,1);
  r=await call('/api/import','POST',{backup,confirm:'IMPORT'});assert.equal(r.status,200);assert.equal(r.json.newEntries,0);
  r=await call('/api/export');assert.equal(r.status,200);assert.equal(r.json.entries.length,2);assert.equal(r.json.version,2);
  r=await call('/api/projects/crab-beach','DELETE');assert.equal(r.status,409);
  r=await call('/api/auth/logout','POST');assert.equal(r.status,200);
  cookie='';r=await call('/api/state');assert.equal(r.status,401);
 }finally{await teardown();}
});
