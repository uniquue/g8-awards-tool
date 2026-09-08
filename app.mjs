import {calculate,parseWorkbook,budgetBreakdown} from './engine.mjs';

import {gradeSummary,gradeHeaders} from './grade-summary.mjs';

import orgMap from './org-map.mjs';

const $=id=>document.getElementById(id),money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let employees=[],settings={},result,filename='',selectedDirs=new Set(),selectedReports=new Set(['QSI']);

const filters={'QSI':r=>r.type==='QSI','TOA':r=>r.hours>0,'TOA & Cash':r=>r.hours>0&&r.cash>0,'Cash Award below 5k':r=>r.cash>0&&r.cash<5000,'Cash Award between 5k to 9999':r=>r.cash>=5000&&r.cash<10000,'Cash Award above 10k':r=>r.cash>=10000};

function summaryRows(source=result.rows){return [...new Set(source.map(e=>e.dir))].sort().map(dir=>{const a=source.filter(e=>e.dir===dir),salary=a.reduce((v,e)=>v+e.salary,0),cash=a.reduce((v,e)=>v+e.cash,0),nrb=a.reduce((v,e)=>v+e.nrb,0),b=budgetBreakdown(salary,settings);return [dir,a.length,a.filter(e=>e.required).length,a.filter(e=>e.required&&e.completed).length,b.ratingBudget,cash,b.nrbBudget,nrb,a.reduce((v,e)=>v+e.hours,0),a.filter(e=>e.type==='QSI').length,b.ratingBudget+b.nrbBudget-cash-nrb];});}

const summaryHeaders=['Directorate','Employees','Eval required','Eval completed','Rating budget','Cash awards','NRB budget','NRB used','TOA hours','QSI','Remaining cash'];

function table(headers,rows){return `<div class="tablewrap"><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${headers.length}">No matching employees.</td></tr>`}</tbody></table></div>`;}

function scopedRows(){return result.rows.filter(e=>selectedDirs.has(e.dir));}

function scopeLabel(){return selectedDirs.size?[...selectedDirs].sort().join(', '):'No directorates selected';}

function drawChoices(){

 $('directorates').innerHTML='<legend>Select one or more directorates</legend>'+[...new Set(employees.map(e=>e.dir))].sort().map(d=>`<label><input type="checkbox" value="${esc(d)}" ${selectedDirs.has(d)?'checked':''}>${esc(d)}</label>`).join('');

 $('report-choices').innerHTML='<legend>Select one or more reports</legend>'+Object.keys(filters).map(d=>`<label><input type="checkbox" value="${esc(d)}" ${selectedReports.has(d)?'checked':''}>${esc(d)}</label>`).join('');

}

function draw(){const selected=employees.filter(e=>selectedDirs.has(e.dir)),agencySalary=employees.reduce((n,e)=>n+e.salary,0),salary=selected.reduce((n,e)=>n+e.salary,0);const scopedBudget=settings.budget==null?null:Math.floor(settings.budget*(agencySalary?salary/agencySalary:0));result=calculate(selected,{...settings,budget:scopedBudget});$('message').textContent=result.errors.join('\n');drawViews();}

function drawViews(){

 const rows=scopedRows(),sum=k=>rows.reduce((n,e)=>n+e[k],0),salary=sum('salary'),cash=sum('cash'),pool=result.budget,nrbBudget=result.nrbBudget;

 $('budget-breakdown').innerHTML=table(['Budget component','Amount'],[['Total award budget',money(result.totalBudget)],['Supervisory reserve',money(result.supervisoryBudget)],['NRB budget',money(result.nrbBudget)],['Rating-based award budget',money(result.ratingBudget)]]);
 $('selected-salary').textContent=money(salary);$('agency-salary').textContent=money(employees.reduce((n,e)=>n+e.salary,0));

 $('scope').textContent=`Showing ${rows.length} of ${employees.length} employees · ${scopeLabel()}`;

 $('metrics').innerHTML=[['Employees',rows.length,`${rows.filter(e=>e.score===0).length} unrated`],['Cash allocated',money(cash),`${money(pool)} selected cash budget`],['Cash remaining',money(pool-cash),`${money(nrbBudget-sum('nrb'))} NRB remaining`],['QSI selections',`${rows.filter(e=>e.type==='QSI').length} / ${result.qsiSlots}`,'Selected employees / selected scope slots']].map(([a,b,c],i)=>`<article class="metric" id="metric-${i}"><div class="card-heading"><span>${a}</span><button data-print="metric-${i}" aria-label="Print ${a}">Print</button></div><b>${b}</b><small>${c}</small></article>`).join('');

 drawEmployees();

 const summaries=summaryRows(rows);if(summaries.length)summaries.push(['Selected total',...summaryHeaders.slice(1).map((_,i)=>summaries.reduce((n,r)=>n+r[i+1],0))]);

 $('budget-view').innerHTML='<div class="toolbar"><h2>Directorate reconciliation</h2><button data-print="budget-view">Print card</button></div>'+table(summaryHeaders,summaries.map(r=>r.map((v,i)=>[4,5,6,7,10].includes(i)?money(v):typeof v==='number'?Math.round(v*100)/100:v)));

 const grades=gradeSummary(result);$('budget-view').innerHTML+='<article id="grade-summary" class="report-card"><div class="toolbar"><h2>GS grade summary</h2><button data-print="grade-summary">Print grade summary</button></div><p class="small">'+esc(scopeLabel())+' · Cash award budgets are apportioned by salary and reconcile to the selected cash pool. Used amounts reflect current cash awards; negative remaining amounts indicate awards above that grade’s salary-based share. NRB and time off are excluded.</p>'+table(gradeHeaders,grades.map(r=>r.map((v,i)=>i>=2?money(v):v)))+'</article>';drawReport();

}

function drawEmployees(){const term=$('search').value.toLowerCase(),rows=scopedRows().filter(e=>(e.name+' '+e.dir).toLowerCase().includes(term));$('count').textContent=`${rows.length} of ${employees.length}`;$('employees').innerHTML=rows.map(e=>`<tr data-id="${e.id}"><td><strong>${esc(e.name)}</strong><small title="${esc(e.title)}">${esc(e.title)}</small></td><td>${esc(e.dir)}<small>${esc(e.plan)}-${e.grade} · ${esc(e.series)}</small></td><td>${e.rawScore} → <input aria-label="Score for ${esc(e.name)}" data-field="score" type="number" min="0" max="5" step=".1" value="${e.score}"></td><td><select aria-label="Award for ${esc(e.name)}" data-field="type">${['Cash','Time off','Combined','QSI','None'].map(t=>`<option ${t===e.type?'selected':''}>${t}</option>`).join('')}</select></td><td><input aria-label="Time off percent for ${esc(e.name)}" data-field="timeShare" type="number" min="0" max="100" value="${e.timeShare*100}" ${e.type==='Combined'?'':'disabled'}></td><td><input aria-label="Months for ${esc(e.name)}" data-field="months" type="number" min="0" max="12" step=".1" value="${e.months}"></td><td><strong>${money(e.cash)}</strong></td><td>${e.hours}</td><td><input class="money" aria-label="NRB for ${esc(e.name)}" data-field="nrb" type="number" min="0" step=".01" value="${e.nrb}"></td></tr>`).join('');}

function drawReport(){

 $('report-table').innerHTML=Object.entries(filters).filter(([name])=>selectedReports.has(name)).map(([name,filter],i)=>{const rows=scopedRows().filter(filter),sum=k=>rows.reduce((n,e)=>n+e[k],0);return `<article class="report-card" id="report-${i}"><div class="toolbar"><h2>${esc(name)}</h2><button data-print="report-${i}" aria-label="Print ${esc(name)}">Print card</button></div><p class="small">${esc(scopeLabel())} · ${rows.length} employees · Cash ${money(sum('cash'))} · TOA ${Math.round(sum('hours')*100)/100} hours · NRB ${money(sum('nrb'))}</p>${table(['Directorate','Employee','Grade','Score','Award','Cash','TOA hours','NRB'],rows.map(e=>[e.dir,e.name,e.grade,e.score,e.type,money(e.cash),e.hours,money(e.nrb)]))}</article>`;}).join('')||'<p class="empty">Select a report to display its card.</p>';

}

function printCard(id){

 const source=$(id);if(!source||!result)return;

 const clone=source.cloneNode(true);clone.removeAttribute('hidden');clone.removeAttribute('id');

 clone.querySelectorAll('button,input[type="search"]').forEach(e=>e.remove());

 clone.querySelectorAll('input,select').forEach(e=>{const span=document.createElement('span');span.textContent=e.value;e.replaceWith(span);});

 $('print-area').innerHTML=`<h1>G-8 Awards Workspace</h1><p>${esc(scopeLabel())} · ${esc(filename)}</p>`;

 $('print-area').appendChild(clone);document.body.classList.add('printing');

 try{window.print();}catch(e){finishPrint();$('message').textContent='Printing could not open: '+e.message;}

}

function finishPrint(){document.body.classList.remove('printing');$('print-area').replaceChildren();}

window.addEventListener('afterprint',finishPrint);

document.addEventListener('click',e=>{const button=e.target.closest('[data-print]');if(button)printCard(button.dataset.print);});

$('directorates').addEventListener('change',e=>{if(e.target.type!=='checkbox')return;e.target.checked?selectedDirs.add(e.target.value):selectedDirs.delete(e.target.value);draw();});

$('dirs-all').addEventListener('click',()=>{selectedDirs=new Set(employees.map(e=>e.dir));drawChoices();draw();});

$('dirs-none').addEventListener('click',()=>{selectedDirs.clear();drawChoices();draw();});

$('report-choices').addEventListener('change',e=>{if(e.target.type!=='checkbox')return;e.target.checked?selectedReports.add(e.target.value):selectedReports.delete(e.target.value);drawReport();});

$('reports-all').addEventListener('click',()=>{selectedReports=new Set(Object.keys(filters));drawChoices();drawReport();});

$('reports-none').addEventListener('click',()=>{selectedReports.clear();drawChoices();drawReport();});

$('file').addEventListener('change',async ev=>{const file=ev.target.files[0];if(!file)return;$('message').textContent='Reading workbook…';try{if(file.size>25*1024*1024)throw Error('Please use a workbook smaller than 25 MB.');const wb=new ExcelJS.Workbook();await wb.xlsx.load(await file.arrayBuffer());const parsed=parseWorkbook(wb,orgMap);employees=parsed.employees;settings={...parsed.settings,nrbRate:parsed.settings.nrbRate};filename=file.name;selectedDirs=new Set(employees.map(e=>e.dir));selectedReports=new Set(['QSI']);drawChoices();for(const k of ['rate','supervisoryRate','nrbRate','qsiLimit'])$(k).value=settings[k]*100;$('mode').value=settings.mode;$('baseGrade').value=settings.baseGrade;$('budget').value='';$('filename').textContent=filename;$('upload').hidden=true;$('workspace').hidden=false;$('export').hidden=false;$('clear').hidden=false;draw();}catch(e){$('message').textContent=e.message;}finally{ev.target.value='';}});

$('employees').addEventListener('change',ev=>{const el=ev.target,k=el.dataset.field;if(!k)return;if(!el.checkValidity()||el.value===''){el.reportValidity();drawEmployees();return;}const row=employees.find(e=>e.id===el.closest('tr').dataset.id);row[k]=k==='type'?el.value:Number(el.value)/(k==='timeShare'?100:1);draw();});

for(const k of ['rate','supervisoryRate','nrbRate','qsiLimit','budget','mode','baseGrade'])$(k).addEventListener('change',()=>{const el=$(k);if(!el.checkValidity()){el.reportValidity();return;}const old=settings[k];settings[k]=k==='mode'?el.value:k==='budget'&&el.value===''?null:Number(el.value)/(['rate','supervisoryRate','nrbRate','qsiLimit'].includes(k)?100:1);try{draw();}catch(e){settings[k]=old;$('message').textContent=e.message;}});

$('search').addEventListener('input',drawEmployees);$('clear').addEventListener('click',()=>{employees=[];result=null;filename='';selectedDirs.clear();selectedReports=new Set(['QSI']);finishPrint();$('workspace').hidden=true;$('upload').hidden=false;$('export').hidden=true;$('clear').hidden=true;$('message').textContent='';$('search').value='';});

document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===b));for(const id of ['review','budget-view','reports','rules'])$(id).hidden=id!==(b.dataset.view==='budget'?'budget-view':b.dataset.view);}));

$('export').addEventListener('click',async()=>{const button=$('export');button.disabled=true;try{const result=calculate(employees,settings);const wb=new ExcelJS.Workbook();wb.creator='G-8 Awards Workspace';wb.created=new Date();const add=(name,headers,rows)=>{const ws=wb.addWorksheet(name);ws.addRow(headers);rows.forEach(r=>ws.addRow(r));ws.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};ws.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF214C3E'}};ws.views=[{state:'frozen',ySplit:1}];ws.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,rows.length+1),column:headers.length}};ws.columns.forEach((c,i)=>{c.width=i===1?30:22;});return ws;};

const headers=['Directorate','Name','Title','Pay Plan','Series','Grade','Salary','Raw score','Adjusted score','Shares','Award type','TOA percent','Months','Cash award','TOA hours','TOA value','Total value','NRB','Eval required','Eval completed','Comments'];const record=e=>[e.dir,e.name,e.title,e.plan,e.series,e.grade,e.salary,e.rawScore,e.score,e.shares,e.type,e.type==='Time off'?1:e.type==='Combined'?e.timeShare:0,e.months,e.cash,e.hours,e.timeValue,e.cash+e.timeValue,e.nrb,e.required?'Yes':'No',e.completed?'Yes':'No',e.comments];

add('Dashboard',['Metric','Value'],[['Source',filename],['Employees',employees.length],['Total award budget',result.totalBudget],['Supervisory reserve',result.supervisoryBudget],['Rating budget',result.ratingBudget],['Selected cash pool',result.budget],['Cash allocated',result.cash],['Unallocated',result.unallocated],['NRB budget',result.nrbBudget],['NRB allocated',result.nrb],['QSI selected',result.qsi],['QSI slots',result.qsiSlots],...result.errors.map(e=>['Review flag',e])]);add('Work Tab',headers,result.rows.map(record));add('Budget Summary',summaryHeaders,summaryRows(result.rows));add('GS Grade Summary',gradeHeaders,gradeSummary(result));for(const [name,filter]of Object.entries(filters))add(name,headers,result.rows.filter(filter).map(record));add('Inputs',['Source row','Directorate','Name','Original score','Adjusted score','Award','TOA fraction','Months','NRB'],employees.map(e=>[e.sourceRow,e.dir,e.name,e.rawScore,e.score,e.type,e.timeShare,e.months,e.nrb]));add('Calculation Notes',['Setting','Value'],Object.entries(settings).map(([k,v])=>[k,v??'Automatic']).concat([['Proration','Months / 12'],['Rounding','Whole-dollar largest remainder; stable uploaded row order breaks ties'],['Time off','40 * score / 5 * time fraction * proration; two decimals'],['Reports','TOA and cash reports overlap with combined awards'],['Review','Draft calculations; selections require human review']]));const blob=new Blob([await wb.xlsx.writeBuffer()],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='G8-Awards-Review.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}catch(e){$('message').textContent='Export failed: '+e.message;}finally{button.disabled=false;}});

