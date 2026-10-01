const KEY="stocks-web-v1";
const initialData=[
  ["1405/04/28",10,520000,6240],["1405/04/29",10,510000,6120],
  ["1405/05/04",10,500000,6000],["1405/05/31",10,580000,6960],
  ["1405/05/31",10,583000,6996],["1405/05/31",10,583000,6996],
  ["1405/05/31",10,590000,7080],["1405/06/02",10,610000,7320],
  ["1405/06/03",10,600000,7200],["1405/06/15",110,640000,84480],
  ["1405/06/16",100,630000,75600],["1405/06/22",100,640000,38496],
  ["1405/06/24",16,630000,0],["1405/07/01",384,650000,0],
  ["1405/07/08",150,710000,85200]
];
const $=s=>document.querySelector(s), rowsEl=$("#rows"), priceEl=$("#currentPrice"), feeEl=$("#sellFee");

function faToEn(s){
  return String(s??"")
    .replace(/[۰-۹]/g,c=>"۰۱۲۳۴۵۶۷۸۹".indexOf(c))
    .replace(/[٬,]/g,"").replace(/٫/g,".").replace(/[\/-]/g,"/");
}
function enToFa(s){return String(s).replace(/\d/g,d=>"۰۱۲۳۴۵۶۷۸۹"[d])}
function num(v){return Number(faToEn(String(v??"")))||0}
function fmt(v){return Math.round(v||0).toLocaleString("fa-IR")}
function fmtPct(v){return (v*100).toLocaleString("fa-IR",{minimumFractionDigits:2,maximumFractionDigits:2})+"٪"}

function normalizeNumericInput(input, decimals=false){
  const raw=faToEn(input.value).replace(/[^0-9.]/g,"");
  input.value=raw;
}
function displayNumericInput(input, decimals=false){
  const raw=faToEn(input.value);
  if(raw==="") return;
  const n=Number(raw);
  if(!Number.isFinite(n)) return;
  input.value=decimals
    ? n.toLocaleString("fa-IR",{maximumFractionDigits:2,useGrouping:false})
    : Math.round(n).toLocaleString("fa-IR",{useGrouping:false});
}
function bindNumericInput(input, decimals=false){
  input.addEventListener("focus",()=>{input.value=faToEn(input.value)});
  input.addEventListener("input",()=>{normalizeNumericInput(input,decimals);render();save()});
  input.addEventListener("blur",()=>{displayNumericInput(input,decimals);render();save()});
  displayNumericInput(input,decimals);
}

function div(a,b){return Math.floor(a/b)}
function jalaliToGregorian(jy,jm,jd){
  jy=Number(jy); jm=Number(jm); jd=Number(jd);
  let epBase=jy-(jy>=0?474:473), epYear=474+((epBase%2820+2820)%2820);
  let md=jm<=7?(jm-1)*31:(jm-1)*30+6;
  let days=jd+md+div(epYear*682-110,2816)+(epYear-1)*365+div(epBase,2820)*1029983+(1948320-1);
  let gy=400*div(days,146097); let rem=days%146097;
  if(rem>=36524){gy+=100*div(--rem,36524); rem%=36524; if(rem>=365)rem++}
  let yday=rem;
  gy+=4*div(yday,1461); yday%=1461;
  if(yday>=366){gy+=div(yday-1,365); yday=(yday-1)%365}
  let gd=yday+1, leap=(gy%4===0&&gy%100!==0)||gy%400===0;
  let sal=leap?[31,29,31,30,31,30,31,31,30,31,30,31]:[31,28,31,30,31,30,31,31,30,31,30,31];
  let gm=1; while(gd>sal[gm-1]){gd-=sal[gm-1];gm++}
  return {gy,gm,gd,date:new Date(Date.UTC(gy,gm-1,gd))};
}
function parseJ(s){
  const a=faToEn(s).split("/").map(Number);
  if(a.length!==3||!a.every(Number.isFinite)) return null;
  if(a[0]<1200||a[0]>1600||a[1]<1||a[1]>12||a[2]<1||a[2]>31)return null;
  return jalaliToGregorian(a[0],a[1],a[2]);
}
function today(){const d=new Date();return new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()))}
function daysBetween(a,b){return Math.round((b-a)/86400000)}
function state(){
  return {price:num(priceEl.value),fee:num(feeEl.value),rows:[...rowsEl.querySelectorAll("tr")].map(tr=>({
    date:tr.querySelector(".jalali").value,shares:num(tr.querySelector(".shares").value),
    price:num(tr.querySelector(".price").value),commission:num(tr.querySelector(".commission").value)
  }))}
}
function save(){localStorage.setItem(KEY,JSON.stringify(state()))}
function addRow(data={date:"",shares:"",price:"",commission:""}){
  const tr=$("#rowTemplate").content.firstElementChild.cloneNode(true);
  tr.querySelector(".jalali").value=enToFa(data.date);
  tr.querySelector(".shares").value=data.shares;
  tr.querySelector(".price").value=data.price;
  tr.querySelector(".commission").value=data.commission;
  rowsEl.appendChild(tr);
  bindNumericInput(tr.querySelector(".shares"));
  bindNumericInput(tr.querySelector(".price"));
  bindNumericInput(tr.querySelector(".commission"));
  tr.querySelector(".jalali").addEventListener("input",()=>{render();save()});
  tr.querySelector(".delete").onclick=()=>{tr.remove();render();save()};
  render();
}
function render(){
  const price=num(priceEl.value), fee=num(feeEl.value)/100, now=today();
  let totalShares=0,totalCost=0;
  rowsEl.querySelectorAll("tr").forEach(tr=>{
    const date=tr.querySelector(".jalali").value, d=parseJ(date);
    const sh=num(tr.querySelector(".shares").value), p=num(tr.querySelector(".price").value), c=num(tr.querySelector(".commission").value);
    const cost=sh*p+c;
    tr.querySelector(".cost").textContent=fmt(cost);
    tr.querySelector(".live-price").textContent=price?fmt(price):"—";
    tr.querySelector(".days").textContent=d?enToFa(String(Math.max(0,daysBetween(d.date,now)))):"—";
    const profit=cost&&price?((price*sh)*(1-fee)-cost)/cost:0;
    tr.querySelector(".profit").textContent=cost&&price?fmtPct(profit):"—";
    totalShares+=sh; totalCost+=cost;
  });
  $("#currentPriceCard").textContent=price?fmt(price):"—";
  $("#totalShares").textContent=fmt(totalShares);
  $("#totalCost").textContent=fmt(totalCost);
  const totalProfit=totalCost&&price?((totalShares*price)*(1-fee)/totalCost)-1:0;
  $("#totalProfit").textContent=totalCost&&price?fmtPct(totalProfit):"—";
}
$("#addBtn").onclick=()=>addRow();
bindNumericInput(priceEl);
bindNumericInput(feeEl,true);
$("#resetBtn").onclick=()=>{if(confirm("همهٔ خریدها حذف شوند؟")){localStorage.removeItem(KEY);location.reload()}};
$("#exportBtn").onclick=()=>{
  const s=state(), head=["تاریخ","تعداد سهم","قیمت","کارمزد","مبلغ خرید","قیمت فعلی سهم","مدت (روز)","درصد سود"];
  const lines=[head,...s.rows.map(r=>{
    const d=parseJ(r.date),cost=r.shares*r.price+r.commission,profit=cost&&s.price?((s.price*r.shares)*(1-s.fee/100)-cost)/cost:0;
    return [r.date,r.shares,r.price,r.commission,cost,s.price,d?daysBetween(d.date,today()):"",cost&&s.price?profit*100:""];
  })];
  const csv="\uFEFF"+lines.map(x=>x.join(",")).join("\n"), a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download="سهام.csv";a.click();
};
const saved=localStorage.getItem(KEY);
if(saved){try{
  const s=JSON.parse(saved);
  priceEl.value=s.price||""; feeEl.value=s.fee??.12;
  s.rows.forEach(addRow);
}catch{}}
else{
  priceEl.value=713145; feeEl.value=.12;
  initialData.forEach(x=>addRow({date:x[0],shares:x[1],price:x[2],commission:x[3]}));
}
displayNumericInput(priceEl);
displayNumericInput(feeEl,true);
render();
