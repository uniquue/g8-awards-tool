export const gradeHeaders=['Grade','Employees','Total salary','Cash award budget available','Cash awards used','Cash awards remaining'];
export function gradeSummary(result){
 const groups=Array.from({length:10},(_,i)=>({name:`GS-${i+6}`,rows:[]}));
 const other={name:'Other pay plans / grades',rows:[]};
 for(const e of result.rows){const grade=Number(e.grade);const group=String(e.plan).trim().toUpperCase()==='GS'&&Number.isInteger(grade)&&grade>=6&&grade<=15?groups[grade-6]:other;group.rows.push(e);}
 if(other.rows.length)groups.push(other);
 const totals=groups.map(g=>{const salary=g.rows.reduce((n,e)=>n+e.salary,0),used=g.rows.reduce((n,e)=>n+e.cash,0),exact=result.totalSalary?result.budget*salary/result.totalSalary:0;return {name:g.name,count:g.rows.length,salary,used,available:Math.floor(exact),fraction:exact-Math.floor(exact)};});
 const order=totals.filter(g=>g.salary>0).sort((a,b)=>b.fraction-a.fraction);
 const remainder=result.budget-totals.reduce((n,g)=>n+g.available,0);
 for(let i=0;i<remainder&&order.length;i++)order[i%order.length].available++;
 const rows=totals.map(g=>[g.name,g.count,g.salary,g.available,g.used,g.available-g.used]);
 rows.push(['Total',...Array.from({length:5},(_,i)=>rows.reduce((n,r)=>n+r[i+1],0))]);
 return rows;
}
