const KEY="stocks-web-v4";const LEGACY_KEYS=["stocks-web-v3","stocks-web-v2"];const DEFAULT_SYMBOL="عیار";
const initialData=[["1405/04/28",10,520000,6240],["1405/04/29",10,510000,6120],["1405/05/04",10,500000,6000],["1405/05/31",10,580000,6960],["1405/05/31",10,583000,6996],["1405/05/31",10,583000,6996],["1405/05/31",10,590000,7080],["1405/06/02",10,610000,7320],["1405/06/03",10,600000,7200],["1405/06/15",110,640000,84480],["1405/06/16",100,630000,75600],["1405/06/22",100,640000,38496],["1405/06/24",16,630000,0],["1405/07/01",384,650000,0],["1405/07/08",150,710000,85200]];
const $=s=>document.querySelector(s),rowsEl=$("#rows"),priceEl=$("#currentPrice"),feeEl=$("#sellFee");let app=loadApp(),activeSymbol=app.activeSymbol||DEFAULT_SYMBOL,calendarTarget=null,calendarCursor=null,chartPoints=[];
function id(){return crypto.randomUUID?.()||String(Date.now()+Math.random())}function faToEn(s){return String(s??"").replace(/[۰-۹]/g,c=>"۰۱۲۳۴۵۶۷۸۹".indexOf(c)).replace(/[٠-٩]/g,c=>"٠١٢٣٤٥٦٧٨٩".indexOf(c)).replace(/٫/g,".").replace(/٬/g,"").replace(/,/g,"").replace(/[\/\\-]/g,"/")}function enToFa(s){return String(s??"").replace(/\d/g,d=>"۰۱۲۳۴۵۶۷۸۹"[d])}function num(v){return Number(faToEn(v).replace(/[^0-9.+-]/g,""))||0}function fmt(v){return Math.round(v||0).toLocaleString("fa-IR")}function fmtPct(v){return (v*100).toLocaleString("fa-IR",{minimumFractionDigits:2,maximumFractionDigits:2})+"٪"}
function formatThousands(v){const raw=faToEn(v).replace(/[^0-9]/g,"");return raw?enToFa(Number(raw).toLocaleString("en-US").replace(/,/g,"٬")):""}function formatDecimal(v){let s=faToEn(v).replace(/[^0-9.]/g,"");const p=s.split(".");if(p.length>2)s=p[0]+"."+p.slice(1).join("");return enToFa(s.replace(".","٫"))}
function div(a,b){return Math.floor(a/b)}function jalaliToGregorian(jy,jm,jd){jy=+jy;jm=+jm;jd=+jd;const epBase=jy-(jy>=0?474:473),epYear=474+((epBase%2820+2820)%2820),md=jm<=7?(jm-1)*31:(jm-1)*30+6,days=jd+md+div(epYear*682-110,2816)+(epYear-1)*365+div(epBase,2820)*1029983+(1948320-1);let gy=400*div(days,146097),rem=days%146097;if(rem>=36524){gy+=100*div(--rem,36524);rem%=36524;if(rem>=365)rem++}let yday=rem;gy+=4*div(yday,1461);yday%=1461;if(yday>=366){gy+=div(yday-1,365);yday=(yday-1)%365}let gd=yday+1;const leap=(gy%4===0&&gy%100!==0)||gy%400===0,sal=leap?[31,29,31,30,31,30,31,31,30,31,30,31]:[31,28,31,30,31,30,31,31,30,31,30,31];let gm=1;while(gd>sal[gm-1]){gd-=sal[gm-1];gm++}return {gy,gm,gd,date:new Date(Date.UTC(gy,gm-1,gd))}}
function parseJ(s){const a=faToEn(s).split("/").map(Number);if(a.length!==3||!a.every(Number.isFinite))return null;const[y,m,d]=a;if(y<1200||y>1600||m<1||m>12||d<1||d>(m<=6?31:m<=11?30:30))return null;return{y,m,d,...jalaliToGregorian(y,m,d)}}function currentJalali(){const p=new Intl.DateTimeFormat("fa-IR-u-ca-persian-nu-latn",{year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()),g=t=>Number(p.find(x=>x.type===t)?.value);return{y:g("year"),m:g("month"),d:g("day")}}function daysBetweenJalali(date){const d=parseJ(date);if(!d)return null;const n=currentJalali(),now=jalaliToGregorian(n.y,n.m,n.d);return Math.max(0,Math.round((now.date-d.date)/86400000))}
function jalaliMonthDays(y,m){if(m<=6)return 31;if(m<=11)return 30;const a=jalaliToGregorian(y,12,1).date,b=jalaliToGregorian(y+1,1,1).date;return Math.round((b-a)/86400000)}
function jalaliDuration(startDate,endDate=currentJalali()){const s=parseJ(startDate);if(!s)return null;let sy=s.y,sm=s.m,sd=s.d,ey=endDate.y,em=endDate.m,ed=endDate.d;if(ey<sy||(ey===sy&&(em<sm||(em===sm&&ed<sd))))return {years:0,months:0,days:0};let years=ey-sy,months=em-sm,days=ed-sd;if(days<0){months--;const pm=em===1?12:em-1;const py=em===1?ey-1:ey;days+=jalaliMonthDays(py,pm)}if(months<0){years--;months+=12}return{years,months,days}}
function formatJalaliDuration(d){if(!d)return "";const parts=[];if(d.years)parts.push(`${enToFa(d.years)} سال`);if(d.months)parts.push(`${enToFa(d.months)} ماه`);if(d.days||!parts.length)parts.push(`${enToFa(d.days)} روز`);return parts.join(" و ")}
function updatePurchasesTitle(){const dates=[...active().rows,...(active().sales||[])].map(r=>parseJ(r.date)).filter(Boolean);const el=$("#purchasesTitle");if(!el)return;if(!dates.length){el.textContent="خریدها/فروش‌ها";return}const first=dates.reduce((min,d)=>d.date<min.date?d:min);el.textContent=`خریدها/فروش‌ها در ${formatJalaliDuration(jalaliDuration(jalaliString(first.y,first.m,first.d)))} گذشته`;}
function jalaliString(y,m,d){return `${y}/${String(m).padStart(2,"0")}/${String(d).padStart(2,"0")}`} 
function makeSymbol(rows=initialData,price=713145,fee=.12,allocationLimit=0){return{price,fee,allocationLimit,sales:[],priceHistory:[],rows:rows.map(x=>({id:id(),date:x[0],shares:x[1],price:x[2],commission:x[3]}))}}function normalizeApp(a){if(a?.symbols&&typeof a.symbols==="object"){const names=Array.isArray(a.symbolOrder)?a.symbolOrder.filter(n=>a.symbols[n]):Object.keys(a.symbols);Object.keys(a.symbols).forEach(n=>{if(!names.includes(n))names.push(n);const raw=a.symbols[n]||{};a.symbols[n]={price:Number(raw.price)||0,fee:raw.fee!=null?Number(raw.fee):Number(a.sellFee??.12),allocationLimit:Number(raw.allocationLimit)||0,sales:Array.isArray(raw.sales)?raw.sales.filter(r=>Number(r.shares)||Number(r.price)||Number(r.commission)):[],priceHistory:Array.isArray(raw.priceHistory)?raw.priceHistory.filter(h=>h&&/^\d{4}\/\d{2}\/\d{2}$/.test(h.date)&&Number.isFinite(Number(h.price))&&Number(h.price)>0).map(h=>({date:h.date,price:Number(h.price),shares:Number(h.shares)||0,cost:Number(h.cost)||0,fee:Number(h.fee)||0})):[],rows:Array.isArray(raw.rows)?raw.rows.filter(r=>Number(r.shares)||Number(r.price)||Number(r.commission)).map(r=>({id:r.id||id(),date:r.date||"",shares:Number(r.shares)||0,price:Number(r.price)||0,commission:Number(r.commission)||0})):[]}});a.symbolOrder=names;a.portfolioCash=Number(a.portfolioCash)||0;a.brokerBuyingPower=a.brokerBuyingPower==null?null:Number(a.brokerBuyingPower);if(!Number.isFinite(a.brokerBuyingPower))a.brokerBuyingPower=null;a.monthlyDepositTarget=Number(a.monthlyDepositTarget)||300000000;a.cashTransactions=Array.isArray(a.cashTransactions)?a.cashTransactions:[];a.version=5;a.ui=a.ui||{};return a}const symbols={[DEFAULT_SYMBOL]:makeSymbol()};if(a?.price!=null)symbols[DEFAULT_SYMBOL].price=+a.price||713145;if(Array.isArray(a?.rows)&&a.rows.length)symbols[DEFAULT_SYMBOL].rows=a.rows.map(r=>({id:id(),date:r.date||"",shares:+r.shares||0,price:+r.price||0,commission:+r.commission||0}));symbols[DEFAULT_SYMBOL].fee=Number(a?.fee??.12);return{version:5,activeSymbol:DEFAULT_SYMBOL,portfolioCash:0,brokerBuyingPower:null,monthlyDepositTarget:300000000,cashTransactions:[],symbolOrder:[DEFAULT_SYMBOL],ui:{chartSymbol:DEFAULT_SYMBOL},symbols}}
function loadApp(){try{const v=JSON.parse(localStorage.getItem(KEY)||"null");if(v)return normalizeApp(v);for(const k of LEGACY_KEYS){const old=JSON.parse(localStorage.getItem(k)||"null");if(old)return normalizeApp(old)}}catch{}return normalizeApp(null)}function saveApp(){app.activeSymbol=activeSymbol;app.ui=app.ui||{};app.ui.chartSymbol=activeSymbol;localStorage.setItem(KEY,JSON.stringify(app))}function active(){return app.symbols[activeSymbol]}function sortRows(){active().rows.sort((a,b)=>{const ad=parseJ(a.date),bd=parseJ(b.date);if(!ad&&!bd)return 0;if(!ad)return -1;if(!bd)return 1;return bd.date-ad.date})}
function renderSymbols(){const el=$("#symbolList");el.innerHTML="";(app.symbolOrder||Object.keys(app.symbols)).forEach(name=>{const s=app.symbols[name];if(!s)return;const b=document.createElement("button");b.className="symbol-btn"+(name===activeSymbol?" active":"");b.draggable=true;b.dataset.symbol=name;const pd=portfolioData(), item=pd.items.find(x=>x.name===name), over=item?.share!==null&&item?.allocationLimit>0&&item.share*100>item.allocationLimit;
    b.innerHTML=`<span class="drag-handle">⋮⋮</span><span class="symbol-name">${escapeHtml(name)}</span><span class="symbol-share ${over?"negative":""}">${item?.share===null||item?.share===undefined?"—":dashboardPct(item.share)}</span>`;b.onclick=()=>switchSymbol(name);b.ondragstart=e=>{e.dataTransfer.setData("text/plain",name);b.classList.add("dragging")};b.ondragend=()=>b.classList.remove("dragging");b.ondragover=e=>e.preventDefault();b.ondrop=e=>{e.preventDefault();const from=e.dataTransfer.getData("text/plain"),to=name;if(!from||from===to)return;const order=app.symbolOrder.slice(),fi=order.indexOf(from),ti=order.indexOf(to);order.splice(fi,1);order.splice(ti,0,from);app.symbolOrder=order;renderSymbols();saveApp()};el.appendChild(b)})}function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}function switchSymbol(name){activeSymbol=name;sortRows();updatePurchasesTitle();renderSymbols();render();saveApp()}
function addRow(data={date:"",shares:"",price:"",commission:""}){const tr=$("#rowTemplate").content.firstElementChild.cloneNode(true);tr.dataset.id=data.id||id();tr.querySelector(".jalali").value=data.date?enToFa(data.date):"";tr.querySelector(".shares").value=data.shares?formatThousands(data.shares):"";tr.querySelector(".price").value=data.price?formatThousands(data.price):"";tr.querySelector(".commission").value=data.commission?formatThousands(data.commission):"";rowsEl.appendChild(tr);tr.querySelector(".date-input").onclick=()=>openCalendar(tr);tr.querySelector(".date-input").onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openCalendar(tr)}};[".shares",".price",".commission"].forEach(sel=>{const input=tr.querySelector(sel);input.oninput=()=>{syncRows();updateTableOnly()};input.onblur=()=>{input.value=formatThousands(input.value);syncRows();render();saveApp()}});tr.querySelector(".delete").onclick=()=>{const date=tr.querySelector(".jalali").value||"بدون تاریخ",sh=tr.querySelector(".shares").value||"بدون تعداد";if(!confirm(`این خرید حذف شود؟\n\nتاریخ: ${date}\nتعداد سهم: ${sh}`))return;tr.remove();syncRows();render();saveApp()};setDataFieldTabOrder()}
function setDataFieldTabOrder(){
  // Tab is reserved for editable numeric data-entry fields only.
  // Keep the order dynamic so newly added purchase rows are included.
  const fields=[...document.querySelectorAll('input')].filter(el=>{
    if(el.disabled||el.readOnly||el.type==='hidden')return false;
    const mode=(el.getAttribute('inputmode')||'').toLowerCase();
    return mode==='numeric'||mode==='decimal';
  });
  fields.forEach(el=>{el.tabIndex=0});
}

function syncRows(){active().rows=[...rowsEl.querySelectorAll("tr:not(.sale-tr)")].map(tr=>({id:tr.dataset.id,date:faToEn(tr.querySelector(".jalali").value),shares:num(tr.querySelector(".shares").value),price:num(tr.querySelector(".price").value),commission:num(tr.querySelector(".commission").value)}));sortRows()}
function updateTableOnly(){const s=active(),price=s.price,fee=(s.fee??.12)/100;let ts=0,tc=0;rowsEl.querySelectorAll("tr:not(.sale-tr)").forEach(tr=>{const sh=num(tr.querySelector(".shares").value),p=num(tr.querySelector(".price").value),c=num(tr.querySelector(".commission").value),cost=sh*p+c;tr.querySelector(".cost").textContent=fmt(cost);tr.querySelector(".gain-amount").textContent="—";const d=daysBetweenJalali(tr.querySelector(".jalali").value);tr.querySelector(".days").textContent=d===null?"—":enToFa(d);const profit=cost&&price?((price*sh)*(1-fee)-cost)/cost:null;const pe=tr.querySelector(".profit");pe.textContent=profit===null?"—":fmtPct(profit);pe.classList.toggle("positive",profit>0);pe.classList.toggle("negative",profit<0);ts+=sh;tc+=cost});$("#currentPriceCard2").textContent=price?fmt(price):"—";$("#totalShares").textContent=fmt(ts);$("#totalCost").textContent=fmt(tc);const totalProfit=tc&&price?((ts*price)*(1-fee)/tc)-1:null;const tp=$("#totalProfit");tp.textContent=totalProfit===null?"—":fmtPct(totalProfit);tp.classList.toggle("positive",totalProfit>0);tp.classList.toggle("negative",totalProfit<0);$("#tableEmpty").style.display=s.rows.length?"none":"block";drawChart()}
function render(){sortRows();updatePurchasesTitle();const s=active();$("#activeSymbolTitle").textContent=activeSymbol;priceEl.value=s.price?formatThousands(s.price):"";feeEl.value=formatDecimal(s.fee??.12);$("#allocationLimit").value=formatDecimal(s.allocationLimit||0);rowsEl.innerHTML="";s.rows.forEach(r=>addRow(r));$("#tableEmpty").style.display=s.rows.length?"none":"block";updateTableOnly();$("#lastUpdated").textContent=`${enToFa(String(currentJalali().y))}/${enToFa(String(currentJalali().m).padStart(2,"0"))}/${enToFa(String(currentJalali().d).padStart(2,"0"))}`;drawChart();setDataFieldTabOrder()}
priceEl.oninput=()=>{active().price=num(priceEl.value);updateTableOnly();saveApp()};priceEl.onblur=()=>{priceEl.value=formatThousands(priceEl.value);active().price=num(priceEl.value);recordPriceSnapshot();render();saveApp()};feeEl.oninput=()=>{active().fee=num(feeEl.value);updateTableOnly();saveApp()};feeEl.onblur=()=>{feeEl.value=formatDecimal(feeEl.value);active().fee=num(feeEl.value);render();saveApp()};$("#allocationLimit").oninput=()=>{active().allocationLimit=num($("#allocationLimit").value);updateTableOnly();saveApp()};$("#allocationLimit").onblur=()=>{$("#allocationLimit").value=formatDecimal($("#allocationLimit").value);active().allocationLimit=num($("#allocationLimit").value);render();saveApp()};$("#addBtn").onclick=()=>{active().rows.unshift({id:id(),date:"",shares:0,price:0,commission:0});render();saveApp();setTimeout(()=>rowsEl.querySelector(".date-input")?.click(),0)};$("#emptyAddBtn").onclick=()=>$("#addBtn").click();
$("#addSymbolBtn").onclick=()=>{const name=prompt("نام نماد را وارد کنید:");if(!name)return;const n=name.trim();if(!n||app.symbols[n])return alert("این نماد قبلاً وجود دارد.");app.symbols[n]=makeSymbol([],0,.12);app.symbolOrder.push(n);activeSymbol=n;renderSymbols();render();saveApp()};$("#renameSymbolBtn").onclick=()=>{const old=activeSymbol,n=prompt("نام جدید نماد را وارد کنید:",old)?.trim();if(!n||n===old)return;if(app.symbols[n])return alert("این نام قبلاً وجود دارد.");app.symbols[n]=app.symbols[old];delete app.symbols[old];const i=app.symbolOrder.indexOf(old);if(i>=0)app.symbolOrder[i]=n;if(app.ui?.chartSymbol===old)app.ui.chartSymbol=n;activeSymbol=n;renderSymbols();render();saveApp()};$("#deleteSymbolBtn").onclick=()=>{if(Object.keys(app.symbols).length===1)return alert("حداقل یک نماد باید باقی بماند.");const count=active().rows.length;if(!confirm(`نماد «${activeSymbol}» و تمام ${enToFa(count)} خرید آن حذف شود؟`))return;delete app.symbols[activeSymbol];app.symbolOrder=app.symbolOrder.filter(n=>n!==activeSymbol);activeSymbol=app.symbolOrder[0];if(app.ui?.chartSymbol===activeSymbol)app.ui.chartSymbol="all";renderSymbols();render();saveApp()};
$("#resetBtn").onclick=()=>{if(confirm("همهٔ داده‌های برنامه، شامل همهٔ نمادها و خریدها، حذف شوند؟")){localStorage.removeItem(KEY);LEGACY_KEYS.forEach(k=>localStorage.removeItem(k));location.reload()}};
function openChoice(title,text,cb){$("#choiceTitle").textContent=title;$("#choiceText").textContent=text;$("#choiceModal").classList.add("open");$("#choiceModal").setAttribute("aria-hidden","false");$("#jsonChoice").onclick=()=>{closeChoice();cb("json")};$("#csvChoice").onclick=()=>{closeChoice();cb("csv")}}function closeChoice(){$("#choiceModal").classList.remove("open");$("#choiceModal").setAttribute("aria-hidden","true")};$("#closeChoice").onclick=closeChoice;$("#backupBtn").onclick=()=>openChoice("پشتیبان‌گیری","فرمت فایل پشتیبان را انتخاب کنید.",kind=>kind==="json"?exportJson():exportCsv());$("#restoreBtn").onclick=()=>openChoice("بازیابی","فرمت فایل پشتیبان را انتخاب کنید.",kind=>kind==="json"?$("#importJsonFile").click():$("#importCsvFile").click());
function exportJson(){saveApp();downloadBlob(new Blob([JSON.stringify(app,null,2)],{type:"application/json;charset=utf-8"}),"درصد-سود-بورس.json")}function csvEscape(v){const s=String(v??"");return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}function exportCsv(){const lines=[["نماد","تاریخ","تعداد سهم","قیمت","کارمزد","مبلغ خرید","قیمت پایانی سهم","کارمزد فروش","مدت (روز)","درصد سود"]];Object.entries(app.symbols).forEach(([name,s])=>{const fee=(s.fee??.12)/100;s.rows.forEach(r=>{const cost=r.shares*r.price+r.commission,d=daysBetweenJalali(r.date),p=cost&&s.price?((s.price*r.shares)*(1-fee)-cost)/cost:null;lines.push([name,r.date,r.shares,r.price,r.commission,cost,s.price,s.fee,d??"",p===null?"":(p*100).toFixed(2)])})});downloadBlob(new Blob(["\uFEFF"+lines.map(r=>r.map(csvEscape).join(",")).join("\n")],{type:"text/csv;charset=utf-8"}),"درصد-سود-بورس.csv")}function downloadBlob(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function setupDataEntryTabOrder(){
  document.addEventListener('keydown',e=>{
    if(e.key!=='Tab'||e.altKey||e.ctrlKey||e.metaKey)return;
    const current=e.target;
    if(!(current instanceof HTMLInputElement)||current.readOnly||current.disabled)return;
    const mode=(current.getAttribute('inputmode')||'').toLowerCase();
    if(mode!=='numeric'&&mode!=='decimal')return;

    const fields=[...document.querySelectorAll('input')].filter(el=>{
      if(el.disabled||el.readOnly||el.type==='hidden')return false;
      const m=(el.getAttribute('inputmode')||'').toLowerCase();
      const r=el.getBoundingClientRect();
      return (m==='numeric'||m==='decimal')&&r.width>0&&r.height>0;
    });
    const index=fields.indexOf(current);
    if(index<0)return;
    const next=fields[index+(e.shiftKey?-1:1)];
    if(!next)return;
    e.preventDefault();
    next.focus();
    next.select?.();
  });
}
setupDataEntryTabOrder();
function bindImport(inputId,kind){$(inputId).onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const text=await f.text();if(kind==="json"){const incoming=normalizeApp(JSON.parse(text));if(confirm("داده‌های فعلی با داده‌های فایل جایگزین شوند؟")){app=incoming;activeSymbol=app.activeSymbol||app.symbolOrder[0];renderSymbols();render();saveApp()}}else importCsv(text);e.target.value=""}catch(err){alert("فایل قابل خواندن نیست.")}}}bindImport("#importJsonFile","json");bindImport("#importCsvFile","csv");
function importCsv(text){const rows=parseCsv(text.replace(/^\uFEFF/,""));if(rows.length<2)return alert("فایل CSV داده‌ای ندارد.");const h=rows[0],idx=n=>h.indexOf(n),required=["نماد","تاریخ","تعداد سهم","قیمت","کارمزد"];if(required.some(x=>idx(x)<0))return alert("ستون‌های لازم CSV پیدا نشد.");const grouped={};rows.slice(1).forEach(r=>{const name=r[idx("نماد")]?.trim()||DEFAULT_SYMBOL;(grouped[name]??=[]).push({id:id(),date:faToEn(r[idx("تاریخ")]||""),shares:num(r[idx("تعداد سهم")]),price:num(r[idx("قیمت")]),commission:num(r[idx("کارمزد")])})});Object.entries(grouped).forEach(([name,rs])=>{if(!app.symbols[name]){app.symbols[name]=makeSymbol([],0,.12);app.symbolOrder.push(name)}app.symbols[name].rows=rs});activeSymbol=Object.keys(grouped)[0]||activeSymbol;renderSymbols();render();saveApp()}
function parseCsv(text){const out=[];let row=[],cell="",quote=false;for(let i=0;i<text.length;i++){const c=text[i];if(quote){if(c==='"'&&text[i+1]==='"'){cell+='"';i++}else if(c==='"')quote=false;else cell+=c}else if(c==='"')quote=true;else if(c===','){row.push(cell);cell=""}else if(c==='\n'){row.push(cell);out.push(row);row=[];cell=""}else if(c!=='\r')cell+=c}row.push(cell);if(row.length>1||row[0])out.push(row);return out}
// Historical monthly series: only prices actually recorded on their observation date.
// An observation stores the contemporaneous remaining cost basis so later edits do not
// silently recalculate a past month's result with today's holdings.
const MONTH_NAMES=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
function recordPriceSnapshot(){
 const s=active(),price=Number(s.price),today=currentJalali();
 if(!(price>0))return;
 const ledger=costLedger(s),date=jalaliString(today.y,today.m,today.d);
 if(!ledger.valid||ledger.shares<=0||ledger.cost<=0)return;
 s.priceHistory=Array.isArray(s.priceHistory)?s.priceHistory:[];
 const snapshot={date,price,shares:ledger.shares,cost:ledger.cost,fee:Number(s.fee)||0};
 const idx=s.priceHistory.findIndex(x=>x.date===date);
 if(idx<0)s.priceHistory.push(snapshot);else s.priceHistory[idx]=snapshot;
 s.priceHistory.sort((a,b)=>a.date.localeCompare(b.date));
}
// Group purchases by their Jalali purchase month. FIFO assigns sale proceeds and
// their actual commissions to the oldest remaining lots. The current closing
// price values only the unsold portion; historical prices are not required.
function monthlyChartData(){
 const symbol=active(),today=currentJalali(),period=Number(app.ui?.chartPeriod)||6;
 const currentMonth=today.y*12+today.m-1,groups=new Map(),lots=[];
 const events=[...(symbol.rows||[]).map((r,i)=>({...r,kind:'buy',seq:i})),...(symbol.sales||[]).map((r,i)=>({...r,kind:'sell',seq:i}))]
  .filter(r=>parseJ(r.date)&&Number(r.shares)>0&&Number(r.price)>0&&Number(r.commission)>=0)
  .sort((a,b)=>faToEn(a.date).localeCompare(faToEn(b.date))||(a.kind===b.kind?a.seq-b.seq:a.kind==='buy'?-1:1));
 for(const e of events){
  const date=parseJ(e.date),qty=Number(e.shares),price=Number(e.price),commission=Number(e.commission)||0;
  if(e.kind==='buy'){
   const monthIndex=date.y*12+date.m-1;
   if(!groups.has(monthIndex))groups.set(monthIndex,{monthIndex,month:`${MONTH_NAMES[date.m-1]} ${enToFa(date.y)}`,basis:0,realized:0,remaining:0,unrealized:0});
   const group=groups.get(monthIndex),basis=qty*price+commission;
   group.basis+=basis;lots.push({group,remaining:qty,unitCost:basis/qty});
  }else{
   let remaining=qty;
   for(const lot of lots){
    if(remaining<=0)break;
    const take=Math.min(lot.remaining,remaining);
    if(take<=0)continue;
    lot.group.realized+=take*price-commission*(take/qty)-take*lot.unitCost;
    lot.remaining-=take;remaining-=take;
   }
   // Ignore inconsistent oversells in the chart; ledger validation remains separate.
  }
 }
 const closing=Number(symbol.price),sellFee=(Number(symbol.fee)||0)/100;
 for(const lot of lots){if(lot.remaining>0){lot.group.remaining+=lot.remaining;lot.group.unrealized+=closing>0?lot.remaining*closing*(1-sellFee)-lot.remaining*lot.unitCost:0;}}
 return [...groups.values()].filter(g=>currentMonth-g.monthIndex>=0&&currentMonth-g.monthIndex<period)
  .filter(g=>closing>0||g.remaining===0).map(g=>({...g,amount:g.realized+g.unrealized,profit:g.basis?(g.realized+g.unrealized)/g.basis:0,provisional:g.remaining>0,month:g.month+(g.monthIndex===currentMonth?' (ماه جاری)':'')}))
  .sort((a,b)=>a.monthIndex-b.monthIndex);
}
function drawChart(){
 const canvas=$('#profitChart'),empty=$('#chartEmpty'),tip=$('#chartTooltip');if(!canvas||!empty)return;
 const items=monthlyChartData();chartPoints=[];
 if(!items.length){empty.textContent='برای این بازه خرید معتبری ثبت نشده است، یا برای سهام باقی‌مانده قیمت پایانی موجود نیست.';empty.style.display='grid';canvas.style.display='none';tip.style.display='none';return;}
 empty.style.display='none';canvas.style.display='block';
 const dpr=window.devicePixelRatio||1,w=canvas.clientWidth,h=canvas.clientHeight;if(w<=0||h<=0)return;
 canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
 const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
 const pad={l:62,r:20,t:22,b:58},cw=w-pad.l-pad.r,ch=h-pad.t-pad.b;
 const values=items.map(p=>p.profit*100),min=Math.min(0,...values),max=Math.max(0,...values),margin=Math.max(1,(max-min)*.14);
 const low=min-margin,high=max+margin,y=v=>pad.t+(high-v)/(high-low)*ch;
 ctx.font='11px Vazirmatn, sans-serif';ctx.strokeStyle='#dfe5ec';ctx.fillStyle='#737d88';ctx.textAlign='right';
 [low,(low+high)/2,high].forEach(v=>{ctx.beginPath();ctx.moveTo(pad.l,y(v));ctx.lineTo(w-pad.r,y(v));ctx.stroke();ctx.fillText(`${v.toLocaleString('fa-IR',{maximumFractionDigits:1})}٪`,pad.l-8,y(v)+4)});
 ctx.strokeStyle='#8a96a4';ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(pad.l,y(0));ctx.lineTo(w-pad.r,y(0));ctx.stroke();ctx.setLineDash([]);
 const spacing=cw/items.length,barWidth=Math.min(62,spacing*.58);
 items.forEach((p,i)=>{
  const x=pad.l+(i+.5)*spacing,v=p.profit*100,yy=y(v),zero=y(0),top=Math.min(yy,zero),height=Math.max(2,Math.abs(yy-zero));
  ctx.fillStyle=v>=0?'#138a4b':'#c62828';ctx.fillRect(x-barWidth/2,top,barWidth,height);
  chartPoints.push({x,y:top,w:barWidth,h:height,data:p});
  ctx.fillStyle='#737d88';ctx.textAlign='center';ctx.fillText(p.month,x,h-19);
 });
}
$('#profitChart').addEventListener('mousemove',e=>{
 const c=e.currentTarget,r=c.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
 const p=chartPoints.find(q=>Math.abs(x-q.x)<=q.w/2+4&&y>=q.y-6&&y<=q.y+q.h+6);
 const tip=$('#chartTooltip');if(!p){tip.style.display='none';return;}
 const d=p.data,sign=d.amount>0?'+':d.amount<0?'−':'';
 tip.innerHTML=`<strong>${escapeHtml(d.month)}</strong><span>مبنای محاسبه: خریدهای این ماه تا امروز</span><span>سود/زیان فروش‌های انجام‌شده: ${fmt(d.realized)} ریال</span><span>سود/زیان سهام باقی‌مانده: ${fmt(d.unrealized)} ریال</span><span class="tip-amount">جمع: <b class="${d.amount>0?'positive':d.amount<0?'negative':''}">${sign}${fmt(Math.abs(d.amount))} ریال</b></span><span class="tip-profit">بازدهی: <b class="${d.profit>0?'positive':d.profit<0?'negative':''}">${fmtPct(d.profit)}</b></span>`;
 tip.style.display='block';tip.style.left=Math.min(Math.max(8,x+12),c.clientWidth-tip.offsetWidth-8)+'px';tip.style.top=Math.min(Math.max(8,y+12),c.clientHeight-tip.offsetHeight-8)+'px';
});
$('#profitChart').addEventListener('mouseleave',()=>$('#chartTooltip').style.display='none');
function setChartPeriod(value){app.ui=app.ui||{};app.ui.chartPeriod=Number(value);document.querySelectorAll('[data-chart-period]').forEach(b=>{const selected=Number(b.dataset.chartPeriod)===app.ui.chartPeriod;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected))});drawChart();saveApp()}
document.querySelectorAll('[data-chart-period]').forEach(b=>b.addEventListener('click',()=>setChartPeriod(b.dataset.chartPeriod)));
setChartPeriod(app.ui?.chartPeriod||6);
function openCalendar(tr){calendarTarget=tr;const p=parseJ(tr.querySelector(".jalali").value),now=currentJalali();calendarCursor=p?{y:p.y,m:p.m}:{y:now.y,m:now.m};renderCalendar();$("#dateModal").classList.add("open");$("#dateModal").setAttribute("aria-hidden","false")}function closeCalendar(){$("#dateModal").classList.remove("open");$("#dateModal").setAttribute("aria-hidden","true");calendarTarget=null}function monthDays(y,m){return m<=6?31:m<=11?30:(jalaliToGregorian(y+1,1,1).date-jalaliToGregorian(y,12,1).date)/86400000}function renderCalendar(){const{y,m}=calendarCursor;$("#calendarTitle").textContent=`${["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"][m-1]} ${enToFa(y)}`;const first=jalaliToGregorian(y,m,1).date.getUTCDay(),offset=(first+1)%7,days=monthDays(y,m),selected=parseJ(calendarTarget?.querySelector(".jalali")?.value||""),today=currentJalali(),g=$("#calendarGrid");g.innerHTML="";for(let i=0;i<offset;i++){const e=document.createElement("button");e.className="empty";g.appendChild(e)}for(let d=1;d<=days;d++){const b=document.createElement("button");b.textContent=enToFa(d);if(today.y===y&&today.m===m&&today.d===d)b.classList.add("today");if(selected?.y===y&&selected?.m===m&&selected?.d===d)b.classList.add("selected");b.onclick=()=>selectDate(y,m,d);g.appendChild(b)}}function selectDate(y,m,d){if(!calendarTarget)return;calendarTarget.querySelector(".jalali").value=`${enToFa(y)}/${enToFa(String(m).padStart(2,"0"))}/${enToFa(String(d).padStart(2,"0"))}`;if(calendarTarget.classList.contains("sale-tr"))syncSaleRow(calendarTarget);else syncRows();closeCalendar();render();saveApp()}$("#prevMonth").onclick=()=>{calendarCursor.m--;if(calendarCursor.m<1){calendarCursor.m=12;calendarCursor.y--}renderCalendar()};$("#nextMonth").onclick=()=>{calendarCursor.m++;if(calendarCursor.m>12){calendarCursor.m=1;calendarCursor.y++}renderCalendar()};$("#todayBtn").onclick=()=>{const t=currentJalali();calendarCursor={y:t.y,m:t.m};renderCalendar()};$("#closeCalendar").onclick=closeCalendar;$("#dateModal").onclick=e=>{if(e.target.id==="dateModal")closeCalendar()};$("#choiceModal").onclick=e=>{if(e.target.id==="choiceModal")closeChoice()};window.addEventListener("resize",drawChart);renderSymbols();render();saveApp();
// Dashboard patch
const OVERVIEW_STATE_KEY = "overview";
let overviewMode = !!app.ui?.overview;
const mainRoot = document.querySelector("main");
const symbolViewSelectors = [".hero-row", ".cards", ".settings", ".chart-panel", "main > .panel"];

function dashboardNumber(v){ return fmt(v); }
function dashboardPct(v){ return fmtPct(v); }
// Moving weighted-average cost basis. Purchases and sales are processed chronologically.
function costLedger(symbol){
 const events=[...(symbol.rows||[]).map((r,i)=>({...r,kind:'buy',seq:i})),...(symbol.sales||[]).map((r,i)=>({...r,kind:'sell',seq:i}))];
 events.sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||(a.kind==='buy'?-1:1)||a.seq-b.seq);
 let shares=0,cost=0,realized=0,valid=true;const bySale={},byTrade={};
 for(const e of events){const q=Number(e.shares),p=Number(e.price),fee=Number(e.commission);
  // Completely empty transaction rows are drafts, not invalid historical trades.
  if(!q&&!p&&!fee)continue;
  if(!parseJ(e.date)||!Number.isInteger(q)||q<=0||!Number.isFinite(p)||p<=0||!Number.isFinite(fee)||fee<0){valid=false;continue}
  if(e.kind==='buy'){shares+=q;cost+=q*p+fee}
  else {if(q>shares){valid=false;continue}const basis=cost*q/shares,net=q*p-fee,gain=net-basis;
   bySale[e.id]={basis,net,gain,pct:basis?gain/basis:null};realized+=gain;shares-=q;cost-=basis;if(shares===0)cost=0;
  }
  byTrade[e.kind+':'+e.id]={shares,average:shares?cost/shares:0};
 }
 return {shares,cost,realized,bySale,byTrade,valid};
}
function portfolioData(){
  const items=[];
  let shares=0, purchases=0, investment=0, current=0;
  Object.entries(app.symbols).forEach(([name,s])=>{
    const rows=Array.isArray(s.rows)?s.rows:[];
    const totalShares=rows.reduce((n,r)=>n+(Number(r.shares)||0),0)-(s.sales||[]).reduce((n,r)=>n+(Number(r.shares)||0),0);
    const grossCost=rows.reduce((n,r)=>n+(Number(r.shares)||0)*(Number(r.price)||0)+(Number(r.commission)||0),0);
    const boughtShares=rows.reduce((n,r)=>n+(Number(r.shares)||0),0);
    const ledger=costLedger(s);
    const cost=ledger.cost;
    const fee=(Number(s.fee)||0)/100;
    const hasPrice=Number(s.price)>0;
    const value=hasPrice ? totalShares*Number(s.price)*(1-fee) : null;
    const profit=value===null?null:value-cost;
    const ret=profit!==null&&cost?profit/cost:null;
    shares+=totalShares; purchases+=rows.length; investment+=cost; if(value!==null) current+=value;
    items.push({name,totalShares,purchases,cost,value,profit,ret,realized:ledger.realized,allocationLimit:Number(s.allocationLimit)||0});
  });
  const cashBalance=effectiveCash();
  const buyingPower=app.brokerBuyingPower;
  const portfolioBasis=investment+cashBalance;
  items.forEach(x=>x.share=portfolioBasis>0?x.cost/portfolioBasis:null);
  const priced=items.filter(x=>x.value!==null);
  const totalProfit=priced.length?items.reduce((sum,x)=>sum+(x.profit??0),0):null;
  const totalRet=totalProfit!==null&&investment?totalProfit/investment:null;
  const totalAssets=items.every(x=>x.value!==null||x.totalShares===0)?current+cashBalance:null;
  const realized=items.reduce((sum,x)=>sum+x.realized,0);
  return {items,shares,purchases,investment,realized,current:priced.length?current:null,profit:totalProfit,ret:totalRet,profitable:items.filter(x=>x.profit!==null&&x.profit>0).length,lossmaking:items.filter(x=>x.profit!==null&&x.profit<0).length,portfolioCash:cashBalance,buyingPower,totalAssets,brokerDifference:buyingPower===null?null:buyingPower-cashBalance};
}
function dashboardValue(v, suffix=""){
  return v===null?"—":dashboardNumber(v)+(suffix?` ${suffix}`:"");
}
function renderOverview(){const salesPanel=document.querySelector("#salesPanel");if(salesPanel)salesPanel.style.display="none";
  const d=portfolioData();
  symbolViewSelectors.forEach(sel=>document.querySelectorAll(sel).forEach(el=>el.style.display="none"));
  let el=document.querySelector("#overviewView");
  if(!el){el=document.createElement("section");el.id="overviewView";mainRoot.appendChild(el)}
  const orderedItems=(app.symbolOrder||Object.keys(app.symbols)).map(name=>d.items.find(x=>x.name===name)).filter(Boolean);
  const rows=orderedItems.map(x=>{
    const profitClass=x.profit>0?"positive":x.profit<0?"negative":"";
    const over=x.share!==null&&x.allocationLimit>0&&x.share*100>x.allocationLimit;
    return `<tr class="overview-row" data-symbol="${escapeHtml(x.name)}" draggable="true"><td><span class="overview-drag-handle" title="برای جابه‌جایی بکشید">⋮⋮</span><button class="overview-symbol" type="button">${escapeHtml(x.name)}</button></td><td>${dashboardNumber(x.totalShares)}</td><td>${dashboardValue(x.cost)}</td><td>${dashboardValue(x.value)}</td><td class="${profitClass}">${x.profit===null?"—":(x.profit>0?"+":"")+dashboardNumber(x.profit)}</td><td>${dashboardNumber(x.realized)}</td><td class="${profitClass}">${x.ret===null?"—":dashboardPct(x.ret)}</td><td class="${over?"negative":""}">${x.share===null?"—":dashboardPct(x.share)}</td></tr>`;
  }).join("");
  const totalCombined=d.profit===null?null:d.profit+d.realized;
  const profitClass=d.profit>0?"positive":d.profit<0?"negative":"";
  el.innerHTML=`
    <div class="overview-head"><div><span class="eyebrow">وضعیت کل سبد</span><h2>نمای کلی</h2><p>خلاصه‌ای از وضعیت همهٔ نمادهای موجود در سبد</p></div></div>
    <section class="overview-cards">
      <div class="overview-card card-blue"><i class="card-icon">◉</i><span>ارزش فعلی سبد</span><strong>${dashboardValue(d.current)}</strong></div>
      <div class="overview-card card-indigo"><i class="card-icon">▣</i><span>بهای تمام‌شدۀ سهام موجود</span><strong>${dashboardValue(d.investment)}</strong></div>
      <div class="overview-card card-green ${profitClass}"><i class="card-icon">↗</i><span>سود/زیان تحقق‌نیافته</span><strong>${d.profit===null?"—":(d.profit>0?"+":"")+dashboardNumber(d.profit)}</strong></div>
      <div class="overview-card card-purple ${profitClass}"><i class="card-icon">%</i><span>بازدهی تحقق‌نیافته</span><strong>${d.ret===null?"—":dashboardPct(d.ret)}</strong></div>
      <div class="overview-card card-green"><span>سود/زیان تحقق‌یافته</span><strong>${dashboardValue(d.realized)}</strong></div>
      <div class="overview-card card-blue"><span>سود/زیان مجموع</span><strong>${dashboardValue(totalCombined)}</strong></div>
    </section>
    <section class="panel portfolio-cash-panel"><h2>💼 دارایی و نقدینگی</h2><div class="finance-grid"><div class="finance-stat"><span>🏦 دارایی کل</span><strong id="totalAssetsValue">${dashboardValue(d.totalAssets)}</strong><small>ریال = ارزش روز سهام + ماندهٔ نقد</small></div><div class="finance-stat"><span>📈 ارزش روز سهام</span><strong>${dashboardValue(d.current)}</strong><small>ریال، پس از کارمزد فروش فرضی</small></div><div class="finance-stat"><span>💵 ماندهٔ نقد محاسبه‌شده</span><strong id="cashBalanceValue">${dashboardValue(d.portfolioCash)}</strong><small>ریال</small></div><div class="finance-stat"><span>🔎 اختلاف قدرت خرید با نقد</span><strong id="brokerDifferenceValue">${d.brokerDifference===null?'—':(d.brokerDifference>0?'+':'')+dashboardNumber(d.brokerDifference)}</strong><small>ریال؛ اختلاف لزوماً خطا نیست</small></div></div><div class="finance-inputs"><label class="cash-field">ماندهٔ نقد اولیه (ریال)<input id="portfolioCash" type="text" inputmode="numeric" value="${formatThousands(Number(app.portfolioCash)||0)}" placeholder="ماندهٔ آغاز دوره"></label><label class="cash-field">قدرت خرید اعلام‌شدهٔ کارگزاری (ریال)<input id="brokerBuyingPower" type="text" inputmode="numeric" value="${app.brokerBuyingPower===null?'':formatThousands(app.brokerBuyingPower)}" placeholder="ورود دستی از کارگزاری"></label><label class="cash-field">هدف واریز ماهانه (ریال)<input id="monthlyDepositTarget" type="text" inputmode="numeric" value="${formatThousands(app.monthlyDepositTarget)}"></label></div><p class="muted" id="monthlyDepositStatus">${monthlyDepositSummary()}</p></section>
    <section class="panel cash-ledger"><div class="panel-head"><h2>💳 گردش نقدی پورتفو</h2><div class="cash-actions"><button id="cashToggleBtn" type="button" aria-expanded="false">📋 نمایش تراکنش‌ها</button><button id="cashAddBtn" class="primary" type="button">＋ واریز / برداشت</button></div></div><p class="muted">موجودی نقد = ماندهٔ اولیه + واریزها − برداشت‌ها + فروش‌های خالص − خریدها. برای داده‌های قدیمی، ماندهٔ اولیه قابل تنظیم است.</p><p class="muted" id="cashRecentSummary">${cashRecentSummary()}</p><div class="table-wrap cash-ledger-details" id="cashLedgerDetails" hidden><table><thead><tr><th>تاریخ</th><th>نوع</th><th>مبلغ (ریال)</th><th>شرح</th><th>عملیات</th></tr></thead><tbody id="cashLedgerRows"></tbody></table></div></section>
    <div class="overview-stats"><span><b>${dashboardNumber(d.items.length)}</b> نماد</span><span><b>${dashboardNumber(d.shares)}</b> سهم</span><span><b>${dashboardNumber(d.purchases)}</b> خرید</span><span><b>${dashboardNumber(d.profitable)}</b> نماد سودده</span><span><b>${dashboardNumber(d.lossmaking)}</b> نماد زیان‌ده</span></div>
    <section class="panel overview-panel"><div class="panel-head"><div><h2>خلاصهٔ نمادها</h2><p class="muted">سهم از سبد بر اساس بهای تمام‌شدۀ سهام و ماندهٔ نقد محاسبه می‌شود.</p></div></div><div class="table-wrap"><table class="overview-table"><thead><tr><th>نماد</th><th>تعداد</th><th>بهای خرید</th><th>ارزش فعلی</th><th>تحقق‌نیافته</th><th>تحقق‌یافته</th><th>بازدهی</th><th>سهم از سبد</th></tr></thead><tbody>${rows||`<tr><td colspan="8" class="overview-empty">هنوز نمادی ثبت نشده است.</td></tr>`}</tbody></table></div></section>`;
  const cashInput=$("#portfolioCash");
  cashInput.oninput=()=>{app.portfolioCash=num(cashInput.value);const pd=portfolioData();$("#cashBalanceValue").textContent=dashboardValue(pd.portfolioCash);$("#totalAssetsValue").textContent=dashboardValue(pd.totalAssets);$("#brokerDifferenceValue").textContent=pd.brokerDifference===null?'—':(pd.brokerDifference>0?'+':'')+dashboardNumber(pd.brokerDifference);saveApp()};
  cashInput.onblur=()=>{app.portfolioCash=num(cashInput.value);renderOverview();saveApp()};
  const brokerInput=$("#brokerBuyingPower"),targetInput=$("#monthlyDepositTarget");
  brokerInput.oninput=()=>{app.brokerBuyingPower=brokerInput.value.trim()?num(brokerInput.value):null;const v=portfolioData().brokerDifference;$("#brokerDifferenceValue").textContent=v===null?'—':(v>0?'+':'')+dashboardNumber(v);saveApp()};
  brokerInput.onblur=()=>{brokerInput.value=app.brokerBuyingPower===null?'':formatThousands(app.brokerBuyingPower);saveApp()};
  targetInput.oninput=()=>{app.monthlyDepositTarget=Math.max(0,num(targetInput.value));$("#monthlyDepositStatus").textContent=monthlyDepositSummary();saveApp()};
  targetInput.onblur=()=>{targetInput.value=formatThousands(app.monthlyDepositTarget);saveApp()};
  renderCashLedger();
  const toggle=$("#cashToggleBtn"),details=$("#cashLedgerDetails");toggle.onclick=()=>{details.hidden=!details.hidden;toggle.setAttribute('aria-expanded',String(!details.hidden));toggle.textContent=details.hidden?'📋 نمایش تراکنش‌ها':'▴ پنهان‌کردن تراکنش‌ها'};
  setDataFieldTabOrder();
  el.querySelectorAll(".overview-row").forEach(row=>{
    row.onclick=e=>{if(e.target.closest("button")){overviewMode=false;activeSymbol=row.dataset.symbol;app.ui.overview=false;renderSymbols();render();saveApp()}};
    row.ondragstart=e=>{e.dataTransfer.setData("text/plain",row.dataset.symbol);row.classList.add("dragging")};
    row.ondragend=()=>row.classList.remove("dragging");
    row.ondragover=e=>{e.preventDefault();row.classList.add("drag-over")};
    row.ondragleave=()=>row.classList.remove("drag-over");
    row.ondrop=e=>{
      e.preventDefault();row.classList.remove("drag-over");
      const from=e.dataTransfer.getData("text/plain"),to=row.dataset.symbol;
      if(!from||from===to)return;
      const order=(app.symbolOrder||Object.keys(app.symbols)).slice(),fi=order.indexOf(from),ti=order.indexOf(to);
      if(fi<0||ti<0)return;
      order.splice(fi,1);order.splice(ti,0,from);app.symbolOrder=order;
      renderSymbols();renderOverview();saveApp();
    };
  });
  el.style.display="block";
}
function renderSymbolView(){
  const el=document.querySelector("#overviewView"); if(el)el.style.display="none";
  symbolViewSelectors.forEach(sel=>document.querySelectorAll(sel).forEach(node=>node.style.display=""));
  sortRows();
  const s=active();
  $("#activeSymbolTitle").textContent=activeSymbol;
  priceEl.value=s.price?formatThousands(s.price):"";
  feeEl.value=formatDecimal(s.fee??.12);
  $("#allocationLimit").value=formatDecimal(s.allocationLimit||0);
  rowsEl.innerHTML="";
  s.rows.forEach(r=>addRow(r));
  renderCombinedTrades();
  $("#tableEmpty").style.display=(s.rows.length||(s.sales||[]).length)?"none":"block";
  updateTableOnly();
  renderCombinedTrades();
  $("#lastUpdated").textContent=`${enToFa(String(currentJalali().y))}/${enToFa(String(currentJalali().m).padStart(2,"0"))}/${enToFa(String(currentJalali().d).padStart(2,"0"))}`;
  const pd=portfolioData(), share=pd.items.find(x=>x.name===activeSymbol)?.share ?? null, limit=s.allocationLimit||0, over=share!==null&&limit>0&&share*100>limit;
  const allocationCard=$("#symbolAllocationCard");
  if(allocationCard){allocationCard.querySelector("strong").textContent=share===null?"—":dashboardPct(share);allocationCard.querySelector("strong").classList.toggle("negative",over);allocationCard.querySelector(".allocation-limit-note").textContent=limit?`سقف تعیین‌شده: ${dashboardPct(limit/100)}`:"سقف تعیین نشده";}
  drawChart();
}
function renderSymbolsDashboardAware(){
  const el=$("#symbolList");el.innerHTML="";
  const overview=document.createElement("button");
  overview.className="symbol-btn overview-btn"+(overviewMode?" active":"");
  overview.innerHTML='<span class="overview-icon">▦</span><span class="symbol-name">نمای کلی</span>';
  overview.onclick=()=>{overviewMode=true;app.ui=app.ui||{};app.ui.overview=true;renderSymbolsDashboardAware();render();saveApp()};
  el.appendChild(overview);
  (app.symbolOrder||Object.keys(app.symbols)).forEach(name=>{
    const s=app.symbols[name];if(!s)return;
    const b=document.createElement("button");b.className="symbol-btn"+(!overviewMode&&name===activeSymbol?" active":"");b.draggable=true;b.dataset.symbol=name;
    const pd=portfolioData(), item=pd.items.find(x=>x.name===name), over=item?.share!==null&&item?.allocationLimit>0&&item.share*100>item.allocationLimit;
    b.innerHTML=`<span class="drag-handle">⋮⋮</span><span class="symbol-name">${escapeHtml(name)}</span><span class="symbol-share ${over?"negative":""}">${item?.share===null||item?.share===undefined?"—":dashboardPct(item.share)}</span>`;
    b.onclick=()=>{overviewMode=false;app.ui=app.ui||{};app.ui.overview=false;switchSymbol(name)};
    b.ondragstart=e=>{e.dataTransfer.setData("text/plain",name);b.classList.add("dragging")};b.ondragend=()=>b.classList.remove("dragging");b.ondragover=e=>e.preventDefault();b.ondrop=e=>{e.preventDefault();const from=e.dataTransfer.getData("text/plain"),to=name;if(!from||from===to)return;const order=app.symbolOrder.slice(),fi=order.indexOf(from),ti=order.indexOf(to);order.splice(fi,1);order.splice(ti,0,from);app.symbolOrder=order;renderSymbolsDashboardAware();saveApp()};el.appendChild(b);
  });
}
function saveAppDashboardAware(){app.activeSymbol=activeSymbol;app.ui=app.ui||{};app.ui.chartSymbol=activeSymbol;app.ui.overview=overviewMode;localStorage.setItem(KEY,JSON.stringify(app))}
function renderDashboardAware(){if(overviewMode){renderOverview();return}renderSymbolView()}
// Replace the view/render entry points while preserving the existing symbol-page implementation.
renderSymbols=renderSymbolsDashboardAware;
saveApp=saveAppDashboardAware;
render=renderDashboardAware;
renderSymbols();render();saveApp();

// Sales are recorded separately; existing purchase records remain intact.
function applyTradeFilter(){
 const choice=document.querySelector('#tradeFilter')?.value||'all';
 const trs=[...rowsEl.querySelectorAll('tr')];
 let visible=0;
 trs.forEach(tr=>{const sell=tr.classList.contains('sale-tr');const show=choice==='all'||(choice==='sell'?sell:!sell);tr.style.display=show?'':'none';if(show)visible++});
 const empty=$('#tableEmpty');
 if(empty){empty.style.display=visible?'none':'block';empty.textContent=choice==='sell'?'فروشی برای نمایش وجود ندارد.':choice==='buy'?'خریدی برای نمایش وجود ندارد.':'هنوز معامله‌ای ثبت نشده است.';}
}
const tradeFilter=document.querySelector('#tradeFilter');
if(tradeFilter)tradeFilter.addEventListener('change',applyTradeFilter);
function saleRow(sale){
 const tr=$("#rowTemplate").content.firstElementChild.cloneNode(true);
 tr.classList.add('sale-tr');tr.dataset.id=sale.id;
 tr.querySelector('.trade-kind').textContent='فروش';
 for(const [selector,value] of [['.jalali',sale.date?enToFa(sale.date):''],['.shares',sale.shares?formatThousands(sale.shares):''],['.price',sale.price?formatThousands(sale.price):''],['.commission',sale.commission?formatThousands(sale.commission):'']])tr.querySelector(selector).value=value;
 tr.querySelector('.date-input').onclick=()=>openCalendar(tr);
 tr.querySelector('.date-input').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openCalendar(tr)}};
 for(const selector of ['.shares','.price','.commission']){
  const input=tr.querySelector(selector);
  input.oninput=()=>{syncSaleRow(tr,false)};
  input.onblur=()=>{syncSaleRow(tr,true);input.value=formatThousands(input.value);render();saveApp()};
 }
 const del=tr.querySelector('.delete');del.title='حذف فروش';del.onclick=()=>{if(!confirm('این فروش حذف شود؟'))return;active().sales=active().sales.filter(x=>x.id!==sale.id);render();renderSymbols();saveApp()};
 return tr;
}
function syncSaleRow(tr,validate=true){
 const sale=active().sales.find(x=>x.id===tr.dataset.id);if(!sale)return;
 const candidate={id:sale.id,date:faToEn(tr.querySelector('.jalali').value),shares:num(tr.querySelector('.shares').value),price:num(tr.querySelector('.price').value),commission:num(tr.querySelector('.commission').value)};
 const complete=!!parseJ(candidate.date)&&Number.isInteger(candidate.shares)&&candidate.shares>0&&candidate.price>0&&candidate.commission>=0;
 if(complete){const proposed=active().sales.map(x=>x.id===sale.id?candidate:x);if(!validSales(active(),proposed)){
  if(validate){alert('فروش در این تاریخ بیش از موجودی مجاز است یا با ترتیب معاملات سازگار نیست.');render()};return;
 }}
 Object.assign(sale,candidate);saveApp();
}
function renderCombinedTrades(){
 const symbol=active(),ledger=costLedger(symbol),body=rowsEl;
 body.querySelectorAll('tr.sale-tr').forEach(x=>x.remove());

 for(const sale of symbol.sales||[]){const tr=saleRow(sale),info=ledger.bySale[sale.id],state=ledger.byTrade['sell:'+sale.id];
  tr.querySelector('.cost').textContent=info?fmt(info.net):'—';tr.querySelector('.days').textContent=enToFa(daysBetweenJalali(sale.date)??'—');
  const pct=tr.querySelector('.profit'),amount=tr.querySelector('.gain-amount');pct.textContent=info?fmtPct(info.pct):'—';amount.textContent=info?(info.gain>0?'+':'')+fmt(info.gain):'—';
  for(const el of [pct,amount]){el.classList.toggle('negative',!!info&&info.gain<0);el.classList.toggle('positive',!!info&&info.gain>0)}
  body.appendChild(tr);
 }
 [...body.querySelectorAll('tr')].sort((a,b)=>{const date=tr=>faToEn(tr.querySelector('.jalali')?.value||'');const ad=date(a),bd=date(b);if(!ad&&!bd)return 0;if(!ad)return -1;if(!bd)return 1;return bd.localeCompare(ad)}).forEach(tr=>body.appendChild(tr));
 updatePurchasesTitle();$('#tableEmpty').style.display=(symbol.rows.length+(symbol.sales||[]).length)?'none':'block';applyTradeFilter();
}
// Each click creates a distinct, empty draft. Focus the row by its unique ID,
// never by the first row of that type (which may be an older transaction).
function createBlankTrade(kind){
 const trade={id:id(),date:'',shares:0,price:0,commission:0};
 if(kind==='sell')active().sales.unshift(trade);else active().rows.unshift(trade);
 const filter=$('#tradeFilter');if(filter)filter.value='all';
 render();saveApp();
 const tr=[...rowsEl.querySelectorAll('tr')].find(row=>row.dataset.id===trade.id);
 if(tr){tr.scrollIntoView({block:'nearest'});tr.querySelector('.jalali')?.focus()}
}
$('#sellBtn').onclick=()=>createBlankTrade('sell');
$('#addBtn').onclick=()=>createBlankTrade('buy');
$('#emptyAddBtn').onclick=()=>$('#addBtn').click();
function validSales(symbol,sales){return costLedger({...symbol,sales}).valid;}
// Cash movements are derived from recorded trades, plus manual deposits/withdrawals.
function tradeCashFlow(){return Object.values(app.symbols).reduce((sum,s)=>sum+(s.sales||[]).reduce((a,r)=>a+num(r.shares)*num(r.price)-num(r.commission),0)-(s.rows||[]).reduce((a,r)=>a+num(r.shares)*num(r.price)+num(r.commission),0),0)}
function manualCashFlow(){return (app.cashTransactions||[]).reduce((a,r)=>a+(r.type==='deposit'?1:-1)*num(r.amount),0)}
function effectiveCash(){return (Number(app.portfolioCash)||0)+tradeCashFlow()+manualCashFlow()}
function monthlyDepositSummary(){const n=currentJalali(),prefix=`${n.y}/${String(n.m).padStart(2,'0')}/`;const deposited=(app.cashTransactions||[]).filter(r=>r.type==='deposit'&&faToEn(r.date||'').startsWith(prefix)).reduce((sum,r)=>sum+num(r.amount),0);const target=Number(app.monthlyDepositTarget)||0;return `📅 واریز ثبت‌شده در ماه جاری: ${dashboardNumber(deposited)} ریال | هدف ماهانه: ${dashboardNumber(target)} ریال | باقیمانده تا هدف: ${dashboardNumber(Math.max(0,target-deposited))} ریال. هدف، واریز خودکار ایجاد نمی‌کند.`}
function cashRecentSummary(){const tx=(app.cashTransactions||[]).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,3);return tx.length?'آخرین تراکنش‌ها: '+tx.map(r=>`${r.type==='deposit'?'↘ واریز':'↗ برداشت'} ${dashboardNumber(num(r.amount))} ریال (${enToFa(r.date)})`).join(' | '):'هنوز واریز یا برداشتی ثبت نشده است.'}
function renderCashLedger(){
 const body=document.querySelector('#cashLedgerRows');if(!body)return;body.innerHTML='';
 const tx=(app.cashTransactions||[]).slice().sort((a,b)=>b.date.localeCompare(a.date));
 for(const r of tx){const tr=document.createElement('tr');for(const value of [enToFa(r.date),r.type==='deposit'?'واریز':'برداشت',fmt(r.amount),r.note||'—']){const td=document.createElement('td');td.textContent=value;tr.appendChild(td)}const td=document.createElement('td');const edit=document.createElement('button');edit.textContent='ویرایش';edit.onclick=()=>editCash(r);const del=document.createElement('button');del.textContent='حذف';del.className='sale-delete';del.onclick=()=>{if(!confirm('این گردش نقدی حذف شود؟'))return;app.cashTransactions=app.cashTransactions.filter(x=>x.id!==r.id);render();saveApp()};td.append(edit,del);tr.appendChild(td);body.appendChild(tr)}
 const add=document.querySelector('#cashAddBtn');if(add)add.onclick=()=>editCash(null);
}
function editCash(existing){
 const today=currentJalali(),date=prompt('تاریخ (هجری شمسی):',existing?.date||`${today.y}/${String(today.m).padStart(2,'0')}/${String(today.d).padStart(2,'0')}`);if(date===null)return;
 if(!parseJ(faToEn(date)))return alert('تاریخ نامعتبر است.');
 const type=prompt('نوع تراکنش: واریز یا برداشت',existing?.type==='withdrawal'?'برداشت':'واریز');if(type===null)return;
 if(!['واریز','برداشت'].includes(type.trim()))return alert('نوع تراکنش نامعتبر است.');
 const amountText=prompt('مبلغ (ریال):',String(existing?.amount||''));if(amountText===null)return;const amount=num(amountText);if(!(amount>0))return alert('مبلغ باید مثبت باشد.');
 const note=prompt('شرح (اختیاری):',existing?.note||'');if(note===null)return;
 const next={id:existing?.id||id(),date:faToEn(date),type:type.trim()==='واریز'?'deposit':'withdrawal',amount,note};
 if(existing)Object.assign(existing,next);else(app.cashTransactions??=[]).push(next);render();saveApp();
}
function validSales(symbol,sales){return costLedger({...symbol,sales}).valid;}
function editSale(existing){const tr=[...rowsEl.querySelectorAll(".sale-tr")].find(row=>row.dataset.id===existing.id);tr?.querySelector(".shares")?.focus()}
