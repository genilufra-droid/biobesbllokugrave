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
