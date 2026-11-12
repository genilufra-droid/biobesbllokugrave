'use strict';
const assert=require('node:assert/strict'),{loadApp}=require('./dom');
const dom=loadApp(null,`;globalThis.api={state,db,blankRecord,render,attendanceData,outputs:[],capture(){download=(name,bytes,type)=>this.outputs.push({name,bytes,type})}};`),w=dom.window,api=w.api,doc=w.document;
(async()=>{
 api.capture();api.db.catalog.employees.push('Ana','Bora');
 const make=(date,name,start,end,demo=false)=>{const r=api.blankRecord('001');r.date=date;r.isDemo=demo;r.employees[0]={name,start,end,comment:'',signature:''};return r};
 api.db.records.push(make('2026-11-02','Ana','08:00','16:30'),make('2026-11-02','Ana','20:00','21:15'),make('2026-11-03','Ana','23:30','00:15'),make('2026-11-04','Ana','08:00',''),make('2026-11-02','Bora','08:00','16:00',true),make('2026-10-02','Ana','08:00','16:00'));
 let data=api.attendanceData(api.db.records,['Ana','Bora'],'2026-11');assert.equal(data.days,30);assert.equal(data.rows[0].total,630);assert.equal(data.rows[0].days[1].minutes,585);assert.equal(data.rows[0].days[3].incomplete,1);assert.equal(data.sundays[0],true);assert.equal(data.hasDemo,true);assert.equal(api.attendanceData([],['Ana'],'2024-02').days,29);assert.equal(api.attendanceData([],['Ana'],'2025-02').days,28);assert.equal(api.attendanceData([],['Ana'],'2026-01').days,31);
 api.state.attendance.month='2026-11';api.state.route='reports';api.render();assert.match(doc.querySelector('#view').textContent,/9:45/);assert.match(doc.querySelector('#view').textContent,/10:30/);assert.match(doc.querySelector('#view').textContent,/Përmban|contém|përmban/);
 const select=doc.querySelector('[data-attendance="employee"]');select.value='Ana';select.dispatchEvent(new w.Event('change',{bubbles:true}));data=api.attendanceData(api.db.records,['Ana','Bora'],'2026-11','Ana');assert.equal(data.rows.length,1);assert.equal(data.hasDemo,false);
 doc.querySelector('[data-action="attendance-xlsx"]').click();await new Promise(r=>setTimeout(r,50));let out=api.outputs.find(x=>x.name.endsWith('.xlsx'));assert.ok(out);const wb=w.XLSX.read(out.bytes,{type:'array',cellNF:true}),sheet=wb.Sheets['Listëprezenca'];assert.equal(sheet.C4.v,585/1440);assert.equal(sheet.C4.z,'[h]:mm');assert.equal(sheet.E4.v,'—*');assert.equal(sheet.AF4.v,630/1440);
 doc.querySelector('[data-action="attendance-pdf"]').click();for(let i=0;i<60&&!api.outputs.find(x=>x.name.endsWith('.pdf'));i++)await new Promise(r=>setTimeout(r,50));out=api.outputs.find(x=>x.name.endsWith('.pdf'));assert.ok(out,'PDF created');assert.equal((await w.PDFLib.PDFDocument.load(out.bytes)).getPageCount(),1);
 console.log('Attendance UI, calculations and exports passed');dom.window.close();
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1});
