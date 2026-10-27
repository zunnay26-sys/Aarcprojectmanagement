/** Local OCR/parser; account numbers are kept as strings. No data is saved by scanning. */
const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
export function dateISO(value){
  const x=value.match(/\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})\b/);
  if(x){const a=x[1].split(/[-/.]/).map(Number),first=x[1].slice(0,4).match(/^\d{4}$/),year=first?a[0]:(a[2]<100?a[2]+(a[2]>=70?1900:2000):a[2]),mo=a[1],day=first?a[2]:a[0];const d=new Date(Date.UTC(year,mo-1,day));if(d.getUTCFullYear()===year&&d.getUTCMonth()===mo-1&&d.getUTCDate()===day&&year>=2000&&year<=2100)return `${year}-${String(mo).padStart(2,'0')}-${String(day).padStart(2,'0')}`;}
  const named=value.match(/\b(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})/i);
  if(named){const y=Number(named[3]),m=months.indexOf(named[2].slice(0,3).toLowerCase())+1,d=Number(named[1]);const check=new Date(Date.UTC(y,m-1,d));if(check.getUTCFullYear()===y&&check.getUTCMonth()===m-1&&check.getUTCDate()===d)return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}
  return '';
}
function amountOf(value){const x=value.match(/(?:MVR|MRF|RF|ރ)\s*[:=-]?\s*([\d,]+(?:\.\d{1,2})?)/i)||value.match(/([\d,]+\.\d{2})\s*(?:MVR|MRF|RF)?/i);if(!x)return 0;const n=Number(x[1].replaceAll(',',''));return Number.isFinite(n)&&n>0&&n<1e9?n:0;}
const labels=[
 ['reference',/^(?:reference(?:\s*(?:no\.?|number|id))?|transaction\s*(?:reference|id|number)|payment\s*reference|receipt\s*(?:no\.?|number))\s*[:#\-]?\s*/i],
 ['date',/^(?:transaction\s*(?:date|time)|transfer\s*date|payment\s*date|invoice\s*date|bill\s*date|date)\s*[:#\-]?\s*/i],
 ['fromAccountName',/^(?:from\s*(?:account\s*)?name|sender\s*name|payer\s*name|received\s*from)\s*[:#\-]?\s*/i],
 ['toAccountName',/^(?:to\s*(?:account\s*)?name|payee(?:\s*name)?|beneficiary(?:\s*name)?|vendor(?:\s*name)?|supplier(?:\s*name)?|merchant(?:\s*name)?)\s*[:#\-]?\s*/i],
 ['fromAccountNo',/^(?:from(?:\s*account\s*(?:no\.?|number))?|sender\s*account(?:\s*(?:no\.?|number))?|debit\s*account)\s*[:#\-]?\s*/i],
 ['toAccountNo',/^(?:to(?:\s*account\s*(?:no\.?|number))?|recipient\s*account(?:\s*(?:no\.?|number))?|credit\s*account)\s*[:#\-]?\s*/i],
 ['invoiceNumber',/^(?:invoice\s*(?:no\.?|number|#)|bill\s*(?:no\.?|number|#))\s*[:#\-]?\s*/i],
 ['amount',/^(?:transfer(?:red)?\s*amount|total\s*paid|payment\s*amount|amount\s*paid|grand\s*total|total\s*amount|total|amount)\s*[:#\-]?\s*/i],
 ['description',/^(?:remarks?|description|narration|payment\s*details|notes?|purpose|particulars)\s*[:#\-]?\s*/i],
 ['status',/^(?:transaction\s*status|payment\s*status|status)\s*[:#\-]?\s*/i]
];
const acct=v=>{const m=String(v).match(/(?:^|\D)(\d[\d\s-]{5,25}\d)(?:\D|$)/);const n=m?.[1]?.replace(/[\s-]/g,'');return n&&n.length>=7&&n.length<=20?n:'';};
function fields(text){const lines=text.replace(/\u00a0/g,' ').split(/\r?\n/).map(s=>s.trim()).filter(Boolean),found={};for(let i=0;i<lines.length;i++){let key,value;for(const [k,re] of labels){const m=lines[i].match(re);if(m){key=k;value=lines[i].slice(m[0].length).trim();break;}}if(!key)continue;if(!value&&i+1<lines.length&&!labels.some(([,re])=>re.test(lines[i+1])))value=lines[++i];if(key==='description'){for(let j=i+1;j<Math.min(lines.length,i+3);j++){if(labels.some(([,re])=>re.test(lines[j]))||/^(Bank of Maldives|Thank you|Page \d+)/i.test(lines[j]))break;value+=(value.endsWith('/')?'':' ')+lines[j];i=j;}}if(value)found[key]??=value;}return {found,lines};}
export function suggestCategory(description,categories=[],kind='expense'){
 const s=String(description).toLowerCase();if(!s)return {category:'Other',confidence:'low'};
 const rules=[
  ['Construction Materials',/cement|sand|iron|timber|plywood|wood|roof|construction|building material|paint|tile|nail/],
  ['Hut Materials',/hut|joali|thatch|palm leaf|shelter|gazebo/],
  ['Labour',/labor|labour|workmanship|wages|carpenter|electrician|plumber/],
  ['Food & Drinks',/food|meal|lunch|dinner|breakfast|iftar|catering|juice|water bottle|drink|snack/],
  ['Printing',/poster|printing|print|banner|flag|sticker|canvas|uniform|jersey/],
  ['Transport',/transport|fuel|ferry|speedboat|boat|taxi|delivery|shipping|freight/],
  ['Decoration',/decoration|balloon|flower|ribbon|decor|lighting/],
  ['Maintenance',/repair|maintenance|replace|fix|service|spare part/],
  ['Cleaning',/cleaning|cleaner|detergent|sweep|trash|garbage/],
  ['Utilities',/electricity|power|utility|internet|telecom|water bill/],
  ['Sponsorship',/sponsor|sponsorship/],['Donation',/donation|donor|gift/],
  ['Contribution',/monthly contribution|member contribution|installment contribution|trip contribution/],
  ['Equipment',/equipment|tool|generator|machine|speaker/]
 ];
 for(const [label,re] of rules){const matching=categories.find(x=>x.toLowerCase()===label.toLowerCase());if(matching&&re.test(s))return {category:matching,confidence:'medium'};}
 if(kind==='income'&&/income|fundraising|donation|contribution|received/i.test(s)){for(const c of ['Contribution','Donation','Fundraising'])if(categories.includes(c)&&s.includes(c.toLowerCase()))return {category:c,confidence:'medium'};}
 return {category:'Other',confidence:'low'};
}
export function parseReceiptText(text,categories=[],kind='expense'){
 const {found,lines}=fields(String(text));
 const description=(found.description||'').replace(/\s+/g,' ').trim().slice(0,240);
 let amount=amountOf(found.amount||'');
 if(!amount){for(const line of lines.filter(x=>/\b(?:MVR|MRF|RF)\b/i.test(x)&&!/balance|account/i.test(x))){amount=amountOf(line);if(amount)break;}}
 let date=dateISO(found.date||'');if(!date){for(const line of lines){date=dateISO(line);if(date)break;}}
 const documentType=/\btransfer\s*bml|bank transfer|funds transfer\b/i.test(text)||found.fromAccountNo&&found.toAccountNo?'Transfer Slip':/\bpaid bill|payment receipt\b/i.test(text)?'Paid Bill':/\binvoice\b/i.test(text)?'Invoice':'Other';
 const reference=String(found.reference||'').match(/[a-z0-9][a-z0-9_-]{5,59}/i)?.[0]||'';
 const category=suggestCategory(description||text,categories,kind);
 const name=x=>x&&!/^\d+$/.test(x)&&/[a-z]{2}/i.test(x)?String(x).slice(0,140):'';
 return {date,amount,reference,documentType,invoiceNumber:String(found.invoiceNumber||'').slice(0,90),fromAccountNo:acct(found.fromAccountNo||''),toAccountNo:acct(found.toAccountNo||''),fromAccountName:name(found.fromAccountName),toAccountName:name(found.toAccountName),description,category:category.category,categoryConfidence:category.confidence,paymentStatus:/\bSUCCESS\b|\bPAID\b/i.test(found.status||'')?'paid':'unknown',rawText:String(text).slice(0,12000)};
}
async function script(src){if([...document.scripts].some(s=>s.src===src&&s.dataset.loaded==='1'))return;await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=true;s.onload=()=>{s.dataset.loaded='1';resolve();};s.onerror=()=>reject(new Error('OCR library could not load. Use manual entry.'));document.head.appendChild(s);});}
export async function readDocument(file,update=()=>{}){
 if(!['application/pdf','image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Please upload PDF, PNG, JPG or WEBP.');
 if(file.size>4*1024*1024)throw new Error('Maximum document size: 4 MB.');
 let image=file;
 if(file.type==='application/pdf'){
  update('Reading PDF text…');
  const pdfjs=await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.7.76/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.7.76/pdf.worker.min.mjs';
  const doc=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
  try{
   const texts=[];
   for(let p=1;p<=Math.min(3,doc.numPages);p++){const page=await doc.getPage(p);texts.push((await page.getTextContent()).items.map(it=>'str' in it?it.str:'').join('\n'));}
   const content=texts.join('\n').trim();if(content.replace(/\s/g,'').length>35){update('PDF text extracted.');return content;}
   update('Scanned PDF: recognizing first page…');const page=await doc.getPage(1),view=page.getViewport({scale:1.8});const can=document.createElement('canvas');can.width=view.width;can.height=view.height;const ctx=can.getContext('2d');await page.render({canvasContext:ctx,viewport:view}).promise;image=can;
  }finally{await doc.destroy();}
 }
 update('Loading on-device OCR…');await script('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js');
 if(!window.Tesseract)throw new Error('OCR library unavailable.');
 const worker=await window.Tesseract.createWorker('eng',1,{logger:m=>{if(m.status)update(m.status+(typeof m.progress==='number'?' '+Math.round(m.progress*100)+'%':''));}});
 try{const r=await worker.recognize(image);update('Scan ready — review carefully.');return r.data.text;}finally{await worker.terminate();}
}
