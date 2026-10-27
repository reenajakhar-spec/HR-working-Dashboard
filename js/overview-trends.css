/* Executive Overview: source-backed metrics and historical workforce trends. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const cards=$('overviewKpis'),overlay=$('execTrendOverlay');
 const keys=['headcount','attendance','attrition','positions','enps'];
 const names=['Total Headcount','Attendance Rate','Attrition (Rolling 12M)','Open Positions','eNPS Score'];
 const state={key:'headcount',period:'month',segment:'all',chart:null};
 const norm=v=>String(v==null?'':v).trim().toLowerCase().replace(/[\s_-]+/g,'');
 const get=(r,...keys)=>{for(const k of keys){if(r[k]!=null&&String(r[k]).trim())return r[k]}return ''};
 const employees=()=>typeof EMPLOYEE_CRM_DATA!=='undefined'&&EMPLOYEE_CRM_DATA&&Array.isArray(EMPLOYEE_CRM_DATA.employees)?EMPLOYEE_CRM_DATA.employees:null;
 const payload=()=>typeof EMPLOYEE_CRM_DATA!=='undefined'?EMPLOYEE_CRM_DATA:null;
 const classify=r=>{
   const collar=norm(get(r,'employeeCategory','Employee Category','collarType','workerType','employeeType'));
   if(collar==='bluecollar'||collar==='blue')return 'blue';
   if(collar!=='whitecollar'&&collar!=='white')return 'unknown';
   const sub=norm(get(r,'subDepartment','Sub-Department','sub_department'));
   if(sub==='sales')return 'sales';if(sub==='nonsales')return 'nonsales';return 'unknown';
 };
 const active=r=>{const raw=get(r,'active','Active','status','employmentStatus');return raw===true||['yes','active','true','1'].includes(norm(raw))||raw===''};
 const date=v=>{
   if(v instanceof Date&&!isNaN(v))return new Date(v.getFullYear(),v.getMonth(),v.getDate());
   const s=String(v||'').trim();let m=s.match(/^(\d{4})-(\d\d)-(\d\d)/);if(m)return valid(+m[1],+m[2],+m[3]);
   m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);if(m)return valid(+m[3],+m[2],+m[1]);return null;
 };
 function valid(y,m,d){const v=new Date(y,m-1,d);return v.getFullYear()===y&&v.getMonth()===m-1&&v.getDate()===d?v:null}
 const keyDate=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
 const format=d=>d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
 const getRows=()=>{const rows=employees();if(!rows)return null;const seen=new Set();return rows.filter((r,i)=>{const id=norm(get(r,'employeeId','employeeCode','Employee ID','emp_code'));const k=id||'row'+i;if(seen.has(k))return false;seen.add(k);return true})};
 function counts(){const rows=getRows();if(!rows)return null;const out={all:0,sales:0,nonsales:0,blue:0,unknown:0};for(const r of rows){if(!active(r))continue;out.all++;out[classify(r)]++}return out}
 function cardValue(idx,value,sub){const card=cards.querySelectorAll('.kpi-card')[idx];if(!card)return;const v=card.querySelector('.value'),s=card.querySelector('.sub');if(v)v.textContent=value;if(s)s.textContent=sub}
 function refresh(){
  const c=counts();if(c)cardValue(0,c.all.toLocaleString('en-IN'),`Sales ${c.sales} · Non-Sales ${c.nonsales} · Blue ${c.blue}${c.unknown?' · Unclassified '+c.unknown:''}`);
  else cardValue(0,'—','Employee CRM API not loaded');
  // Other metrics must be populated only by their own real dated source.
  const history=window.EXEC_OVERVIEW_HISTORY||window.HR_OVERVIEW_HISTORY||{};
  const mappings=[['attendance',1,'%'],['attrition',2,'%'],['positions',3,''],['enps',4,'']];
  for(const [key,idx,unit] of mappings){const arr=Array.isArray(history[key])?history[key]:[];const latest=arr.filter(r=>Number.isFinite(Number(r.value))).slice(-1)[0];if(latest)cardValue(idx,String(latest.value)+unit,'Latest connected historical record')}
 }
 window.refreshExecOverview=refresh;
 function endpoints(){const now=new Date();now.setHours(0,0,0,0);const start=new Date(2026,3,1);const out=[];
  if(state.period==='month'){
   let d=new Date(start.getFullYear(),start.getMonth()+1,0);
   while(d<=now){out.push(new Date(d));d=new Date(d.getFullYear(),d.getMonth()+2,0)}
   if(!out.length||keyDate(out[out.length-1])!==keyDate(now))out.push(now);
  }else{
   let d=new Date(start);d.setDate(d.getDate()+(7-d.getDay())%7);
   while(d<=now){out.push(new Date(d));d.setDate(d.getDate()+7)}
   if(!out.length||keyDate(out[out.length-1])!==keyDate(now))out.push(now);
  }return out;
 }
 function workforceHistory(){
  const rows=getRows();if(!rows)return {data:[],warning:'Employee master has not loaded.'};
  const exits=(payload()&&Array.isArray(payload().exits))?payload().exits:[];
  const exitMap=new Map();for(const x of exits){const id=norm(get(x,'employeeId','employeeCode','Employee ID'));const d=date(get(x,'lastWorkingDay','Last Working Day'));if(id&&d)exitMap.set(id,d)}
  // For historical points, require joining dates and exit dates for inactive employees.
  const relevant=rows.filter(r=>state.segment==='all'||classify(r)===state.segment);
  const missingJoin=relevant.filter(r=>!date(get(r,'doj','dateOfJoining','Date of Joining'))).length;
  const missingExit=relevant.filter(r=>!active(r)&&!exitMap.has(norm(get(r,'employeeId','employeeCode','Employee ID')))).length;
  const unknown=state.segment==='all'?relevant.filter(r=>classify(r)==='unknown').length:0;
  if(missingJoin||missingExit)return {data:[],warning:`Historical headcount cannot be verified: ${missingJoin} missing joining dates, ${missingExit} inactive employees without matched exit dates. No estimated values are displayed.`};
  const points=endpoints().map(d=>({date:d,value:relevant.filter(r=>{
   const joined=date(get(r,'doj','dateOfJoining','Date of Joining'));
   const exit=exitMap.get(norm(get(r,'employeeId','employeeCode','Employee ID')));
   return joined&&joined<=d&&(!exit||exit>d)&& (active(r)||!!exit);
  }).length}));
  return {data:points,warning:`Calculated from employee master joining dates and matched exit dates. ${unknown?'Unclassified employees included in All: '+unknown+'. ':''}Employees absent from both sources cannot be reconstructed; verify against historical Keka snapshots.`};
 }
 function sourcedHistory(){
  const source=window.EXEC_OVERVIEW_HISTORY||window.HR_OVERVIEW_HISTORY||{};
  const rows=source[state.key];if(!Array.isArray(rows))return {data:[],warning:'No live dated history is connected for this KPI. Connect the corresponding HR source; sample data is not used.'};
  const data=rows.filter(r=>{const seg=norm(r.segment||r.group||'all');return seg===state.segment}).map(r=>({date:date(r.date||r.snapshotDate||r.surveyDate),value:Number(r.value)})).filter(r=>r.date&&Number.isFinite(r.value)).sort((a,b)=>a.date-b.date);
  const byPeriod=new Map();for(const r of data){const d=r.date;let k;if(state.period==='month')k=d.getFullYear()+'-'+d.getMonth();else{const sunday=new Date(d);sunday.setDate(sunday.getDate()+(7-sunday.getDay())%7);k=keyDate(sunday)}byPeriod.set(k,r)}
  return {data:[...byPeriod.values()],warning:data.length?'Source-backed dated records only. Each period displays its latest available record.':'No records available for the selected category.'};
 }
 function render(){
  const index=keys.indexOf(state.key);$('execTrendTitle').textContent=names[index]+' — '+(state.period==='month'?'Month-on-Month':'Week-on-Week');
  $('execTrendNote').textContent='All / Sales / Non-Sales / Blue Collar · From 01 Apr 2026';
  document.querySelectorAll('#execPeriod button').forEach(b=>b.classList.toggle('active',b.dataset.period===state.period));
  document.querySelectorAll('#execSegment button').forEach(b=>b.classList.toggle('active',b.dataset.segment===state.segment));
  const result=state.key==='headcount'?workforceHistory():sourcedHistory();const data=result.data;
  $('execWarning').textContent=result.warning;
  const vals=data.map(r=>r.value),last=vals.at(-1),prev=vals.at(-2);
  const unit=['attendance','attrition'].includes(state.key)?'%':'';
  const fmt=v=>v==null?'—':Number(v.toFixed(2)).toLocaleString('en-IN')+unit;
  $('execLatest').textContent=fmt(last);$('execDelta').textContent=prev==null?'—':(last-prev>0?'+':'')+fmt(last-prev);
  $('execHighest').textContent=vals.length?fmt(Math.max(...vals)):'—';$('execLowest').textContent=vals.length?fmt(Math.min(...vals)):'—';
  const body=$('execTrendRows');body.replaceChildren();if(!data.length){const tr=body.insertRow();const td=tr.insertCell();td.colSpan=3;td.textContent='Historical data unavailable';}
  data.forEach((r,i)=>{const tr=body.insertRow();[format(r.date),fmt(r.value),i?fmt(r.value-data[i-1].value):'—'].forEach(t=>tr.insertCell().textContent=t)});
  if(state.chart){state.chart.destroy();state.chart=null}
  if(data.length&&typeof Chart==='function'){state.chart=new Chart($('execTrendChart'),{type:'line',data:{labels:data.map(r=>format(r.date)),datasets:[{data:vals,borderColor:'#147b8d',backgroundColor:'rgba(20,123,141,.12)',fill:true,tension:.25,pointRadius:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:false}}}})}
  $('execTrendChart').style.display=data.length?'block':'none';
 }
 function open(i){state.key=keys[i];state.period='month';state.segment='all';overlay.classList.add('open');render()}
 cards.addEventListener('click',e=>{if(e.target.closest('.hrbd-trigger'))return;const card=e.target.closest('.kpi-card');if(!card||!cards.contains(card))return;const i=[...cards.querySelectorAll('.kpi-card')].indexOf(card);if(i>=0&&i<5)open(i)});
 cards.addEventListener('keydown',e=>{if(!['Enter',' '].includes(e.key))return;const card=e.target.closest('.kpi-card');if(!card)return;e.preventDefault();const i=[...cards.querySelectorAll('.kpi-card')].indexOf(card);if(i>=0&&i<5)open(i)});
 const observer=new MutationObserver(()=>{cards.querySelectorAll('.kpi-card').forEach(c=>{c.tabIndex=0;c.setAttribute('role','button')})});observer.observe(cards,{childList:true});
 $('execPeriod').addEventListener('click',e=>{const b=e.target.closest('[data-period]');if(b){state.period=b.dataset.period;render()}});
 $('execSegment').addEventListener('click',e=>{const b=e.target.closest('[data-segment]');if(b){state.segment=b.dataset.segment;render()}});
 function close(){overlay.classList.remove('open');if(state.chart){state.chart.destroy();state.chart=null}}
 $('execTrendClose').addEventListener('click',close);overlay.addEventListener('click',e=>{if(e.target===overlay)close()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay.classList.contains('open'))close()});
 refresh();
 if(typeof loadEmployeeCrmLive==='function'&&!getRows())loadEmployeeCrmLive(false);
})();
