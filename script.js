"use strict";

const $ = id => document.getElementById(id);
const paper = $("paper");
const itemsBody = $("items");
let rows = [];
let nextId = 1;
let CURRENCY = "NGN";

const DEFAULTS = {
  original: {background:"#07151b",text:"#f3f6ff",accent:"#10e6a3",line:"#245c7b",head:"#102632"},
  classic: {background:"#fffaf0",text:"#343a30",accent:"#648057",line:"#ded8c8",head:"#eee8d9"},
  market: {background:"#fff7e8",text:"#3c3024",accent:"#c34e2d",line:"#e4c99e",head:"#f2dfb9"},
  minimal: {background:"#ffffff",text:"#252525",accent:"#252525",line:"#dddddd",head:"#f4f4f4"}
};
const CURRENCY_SYMBOLS = {
  NGN:"₦", USD:"$", GBP:"£", EUR:"€", GHS:"GH₵", KES:"KSh",
  ZAR:"R", CAD:"CA$", AUD:"A$", INR:"₹"
};
const STORAGE_KEY = "listly.savedLists.v1";
const DRAFT_KEY = "listly.draft.v1";

function money(value) {
  try {
    return new Intl.NumberFormat("en", {
      style:"currency", currency:CURRENCY,
      minimumFractionDigits:2, maximumFractionDigits:2
    }).format(Number(value) || 0);
  } catch {
    return `${CURRENCY_SYMBOLS[CURRENCY] || CURRENCY}${(Number(value)||0).toFixed(2)}`;
  }
}
function numberValue(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
function quantityValue(value) {
  const text = String(value ?? "").trim();
  if (!text) return 0;
  const fraction = text.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fraction && Number(fraction[2]) !== 0) return Number(fraction[1])/Number(fraction[2]);
  const number = Number(text);
  if (Number.isFinite(number) && number > 0) return number;
  const match = text.match(/^\s*(\d+(?:\.\d+)?)/);
  return match ? numberValue(match[1]) : 0;
}
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[c]);
}
function addRow(name="", quantity="", price="") {
  const row = {id:nextId++, name, quantity, price};
  rows.push(row);
  renderRows();
  const input = itemsBody.querySelector(`tr[data-id="${row.id}"] .name-input`);
  if (input) input.focus();
}
function renderRows() {
  itemsBody.innerHTML = rows.map((row,index) => `
    <tr data-id="${row.id}">
      <td class="row-number">${index+1}</td>
      <td><input class="cell-input name-input" type="text" aria-label="Item name" placeholder="Item name" value="${escapeHTML(row.name)}"></td>
      <td><input class="cell-input quantity-input" type="text" inputmode="decimal" aria-label="Quantity" placeholder="e.g. 2" value="${escapeHTML(row.quantity)}"></td>
      <td><input class="cell-input price-input" type="number" min="0" step="0.01" inputmode="decimal" aria-label="Unit price" placeholder="Unit price" value="${escapeHTML(row.price)}"><div class="line-amount">—</div></td>
      <td class="action-col"><button class="remove-row" type="button" aria-label="Remove item" title="Remove item">×</button></td>
    </tr>`).join("");
  updateTotals();
}
function readRows() {
  itemsBody.querySelectorAll("tr").forEach(tr => {
    const row = rows.find(item => item.id === Number(tr.dataset.id));
    if (!row) return;
    row.name = tr.querySelector(".name-input").value;
    row.quantity = tr.querySelector(".quantity-input").value;
    row.price = tr.querySelector(".price-input").value;
  });
}
function calculateTotal() {
  return rows.reduce((sum,row) => sum + quantityValue(row.quantity)*numberValue(row.price),0);
}
function updateTotals() {
  let total = 0;
  itemsBody.querySelectorAll("tr").forEach(tr => {
    const row = rows.find(item => item.id === Number(tr.dataset.id));
    if (!row) return;
    const quantity = quantityValue(row.quantity);
    const price = numberValue(row.price);
    const amount = quantity*price;
    total += amount;
    tr.querySelector(".line-amount").textContent =
      row.quantity.trim() !== "" && row.price !== "" ? money(amount) : "—";
  });
  $("totalInside").textContent = money(total);
  $("totalOutside").textContent = money(total);
  const rawBudget = $("budget").value.trim();
  const hasBudget = rawBudget !== "" && Number.isFinite(Number(rawBudget)) && Number(rawBudget)>=0;
  const budget = hasBudget ? Number(rawBudget) : null;
  const remaining = hasBudget ? budget-total : null;
  $("budgetInside").textContent = hasBudget ? money(budget) : "—";
  $("remainingInside").textContent = hasBudget ? money(remaining) : "—";
  $("remainingOutside").textContent = hasBudget ? money(remaining) : "—";
  const over = remaining !== null && remaining < 0;
  $("remainingInside").style.color = over ? "#ff8277" : "";
  $("remainingOutside").style.color = over ? "#b43e31" : "";
  return {total,hasBudget,budget,remaining};
}
function updateCurrencyLabel() {
  $("amountHeading").textContent = `Amount (${CURRENCY_SYMBOLS[CURRENCY] || CURRENCY})`;
}
itemsBody.addEventListener("input", () => { readRows(); updateTotals(); });
itemsBody.addEventListener("click", event => {
  const button = event.target.closest(".remove-row");
  if (!button) return;
  rows = rows.filter(row => row.id !== Number(button.closest("tr").dataset.id));
  renderRows();
  $("status").textContent = "Item removed.";
});
$("addRow").addEventListener("click", () => addRow());
$("clearRows").addEventListener("click", () => {
  if (!rows.length) return;
  if (!confirm("Clear all items from this list?")) return;
  rows = []; renderRows(); $("status").textContent = "All items cleared.";
});
$("budget").addEventListener("input", updateTotals);
$("currency").addEventListener("change", () => {
  CURRENCY = $("currency").value;
  updateCurrencyLabel();
  updateTotals();
  $("status").textContent = `Currency changed to ${CURRENCY}. Values are reformatted, not exchange-converted.`;
});
function selectedTemplate() { return $("template").value; }
function applyBackground() { paper.style.setProperty("--paper-bg",$("background").value); }
function applyTemplate(template, resetColour=true) {
  if (!DEFAULTS[template]) template = "original";
  paper.className = `paper ${template}`;
  if (resetColour) $("background").value = DEFAULTS[template].background;
  applyBackground();
}
$("template").addEventListener("change", () => {
  applyTemplate(selectedTemplate(),true);
  $("status").textContent = "Template changed.";
  updateTotals();
});
$("background").addEventListener("input",applyBackground);
$("resetBackground").addEventListener("click", () => {
  $("background").value = DEFAULTS[selectedTemplate()].background;
  applyBackground();
  $("status").textContent = "Default background colour restored.";
});
const textBindings = [
  ["heading","previewHeading"],["subtitle","previewSubtitle"],
  ["decorativeText","previewDecorative"],["footerText","previewFooter"]
];
function decorativeTextHTML(value) {
  return escapeHTML(value).replace(/\n/g,"<br>");
}
textBindings.forEach(([inputId,previewId]) => {
  const input = $(inputId), preview = $(previewId);
  input.addEventListener("input", () => {
    if (previewId === "previewDecorative") preview.innerHTML = decorativeTextHTML(input.value);
    else preview.textContent = input.value;
  });
  preview.addEventListener("input", () => {
    input.value = preview.innerText.replace(/\n/g," ").trim();
  });
});
function getSavedLists() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}
function refreshSavedLists(selectedId="") {
  const select = $("savedLists");
  select.innerHTML = '<option value="">Choose a saved list</option>';
  getSavedLists().forEach(list => {
    const option = document.createElement("option");
    option.value = list.id; option.textContent = list.name || "Untitled list";
    select.appendChild(option);
  });
  select.value = selectedId;
}
function readCurrentList() {
  readRows();
  return {
    id:"", name:$("heading").value.trim()||"Shopping List", currency:CURRENCY,
    template:selectedTemplate(), heading:$("heading").value, subtitle:$("subtitle").value,
    decorativeText:$("decorativeText").value, footerText:$("footerText").value,
    background:$("background").value, budget:$("budget").value,
    rows:rows.map(row=>({name:row.name,quantity:row.quantity,price:row.price}))
  };
}
function saveCurrentList() {
  const current = readCurrentList();
  const lists = getSavedLists();
  const selectedId = $("savedLists").value;
  const sameSelected = selectedId ? lists.find(list=>list.id===selectedId) : null;
  const sameName = !sameSelected ? lists.find(list=>(list.name||"").toLowerCase()===current.name.toLowerCase()) : null;
  let id = sameSelected?.id || sameName?.id || `list-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  if (sameName && !sameSelected && !confirm(`A list named "${current.name}" already exists. Update it? Press Cancel to save another copy.`)) {
    id = `list-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  }
  current.id = id;
  const index = lists.findIndex(list=>list.id===id);
  if (index >= 0) lists[index] = current; else lists.push(current);
  try {
    localStorage.setItem(STORAGE_KEY,JSON.stringify(lists));
    localStorage.setItem(DRAFT_KEY,JSON.stringify(current));
    refreshSavedLists(id);
    $("status").textContent = `"${current.name}" saved in this browser.`;
  } catch (error) {
    console.error(error);
    $("status").textContent = "Unable to save. Browser storage may be full or disabled.";
  }
}
function loadSelectedList() {
  const id = $("savedLists").value;
  if (!id) { $("status").textContent="Choose a saved list first."; return; }
  const list = getSavedLists().find(item=>item.id===id);
  if (!list) { $("status").textContent="Saved list not found."; refreshSavedLists(); return; }
  applySavedList(list);
  localStorage.setItem(DRAFT_KEY,JSON.stringify(list));
}
function applySavedList(list) {
  CURRENCY = list.currency || "NGN";
  $("currency").value = CURRENCY;
  $("template").value = DEFAULTS[list.template] ? list.template : "original";
  $("heading").value = list.heading ?? "Shopping List";
  $("subtitle").value = list.subtitle ?? "";
  $("decorativeText").value = list.decorativeText ?? "";
  $("footerText").value = list.footerText ?? "";
  $("background").value = list.background || DEFAULTS[$("template").value].background;
  $("budget").value = list.budget ?? "";
  $("previewHeading").textContent = $("heading").value;
  $("previewSubtitle").textContent = $("subtitle").value;
  $("previewDecorative").innerHTML = decorativeTextHTML($("decorativeText").value);
  $("previewFooter").textContent = $("footerText").value;
  rows = (Array.isArray(list.rows)?list.rows:[]).map(row=>({
    id:nextId++,name:String(row.name??""),quantity:String(row.quantity??""),price:String(row.price??"")
  }));
  applyTemplate($("template").value,false);
  $("background").value = list.background || DEFAULTS[$("template").value].background;
  applyBackground(); updateCurrencyLabel(); renderRows();
  $("status").textContent = `"${list.name || "Shopping List"}" loaded.`;
}
function deleteSelectedList() {
  const id = $("savedLists").value;
  if (!id) { $("status").textContent="Choose a saved list to delete."; return; }
  const list = getSavedLists().find(item=>item.id===id);
  if (!confirm(`Delete "${list?.name || "this list"}"? This cannot be undone.`)) return;
  localStorage.setItem(STORAGE_KEY,JSON.stringify(getSavedLists().filter(item=>item.id!==id)));
  refreshSavedLists();
  $("status").textContent = "Saved list deleted.";
}
$("saveListBtn").addEventListener("click",saveCurrentList);
$("loadListBtn").addEventListener("click",loadSelectedList);
$("deleteListBtn").addEventListener("click",deleteSelectedList);

function drawText(ctx,text,x,y,{font="16px Arial",color="#222",align="left",maxWidth}={}) {
  ctx.font=font;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline="middle";
  ctx.fillText(String(text??""),x,y,maxWidth);
}
function roundedRect(ctx,x,y,w,h,r) {
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
}
function wrapCanvasText(ctx,text,x,y,maxWidth,lineHeight,options={}) {
  ctx.font=options.font||"16px Arial";ctx.fillStyle=options.color||"#222";ctx.textAlign="left";ctx.textBaseline="middle";
  const words=String(text||"").split(/\s+/);let line="",cy=y;
  words.forEach(word=>{const test=line?`${line} ${word}`:word;if(ctx.measureText(test).width>maxWidth&&line){ctx.fillText(line,x,cy);cy+=lineHeight;line=word;}else line=test;});
  if(line)ctx.fillText(line,x,cy);
}
function drawShoppingList() {
  readRows();
  const totals=updateTotals(), template=selectedTemplate();
  const palette={...DEFAULTS[template],background:$("background").value};
  const title=$("previewHeading").innerText.trim()||"Shopping List";
  const subtitle=$("previewSubtitle").innerText.trim();
  const decorative=$("previewDecorative").innerText.trim();
  const footer=$("previewFooter").innerText.trim();
  const visibleRows=rows.filter(row=>row.name.trim()||row.quantity.trim()||row.price!=="");
  const width=1000,margin=40,tableX=margin,tableWidth=width-margin*2;
  const headerHeight=template==="market"?175:160,theadH=55,rowH=62;
  const tableY=headerHeight,tableRows=Math.max(visibleRows.length,1);
  const tableH=theadH+tableRows*rowH+65,showBudget=template!=="minimal";
  const budgetH=showBudget?100:0,footerH=showBudget?75:15;
  const height=tableY+tableH+budgetH+footerH+25,scale=2;
  const canvas=document.createElement("canvas");canvas.width=width*scale;canvas.height=height*scale;
  const ctx=canvas.getContext("2d");ctx.scale(scale,scale);
  ctx.fillStyle=palette.background;ctx.fillRect(0,0,width,height);
  const text=palette.text,accent=palette.accent,line=palette.line,head=palette.head;
  if(template==="original"){
    drawText(ctx,"🛒",margin+35,65,{font:"48px Arial",color:accent,align:"center"});
    drawText(ctx,title,margin+80,55,{font:"bold 43px Arial",color:text,maxWidth:590});
    drawText(ctx,subtitle,margin+80,100,{font:"bold 18px Arial",color:text,maxWidth:590});
    const note=decorative.split(/\n/);
    drawText(ctx,note[0]||"",width-margin,48,{font:"bold 23px Georgia",color:accent,align:"right",maxWidth:220});
    drawText(ctx,note.slice(1).join(" ")||"",width-margin,77,{font:"bold 20px Georgia",color:accent,align:"right",maxWidth:220});
  } else if(template==="classic"){
    drawText(ctx,title,margin,50,{font:"bold 42px Georgia",color:text,maxWidth:tableWidth});
    drawText(ctx,subtitle,margin,95,{font:"20px Georgia",color:text,maxWidth:tableWidth});
    ctx.strokeStyle=accent;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(margin,130);ctx.lineTo(width-margin,130);ctx.stroke();
    drawText(ctx,decorative.replace(/\n/g," "),width-margin,147,{font:"italic 16px Georgia",color:accent,align:"right",maxWidth:tableWidth});
  } else if(template==="market"){
    ctx.fillStyle=head;roundedRect(ctx,margin,25,tableWidth,130,14);ctx.fill();ctx.fillStyle=accent;ctx.fillRect(margin,145,tableWidth,7);
    drawText(ctx,title,margin+20,65,{font:"bold 42px Georgia",color:text,maxWidth:tableWidth-40});
    drawText(ctx,subtitle,margin+20,103,{font:"19px Arial",color:text,maxWidth:tableWidth-40});
    drawText(ctx,decorative.replace(/\n/g," "),margin+20,133,{font:"bold 17px Georgia",color:accent,maxWidth:tableWidth-40});
  } else {
    drawText(ctx,title,margin,55,{font:"bold 42px Arial",color:text,maxWidth:tableWidth});
    drawText(ctx,subtitle,margin,100,{font:"20px Arial",color:"#777",maxWidth:tableWidth});
    ctx.fillStyle=text;ctx.fillRect(margin,132,tableWidth,3);
  }
  const numberX=tableX,itemX=tableX+75,quantityX=tableX+tableWidth*.53,amountX=tableX+tableWidth*.77,endX=tableX+tableWidth;
  const numberWidth=75,itemWidth=quantityX-itemX-10,quantityWidth=amountX-quantityX-15,amountWidth=endX-amountX;
  const bodyY=tableY+theadH;
  ctx.fillStyle=head;ctx.fillRect(tableX,tableY,tableWidth,theadH);
  ctx.strokeStyle=line;ctx.lineWidth=1.5;ctx.strokeRect(tableX,tableY,tableWidth,tableH);
  drawText(ctx,"#",numberX+numberWidth/2,tableY+28,{font:"bold 20px Arial",color:text,align:"center"});
  drawText(ctx,"Item",itemX+8,tableY+28,{font:"bold 20px Arial",color:text});
  drawText(ctx,"Quantity",quantityX+8,tableY+28,{font:"bold 17px Arial",color:text});
  drawText(ctx,`Amount (${CURRENCY_SYMBOLS[CURRENCY]||CURRENCY})`,endX-10,tableY+28,{font:"bold 17px Arial",color:text,align:"right",maxWidth:amountWidth-2});
  [itemX,quantityX,amountX].forEach(x=>{ctx.beginPath();ctx.moveTo(x,tableY);ctx.lineTo(x,tableY+tableH);ctx.stroke();});
  visibleRows.forEach((row,index)=>{
    const y=bodyY+index*rowH;
    if(template==="market"&&index%2===1){ctx.fillStyle="#f8efd9";ctx.fillRect(tableX+1,y,tableWidth-2,rowH);}
    ctx.strokeStyle=line;ctx.beginPath();ctx.moveTo(tableX,y+rowH);ctx.lineTo(endX,y+rowH);ctx.stroke();
    const amount=quantityValue(row.quantity)*numberValue(row.price);
    drawText(ctx,String(index+1),numberX+numberWidth/2,y+31,{font:"bold 18px Arial",color:accent,align:"center"});
    wrapCanvasText(ctx,row.name,itemX+8,y+31,itemWidth-15,19,{font:"bold 17px Arial",color:text});
    drawText(ctx,row.quantity,quantityX+8,y+31,{font:"16px Arial",color:text,maxWidth:quantityWidth-10});
    drawText(ctx,row.quantity.trim()!==""&&row.price!==""?money(amount):"—",endX-10,y+31,{font:"bold 16px Arial",color:text,align:"right",maxWidth:amountWidth-10});
  });
  if(!visibleRows.length)drawText(ctx,"Your shopping list",width/2,bodyY+31,{font:"17px Arial",color:text,align:"center"});
  const totalY=bodyY+tableRows*rowH;
  ctx.fillStyle=palette.background;ctx.fillRect(tableX+1,totalY,tableWidth-2,65);
  ctx.strokeStyle=line;ctx.beginPath();ctx.moveTo(tableX,totalY);ctx.lineTo(endX,totalY);ctx.stroke();
  drawText(ctx,"TOTAL",amountX-18,totalY+31,{font:"bold 24px Arial",color:text,align:"right"});
  drawText(ctx,money(totals.total),endX-10,totalY+31,{font:"bold 24px Arial",color:accent,align:"right",maxWidth:amountWidth-10});
  if(showBudget){
    const by=tableY+tableH+18;ctx.strokeStyle=accent;ctx.lineWidth=3;roundedRect(ctx,margin,by,tableWidth,82,template==="market"?28:14);ctx.stroke();
    drawText(ctx,"▣",margin+42,by+41,{font:"bold 37px Arial",color:accent,align:"center"});
    ctx.beginPath();ctx.moveTo(margin+90,by+12);ctx.lineTo(margin+90,by+70);ctx.stroke();
    drawText(ctx,"Total Budget:",margin+115,by+27,{font:"bold 19px Arial",color:text});
    drawText(ctx,"Remaining:",margin+115,by+56,{font:"bold 19px Arial",color:text});
    drawText(ctx,totals.hasBudget?money(totals.budget):"—",margin+320,by+27,{font:"bold 19px Arial",color:accent});
    drawText(ctx,totals.hasBudget?money(totals.remaining):"—",margin+320,by+56,{font:"bold 19px Arial",color:totals.remaining<0?"#ff8277":accent});
    drawText(ctx,footer,width/2,tableY+tableH+budgetH+18,{font:"bold 25px Georgia",color:accent,align:"center",maxWidth:tableWidth});
  }
  return canvas;
}
$("downloadBtn").addEventListener("click",async()=>{
  const button=$("downloadBtn");button.disabled=true;button.textContent="Preparing image...";
  try{
    const canvas=drawShoppingList();
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(result=>result?resolve(result):reject(new Error("PNG creation failed")),"image/png"));
    const url=URL.createObjectURL(blob);
    const filename=($("heading").value.trim()||"shopping-list").replace(/[<>:"/\\|?*\x00-\x1F]/g,"").replace(/\s+/g,"-").toLowerCase();
    const link=document.createElement("a");link.href=url;link.download=`${filename||"shopping-list"}.png`;
    document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
    $("status").textContent="Your shopping list PNG is ready.";
  }catch(error){console.error(error);$("status").textContent="Could not create the PNG. Please try again.";}
  finally{button.disabled=false;button.textContent="↓ Download PNG";}
});

// Save a working draft locally so an accidental refresh does not erase the current list.
let draftTimer;
function scheduleDraftSave(){
  clearTimeout(draftTimer);
  draftTimer=setTimeout(()=>{
    try{localStorage.setItem(DRAFT_KEY,JSON.stringify(readCurrentList()));}catch(e){console.warn("Draft could not be saved",e);}
  },250);
}
document.addEventListener("input",event=>{
  if(event.target.closest(".app"))scheduleDraftSave();
});
function initialise(){
  $("template").value="original";
  $("background").value=DEFAULTS.original.background;
  applyTemplate("original",false);
  refreshSavedLists();
  try{
    const draft=JSON.parse(localStorage.getItem(DRAFT_KEY)||"null");
    if(draft&&draft.rows&&Array.isArray(draft.rows)){
      applySavedList(draft);
      $("status").textContent="Your last draft was restored.";
    }else{
      CURRENCY="NGN";$("currency").value="NGN";updateCurrencyLabel();rows=[];renderRows();
    }
  }catch{
    CURRENCY="NGN";$("currency").value="NGN";updateCurrencyLabel();rows=[];renderRows();
  }
}
initialise();
