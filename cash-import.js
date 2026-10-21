/* EasyTrader cash account statement importer; no server and no double counting trades. */
(()=>{'use strict';
const $=id=>document.getElementById(id),panel=$('cashImportPanel'),file=$('cashImportFile');
const fields={date:'تاریخ',description:'شرح',debit:'بدهکار',credit:'بستانکار',balance:'مانده'};
const aliases={date:['تاریخ','date'],description:['شرح','توضیحات','description'],debit:['بدهکار','debit'],credit:['بستانکار','credit'],balance:['مانده','balance']};
let table=[],headers=[],mapping={},rows=[],fileName='';
const reader=()=>window.brokerSheetReader;
const normalized=s=>reader().norm(s).replace(/\s+/g,'');
const fmt=n=>Number(n).toLocaleString('fa-IR');
const money=x=>{const t=String(x??'').trim();return t===''?0:reader().parseNumber(t)};
function signature(r){return ['easytrader-cash',r.date,r.type,r.amount].join('|')}
function existingCounts(){const m=new Map();for(const x of app.cashTransactions||[]){const key=x.importSignature||['easytrader-cash',x.date,x.type,Number(x.amount)].join('|');m.set(key,(m.get(key)||0)+1)}return m}
function classify(desc){const s=normalized(desc);if(/پرداختوجه|واریزوجه|واریزبهحساب|deposit/.test(s))return 'deposit';if(/دریافتوجه|برداشتوجه|برداشتازحساب|withdraw/.test(s))return 'withdrawal';if(/خرید|فروش/.test(s))return 'trade';return 'other'}
function compute(){mapping={};document.querySelectorAll('#cashImportMapping select').forEach(x=>mapping[x.dataset.field]=Number(x.value));rows=[];
if(['date','description','debit','credit'].some(f=>mapping[f]<0)){$('cashImportSummary').textContent='ستون‌های تاریخ، شرح، بدهکار و بستانکار را مشخص کن.';$('cashImportCommit').disabled=true;return}
const existing=existingCounts(),seen=new Map();let accepted=0,duplicate=0,trades=0,unknown=0,invalid=0,balanceIssues=0;let previous=null;
for(const line of table.slice(1)){if(!line.some(v=>String(v??'').trim()))continue;const get=f=>mapping[f]<0?'':line[mapping[f]]??'';const date=reader().dateValue(get('date')),description=String(get('description')).trim(),debit=money(get('debit')),credit=money(get('credit')),balance=mapping.balance<0?null:money(get('balance'));const type=classify(description);let status='',amount=type==='deposit'?credit:debit;
if(!date||!description||!Number.isFinite(debit)||!Number.isFinite(credit)||debit<0||credit<0||(mapping.balance>=0&&!Number.isFinite(balance))){status='⚠ دادهٔ نامعتبر';invalid++}
else if(debit>0&&credit>0){status='⚠ بدهکار و بستانکار هم‌زمان';invalid++}
else if(type==='trade'){status='🔎 معامله؛ فقط تطبیق';trades++}
else if(type==='other'){status='— نوع نامشخص؛ ثبت نمی‌شود';unknown++}
else if(amount<=0||(type==='deposit'&&debit!==0)||(type==='withdrawal'&&credit!==0)){status='⚠ مبلغ نامعتبر';invalid++}
else {const key=signature({date,type,amount});const used=seen.get(key)||0;seen.set(key,used+1);if(used<(existing.get(key)||0)){status='↩ قبلاً ثبت شده';duplicate++}else{status='✓ آمادهٔ ثبت';accepted++}}
if(previous&&date&&previous.date&&mapping.balance>=0&&Number.isFinite(balance)&&Number.isFinite(previous.balance)&&date<=previous.date){const expected=balance+previous.credit-previous.debit;if(Math.abs(expected-previous.balance)>1){balanceIssues++}}
if(date&&Number.isFinite(debit)&&Number.isFinite(credit)&&Number.isFinite(balance))previous={date,debit,credit,balance};
rows.push({date,description,debit,credit,balance,type,amount,status});}
const tbody=$('cashImportPreview');tbody.replaceChildren();for(const r of rows.slice(0,150)){const tr=document.createElement('tr');tr.className=r.status.startsWith('✓')?'import-good':'import-warn';for(const val of [r.status,r.date||'—',r.description,fmt(r.debit),fmt(r.credit),r.balance===null?'—':fmt(r.balance)]){const td=document.createElement('td');td.textContent=val;tr.append(td)}tbody.append(tr)}
$('cashImportSummary').textContent=`${fmt(accepted)} واریز/برداشت آماده، ${fmt(duplicate)} تکراری، ${fmt(trades)} خریدوفروش صرفاً برای تطبیق، ${fmt(unknown)} شرح ناشناخته، ${fmt(invalid)} نامعتبر. ${mapping.balance>=0?`اختلاف احتمالی زنجیرۀ مانده در ${fmt(balanceIssues)} نقطه (بررسی فقط در ترتیب نزولی فایل).`:''} ${rows.length>150?'۱۵۰ ردیف نخست نمایش داده شده‌اند.':''} ماندهٔ گزارش کارگزاری به‌طور خودکار جایگزین ماندهٔ برنامه نمی‌شود.`;
$('cashImportCommit').disabled=!accepted;
}
function mappingUI(){const el=$('cashImportMapping');el.replaceChildren();for(const [key,label] of Object.entries(fields)){const wrap=document.createElement('label');wrap.textContent=label;const select=document.createElement('select');select.dataset.field=key;select.add(new Option('— انتخاب نشده —','-1'));let found=-1;headers.forEach((h,i)=>{select.add(new Option(h||`ستون ${i+1}`,String(i)));if(found<0&&aliases[key].some(a=>normalized(a)===normalized(h)))found=i});select.value=String(found);select.onchange=compute;wrap.append(select);el.append(wrap)}compute()}
$('cashImportBtn').onclick=()=>{panel.hidden=false;file.click();panel.scrollIntoView({behavior:'smooth'})};
$('cashImportClose').onclick=$('cashImportCancel').onclick=()=>{panel.hidden=true;file.value=''};
file.onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>15*1024*1024)throw Error('فایل بزرگ‌تر از ۱۵ مگابایت است.');fileName=f.name;table=/\.xlsx$/i.test(f.name)?await reader().unzipXlsx(f):/\.csv$/i.test(f.name)?reader().csv(await f.text()):null;if(!table||table.length<2)throw Error('فایل CSV/XLSX معتبر با ردیف داده انتخاب کن.');headers=table[0].map(x=>String(x??'').trim());$('cashImportStatus').textContent=`فایل «${fileName}» خوانده شد. پیش از تأیید، ستون‌ها و ردیف‌ها را بررسی کن.`;mappingUI()}catch(err){$('cashImportStatus').textContent='⚠ '+err.message;$('cashImportCommit').disabled=true;$('cashImportPreview').replaceChildren()}};
$('cashImportCommit').onclick=()=>{const valid=rows.filter(r=>r.status==='✓ آمادهٔ ثبت');if(!valid.length)return;const deposits=valid.filter(r=>r.type==='deposit').length,withdrawals=valid.length-deposits;if(!confirm(`${fmt(deposits)} واریز و ${fmt(withdrawals)} برداشت ثبت شود؟\nمعاملات خریدوفروش دوباره ثبت نخواهند شد.\nپیش از ادامه از داده‌ها پشتیبان JSON بگیر.`))return;
const staged=structuredClone(app);staged.cashTransactions??=[];const counts=existingCounts();const added=new Map();let n=0;for(const r of valid){const key=signature(r),occ=added.get(key)||0;added.set(key,occ+1);if(occ<(counts.get(key)||0))continue;staged.cashTransactions.push({id:id(),date:r.date,type:r.type,amount:r.amount,note:r.description,importSignature:key,importSource:'easytrader-cash'});n++}
try{localStorage.setItem(KEY,JSON.stringify(staged))}catch{alert('ذخیره‌سازی ممکن نشد؛ داده‌ها تغییر نکردند.');return}app=staged;render();$('cashImportStatus').textContent=`✓ ${fmt(n)} تراکنش نقدی ثبت شد. معاملات سهام تغییری نکردند.`;$('cashImportCommit').disabled=true;rows=[];file.value='';};
})();
