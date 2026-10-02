const KEY="stocks-web-v4";const LEGACY_KEYS=["stocks-web-v3","stocks-web-v2"];const DEFAULT_SYMBOL="عیار";
const initialData=[["1405/04/28",10,520000,6240],["1405/04/29",10,510000,6120],["1405/05/04",10,500000,6000],["1405/05/31",10,580000,6960],["1405/05/31",10,583000,6996],["1405/05/31",10,583000,6996],["1405/05/31",10,590000,7080],["1405/06/02",10,610000,7320],["1405/06/03",10,600000,7200],["1405/06/15",110,640000,84480],["1405/06/16",100,630000,75600],["1405/06/22",100,640000,38496],["1405/06/24",16,630000,0],["1405/07/01",384,650000,0],["1405/07/08",150,710000,85200]];
const $=s=>document.querySelector(s),rowsEl=$("#rows"),priceEl=$("#currentPrice"),feeEl=$("#sellFee");let app=loadApp(),activeSymbol=app.activeSymbol||DEFAULT_SYMBOL,calendarTarget=null,calendarCursor=null,chartPoints=[];
function id(){return crypto.randomUUID?.()||String(Date.now()+Math.random())}function faToEn(s){return String(s??"").replace(/[۰-۹]/g,c=>"۰۱۲۳۴۵۶۷۸۹".indexOf(c)).replace(/[٠-٩]/g,c=>"٠١٢٣٤٥٦٧٨٩".indexOf(c)).replace(/٫/g,".").replace(/٬/g,"").replace(/,/g,"").replace(/[\/\\-]/g,"/")}function enToFa(s){return String(s??"").replace(/\d/g,d=>"۰۱۲۳۴۵۶۷۸۹"[d])}function num(v){return Number(faToEn(v).replace(/[^0-9.+-]/g,""))||0}function fmt(v){return Math.round(v||0).toLocaleString("fa-IR")}function fmtPct(v){return (v*100).toLocaleString("fa-IR",{minimumFractionDigits:2,maximumFractionDigits:2})+"٪"}
function formatThousands(v){const raw=faToEn(v).replace(/[^0-9]/g,"");return raw?enToFa(Number(raw).toLocaleString("en-US").replace(/,/g,"٬")):""}function formatDecimal(v){let s=faToEn(v).replace(/[^0-9.]/g,"");const p=s.split(".");if(p.length>2)s=p[0]+"."+p.slice(1).join("");return enToFa(s.replace(".","٫"))}
function div(a,b){return Math.floor(a/b)}function jalaliToGregorian(jy,jm,jd){jy=+jy;jm=+jm;jd=+jd;const epBase=jy-(jy>=0?474:473),epYear=474+((epBase%2820+2820)%2820),md=jm<=7?(jm-1)*31:(jm-1)*30+6,days=jd+md+div(epYear*682-110,2816)+(epYear-1)*365+div(epBase,2820)*1029983+(1948320-1);let gy=400*div(days,146097),rem=days%146097;if(rem>=36524){gy+=100*div(--rem,36524);rem%=36524;if(rem>=365)rem++}let yday=rem;gy+=4*div(yday,1461);yday%=1461;if(yday>=366){gy+=div(yday-1,365);yday=(yday-1)%365}let gd=yday+1;const leap=(gy%4===0&&gy%100!==0)||gy%400===0,sal=leap?[31,29,31,30,31,30,31,31,30,31,30,31]:[31,28,31,30,31,30,31,31,30,31,30,31];let gm=1;while(gd>sal[gm-1]){gd-=sal[gm-1];gm++}return {gy,gm,gd,date:new Date(Date.UTC(gy,gm-1,gd))}}
function parseJ(s){const a=faToEn(s).split("/").map(Number);if(a.length!==3||!a.every(Number.isFinite))return null;const[y,m,d]=a;if(y<1200||y>1600||m<1||m>12||d<1||d>(m<=6?31:m<=11?30:30))return null;return{y,m,d,...jalaliToGregorian(y,m,d)}}function currentJalali(){const p=new Intl.DateTimeFormat("fa-IR-u-ca-persian-nu-latn",{year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()),g=t=>Number(p.find(x=>x.type===t)?.value);return{y:g("year"),m:g("month"),d:g("day")}}function daysBetweenJalali(date){const d=parseJ(date);if(!d)return null;const n=currentJalali(),now=jalaliToGregorian(n.y,n.m,n.d);return Math.max(0,Math.round((now.date-d.date)/86400000))}
function makeSymbol(rows=initialData,price=713145,fee=.12){return{price,fee,rows:rows.map(x=>({id:id(),date:x[0],shares:x[1],price:x[2],commission:x[3]}))}}function normalizeApp(a){if(a?.symbols&&typeof a.symbols==="object"){const names=Array.isArray(a.symbolOrder)?a.symbolOrder.filter(n=>a.symbols[n]):Object.keys(a.symbols);Object.keys(a.symbols).forEach(n=>{if(!names.includes(n))names.push(n);const s=a.symbols[n]||{};s.price=Number(s.price)||0;s.fee=s.fee!=null?Number(s.fee):Number(a.sellFee??.12);s.rows=Array.isArray(s.rows)?s.rows.map(r=>({id:r.id||id(),date:r.date||"",shares:Number(r.shares)||0,price:Number(r.price)||0,commission:Number(r.commission)||0})):[];a.symbols[n]=s});a.symbolOrder=names;a.version=4;a.ui=a.ui||{};return a}const symbols={[DEFAULT_SYMBOL]:makeSymbol()};if(a?.price!=null)symbols[DEFAULT_SYMBOL].price=+a.price||713145;if(Array.isArray(a?.rows)&&a.rows.length)symbols[DEFAULT_SYMBOL].rows=a.rows.map(r=>({id:id(),date:r.date||"",shares:+r.shares||0,price:+r.price||0,commission:+r.commission||0}));symbols[DEFAULT_SYMBOL].fee=Number(a?.fee??.12);return{version:4,activeSymbol:DEFAULT_SYMBOL,symbolOrder:[DEFAULT_SYMBOL],ui:{chartSymbol:DEFAULT_SYMBOL},symbols}}
function loadApp(){try{const v=JSON.parse(localStorage.getItem(KEY)||"null");if(v)return normalizeApp(v);for(const k of LEGACY_KEYS){const old=JSON.parse(localStorage.getItem(k)||"null");if(old)return normalizeApp(old)}}catch{}return normalizeApp(null)}function saveApp(){app.activeSymbol=activeSymbol;app.ui=app.ui||{};app.ui.chartSymbol=activeSymbol;localStorage.setItem(KEY,JSON.stringify(app))}function active(){return app.symbols[activeSymbol]}function sortRows(){active().rows.sort((a,b)=>(parseJ(b.date)?.date-parseJ(a.date)?.date)||0)}
function renderSymbols(){const el=$("#symbolList");el.innerHTML="";(app.symbolOrder||Object.keys(app.symbols)).forEach(name=>{const s=app.symbols[name];if(!s)return;const b=document.createElement("button");b.className="symbol-btn"+(name===activeSymbol?" active":"");b.draggable=true;b.dataset.symbol=name;b.innerHTML=`<span class="drag-handle">⋮⋮</span><span class="symbol-name">${escapeHtml(name)}</span><span class="symbol-count">${enToFa(String(s.rows.length))}</span>`;b.onclick=()=>switchSymbol(name);b.ondragstart=e=>{e.dataTransfer.setData("text/plain",name);b.classList.add("dragging")};b.ondragend=()=>b.classList.remove("dragging");b.ondragover=e=>e.preventDefault();b.ondrop=e=>{e.preventDefault();const from=e.dataTransfer.getData("text/plain"),to=name;if(!from||from===to)return;const order=app.symbolOrder.slice(),fi=order.indexOf(from),ti=order.indexOf(to);order.splice(fi,1);order.splice(ti,0,from);app.symbolOrder=order;renderSymbols();saveApp()};el.appendChild(b)})}function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}function switchSymbol(name){activeSymbol=name;sortRows();renderSymbols();render();saveApp()}
function addRow(data={date:"",shares:"",price:"",commission:""}){const tr=$("#rowTemplate").content.firstElementChild.cloneNode(true);tr.dataset.id=data.id||id();tr.querySelector(".jalali").value=data.date?enToFa(data.date):"";tr.querySelector(".shares").value=data.shares?formatThousands(data.shares):"";tr.querySelector(".price").value=data.price?formatThousands(data.price):"";tr.querySelector(".commission").value=data.commission?formatThousands(data.commission):"";rowsEl.appendChild(tr);tr.querySelector(".date-input").onclick=()=>openCalendar(tr);tr.querySelector(".date-input").onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openCalendar(tr)}};[".shares",".price",".commission"].forEach(sel=>{const input=tr.querySelector(sel);input.oninput=()=>{syncRows();updateTableOnly()};input.onblur=()=>{input.value=formatThousands(input.value);syncRows();render();saveApp()}});tr.querySelector(".delete").onclick=()=>{const date=tr.querySelector(".jalali").value||"بدون تاریخ",sh=tr.querySelector(".shares").value||"بدون تعداد";if(!confirm(`این خرید حذف شود؟\n\nتاریخ: ${date}\nتعداد سهم: ${sh}`))return;tr.remove();syncRows();render();saveApp()}}
function syncRows(){active().rows=[...rowsEl.querySelectorAll("tr")].map(tr=>({id:tr.dataset.id,date:faToEn(tr.querySelector(".jalali").value),shares:num(tr.querySelector(".shares").value),price:num(tr.querySelector(".price").value),commission:num(tr.querySelector(".commission").value)}));sortRows()}
function updateTableOnly(){const s=active(),price=s.price,fee=(s.fee??.12)/100;let ts=0,tc=0;rowsEl.querySelectorAll("tr").forEach(tr=>{const sh=num(tr.querySelector(".shares").value),p=num(tr.querySelector(".price").value),c=num(tr.querySelector(".commission").value),cost=sh*p+c;tr.querySelector(".cost").textContent=fmt(cost);const d=daysBetweenJalali(tr.querySelector(".jalali").value);tr.querySelector(".days").textContent=d===null?"—":enToFa(d);const profit=cost&&price?((price*sh)*(1-fee)-cost)/cost:null;const pe=tr.querySelector(".profit");pe.textContent=profit===null?"—":fmtPct(profit);pe.classList.toggle("positive",profit>0);pe.classList.toggle("negative",profit<0);ts+=sh;tc+=cost});$("#totalShares").textContent=fmt(ts);$("#totalCost").textContent=fmt(tc);const currentValue=price?ts*price*(1-fee):null;$("#totalCurrentValue").textContent=currentValue===null?"—":fmt(currentValue);const totalProfit=tc&&price?currentValue/tc-1:null;const tp=$("#totalProfit");tp.textContent=totalProfit===null?"—":fmtPct(totalProfit);tp.classList.toggle("positive",totalProfit>0);tp.classList.toggle("negative",totalProfit<0);$("#tableEmpty").style.display=s.rows.length?"none":"block";drawChart()}
function render(){sortRows();const s=active();$("#activeSymbolTitle").textContent=activeSymbol;priceEl.value=s.price?formatThousands(s.price):"";feeEl.value=formatDecimal(s.fee??.12);rowsEl.innerHTML="";s.rows.forEach(r=>addRow(r));$("#tableEmpty").style.display=s.rows.length?"none":"block";updateTableOnly();$("#lastUpdated").textContent=`${enToFa(String(currentJalali().y))}/${enToFa(String(currentJalali().m).padStart(2,"0"))}/${enToFa(String(currentJalali().d).padStart(2,"0"))}`;drawChart()}
priceEl.oninput=()=>{active().price=num(priceEl.value);updateTableOnly();saveApp()};priceEl.onblur=()=>{priceEl.value=formatThousands(priceEl.value);active().price=num(priceEl.value);render();saveApp()};feeEl.oninput=()=>{active().fee=num(feeEl.value);updateTableOnly();saveApp()};feeEl.onblur=()=>{feeEl.value=formatDecimal(feeEl.value);active().fee=num(feeEl.value);render();saveApp()};$("#addBtn").onclick=()=>{active().rows.unshift({id:id(),date:"",shares:0,price:0,commission:0});render();saveApp();setTimeout(()=>rowsEl.querySelector(".date-input")?.click(),0)};$("#emptyAddBtn").onclick=()=>$("#addBtn").click();
$("#addSymbolBtn").onclick=()=>{const name=prompt("نام نماد را وارد کنید:");if(!name)return;const n=name.trim();if(!n||app.symbols[n])return alert("این نماد قبلاً وجود دارد.");app.symbols[n]=makeSymbol([],0,.12);app.symbolOrder.push(n);activeSymbol=n;renderSymbols();render();saveApp()};$("#renameSymbolBtn").onclick=()=>{const old=activeSymbol,n=prompt("نام جدید نماد را وارد کنید:",old)?.trim();if(!n||n===old)return;if(app.symbols[n])return alert("این نام قبلاً وجود دارد.");app.symbols[n]=app.symbols[old];delete app.symbols[old];const i=app.symbolOrder.indexOf(old);if(i>=0)app.symbolOrder[i]=n;if(app.ui?.chartSymbol===old)app.ui.chartSymbol=n;activeSymbol=n;renderSymbols();render();saveApp()};$("#deleteSymbolBtn").onclick=()=>{if(Object.keys(app.symbols).length===1)return alert("حداقل یک نماد باید باقی بماند.");const count=active().rows.length;if(!confirm(`نماد «${activeSymbol}» و تمام ${enToFa(count)} خرید آن حذف شود؟`))return;delete app.symbols[activeSymbol];app.symbolOrder=app.symbolOrder.filter(n=>n!==activeSymbol);activeSymbol=app.symbolOrder[0];if(app.ui?.chartSymbol===activeSymbol)app.ui.chartSymbol="all";renderSymbols();render();saveApp()};
$("#resetBtn").onclick=()=>{if(confirm("همهٔ داده‌های برنامه، شامل همهٔ نمادها و خریدها، حذف شوند؟")){localStorage.removeItem(KEY);LEGACY_KEYS.forEach(k=>localStorage.removeItem(k));location.reload()}};
function openChoice(title,text,cb){$("#choiceTitle").textContent=title;$("#choiceText").textContent=text;$("#choiceModal").classList.add("open");$("#choiceModal").setAttribute("aria-hidden","false");$("#jsonChoice").onclick=()=>{closeChoice();cb("json")};$("#csvChoice").onclick=()=>{closeChoice();cb("csv")}}function closeChoice(){$("#choiceModal").classList.remove("open");$("#choiceModal").setAttribute("aria-hidden","true")};$("#closeChoice").onclick=closeChoice;$("#backupBtn").onclick=()=>openChoice("پشتیبان‌گیری","فرمت فایل پشتیبان را انتخاب کنید.",kind=>kind==="json"?exportJson():exportCsv());$("#restoreBtn").onclick=()=>openChoice("بازیابی","فرمت فایل پشتیبان را انتخاب کنید.",kind=>kind==="json"?$("#importJsonFile").click():$("#importCsvFile").click());
function exportJson(){saveApp();downloadBlob(new Blob([JSON.stringify(app,null,2)],{type:"application/json;charset=utf-8"}),"درصد-سود-بورس.json")}function csvEscape(v){const s=String(v??"");return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}function exportCsv(){const lines=[["نماد","تاریخ","تعداد سهم","قیمت","کارمزد","مبلغ خرید","قیمت پایانی سهم","کارمزد فروش","مدت (روز)","درصد سود"]];Object.entries(app.symbols).forEach(([name,s])=>{const fee=(s.fee??.12)/100;s.rows.forEach(r=>{const cost=r.shares*r.price+r.commission,d=daysBetweenJalali(r.date),p=cost&&s.price?((s.price*r.shares)*(1-fee)-cost)/cost:null;lines.push([name,r.date,r.shares,r.price,r.commission,cost,s.price,s.fee,d??"",p===null?"":(p*100).toFixed(2)])})});downloadBlob(new Blob(["\uFEFF"+lines.map(r=>r.map(csvEscape).join(",")).join("\n")],{type:"text/csv;charset=utf-8"}),"درصد-سود-بورس.csv")}function downloadBlob(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function bindImport(inputId,kind){$(inputId).onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const text=await f.text();if(kind==="json"){const incoming=normalizeApp(JSON.parse(text));if(confirm("داده‌های فعلی با داده‌های فایل جایگزین شوند؟")){app=incoming;activeSymbol=app.activeSymbol||app.symbolOrder[0];renderSymbols();render();saveApp()}}else importCsv(text);e.target.value=""}catch(err){alert("فایل قابل خواندن نیست.")}}}bindImport("#importJsonFile","json");bindImport("#importCsvFile","csv");
function importCsv(text){const rows=parseCsv(text.replace(/^\uFEFF/,""));if(rows.length<2)return alert("فایل CSV داده‌ای ندارد.");const h=rows[0],idx=n=>h.indexOf(n),required=["نماد","تاریخ","تعداد سهم","قیمت","کارمزد"];if(required.some(x=>idx(x)<0))return alert("ستون‌های لازم CSV پیدا نشد.");const grouped={};rows.slice(1).forEach(r=>{const name=r[idx("نماد")]?.trim()||DEFAULT_SYMBOL;(grouped[name]??=[]).push({id:id(),date:faToEn(r[idx("تاریخ")]||""),shares:num(r[idx("تعداد سهم")]),price:num(r[idx("قیمت")]),commission:num(r[idx("کارمزد")])})});Object.entries(grouped).forEach(([name,rs])=>{if(!app.symbols[name]){app.symbols[name]=makeSymbol([],0,.12);app.symbolOrder.push(name)}app.symbols[name].rows=rs});activeSymbol=Object.keys(grouped)[0]||activeSymbol;renderSymbols();render();saveApp()}
function parseCsv(text){const out=[];let row=[],cell="",quote=false;for(let i=0;i<text.length;i++){const c=text[i];if(quote){if(c==='"'&&text[i+1]==='"'){cell+='"';i++}else if(c==='"')quote=false;else cell+=c}else if(c==='"')quote=true;else if(c===','){row.push(cell);cell=""}else if(c==='\n'){row.push(cell);out.push(row);row=[];cell=""}else if(c!=='\r')cell+=c}row.push(cell);if(row.length>1||row[0])out.push(row);return out}
function chartData(){const s=active(),items=[];s.rows.forEach(r=>{const cost=r.shares*r.price+r.commission,fee=(s.fee??.12)/100,net=r.shares*s.price*(1-fee),amount=cost&&s.price?net-cost:null,profit=cost&&s.price?amount/cost:null;if(profit!==null)items.push({name:activeSymbol,date:r.date,profit,amount})});return items}
function drawChart(){const canvas=$("#profitChart"),empty=$("#chartEmpty"),tip=$("#chartTooltip"),items=chartData();chartPoints=[];if(!items.length){empty.style.display="grid";canvas.style.display="none";tip.style.display="none";return}empty.style.display="none";canvas.style.display="block";const dpr=devicePixelRatio||1,w=canvas.clientWidth,h=canvas.clientHeight;canvas.width=w*dpr;canvas.height=h*dpr;const ctx=canvas.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);const pad={l:52,r:18,t:18,b:42},cw=w-pad.l-pad.r,ch=h-pad.t-pad.b,vals=items.map(x=>x.profit*100),min=Math.min(0,...vals),max=Math.max(0,...vals),span=(max-min)||1,y=v=>pad.t+(max-v)/span*ch,zero=y(0);ctx.font="11px Vazirmatn";ctx.strokeStyle="#d9e0e7";ctx.fillStyle="#727a83";ctx.textAlign="right";[min,(min+max)/2,max].forEach(v=>{ctx.beginPath();ctx.moveTo(pad.l,y(v));ctx.lineTo(w-pad.r,y(v));ctx.stroke();ctx.fillText(`${v.toLocaleString("fa-IR",{maximumFractionDigits:1})}٪`,pad.l-8,y(v)+4)});const bw=Math.min(48,Math.max(18,(cw/items.length)*.58));items.forEach((p,i)=>{const x=pad.l+(i+.5)*(cw/items.length),yy=y(p.profit*100),top=Math.min(yy,zero),height=Math.max(2,Math.abs(yy-zero));ctx.fillStyle=p.profit>=0?"#138a4b":"#c62828";ctx.fillRect(x-bw/2,top,bw,height);chartPoints.push({x:x-bw/2,y:top,w:bw,h:height,data:p});ctx.fillStyle="#727a83";ctx.textAlign="center";ctx.fillText(enToFa(p.date?p.date.slice(5):""),x,h-10)})}
$("#profitChart").addEventListener("mousemove",e=>{const c=e.currentTarget,r=c.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,p=chartPoints.find(q=>x>=q.x&&x<=q.x+q.w&&y>=q.y&&y<=q.y+q.h);if(!p){$("#chartTooltip").style.display="none";return}const d=p.data;const sign=d.amount>0?"+":d.amount<0?"−":"";$("#chartTooltip").innerHTML=`<strong>${escapeHtml(d.name)}</strong>${d.date?`<span>تاریخ: ${enToFa(d.date)}</span>`:""}<span class="tip-amount">مبلغ سود/زیان: <b class="${d.amount>0?"positive":d.amount<0?"negative":""}">${sign}${fmt(Math.abs(d.amount))} ریال</b></span><span class="tip-profit">درصد سود/زیان: <b class="${d.profit>0?"positive":d.profit<0?"negative":""}">${fmtPct(d.profit)}</b></span>`;const tip=$("#chartTooltip");tip.style.display="block";tip.style.left=Math.min(Math.max(8,x+12),c.clientWidth-tip.offsetWidth-8)+"px";tip.style.top=Math.min(Math.max(8,y+12),c.clientHeight-tip.offsetHeight-8)+"px"});$("#profitChart").addEventListener("mouseleave",()=>$("#chartTooltip").style.display="none");
function openCalendar(tr){calendarTarget=tr;const p=parseJ(tr.querySelector(".jalali").value),now=currentJalali();calendarCursor=p?{y:p.y,m:p.m}:{y:now.y,m:now.m};renderCalendar();$("#dateModal").classList.add("open");$("#dateModal").setAttribute("aria-hidden","false")}function closeCalendar(){$("#dateModal").classList.remove("open");$("#dateModal").setAttribute("aria-hidden","true");calendarTarget=null}function monthDays(y,m){return m<=6?31:m<=11?30:(jalaliToGregorian(y+1,1,1).date-jalaliToGregorian(y,12,1).date)/86400000}function renderCalendar(){const{y,m}=calendarCursor;$("#calendarTitle").textContent=`${["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"][m-1]} ${enToFa(y)}`;const first=jalaliToGregorian(y,m,1).date.getUTCDay(),offset=(first+1)%7,days=monthDays(y,m),selected=parseJ(calendarTarget?.querySelector(".jalali")?.value||""),today=currentJalali(),g=$("#calendarGrid");g.innerHTML="";for(let i=0;i<offset;i++){const e=document.createElement("button");e.className="empty";g.appendChild(e)}for(let d=1;d<=days;d++){const b=document.createElement("button");b.textContent=enToFa(d);if(today.y===y&&today.m===m&&today.d===d)b.classList.add("today");if(selected?.y===y&&selected?.m===m&&selected?.d===d)b.classList.add("selected");b.onclick=()=>selectDate(y,m,d);g.appendChild(b)}}function selectDate(y,m,d){if(!calendarTarget)return;calendarTarget.querySelector(".jalali").value=`${enToFa(y)}/${enToFa(String(m).padStart(2,"0"))}/${enToFa(String(d).padStart(2,"0"))}`;syncRows();closeCalendar();render();saveApp()}$("#prevMonth").onclick=()=>{calendarCursor.m--;if(calendarCursor.m<1){calendarCursor.m=12;calendarCursor.y--}renderCalendar()};$("#nextMonth").onclick=()=>{calendarCursor.m++;if(calendarCursor.m>12){calendarCursor.m=1;calendarCursor.y++}renderCalendar()};$("#todayBtn").onclick=()=>{const t=currentJalali();calendarCursor={y:t.y,m:t.m};renderCalendar()};$("#closeCalendar").onclick=closeCalendar;$("#dateModal").onclick=e=>{if(e.target.id==="dateModal")closeCalendar()};$("#choiceModal").onclick=e=>{if(e.target.id==="choiceModal")closeChoice()};window.addEventListener("resize",drawChart);renderSymbols();render();
// Dashboard patch
const OVERVIEW_STATE_KEY = "overview";
let overviewMode = app.ui?.overview === undefined ? true : !!app.ui.overview;
const mainRoot = document.querySelector("main");
const symbolViewSelectors = [".hero-row", ".cards", ".settings", ".chart-panel", "main > .panel"];

function dashboardNumber(v){ return fmt(v); }
function dashboardPct(v){ return fmtPct(v); }
function portfolioData(){
  const items=[];
  let shares=0, purchases=0, investment=0, current=0;
  Object.entries(app.symbols).forEach(([name,s])=>{
    const rows=Array.isArray(s.rows)?s.rows:[];
    const totalShares=rows.reduce((n,r)=>n+(Number(r.shares)||0),0);
    const cost=rows.reduce((n,r)=>n+(Number(r.shares)||0)*(Number(r.price)||0)+(Number(r.commission)||0),0);
    const fee=(Number(s.fee)||0)/100;
    const hasPrice=Number(s.price)>0;
    const value=hasPrice ? totalShares*Number(s.price)*(1-fee) : null;
    const profit=value===null?null:value-cost;
    const ret=profit!==null&&cost?profit/cost:null;
    shares+=totalShares; purchases+=rows.length; investment+=cost; if(value!==null) current+=value;
    items.push({name,totalShares,purchases,cost,value,profit,ret});
  });
  const priced=items.filter(x=>x.value!==null);
  const pricedInvestment=priced.reduce((n,x)=>n+x.cost,0);
  const totalProfit=priced.length?priced.reduce((n,x)=>n+(x.profit||0),0):null;
  const totalRet=totalProfit!==null&&pricedInvestment?totalProfit/pricedInvestment:null;
  return {items,shares,purchases,investment,pricedInvestment,current:priced.length?current:null,profit:totalProfit,ret:totalRet,profitable:items.filter(x=>x.profit!==null&&x.profit>0).length,lossmaking:items.filter(x=>x.profit!==null&&x.profit<0).length};
}
function dashboardValue(v, suffix=""){
  return v===null?"—":dashboardNumber(v)+(suffix?` ${suffix}`:"");
}
function renderOverview(){
  const d=portfolioData();
  symbolViewSelectors.forEach(sel=>document.querySelectorAll(sel).forEach(el=>el.style.display="none"));
  let el=document.querySelector("#overviewView");
  if(!el){
    el=document.createElement("section"); el.id="overviewView"; mainRoot.appendChild(el);
  }
  const rows=d.items.map(x=>{
    const share=d.current&&x.value!==null?x.value/d.current:null;
    const profitClass=x.profit>0?"positive":x.profit<0?"negative":"";
    return `<tr class="overview-row" data-symbol="${escapeHtml(x.name)}"><td><button class="overview-symbol" type="button">${escapeHtml(x.name)}</button></td><td>${dashboardNumber(x.totalShares)}</td><td>${dashboardValue(x.cost)}</td><td>${dashboardValue(x.value)}</td><td class="${profitClass}">${x.profit===null?"—":(x.profit>0?"+":"")+dashboardNumber(x.profit)}</td><td class="${profitClass}">${x.ret===null?"—":dashboardPct(x.ret)}</td><td>${share===null?"—":dashboardPct(share)}</td></tr>`;
  }).join("");
  const bars=d.items.filter(x=>x.value!==null&&x.value>0).sort((a,b)=>b.value-a.value).map(x=>{
    const pct=d.current?x.value/d.current:0;
    return `<div class="allocation-row"><div class="allocation-head"><span>${escapeHtml(x.name)}</span><b>${dashboardPct(pct)}</b></div><div class="allocation-track"><span style="width:${Math.max(0,Math.min(100,pct*100))}%"></span></div></div>`;
  }).join("");
  const profitClass=d.profit>0?"positive":d.profit<0?"negative":"";
  el.innerHTML=`
    <div class="overview-head"><div><span class="eyebrow">وضعیت کل سبد</span><h2>نمای کلی</h2><p>خلاصه‌ای از وضعیت همهٔ نمادهای موجود در سبد</p></div></div>
    <section class="overview-cards">
      <div class="overview-card"><span>ارزش فعلی سبد</span><strong>${dashboardValue(d.current)}</strong></div>
      <div class="overview-card"><span>کل سرمایه‌گذاری</span><strong>${dashboardValue(d.investment)}</strong></div>
      <div class="overview-card ${profitClass}"><span>سود/زیان کل</span><strong>${d.profit===null?"—":(d.profit>0?"+":"")+dashboardNumber(d.profit)}</strong></div>
      <div class="overview-card ${profitClass}"><span>بازدهی کل</span><strong>${d.ret===null?"—":dashboardPct(d.ret)}</strong></div>
    </section>
    <div class="overview-stats"><span><b>${dashboardNumber(d.items.length)}</b> نماد</span><span><b>${dashboardNumber(d.shares)}</b> سهم</span><span><b>${dashboardNumber(d.purchases)}</b> خرید</span><span><b>${dashboardNumber(d.profitable)}</b> نماد سودده</span><span><b>${dashboardNumber(d.lossmaking)}</b> نماد زیان‌ده</span></div>
    <section class="panel overview-panel"><div class="panel-head"><div><h2>خلاصهٔ نمادها</h2><p class="muted">برای مشاهدهٔ جزئیات، روی نماد موردنظر کلیک کنید.</p></div></div><div class="table-wrap"><table class="overview-table"><thead><tr><th>نماد</th><th>تعداد</th><th>بهای خرید</th><th>ارزش فعلی</th><th>سود/زیان</th><th>بازدهی</th><th>سهم از سبد</th></tr></thead><tbody>${rows||`<tr><td colspan="7" class="overview-empty">هنوز نمادی ثبت نشده است.</td></tr>`}</tbody></table></div></section>
    <section class="panel overview-panel allocation-panel"><div class="panel-head"><div><h2>توزیع فعلی سبد</h2><p class="muted">سهم هر نماد بر اساس ارزش فعلی آن از کل سبد</p></div></div><div class="allocation-list">${bars||`<div class="overview-empty">برای نمایش توزیع سبد، قیمت پایانی نمادها را وارد کنید.</div>`}</div></section>`;
  el.querySelectorAll(".overview-row").forEach(row=>row.onclick=e=>{if(e.target.closest("button")){overviewMode=false;activeSymbol=row.dataset.symbol;app.ui.overview=false;renderSymbols();render();saveApp()}});
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
  rowsEl.innerHTML="";
  s.rows.forEach(r=>addRow(r));
  $("#tableEmpty").style.display=s.rows.length?"none":"block";
  updateTableOnly();
  $("#lastUpdated").textContent=`${enToFa(String(currentJalali().y))}/${enToFa(String(currentJalali().m).padStart(2,"0"))}/${enToFa(String(currentJalali().d).padStart(2,"0"))}`;
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
    const totalShares=s.rows.reduce((n,r)=>n+(Number(r.shares)||0),0);
    const cost=s.rows.reduce((n,r)=>n+(Number(r.shares)||0)*(Number(r.price)||0)+(Number(r.commission)||0),0);
    const fee=(Number(s.fee)||0)/100;
    const value=Number(s.price)>0?totalShares*Number(s.price)*(1-fee):null;
    const profit=value===null?null:value-cost;
    const pct=profit!==null&&cost?profit/cost:null;
    const cls=profit>0?"positive":profit<0?"negative":"";
    const b=document.createElement("button");
    b.className="symbol-btn symbol-card"+(!overviewMode&&name===activeSymbol?" active":"");
    b.draggable=true;b.dataset.symbol=name;
    b.innerHTML=`<span class="drag-handle">⋮⋮</span><span class="symbol-main"><span class="symbol-name">${escapeHtml(name)}</span><span class="symbol-meta">${enToFa(String(s.rows.length))} خرید</span></span><span class="symbol-result ${cls}">${pct===null?"—":(pct>0?"+":"")+fmtPct(pct)}</span>`;
    b.onclick=()=>{overviewMode=false;app.ui=app.ui||{};app.ui.overview=false;switchSymbol(name)};
    b.ondragstart=e=>{e.dataTransfer.setData("text/plain",name);b.classList.add("dragging")};
    b.ondragend=()=>b.classList.remove("dragging");
    b.ondragover=e=>e.preventDefault();
    b.ondrop=e=>{e.preventDefault();const from=e.dataTransfer.getData("text/plain"),to=name;if(!from||from===to)return;const order=app.symbolOrder.slice(),fi=order.indexOf(from),ti=order.indexOf(to);order.splice(fi,1);order.splice(ti,0,from);app.symbolOrder=order;renderSymbolsDashboardAware();saveApp()};
    el.appendChild(b);
  });
}
function saveAppDashboardAware(){app.activeSymbol=activeSymbol;app.ui=app.ui||{};app.ui.chartSymbol=activeSymbol;app.ui.overview=overviewMode;localStorage.setItem(KEY,JSON.stringify(app))}
function renderDashboardAware(){if(overviewMode){renderOverview();return}renderSymbolView()}

function bindChartToggle(){
  const btn=$("#toggleChartBtn"), body=$("#chartBody");
  if(!btn||!body)return;
  const sync=()=>{const open=!body.hidden;btn.textContent=open?"بستن نمودار":"نمایش نمودار";btn.classList.toggle("active",open)};
  btn.onclick=()=>{body.hidden=!body.hidden;sync();if(!body.hidden)requestAnimationFrame(drawChart)};
  sync();
}
bindChartToggle();
// Replace the view/render entry points while preserving the existing symbol-page implementation.
renderSymbols=renderSymbolsDashboardAware;
saveApp=saveAppDashboardAware;
render=renderDashboardAware;
renderSymbols();render();saveApp();
