'use strict';
const assert=require('node:assert/strict');
const {loadApp}=require('./dom');
const dom=loadApp(null,`;globalThis.api={state,db,cloud,blankRecord,render,outputs:[],capture(){download=(name,bytes,type)=>this.outputs.push({name,bytes,type})}};`);
const w=dom.window,api=w.api,doc=w.document;
(async()=>{
 api.capture();api.db.catalog.employees.push('Bora Kola','Ana Test');
 const r=api.blankRecord('001');r.date='2026-11-10';r.employees[0]={name:'Ana Test',start:'08:00',end:'16:30',comment:'',signature:''};api.db.records.push(r);
 api.state.route='reports';api.render();
 assert.match(doc.querySelector('#timecard-choices').textContent,/Bora Kola/);assert.match(doc.querySelector('#timecard-choices').textContent,/Ana Test/);
 const search=doc.querySelector('#timecard-search');search.value='ana';search.dispatchEvent(new w.Event('input',{bubbles:true}));assert.doesNotMatch(doc.querySelector('#timecard-choices').textContent,/Bora/);
 doc.querySelector('#timecard-choices button').click();assert.match(doc.querySelector('#view').textContent,/8:30/);assert.match(doc.querySelector('#view').textContent,/16:30/);assert.equal(doc.querySelector('[data-action="timecard-xlsx"]').disabled,false);
 doc.querySelector('[data-action="timecard-xlsx"]').click();await new Promise(r=>setTimeout(r,30));let out=api.outputs.find(x=>x.name.endsWith('.xlsx'));assert.ok(out);const wb=w.XLSX.read(out.bytes,{type:'array'});assert.equal(wb.Sheets.Timecard.E5.v,510/1440);
 doc.querySelector('[data-action="timecard-pdf"]').click();for(let i=0;i<50&&!api.outputs.find(x=>x.name.endsWith('.pdf'));i++)await new Promise(r=>setTimeout(r,50));out=api.outputs.find(x=>x.name.endsWith('.pdf'));assert.ok(out,'PDF created');assert.ok((await w.PDFLib.PDFDocument.load(out.bytes)).getPageCount()>0);
 const from=doc.querySelector('[data-report="from"]');from.value='2026-11-11';from.dispatchEvent(new w.Event('change',{bubbles:true}));assert.match(doc.querySelector('#view').textContent,/Totali: 0:00/);
 doc.querySelector('#timecard-choices button').click();assert.match(doc.querySelector('#view').textContent,/Bora Kola/);
 console.log('Timecard UI and PDF/Excel checks passed');dom.window.close();
})().catch(err=>{console.error(err);dom.window.close();process.exitCode=1});
