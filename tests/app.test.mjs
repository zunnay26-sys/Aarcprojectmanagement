import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseReceiptText,suggestCategory } from '../public/reader.js';

let proc, port, base, session='';
const temp=mkdtempSync(path.join(os.tmpdir(),'aarc-test-'));
function testFetch(route,{method='GET',body,auth=true}={}) {return fetch(base+route,{method,headers:{...(auth&&session?{cookie:session}:{}),...(body!==undefined?{'content-type':'application/json'}:{})},body:body===undefined?undefined:JSON.stringify(body)}).then(async r=>({status:r.status,headers:r.headers, data:await r.json()}));}
before(async()=>{
 port=30000+Math.floor(Math.random()*15000);base='http://127.0.0.1:'+port;
 proc=spawn(process.execPath,['server.mjs'],{cwd:path.resolve('tests/..'),env:{...process.env,PORT:String(port),HOST:'127.0.0.1',DATA_DIR:temp},stdio:['ignore','pipe','pipe']});
 const messages=[];proc.stderr.on('data',data=>messages.push(String(data)));let started=false;
 for(let i=0;i<80;i++){if(proc.exitCode!==null)break;try{const r=await fetch(base+'/api/bootstrap');if(r.ok){started=true;break;}}catch{}await new Promise(res=>setTimeout(res,100));}
 assert.ok(started,'server failed startup: '+messages.join(''));
});
after(()=>{proc?.kill();rmSync(temp,{recursive:true,force:true});});

test('bootstrap, administrator setup, login, protected state',async()=>{
 const start=await testFetch('/api/bootstrap');assert.equal(start.data.needsSetup,true);
 const forbid=await testFetch('/api/state');assert.equal(forbid.status,401);
 const setup=await testFetch('/api/auth/setup',{method:'POST',auth:false,body:{email:'treasurer@example.com',password:'correct-horse-battery-#-2026'}});assert.equal(setup.status,201,JSON.stringify(setup.data));
 const setupTwice=await testFetch('/api/auth/setup',{method:'POST',auth:false,body:{email:'another@example.com',password:'another-horse-password-2026'}});assert.equal(setupTwice.status,409);
 const login=await testFetch('/api/auth/login',{method:'POST',auth:false,body:{email:'treasurer@example.com',password:'correct-horse-battery-#-2026'}});assert.equal(login.status,200,JSON.stringify(login.data));session=login.headers.get('set-cookie').split(';')[0];assert.match(session,/aarc_session/);
 const state=await testFetch('/api/state');assert.equal(state.status,200);assert.equal(state.data.entries.length,0);
 const crab=state.data.projects.find(p=>p.name==='Crab Beach');assert.ok(crab);assert.equal(state.data.projects.filter(p=>p.parentId===crab.id).length,6);
});
test('project CRUD, hierarchy, category creation',async()=>{
 const p=await testFetch('/api/projects',{method:'POST',body:{name:'Community Event',parentId:'crab-beach',budget:500,status:'Active',description:'Children day'}});assert.equal(p.status,201,JSON.stringify(p.data));
 const invalidChild=await testFetch('/api/projects',{method:'POST',body:{name:'Grandchild',parentId:p.data.id,budget:25}});assert.equal(invalidChild.status,400);
 const edit=await testFetch('/api/projects/'+p.data.id,{method:'PUT',body:{name:'Community Event',budget:675,status:'On Hold',description:'Updated'}});assert.equal(edit.status,200);
 const c=await testFetch('/api/categories',{method:'POST',body:{name:'Event Equipment'}});assert.equal(c.status,201);
});
test('income, expense, duplicate reference, receipt isolation',async()=>{
 const entry={kind:'income',projectId:'eid-malhi-2025',amount:25000,date:'2026-04-14',description:'DEMO DEMO/INV/2026/001',category:'Donation',party:'AARC',status:'Confirmed',reference:'TEST230491820183',fromAccountNo:'7710000012345',toAccountNo:'7700000054321',documentType:'Transfer Slip'};
 const save=await testFetch('/api/entries',{method:'POST',body:entry});assert.equal(save.status,201,JSON.stringify(save.data));
 const duplicate=await testFetch('/api/entries',{method:'POST',body:entry});assert.equal(duplicate.status,409);
 const id=save.data.id;
 const receiptBytes=Buffer.from('%PDF-1.7\n1 0 obj <<>> endobj\n%%EOF');
 const upload=await testFetch('/api/receipts/'+id,{method:'POST',body:{content:receiptBytes.toString('base64'),contentType:'application/pdf',name:'transfer.pdf'}});assert.equal(upload.status,201,JSON.stringify(upload.data));
 const r=await fetch(base+'/api/receipts/'+id,{headers:{cookie:session}});assert.equal(r.status,200);assert.equal(await r.text(),receiptBytes.toString());
 const unauthed=await fetch(base+'/api/receipts/'+id);assert.equal(unauthed.status,401);
 const exportData=await testFetch('/api/export');assert.equal(exportData.status,200);assert.equal(exportData.data.entries.length,1);assert.equal(exportData.data.warning.includes('NOT included'),true);
 const detach=await testFetch('/api/receipts/'+id,{method:'DELETE'});assert.equal(detach.status,200);assert.equal(detach.data.entryPreserved,true);
 const oldSlip=await fetch(base+'/api/receipts/'+id,{headers:{cookie:session}});assert.equal(oldSlip.status,404);
 const exists=(await testFetch('/api/state')).data.entries.find(e=>e.id===id);assert.equal(exists.amount,25000);assert.equal(exists.hasReceipt,false);
});
test('JSON export and non-destructive import skip existing source entries',async()=>{
 const ex=(await testFetch('/api/export')).data;const first=await testFetch('/api/import',{method:'POST',body:{confirm:'IMPORT',backup:ex}});assert.equal(first.status,200,JSON.stringify(first.data));assert.equal(first.data.newEntries,1);
 const second=await testFetch('/api/import',{method:'POST',body:{confirm:'IMPORT',backup:ex}});assert.equal(second.status,200);assert.equal(second.data.newEntries,0);assert.equal(second.data.skipped,1);
 const current=(await testFetch('/api/state')).data;assert.equal(current.entries.length,2);
});
test('BML bank slip text parsing and expense category classification',()=>{
 const text=`Transfer BML\nMVR 25,000.00\nStatus SUCCESS\nReference TEST230491820183\nTransaction date 14/04/2026 13:34\nFrom 7710000012345\nTo 7700000054321\nAmount MVR 25,000.00\nRemarks DEMO DEMO/INV/\n2026/001\nBank of Maldives`;
 const o=parseReceiptText(text,['Other','Donation','Construction Materials'],'income');
 assert.equal(o.date,'2026-04-14');assert.equal(o.amount,25000);assert.equal(o.reference,'TEST230491820183');assert.equal(o.fromAccountNo,'7710000012345');assert.equal(o.toAccountNo,'7700000054321');assert.match(o.description,/DEMO\/INV\/\s*2026\/001/);assert.equal(o.fromAccountName,'');
 const c=suggestCategory('Timber plywood nails and cement','Construction Materials,Other'.split(','));assert.equal(c.category,'Construction Materials');
});
