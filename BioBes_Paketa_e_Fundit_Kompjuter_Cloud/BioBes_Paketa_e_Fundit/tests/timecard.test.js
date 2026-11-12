'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'../BioBes_Cloud/web/app.js'),'utf8');
function extract(name){const start=app.indexOf(`function ${name}(`),end=app.indexOf('\nfunction ',start+1);assert.ok(start>=0);return app.slice(start,end);}
const ctx={str:v=>String(v??'')};vm.createContext(ctx);
vm.runInContext(`${['hoursFor','timecardData','durationText'].map(extract).join('\n')}\nglobalThis.test={timecardData,durationText};`,ctx);
const records=[{date:'2026-11-02',nr:'002',isDemo:false,employees:[{name:' Ana ',start:'23:30',end:'00:15',comment:''},{name:'Ana',start:'08:00',end:'',comment:''}]},{date:'2026-11-01',nr:'001',isDemo:true,employees:[{name:'ana',start:'08:00',end:'09:20',comment:''},{name:'Other',start:'08:00',end:'18:00',comment:''}]}];
const result=ctx.test.timecardData(records,'ANA');
assert.equal(result.rows.length,3);assert.equal(result.rows[0].date,'2026-11-01');assert.equal(result.minutes,125);assert.equal(result.incomplete,1);assert.equal(ctx.test.durationText(result.minutes),'2:05');assert.equal(ctx.test.timecardData(records,'').rows.length,0);
console.log('Timecard checks passed');
(async()=>{
 const XLSX=require('../BioBes_Cloud/web/vendor/xlsx.full.min.js');let output;
 const exportContext={XLSX,state:{report:{employee:'ANA',from:'',to:''}},reportRecords:()=>records,timecardData:ctx.test.timecardData,download:(name,bytes)=>{output={name,bytes}},toast:()=>{},console};
 vm.createContext(exportContext);vm.runInContext(extract('exportTimecardXlsx'),exportContext);await vm.runInContext('exportTimecardXlsx()',exportContext);
 assert.equal(output.name,'BioBes_timecard.xlsx');const sheet=XLSX.read(output.bytes,{type:'array'}).Sheets.Timecard;
 assert.equal(sheet.E5.v,80/1440);assert.equal(sheet.E6.v,45/1440);assert.equal(sheet.E7.v,'E paplotë');assert.equal(sheet.E8.v,125/1440);assert.equal(sheet.E8.z,undefined); // formats are read only with cellNF
 const formatted=XLSX.read(output.bytes,{type:'array',cellNF:true}).Sheets.Timecard;assert.equal(formatted.E8.z,'[h]:mm');
 console.log('Timecard Excel checks passed');
})().catch(e=>{console.error(e);process.exitCode=1});
