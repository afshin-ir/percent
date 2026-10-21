const KEY="stocks-web-v4";const LEGACY_KEYS=["stocks-web-v3","stocks-web-v2"];const DEFAULT_SYMBOL="عیار";
const initialData=[["1405/04/28",10,520000,6240],["1405/04/29",10,510000,6120],["1405/05/04",10,500000,6000],["1405/05/31",10,580000,6960],["1405/05/31",10,583000,6996],["1405/05/31",10,583000,6996],["1405/05/31",10,590000,7080],["1405/06/02",10,610000,7320],["1405/06/03",10,600000,7200],["1405/06/15",110,640000,84480],["1405/06/16",100,630000,75600],["1405/06/22",100,640000,38496],["1405/06/24",16,630000,0],["1405/07/01",384,650000,0],["1405/07/08",150,710000,85200]];
const $=s=>document.querySelector(s),rowsEl=$("#rows"),priceEl=$("#currentPrice");let app=loadApp(),activeSymbol=app.activeSymbol||DEFAULT_SYMBOL,calendarTarget=null,calendarCursor=null,chartPoints=[];
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
function estimatedSaleNet(symbol, shares, closing){const gross=Number(shares)*Number(closing);const rate=Math.max(0,Number(symbol.fee)||0);return gross*(1-rate/100)}
function updateTableOnly(){const s=active(),price=s.price;let ts=0,tc=0;rowsEl.querySelectorAll("tr:not(.sale-tr)").forEach(tr=>{const sh=num(tr.querySelector(".shares").value),p=num(tr.querySelector(".price").value),c=num(tr.querySelector(".commission").value),cost=sh*p+c;tr.querySelector(".cost").textContent=fmt(cost);tr.querySelector(".gain-amount").textContent="—";const d=daysBetweenJalali(tr.querySelector(".jalali").value);tr.querySelector(".days").textContent=d===null?"—":enToFa(d);const profit=cost&&price?(estimatedSaleNet(s,sh,price)-cost)/cost:null;const pe=tr.querySelector(".profit");pe.textContent=profit===null?"—":fmtPct(profit);pe.classList.toggle("positive",profit>0);pe.classList.toggle("negative",profit<0);ts+=sh;tc+=cost});$("#currentPriceCard2").textContent=price?fmt(price):"—";$("#totalShares").textContent=fmt(ts);$("#totalCost").textContent=fmt(tc);const totalProfit=tc&&price?(estimatedSaleNet(s,ts,price)/tc)-1:null;const tp=$("#totalProfit");tp.textContent=totalProfit===null?"—":fmtPct(totalProfit);tp.classList.toggle("positive",totalProfit>0);tp.classList.toggle("negative",totalProfit<0);$("#tableEmpty").style.display=s.rows.length?"none":"block";drawChart()}
function render(){sortRows();updatePurchasesTitle();const s=active();$("#activeSymbolTitle").textContent=activeSymbol;priceEl.value=s.price?formatThousands(s.price):"";$("#allocationLimit").value=formatDecimal(s.allocationLimit||0);rowsEl.innerHTML="";s.rows.forEach(r=>addRow(r));$("#tableEmpty").style.display=s.rows.length?"none":"block";updateTableOnly();$("#lastUpdated").textContent=`${enToFa(String(currentJalali().y))}/${enToFa(String(currentJalali().m).padStart(2,"0"))}/${enToFa(String(currentJalali().d).padStart(2,"0"))}`;drawChart();setDataFieldTabOrder()}
priceEl.oninput=()=>{active().price=num(priceEl.value);updateTableOnly();saveApp()};priceEl.onblur=()=>{priceEl.value=formatThousands(priceEl.value);active().price=num(priceEl.value);recordPriceSnapshot();render();saveApp()};$("#sellFee").oninput=()=>{active().fee=Math.max(0,num($("#sellFee").value));updateTableOnly();saveApp()};$("#sellFee").onblur=()=>{$("#sellFee").value=formatDecimal(active().fee??0);render();saveApp()};$("#allocationLimit").oninput=()=>{active().allocationLimit=num($("#allocationLimit").value);updateTableOnly();saveApp()};$("#allocationLimit").onblur=()=>{$("#allocationLimit").value=formatDecimal($("#allocationLimit").value);active().allocationLimit=num($("#allocationLimit").value);render();saveApp()};$("#addBtn").onclick=()=>{active().rows.unshift({id:id(),date:"",shares:0,price:0,commission:0});render();saveApp();setTimeout(()=>rowsEl.querySelector(".date-input")?.click(),0)};$("#emptyAddBtn").onclick=()=>$("#addBtn").click();
function addNewSymbol(){const name=prompt("نام نماد را وارد کنید:");if(!name)return;const n=name.trim();if(!n||app.symbols[n])return alert("این نماد قبلاً وجود دارد.");app.symbols[n]=makeSymbol([],0,.12);app.symbolOrder.push(n);activeSymbol=n;overviewMode=false;app.ui=app.ui||{};app.ui.overview=false;renderSymbols();render();saveApp()}$("#renameSymbolBtn").onclick=()=>{const old=activeSymbol,n=prompt("نام جدید نماد را وارد کنید:",old)?.trim();if(!n||n===old)return;if(app.symbols[n])return alert("این نام قبلاً وجود دارد.");app.symbols[n]=app.symbols[old];delete app.symbols[old];const i=app.symbolOrder.indexOf(old);if(i>=0)app.symbolOrder[i]=n;if(app.ui?.chartSymbol===old)app.ui.chartSymbol=n;activeSymbol=n;renderSymbols();render();saveApp()};function deleteSymbolByName(name){
  const symbol=app.symbols[name];if(!symbol)return;
  if(Object.keys(app.symbols).length===1){alert("حداقل یک نماد باید باقی بماند.");return;}
  const buys=(symbol.rows||[]).length,sales=(symbol.sales||[]).length;
  if(!confirm(`نماد «${name}» همراه با ${enToFa(buys)} خرید و ${enToFa(sales)} فروش و تنظیمات آن برای همیشه حذف شود؟\n\nاین عملیات قابل بازگشت نیست. پیش از حذف، در صورت نیاز پشتیبان بگیرید.`))return;
  delete app.symbols[name];app.symbolOrder=app.symbolOrder.filter(n=>n!==name);
  if(activeSymbol===name)activeSymbol=app.symbolOrder[0];
  if(app.ui?.chartSymbol===name)app.ui.chartSymbol=activeSymbol;
  renderSymbols();render();saveApp();
}
$("#deleteSymbolBtn").onclick=()=>deleteSymbolByName(activeSymbol);
$("#resetBtn").onclick=()=>{if(confirm("همهٔ داده‌های برنامه، شامل همهٔ نمادها و خریدها، حذف شوند؟")){localStorage.removeItem(KEY);LEGACY_KEYS.forEach(k=>localStorage.removeItem(k));location.reload()}};
function openChoice(title,text,cb){$("#choiceTitle").textContent=title;$("#choiceText").textContent=text;$("#choiceModal").classList.add("open");$("#choiceModal").setAttribute("aria-hidden","false");$("#jsonChoice").onclick=()=>{closeChoice();cb("json")};$("#csvChoice").onclick=()=>{closeChoice();cb("csv")}}function closeChoice(){$("#choiceModal").classList.remove("open");$("#choiceModal").setAttribute("aria-hidden","true")};$("#closeChoice").onclick=closeChoice;$("#backupBtn").onclick=()=>openChoice("پشتیبان‌گیری","فرمت فایل پشتیبان را انتخاب کنید.",kind=>kind==="json"?exportJson():exportCsv());$("#restoreBtn").onclick=()=>openChoice("بازیابی","فرمت فایل پشتیبان را انتخاب کنید.",kind=>kind==="json"?$("#importJsonFile").click():$("#importCsvFile").click());
function exportJson(){saveApp();downloadBlob(new Blob([JSON.stringify(app,null,2)],{type:"application/json;charset=utf-8"}),"درصد-سود-بورس.json")}function csvEscape(v){const s=String(v??"");return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}function exportCsv(){const lines=[["نماد","تاریخ","تعداد سهم","قیمت","کارمزد","مبلغ خرید","قیمت پایانی سهم","مدت (روز)","درصد سود"]];Object.entries(app.symbols).forEach(([name,s])=>{s.rows.forEach(r=>{const cost=r.shares*r.price+r.commission,d=daysBetweenJalali(r.date),p=cost&&s.price?(s.price*r.shares-cost)/cost:null;lines.push([name,r.date,r.shares,r.price,r.commission,cost,s.price,d??"",p===null?"":(p*100).toFixed(2)])})});downloadBlob(new Blob(["\uFEFF"+lines.map(r=>r.map(csvEscape).join(",")).join("\n")],{type:"text/csv;charset=utf-8"}),"درصد-سود-بورس.csv")}function downloadBlob(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
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
 const snapshot={date,price,shares:ledger.shares,cost:ledger.cost,fee:0};
 const idx=s.priceHistory.findIndex(x=>x.date===date);
 if(idx<0)s.priceHistory.push(snapshot);else s.priceHistory[idx]=snapshot;
 s.priceHistory.sort((a,b)=>a.date.localeCompare(b.date));
}
// Group purchases by their Jalali purchase month. FIFO assigns sale proceeds and
// their actual commissions to the oldest remaining lots. The current closing
// price values only the unsold portion; historical prices are not required.
function monthlyChartData(symbolName=activeSymbol,requestedPeriod=null){
 const symbol=app.symbols[symbolName]||active(),today=currentJalali(),period=Number(requestedPeriod||app.ui?.chartPeriod)||6;
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
 const closing=Number(symbol.price);
 for(const lot of lots){if(lot.remaining>0){lot.group.remaining+=lot.remaining;lot.group.unrealized+=closing>0?estimatedSaleNet(symbol,lot.remaining,closing)-lot.remaining*lot.unitCost:0;}}
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
    const hasPrice=Number(s.price)>0;
    const value=hasPrice ? totalShares*Number(s.price) : null;
    const profit=value===null?null:estimatedSaleNet(s,totalShares,s.price)-cost;
    const ret=profit!==null&&cost?profit/cost:null;
    shares+=totalShares; purchases+=rows.length; investment+=cost; if(value!==null) current+=value;
    items.push({name,totalShares,purchases,cost,value,profit,ret,realized:ledger.realized,allocationLimit:Number(s.allocationLimit)||0});
  });
  const buyingPower=app.brokerBuyingPower;
  const portfolioBasis=investment+(buyingPower??0);
  items.forEach(x=>x.share=portfolioBasis>0?x.cost/portfolioBasis:null);
  const priced=items.filter(x=>x.value!==null);
  const totalProfit=priced.length?items.reduce((sum,x)=>sum+(x.profit??0),0):null;
  const totalRet=totalProfit!==null&&investment?totalProfit/investment:null;
  const totalAssets=buyingPower!==null&&items.every(x=>x.value!==null||x.totalShares===0)?current+buyingPower:null;
  const realized=items.reduce((sum,x)=>sum+x.realized,0);
  return {items,shares,purchases,investment,realized,current:priced.length?current:null,profit:totalProfit,ret:totalRet,profitable:items.filter(x=>x.profit!==null&&x.profit>0).length,lossmaking:items.filter(x=>x.profit!==null&&x.profit<0).length,buyingPower,totalAssets};
}
function dashboardValue(v, suffix=""){
  return v===null?"—":dashboardNumber(v)+(suffix?` ${suffix}`:"");
}
// نمایش یکنواخت علامت عدد در محیط راست‌به‌چپ؛ بدون تغییر مقدار عددی.
function dashboardSigned(v,percent=false){
  if(v===null||v===undefined||!Number.isFinite(v))return "—";
  const sign=v>0?"+":v<0?"−":"";
  const amount=percent?fmtPct(Math.abs(v)):dashboardNumber(Math.abs(v));
  return `<span class="dashboard-signed" dir="ltr">${sign}${amount}</span>`;
}
// SVGهای خطی یکدست، بدون وابستگی به کتابخانه یا فونت آیکون.
function overviewIcon(name){
  const paths={
    wallet:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18"/><path d="M16 14h2"/><path d="M7 5V3h11"/>',
    layers:'<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 9h8M8 13h8"/>',
    trend:'<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    percent:'<circle cx="7" cy="7" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 19 19 5"/>',
    check:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    chart:'<path d="M4 20V4M4 20h16"/><path d="M8 16v-4M13 16V8M18 16V5"/>'
  };
  return `<span class="card-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]||paths.chart}</svg></span>`;
}
// مرتب‌سازی صرفاً نمایشی است؛ ترتیب دلخواه نمادها را تغییر نمی‌دهد.
let overviewSort={key:null,direction:1};
const overviewSortColumns=[
  {key:"name",label:"نماد",tip:"نام نماد بورسی"},
  {key:"totalShares",label:"تعداد",tip:"تعداد سهام باقی‌مانده پس از کسر فروش‌ها"},
  {key:"cost",label:"بهای خرید",tip:"بهای تمام‌شدۀ سهام باقی‌مانده، با احتساب کارمزد خرید"},
  {key:"value",label:"ارزش فعلی",tip:"تعداد سهام باقی‌مانده ضرب‌در قیمت پایانی ثبت‌شده"},
  {key:"profit",label:"تحقق‌نیافته",tip:"سود یا زیان سهامی که هنوز فروخته نشده‌اند، با کسر کارمزد فروش احتمالی"},
  {key:"realized",label:"تحقق‌یافته",tip:"سود یا زیان حاصل از فروش‌های ثبت‌شده، پس از کسر کارمزد واقعی"},
  {key:"ret",label:"بازدهی",tip:"درصد سود یا زیان تحقق‌نیافته نسبت به بهای تمام‌شدۀ سهام باقی‌مانده"},
  {key:"share",label:"سهم از سبد",tip:"نسبت بهای تمام‌شدۀ سهام نماد به مجموع بهای تمام‌شدۀ سهام و قدرت خرید دستی"}
];
function overviewCompare(a,b,key){
  const x=a[key],y=b[key];
  if(x===null||x===undefined)return y===null||y===undefined?0:1;
  if(y===null||y===undefined)return -1;
  return key==="name"?x.localeCompare(y,"fa"):x-y;
}
// Dashboard charts use portfolio values already calculated by portfolioData().
const overviewPalette=['#4f8be9','#43b98b','#f0b84f','#9670df','#f28c60','#6b9eae','#db739a','#8b9db4'];
function overviewAllocationChart(d){
  if(d.buyingPower===null)return '<p class="overview-chart-empty">برای نمایش ترکیب دارایی‌ها، قدرت خرید کارگزاری را وارد کنید.</p>';
  if(d.buyingPower<0)return '<p class="overview-chart-empty">قدرت خرید نمی‌تواند منفی باشد.</p>';
  const missing=d.items.filter(x=>x.totalShares>0&&x.value===null);
  if(missing.length)return '<p class="overview-chart-empty">برای نمایش ترکیب دارایی‌ها، قیمت پایانی همۀ نمادهای دارای سهم را ثبت کنید.</p>';
  const parts=d.items.filter(x=>x.value>0).map(x=>({name:x.name,value:x.value}));
  if(d.buyingPower>0)parts.push({name:'قدرت خرید',value:d.buyingPower});
  const sum=parts.reduce((n,x)=>n+x.value,0);
  if(sum<=0)return '<p class="overview-chart-empty">هنوز دارایی قابل نمایش وجود ندارد.</p>';
  let acc=0;
  const colors=parts.map((x,i)=>{const start=acc;acc+=x.value/sum*100;return `${overviewPalette[i%overviewPalette.length]} ${start}% ${acc}%`}).join(',');
  const legend=parts.map((x,i)=>`<li><span class="allocation-key" style="background:${overviewPalette[i%overviewPalette.length]}"></span><span class="allocation-name">${escapeHtml(x.name)}</span><b dir="ltr">${(x.value/sum*100).toLocaleString('fa-IR',{maximumFractionDigits:1})}٪</b></li>`).join('');
  return `<div class="overview-donut-layout"><div class="overview-donut" style="background:conic-gradient(${colors})" role="img" aria-label="نمودار ترکیب دارایی‌ها"><div class="overview-donut-hole"><small>دارایی کل (ریال)</small><strong>${dashboardNumber(sum)}</strong></div></div><ul class="overview-allocation-legend">${legend}</ul></div>`;
}
function overviewMonthlyChart(symbolName,period){
  const items=monthlyChartData(symbolName,period);
  if(!items.length)return '<p class="overview-chart-empty">برای این نماد و بازه، خرید معتبری ثبت نشده یا قیمت پایانی موجود نیست.</p>';
  const values=items.map(x=>x.profit*100),lo=Math.min(0,...values),hi=Math.max(0,...values),maxAbs=Math.max(1,Math.abs(lo),Math.abs(hi));
  const top=8,bottom=155,mid=top+(hi/(hi-lo||1))*(bottom-top),plotHeight=bottom-top;
  const spacing=660/items.length,barW=Math.min(94,spacing*.70);
  const bars=items.map((x,i)=>{const v=x.profit*100;const yy=top+(hi-v)/(hi-lo||1)*plotHeight;const y=Math.min(mid,yy);const h=Math.max(2,Math.abs(yy-mid));const cx=55+(i+.5)*spacing;const label=escapeHtml(x.month);const title=escapeHtml(`${x.month}: ${v.toLocaleString('fa-IR',{maximumFractionDigits:2})}٪؛ ${dashboardNumber(x.amount)} ریال`);return `<g><title>${title}</title><rect x="${cx-barW/2}" y="${y}" width="${barW}" height="${h}" rx="3" fill="${v>=0?'#39b987':'#e17979'}"/><text x="${cx}" y="181" text-anchor="middle">${label}</text></g>`}).join('');
  return `<svg class="overview-monthly-svg" viewBox="0 0 770 200" role="img" aria-label="نمودار درصد سود و زیان خریدهای ماهانهٔ نماد ${escapeHtml(symbolName)}"><line x1="40" x2="745" y1="${mid}" y2="${mid}" stroke="#aebdce" stroke-dasharray="4 4"/><text x="35" y="${mid-5}" text-anchor="end">۰٪</text>${bars}</svg>`;
}
function renderOverview(){const salesPanel=document.querySelector("#salesPanel");if(salesPanel)salesPanel.style.display="none";
  const d=portfolioData();
  symbolViewSelectors.forEach(sel=>document.querySelectorAll(sel).forEach(el=>el.style.display="none"));
  let el=document.querySelector("#overviewView");
  if(!el){el=document.createElement("section");el.id="overviewView";mainRoot.appendChild(el)}
  const orderedItems=(app.symbolOrder||Object.keys(app.symbols)).map(name=>d.items.find(x=>x.name===name)).filter(Boolean);
  if(overviewSort.key){
    const key=overviewSort.key,dir=overviewSort.direction;
    orderedItems.sort((a,b)=>{
      const missingA=a[key]===null||a[key]===undefined,missingB=b[key]===null||b[key]===undefined;
      if(missingA!==missingB)return missingA?1:-1;
      return overviewCompare(a,b,key)*dir;
    });
  }
  const headerCells=overviewSortColumns.map(c=>{
    const selected=overviewSort.key===c.key;
    const symbol=selected?(overviewSort.direction===1?"▲":"▼"):"<span>▲</span><span>▼</span>";
    return `<th scope="col" aria-sort="${selected?(overviewSort.direction===1?"ascending":"descending"):"none"}"><button type="button" class="overview-sort-button ${selected?"is-active":""}" data-sort="${c.key}" title="${c.tip}؛ برای مرتب‌سازی کلیک کنید" aria-label="مرتب‌سازی بر اساس ${c.label}: ${c.tip}"><span>${c.label}</span><span class="overview-sort-indicator ${selected?"is-active":""}" aria-hidden="true">${symbol}</span></button></th>`;
  }).join("");
  const rows=orderedItems.map(x=>{
    const profitClass=x.profit>0?"positive":x.profit<0?"negative":"";
    const over=x.share!==null&&x.allocationLimit>0&&x.share*100>x.allocationLimit;
    return `<tr class="overview-row" data-symbol="${escapeHtml(x.name)}" draggable="${!overviewSort.key}"><td class="overview-symbol-cell"><div class="overview-symbol-layout"><span class="overview-drag-handle" title="${overviewSort.key?"برای جابه‌جایی، مرتب‌سازی را غیرفعال کنید":"برای جابه‌جایی بکشید"}" aria-hidden="true">⋮⋮</span><button class="overview-symbol" type="button"><span class="overview-symbol-mark" aria-hidden="true"></span><span class="overview-symbol-name">${escapeHtml(x.name)}</span></button><button type="button" class="overview-delete-symbol" title="حذف نماد ${escapeHtml(x.name)}" aria-label="حذف نماد ${escapeHtml(x.name)}">×</button></div></td><td class="overview-numeric">${dashboardNumber(x.totalShares)}</td><td class="overview-numeric">${dashboardValue(x.cost)}</td><td class="overview-numeric">${dashboardValue(x.value)}</td><td class="overview-numeric ${profitClass}">${dashboardSigned(x.profit)}</td><td class="overview-numeric ${x.realized>0?"positive":x.realized<0?"negative":""}">${dashboardSigned(x.realized)}</td><td class="overview-numeric ${profitClass}">${dashboardSigned(x.ret,true)}</td><td class="overview-numeric ${over?"negative":""}">${x.share===null?"—":dashboardPct(x.share)}</td></tr>`;
  }).join("");
  const totalCombined=d.profit===null?null:d.profit+d.realized;
  const profitClass=d.profit>0?"positive":d.profit<0?"negative":"";
  const selectedChartSymbol=app.ui?.overviewChartSymbol&&app.symbols[app.ui.overviewChartSymbol]?app.ui.overviewChartSymbol:(orderedItems[0]?.name||'');
  const chartPeriod=[3,6,12].includes(Number(app.ui?.overviewChartPeriod))?Number(app.ui.overviewChartPeriod):6;
  const monthlyOptions=orderedItems.map(x=>`<option value="${escapeHtml(x.name)}" ${x.name===selectedChartSymbol?'selected':''}>${escapeHtml(x.name)}</option>`).join('');
  el.innerHTML=`
    <div class="overview-top panel">
      <div class="overview-head"><div><span class="eyebrow">وضعیت کل سبد</span><h2>نمای کلی</h2><p>خلاصه‌ای از وضعیت نمادها و دارایی‌ها</p></div></div>
      <section class="overview-cards overview-primary-cards" aria-label="شاخص‌های اصلی">
        <div class="overview-card">${overviewIcon('wallet')}<span>ارزش روز سهام (ریال)</span><strong>${dashboardValue(d.current)}</strong></div>
        <div class="overview-card overview-buying-card">${overviewIcon('layers')}<label for="brokerBuyingPower">قدرت خرید کارگزاری (ریال)</label><input id="brokerBuyingPower" type="text" inputmode="numeric" autocomplete="off" value="${app.brokerBuyingPower===null?'':formatThousands(app.brokerBuyingPower)}" placeholder="قدرت خرید را وارد کنید"><small>ورود دستی</small></div>
        <div class="overview-card overview-assets-card">${overviewIcon('check')}<span>دارایی کل (ریال)</span><strong id="totalAssetsValue">${dashboardValue(d.totalAssets)}</strong></div>
        <div class="overview-card ${totalCombined>0?'positive':totalCombined<0?'negative':''}">${overviewIcon('trend')}<span>سود/زیان مجموع (ریال)</span><strong>${dashboardSigned(totalCombined)}</strong></div>
      </section>
      <section class="overview-cards overview-secondary-cards" aria-label="شاخص‌های تکمیلی">
        <div class="overview-card ${profitClass}">${overviewIcon('percent')}<span>بازدهی تحقق‌نیافته</span><strong>${dashboardSigned(d.ret,true)}</strong></div>
        <div class="overview-card ${d.realized>0?'positive':d.realized<0?'negative':''}">${overviewIcon('check')}<span>سود/زیان تحقق‌یافته (ریال)</span><strong>${dashboardSigned(d.realized)}</strong></div>
        <div class="overview-card ${profitClass}">${overviewIcon('chart')}<span>سود/زیان تحقق‌نیافته (ریال)</span><strong>${dashboardSigned(d.profit)}</strong></div>
      </section>
      <div class="overview-stats"><span><b>${dashboardNumber(d.items.length)}</b> نماد</span><span><b>${dashboardNumber(d.shares)}</b> سهم</span><span><b>${dashboardNumber(d.purchases)}</b> خرید</span><span><b>${dashboardNumber(d.profitable)}</b> نماد سودده</span><span><b>${dashboardNumber(d.lossmaking)}</b> نماد زیان‌ده</span></div>
    </div>
    <div class="overview-chart-grid">
      <section class="panel overview-chart-panel"><div class="overview-chart-head"><h2>ترکیب دارایی‌ها</h2><p>سهم هر نماد از ارزش روز دارایی‌ها، به‌همراه قدرت خرید</p></div><div id="overviewAllocation">${overviewAllocationChart(d)}</div></section>
      <section class="panel overview-chart-panel"><div class="overview-chart-head"><h2>سود و زیان خریدهای ماهانه</h2><div class="overview-chart-controls"><label for="overviewChartSymbol">نماد</label><select id="overviewChartSymbol" aria-label="نماد نمودار ماهانه">${monthlyOptions}</select><label for="overviewChartPeriod">بازه</label><select id="overviewChartPeriod" aria-label="بازهٔ نمودار ماهانه"><option value="3" ${chartPeriod===3?'selected':''}>۳ ماه</option><option value="6" ${chartPeriod===6?'selected':''}>۶ ماه</option><option value="12" ${chartPeriod===12?'selected':''}>۱۲ ماه</option></select></div></div><div id="overviewMonthly">${selectedChartSymbol?overviewMonthlyChart(selectedChartSymbol,chartPeriod):'<p class="overview-chart-empty">هنوز نمادی ثبت نشده است.</p>'}</div><p class="overview-chart-note">عملکرد خریدهای نماد انتخاب‌شده تا امروز؛ فروش‌ها با روش FIFO لحاظ می‌شوند. این نمودار قیمت تاریخی نیست.</p></section>
    </div>
    <section class="panel overview-panel"><div class="panel-head"><div class="overview-title-actions"><h2>نمادها</h2><button id="addSymbolBtn" type="button" class="icon-btn overview-add-symbol" title="نماد جدید" aria-label="نماد جدید">＋</button></div><p class="muted">سهم از سبد بر اساس بهای تمام‌شدۀ سهام و قدرت خرید دستی محاسبه می‌شود.</p></div><div class="table-wrap"><table class="overview-table"><thead><tr>${headerCells}</tr></thead><tbody>${rows||`<tr><td colspan="8" class="overview-empty">هنوز نمادی ثبت نشده است.</td></tr>`}</tbody></table></div></section>`;
  const brokerInput=$("#brokerBuyingPower");
  brokerInput.oninput=()=>{
    app.brokerBuyingPower=brokerInput.value.trim()?num(brokerInput.value):null;
    const latest=portfolioData();
    $("#totalAssetsValue").textContent=dashboardValue(latest.totalAssets);
    $("#overviewAllocation").innerHTML=overviewAllocationChart(latest);
    saveApp();
  };
  brokerInput.onblur=()=>{
    brokerInput.value=app.brokerBuyingPower===null?'':formatThousands(app.brokerBuyingPower);
    renderOverview();
  };
  const chartSymbolInput=$("#overviewChartSymbol"),chartPeriodInput=$("#overviewChartPeriod");
  if(chartSymbolInput)chartSymbolInput.onchange=()=>{app.ui.overviewChartSymbol=chartSymbolInput.value;renderOverview();saveApp()};
  if(chartPeriodInput)chartPeriodInput.onchange=()=>{app.ui.overviewChartPeriod=Number(chartPeriodInput.value);renderOverview();saveApp()};
  $("#addSymbolBtn").onclick=addNewSymbol;
  setDataFieldTabOrder();
  el.querySelectorAll(".overview-sort-button").forEach(button=>{
    button.onclick=()=>{
      const key=button.dataset.sort;
      overviewSort=overviewSort.key===key?(overviewSort.direction===-1?{key:null,direction:1}:{key,direction:-1}):{key,direction:1};
      renderOverview();
    };
  });
  el.querySelectorAll(".overview-row").forEach(row=>{
    row.querySelector(".overview-delete-symbol").onclick=e=>{e.stopPropagation();deleteSymbolByName(row.dataset.symbol)};
    row.querySelector(".overview-symbol").onclick=()=>{overviewMode=false;activeSymbol=row.dataset.symbol;app.ui.overview=false;renderSymbols();render();saveApp()};
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
  
  $("#sellFee").value=formatDecimal(s.fee??0);
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
$("#backToOverviewBtn").onclick=()=>{overviewMode=true;app.ui=app.ui||{};app.ui.overview=true;renderSymbols();render();saveApp()};

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

// جایگاه ثابت سربرگ؛ ارتفاع واقعی آن در فضاگیری صفحه لحاظ می‌شود.
(function keepHeaderSpace(){
  const siteHeader=document.querySelector('body > header');
  if(!siteHeader)return;
  const sync=()=>document.documentElement.style.setProperty('--site-header-height',`${Math.ceil(siteHeader.getBoundingClientRect().height)}px`);
  sync();
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(sync).observe(siteHeader);
  window.addEventListener('resize',sync);
})();
