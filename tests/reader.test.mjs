import test from 'node:test';
import assert from 'node:assert/strict';
import {dateISO,parseReceiptText,suggestCategory} from '../public/reader.js';

test('BML transfer slip format: amount date ref both accounts and multiline remarks',()=>{
 const text=`Transfer BML
MVR 25,000.00
Status
SUCCESS
Reference
TEST230491820183
Transaction date
14/04/2026 13:34
From
7710000012345
To
7700000054321
Amount
MVR 25,000.00
Remarks
DEMO DEMO/INV/
2026/001
Bank of Maldives`;
 const r=parseReceiptText(text,['Contribution','Other','Sponsorship'],'income');
 assert.equal(r.amount,25000);assert.equal(r.date,'2026-04-14');assert.equal(r.reference,'TEST230491820183');assert.equal(r.fromAccountNo,'7710000012345');assert.equal(r.toAccountNo,'7700000054321');assert.equal(r.description,'DEMO DEMO/INV/2026/001');assert.equal(r.fromAccountName,'');assert.equal(r.toAccountName,'');
});
test('date conversion rejects invalid date; classification selects available options only',()=>{
 assert.equal(dateISO('31/02/2026'),'');assert.equal(dateISO('2026-04-14'),'2026-04-14');
 assert.equal(suggestCategory('Cement timber plywood purchase',['Other','Construction Materials']).category,'Construction Materials');
 assert.equal(suggestCategory('Cement timber plywood purchase',['Other']).category,'Other');
 const invoice=parseReceiptText('INVOICE\nInvoice No: 2026-55\nInvoice Date: 21/10/2026\nVendor: Thinadhoo Supplies\nTotal Amount: MVR 1200.00\nDescription: Cement and plywood',['Other','Construction Materials'],'expense');
 assert.equal(invoice.amount,1200);assert.equal(invoice.category,'Construction Materials');assert.equal(invoice.date,'2026-10-21');
});
