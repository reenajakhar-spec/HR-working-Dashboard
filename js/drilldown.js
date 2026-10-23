/* Euronics HR Command Centre - non-destructive KPI drill-down */
(function () {
  'use strict';
  const CARD_SELECTOR = '.kpi-card,.employee-kpi-card,.attendance-kpi-card,.teamob-kpi,.payroll-kpi,.lnd-kpi-card,.performance-kpi-card,.engagement-kpi-card,.compliance-kpi-card';
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clean = value => String(value == null ? '' : value).trim();
  const num = value => { const n = Number(String(value == null ? '' : value).replace(/[,₹%]/g,'')); return Number.isFinite(n) ? n : null; };
  let current = null;
  const popup = document.createElement('div');
  popup.id = 'hrBreakdownOverlay';
  popup.innerHTML = '<section class="hrbd-panel" role="dialog" aria-modal="true" aria-labelledby="hrbdTitle"><header class="hrbd-head"><div><small>EURONICS · LIVE KPI DRILL-DOWN</small><h2 id="hrbdTitle"></h2><p id="hrbdDescription"></p></div><button type="button" id="hrbdClose" aria-label="Close popup">×</button></header><div id="hrbdBreadcrumb" class="hrbd-breadcrumb"></div><div id="hrbdContent" class="hrbd-content"></div><footer id="hrbdFoot" class="hrbd-foot"></footer></section>';
  document.body.appendChild(popup);
  const get = id => document.querySelector('#' + id);
  function close(){popup.classList.remove('open');current=null;}
  get('hrbdClose').addEventListener('click',close);
  popup.addEventListener('click',e=>{if(e.target===popup)close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&popup.classList.contains('open'))close();});
  const field = (row,keys) => {for(const key of keys){if(row[key]!==undefined && clean(row[key]))return clean(row[key]);}return '';};
  const groupField = (r,key) => key==='department' ? field(r,['department','Department','dept','Dept']) : key==='location' ? field(r,['branch','Branch','location','Location','Branch Name','office','city']) : field(r,['manager','Manager','reportingManager','Reporting Manager','reporting_manager','L1']);
  const sources = {
    employees: () => typeof EMPLOYEE_CRM_DATA!=='undefined' && EMPLOYEE_CRM_DATA && Array.isArray(EMPLOYEE_CRM_DATA.employees) ? EMPLOYEE_CRM_DATA.employees : null,
    teamob: () => typeof TEAM_OB_DATA!=='undefined' && TEAM_OB_DATA && Array.isArray(TEAM_OB_DATA.employees) ? TEAM_OB_DATA.employees : null,
    learning: () => typeof lndRows!=='undefined' && Array.isArray(lndRows) && lndRows.length ? lndRows : null,
    payroll: () => typeof PAYROLL_DATA!=='undefined' && PAYROLL_DATA && (PAYROLL_DATA.employees || PAYROLL_DATA.rows || PAYROLL_DATA.records) || null,
    attendance: () => typeof attendancePayload!=='undefined' && attendancePayload && (attendancePayload.employees || attendancePayload.records || attendancePayload.rows) || null,
    sample: () => typeof HR_DATA!=='undefined' && HR_DATA && Array.isArray(HR_DATA.employees) ? HR_DATA.employees : null
  };
  function metricFor(card){
    const label = clean(card.querySelector('[class*="label"],.title')?.textContent || card.querySelector('.label')?.textContent || card.textContent.split('\n')[0]);
    const page = card.closest('.page')?.id || '';
    const id = card.querySelector('[id*="Kpi"], [id*="kpi"]')?.id || '';
    return {label,page,id};
  }
  function rowsFor(m){
    if(m.page==='employees')return {rows:sources.employees(),source:'Employee CRM live API'};
    if(m.page==='teamob')return {rows:sources.teamob(),source:'Team OB live API'};
    if(m.page==='learning')return {rows:sources.learning(),source:'L&D live API'};
    if(m.page==='payroll')return {rows:sources.payroll(),source:'Payroll live API'};
    if(m.page==='attendance')return {rows:sources.attendance(),source:'Attendance live API'};
    if(m.page==='overview'||m.page==='performance')return {rows:sources.employees(),source:'Employee CRM live API'};
    return {rows:null,source:'This module'};
  }
  function kind(m){
    const l=m.label.toLowerCase();
    if(m.page==='employees'){
      if(l.includes('active'))return 'active';
      if(l.includes('joiner'))return 'joiner';
      if(l.includes('under 3')||l.includes('probation'))return 'probation';
      if(l.includes('tenure'))return 'tenure';
      if(l.includes('net change'))return 'netchange';
      return 'count';
    }
    if(m.page==='teamob'){
      if(l.includes('active hour'))return 'avgActiveHours';
      if(l.includes('work hour'))return 'avgWorkHours';
      if(l.includes('productivity'))return 'productivityPct';
      if(l.includes('idle'))return 'avgIdleHours';
      if(l.includes('email'))return 'emailResponsePct';
      if(l.includes('missed'))return 'missedCalls';
      if(l.includes('talk'))return 'talkTime';
      return 'count';
    }
    if(m.page==='performance'){
      if(l.includes('kra'))return 'kra';
      if(l.includes('green'))return 'green';
      if(l.includes('yellow'))return 'yellow';
      if(l.includes('red')||l.includes('pip'))return 'pip';
    }
    if(m.page==='overview'){
      if(l.includes('headcount'))return 'count';
      if(l.includes('attendance'))return 'attendance';
      if(l.includes('pip'))return 'pip';
    }
    return 'unsupported';
  }
  // Match the selected KPI population BEFORE grouping, so a manager with
  // zero new joiners does not appear in the New Joiners MTD drill-down.
  // Only the actual Date of Joining qualifies. Reject missing/ambiguous dates.
  function joiningDate(row){
    const raw=field(row,['doj','DOJ','dateOfJoining','Date of Joining','date_of_joining','joiningDate','Joining Date','joining_date','joining','Joining']);
    if(!raw)return null;
    let y,mo,day;
    let match=raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T|\s|$)/);
    if(match){y=+match[1];mo=+match[2];day=+match[3];}
    else {
      match=raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
      if(!match)return null;
      day=+match[1];mo=+match[2];y=+match[3]; // DD/MM/YYYY (India)
    }
    const d=new Date(y,mo-1,day);
    return d.getFullYear()===y&&d.getMonth()===mo-1&&d.getDate()===day?d:null;
  }
  function qualifyingRows(rows,k){
    if(k!=='joiner'&&k!=='probation')return rows;
    const now=new Date();
    const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
    const probationStart=new Date(now.getFullYear(),now.getMonth()-3,now.getDate());
    const seen=new Set();
    return rows.filter(r=>{
      const d=joiningDate(r);
      if(!d||d>now)return false;
      if(k==='joiner' && (d<monthStart||d.getMonth()!==now.getMonth()||d.getFullYear()!==now.getFullYear()))return false;
      if(k==='probation'&&d<probationStart)return false;
      const id=field(r,['employeeId','Employee ID','emp_code','empCode','employee_code','employeeCode','employee_id']);
      const key=id?('id:'+id.toLowerCase()):('person:'+field(r,['name','employeeName','Employee Name','emp_name']).toLowerCase()+'|'+d.toISOString().slice(0,10));
      if(seen.has(key))return false;
      seen.add(key);
      return true;
    });
  }
  function compute(rows,k,m){
    if(!rows.length)return null;
    if(k==='count')return {value:rows.length,unit:'employees'};
    if(k==='joiner'||k==='probation')return {value:rows.length,unit:'employees'};
    if(k==='active')return {value:rows.filter(r=>r.active===true||String(r.active).toLowerCase()==='true'||String(r.status).toLowerCase()==='active').length,unit:'employees'};
    if(k==='joiner'||k==='probation'||k==='tenure'||k==='netchange'){
      const dated=rows.map(r=>({row:r,date:joiningDate(r)})).filter(x=>x.date);
      if(!dated.length)return null;
      const now=new Date();
      if(k==='netchange')return null; // Exits must be provided to calculate net change.
      if(k==='tenure')return {value:dated.reduce((s,x)=>s+(now-x.date)/31557600000,0)/dated.length,unit:'years',decimal:2};
      const count=dated.filter(x=>k==='joiner'?(x.date.getMonth()===now.getMonth()&&x.date.getFullYear()===now.getFullYear()):((now-x.date)>=0&&(now-x.date)<92*86400000)).length;
      return {value:count,unit:'employees'};
    }
    if(['green','yellow','pip'].includes(k))return {value:rows.filter(r=>{const s=field(r,['status','performanceStatus']).toLowerCase();return k==='pip'?(s==='pip'||s==='red'):s===k;}).length,unit:'employees'};
    const map={kra:['kra','kraScore'],attendance:['attendance','attendancePct'],avgActiveHours:['avgActiveHours'],avgWorkHours:['avgWorkHours'],productivityPct:['productivityPct'],avgIdleHours:['avgIdleHours'],emailResponsePct:['emailResponsePct','emailResponse'],missedCalls:['missedCalls','missedRejectedCalls'],talkTime:['talkTime','talkTimeMinutes']};
    if(!map[k])return null;
    const values=rows.map(r=>{for(const f of map[k]){if(r[f]!==undefined&&r[f]!==null&&r[f]!==''){const v=num(r[f]);if(v!==null)return v;}}return null;}).filter(v=>v!==null);
    if(!values.length)return null;
    const total=values.reduce((a,b)=>a+b,0);
    const sum=['missedCalls','talkTime'].includes(k);
    return {value:sum?total:total/values.length,unit:['kra','attendance','productivityPct','emailResponsePct'].includes(k)?'%':['avgActiveHours','avgWorkHours','avgIdleHours'].includes(k)?'hours':k==='talkTime'?'minutes':k==='missedCalls'?'calls':'',decimal:sum?0:1};
  }
  function format(v){return v.value.toLocaleString('en-IN',{maximumFractionDigits:v.decimal??0,minimumFractionDigits:v.decimal??0})+(v.unit==='%'?'%':v.unit?' '+v.unit:'');}
  function open(card){
    const m=metricFor(card),data=rowsFor(m);
    current={m,source:data.source,rows:Array.isArray(data.rows)?data.rows:null,path:[],k:kind(m)};
    get('hrbdTitle').textContent=m.label;
    get('hrbdDescription').textContent='Department → Location → Reporting Manager';
    popup.classList.add('open');render();
  }
  function render(){
    if(!current)return;
    const {rows,path,k,m,source}=current;
    const crumbs=['All Departments',...path.map(x=>x.name)];
    get('hrbdBreadcrumb').innerHTML=crumbs.map((v,i)=>`<button type="button" data-level="${i}">${esc(v)}</button>`).join('<span>›</span>');
    get('hrbdBreadcrumb').querySelectorAll('button').forEach(b=>b.onclick=()=>{current.path=current.path.slice(0,Number(b.dataset.level));render();});
    get('hrbdFoot').textContent='Source: '+source+'. Values are calculated from available employee-level records, not copied from headline KPI totals.';
    if(!rows){get('hrbdContent').innerHTML='<div class="hrbd-empty">Employee-level records are not available for this module yet. Connect its API with Department, Location, Reporting Manager and the KPI metric to enable a live breakdown.</div>';return;}
    if(k==='unsupported'){get('hrbdContent').innerHTML='<div class="hrbd-empty">This KPI requires its own employee-level metric or transaction records. A department split cannot be calculated reliably from headcount alone.</div>';return;}
    let filtered=rows;
    filtered=qualifyingRows(filtered,k);
    for(const part of path)filtered=filtered.filter(r=>(groupField(r,part.key)||'Not mapped')===part.name);
    const level=path.length;
    const keys=['department','location','manager'];
    if(level>=3){
      const result=compute(filtered,k,m);
      const employeeName = r => field(r,['employeeName','Employee Name','emp_name','empName','name','Name','fullName','Full Name','employee_name']);
      const employeeId = r => field(r,['employeeId','Employee ID','emp_code','empCode','employee_code','employeeCode','employee_id','code']);
      const people = filtered.map((r,i)=>({name:employeeName(r),id:employeeId(r),role:field(r,['designation','Designation','role','Role','jobTitle','Job Title'])})).sort((a,b)=>a.name.localeCompare(b.name));
      const peopleHtml = people.map((person,i)=>`<div class="hrbd-person" style="display:flex;justify-content:space-between;gap:12px;padding:12px 4px;border-bottom:1px solid #e3edf0"><div><strong>${esc(person.name||'Name not provided by API')}</strong>${person.role?`<div style="font-size:12px;color:#72919a;margin-top:3px">${esc(person.role)}</div>`:''}</div><span style="color:#63818a;font-size:12px;white-space:nowrap">${esc(person.id)}</span></div>`).join('');
      get('hrbdContent').innerHTML=`<div class="hrbd-total"><span>${esc(path[path.length-1].name)}</span><strong>${result?esc(format(result)):'Metric unavailable'}</strong></div><p class="hrbd-note">${filtered.length} qualifying employee records in this selection.</p><div style="margin-top:20px"><div class="hrbd-level">Employees under ${esc(path[path.length-1].name)} <span>${people.length} records</span></div>${peopleHtml}</div>`;
      return;
    }
    const key=keys[level],groups=new Map();
    filtered.forEach(r=>{const name=groupField(r,key)||'Not mapped';if(!groups.has(name))groups.set(name,[]);groups.get(name).push(r);});
    const entries=[...groups].map(([name,items])=>({name,items,metric:compute(items,k,m)})).sort((a,b)=>(b.metric?.value??-1)-(a.metric?.value??-1));
    if(!entries.length){get('hrbdContent').innerHTML='<div class="hrbd-empty">No matching employee records for this KPI in the selected period.</div>';return;}
    const available=entries.filter(x=>x.metric!==null);
    if(!available.length){get('hrbdContent').innerHTML='<div class="hrbd-empty">This KPI cannot be calculated from the available records. Its required date, status or metric fields are missing.</div>';return;}
    const max=Math.max(...available.map(x=>x.metric.value),1);
    get('hrbdContent').innerHTML=`<div class="hrbd-level">${['Department-wise','Location-wise','Reporting Manager-wise'][level]} breakdown <span>${entries.length} groups</span></div>`+entries.map((x,i)=>`<button class="hrbd-row" type="button" data-index="${i}"><div class="hrbd-row-top"><strong>${esc(x.name)}</strong><span>${x.metric?esc(format(x.metric)):'Unavailable'} <b>›</b></span></div><div class="hrbd-track"><div style="width:${x.metric?Math.max(0,Math.min(100,x.metric.value/max*100)):0}%"></div></div></button>`).join('');
    get('hrbdContent').querySelectorAll('.hrbd-row').forEach(b=>b.onclick=()=>{current.path.push({key,name:entries[Number(b.dataset.index)].name});render();});
  }
  function enhance(){
    document.querySelectorAll(CARD_SELECTOR).forEach(card=>{
      if(card.dataset.hrbdEnhanced)return;
      if(card.closest('#hrBreakdownOverlay'))return;
      card.dataset.hrbdEnhanced='1';
      const button=document.createElement('button');
      button.type='button';button.className='hrbd-trigger';button.textContent='View Breakdown ↗';
      button.setAttribute('aria-label','View department, location and manager breakdown');
      button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();open(card);});
      card.appendChild(button);
    });
  }
  enhance();
  const observer=new MutationObserver(()=>enhance());
  observer.observe(document.body,{childList:true,subtree:true});
})();
