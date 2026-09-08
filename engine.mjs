export const defaults={rate:.024,supervisoryRate:.05,nrbRate:.1,ratingShare:.97,qsiLimit:.1,budget:null,mode:'weighted',baseGrade:11};
export function budgetBreakdown(salary,settings={}) {
 const s={...defaults,...settings},nrbRate=s.nrbRate??(1-s.ratingShare);
 for(const [name,value] of [['rate',s.rate],['supervisoryRate',s.supervisoryRate],['nrbRate',nrbRate]])if(!Number.isFinite(value)||value<0||value>1)throw Error(`Invalid ${name}`);
 const totalBudget=salary*s.rate,supervisoryBudget=totalBudget*s.supervisoryRate,afterSupervisory=totalBudget-supervisoryBudget,nrbBudget=afterSupervisory*nrbRate;
 return {totalBudget,supervisoryBudget,nrbBudget,ratingBudget:afterSupervisory-nrbBudget};
}
export function calculate(employees,settings={}) {
 const s={...defaults,...settings}, errors=[];
 for(const [k,min,max] of [['rate',0,1],['ratingShare',0,1],['qsiLimit',0,1]]) if(!Number.isFinite(s[k])||s[k]<min||s[k]>max) throw Error(`Invalid ${k}`);
 const grades={};for(const e of employees){const a=grades[e.grade]??={sum:0,count:0};a.sum+=e.salary;a.count++;}
 const baseline=grades[s.baseGrade];if(s.mode==='weighted'&&!baseline)errors.push(`No grade ${s.baseGrade} employees: equal shares used. Choose a populated base grade to enable weighting.`);
 const totalSalary=employees.reduce((a,e)=>a+e.salary,0),{totalBudget,supervisoryBudget,ratingBudget,nrbBudget}=budgetBreakdown(totalSalary,s);
 const budget=s.budget===null?Math.floor(ratingBudget):s.budget;
 if(!Number.isSafeInteger(budget)||budget<0)throw Error('Cash budget must be a nonnegative whole dollar amount.');
 const rows=employees.map(e=>{
  if(!Number.isFinite(e.score)||e.score<0||e.score>5||!Number.isFinite(e.months)||e.months<0||e.months>12||!Number.isFinite(e.timeShare)||e.timeShare<0||e.timeShare>1||!Number.isFinite(e.nrb)||e.nrb<0)throw Error(`Invalid input on employee row ${e.sourceRow}`);
  const eligible=e.score>=3&&e.type!=='None'&&e.type!=='QSI',proration=e.months/12;
  const premium=s.mode==='weighted'&&baseline?(grades[e.grade].sum/grades[e.grade].count)/(baseline.sum/baseline.count):1;
  const time=e.type==='Time off'?1:e.type==='Combined'?e.timeShare:0;
  const shares=eligible?e.score*premium:0,cashWeight=shares*(1-time)*proration;
  const hours=eligible?Math.round(40*(e.score/5)*time*proration*100)/100:0;
  return {...e,premium,shares,cashWeight,hours,cash:0,timeValue:Math.round(hours*e.salary/2080*100)/100};
 });
 const directorateBudgets={};
 const groups=[...new Set(rows.map(e=>e.dir))].sort().map(dir=>{const members=rows.filter(e=>e.dir===dir),salary=members.reduce((n,e)=>n+e.salary,0),exact=totalSalary?budget*salary/totalSalary:0;return {dir,members,pool:Math.floor(exact),fraction:exact-Math.floor(exact)};});
 const remainder=budget-groups.reduce((n,g)=>n+g.pool,0),ordered=[...groups].sort((a,b)=>b.fraction-a.fraction);
 for(let i=0;i<remainder&&ordered.length;i++)ordered[i%ordered.length].pool++;
 for(const g of groups){directorateBudgets[g.dir]=g.pool;const weight=g.members.reduce((n,e)=>n+e.cashWeight,0);if(!weight)continue;
 let used=0;const order=[];g.members.forEach((e,i)=>{const exact=e.cashWeight/weight*g.pool;e.cash=Math.floor(exact);used+=e.cash;if(e.cashWeight>0)order.push({e,i,f:exact-e.cash});});order.sort((a,b)=>b.f-a.f||a.i-b.i);for(let i=0;i<g.pool-used;i++)order[i%order.length].e.cash++;
 }
 const cash=rows.reduce((a,e)=>a+e.cash,0),nrb=rows.reduce((a,e)=>a+e.nrb,0),qsi=rows.filter(e=>e.type==='QSI').length,qsiSlots=Math.floor(rows.length*s.qsiLimit);
 if(qsi>qsiSlots)errors.push(`${qsi} QSI selections exceed the ${qsiSlots} available slots.`);
 if(nrb>nrbBudget+.005)errors.push('NRB awards exceed the NRB budget.');if(budget>Math.floor(ratingBudget))errors.push('Selected cash budget exceeds the calculated rating-based budget.');
 return {rows,directorateBudgets,totalSalary,totalBudget,supervisoryBudget,ratingBudget,nrbBudget,budget,cash,nrb,qsi,qsiSlots,unallocated:budget-cash,errors};
}
export function cellValue(c){const v=c && typeof c==='object' && 'value' in c ? c.value : c;if(v&&typeof v==='object'){if('result'in v)return v.result??'';if(v.richText)return v.richText.map(x=>x.text).join('');if(v.text)return v.text;return '';}return v??'';}
export function parseWorkbook(wb,orgMap={}){
 const ws=wb.getWorksheet('RAW-Data')||wb.worksheets[0];if(!ws)throw Error('Workbook has no worksheets.');
 let header,cols={};for(let r=1;r<=Math.min(ws.rowCount,30);r++){const c={};ws.getRow(r).eachCell((v,n)=>c[String(cellValue(v)).trim().replace(/\s+/g,' ').toLowerCase()]=n);if(c['name pers']&&c['total salary']){header=r;cols=c;break;}}
 if(!header)throw Error('Expected a RAW-Data sheet with Name Pers and Total Salary headers.');
 const get=(r,k)=>cellValue(ws.getRow(r).getCell(cols[k.toLowerCase()]||1000));const employees=[];
 for(let r=header+1;r<=ws.rowCount;r++){const name=String(get(r,'Name Pers')).trim();if(!name || name==='Name Pers')continue;const salary=Number(get(r,'Total Salary'));if(!Number.isFinite(salary)||salary<=0)throw Error(`Invalid salary on row ${r}.`);const rawScore=Number(get(r,'Rating')||0);if(!Number.isFinite(rawScore)||rawScore<0||rawScore>5)throw Error(`Invalid rating on row ${r}.`);const org=String(get(r,'Org Component'));const qsi=/^(yes|y)$/i.test(String(get(r,'QSI (Y or Blank)')));const toa=Number(get(r,'TOA'))||0;
 employees.push({id:`row-${r}`,sourceRow:r,name,org,dir:orgMap[org]||String(cellValue(ws.getRow(r).getCell(1)))||'Unmapped',title:String(get(r,'Title')),plan:String(get(r,'PP')),series:String(get(r,'Series')).padStart(4,'0'),grade:Number(get(r,'GR')),salary:salary>1000?salary:salary*2087,rawScore,score:rawScore,type:qsi?'QSI':toa>0?'Time off':'Cash',timeShare:.5,months:12,nrb:Number(get(r,'NRB Awards Given'))||0,required:/^(y|yes)$/i.test(String(get(r,'Require Eval'))),completed:/^(y|yes)$/i.test(String(get(r,'Eval Completed'))),comments:String(get(r,'COMMENTS'))});}
 if(!employees.length)throw Error('No employee records found.');
 const settings={...defaults};
 const revised=Boolean(cols['supervisory budget']&&cols['awards budget']);
 const locations=revised?[['rate','P5'],['supervisoryRate','Q5'],['ratingShare','S2'],['nrbRate','T2'],['qsiLimit','Y3']]:[['rate','L3'],['ratingShare','Q2'],['qsiLimit','W3']];
 for(const [k,addr] of locations){const value=cellValue(ws.getCell(addr));if(value==='')continue;const n=Number(value);if(!Number.isFinite(n)||n<0||n>1)throw Error(`Invalid budget percentage in ${addr}.`);settings[k]=n;}
 if(revised&&cellValue(ws.getCell('T2'))==='')settings.nrbRate=1-settings.ratingShare;

 return {employees,settings};
}
