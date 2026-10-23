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
  function collarType(r) {
    const raw=field(r,['workerType','Worker Type','worker_type','collarType','Collar Type','employeeType','Employee Type','employee_type','employmentCategory']).toLowerCase().replace(/[\s_-]+/g,'');
    return raw==='whitecollar'||raw==='white'?'White Collar':raw==='bluecollar'||raw==='blue'?'Blue Collar':'Not Classified';
  }
  function collarEmployees(rows) {
    const unique=new Map();
    rows.forEach((r,i)=>{
      const status=field(r,['employmentStatus','Employment Status','employeeStatus','status','Status']).toLowerCase();
      if(['inactive','exited','resigned','terminated','relieved','separated'].includes(status))return;
      const id=field(r,['employeeCode','employeeId','Employee ID','emp_code','employeeNumber','employee_id']);
      const key=id?'id:'+id.toLowerCase():'row:'+i;
      if(!unique.has(key))unique.set(key,r);
    });
    return [...unique.values()];
  }
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
    if(m.page==='payroll'){
      if(l.includes('deduction'))return 'totalDeduction';
      if(l.includes('net'))return 'netPayroll';
      if(l.includes('arrear'))return 'arrearIncrement';
      if(l.includes('hold'))return 'salaryHoldCount';
      if(l.includes('lop'))return 'lopDays';
      if(l.includes('employee')||l.includes('headcount'))return 'employeeCount';
      return 'payrollCost';
    }
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
     if(m.page==='overview' && l.includes('white collar'))return 'whiteCollar';
     if(m.page==='overview' && l.includes('blue collar'))return 'blueCollar';
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
    get('hrbdDescription').textContent=m.page==='teamob'?'Department → Employee → Performance details':m.page==='attendance'?'Department-wise live attendance breakdown':'Department → Location → Reporting Manager';
    popup.classList.add('open');render();
  }
  function render(){
    if(!current)return;
    const {rows,path,k,m,source}=current;
    if(m.page==='attendance'){renderAttendanceDepartments();return;}
    if(m.page==='learning'){renderLearningBreakdown();return;}
    if(m.page==='teamob'){renderTeamObBreakdown();return;}
    if(m.page==='payroll'){renderPayrollAggregate();return;}
     if(m.page==='overview' && k==='count'){renderHeadcountCollarBreakdown();return;}
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
  // Attendance API exposes department aggregates, not full employee attendance records.
  // Use the real aggregates and never invent employee-level detail.
  function renderAttendanceDepartments(){
    const payload=typeof attendancePayload!=='undefined'?attendancePayload:null;
    const departments=payload&&Array.isArray(payload.departments)?payload.departments:[];
    const path=current.path;
    const label=current.m.label.toLowerCase();
    get('hrbdDescription').textContent='Department-wise attendance · Current dashboard period';
    get('hrbdFoot').textContent='Source: Attendance live API, department aggregates. Attendance % uses present / (present + absent). Late instances and effective hours require department-level fields in the API.';
    get('hrbdBreadcrumb').innerHTML='<button type="button" data-level="0">All Departments</button>'+(path.length?'<span>›</span><button type="button" data-level="1">'+esc(path[0].name)+'</button>':'');
    get('hrbdBreadcrumb').querySelectorAll('button').forEach(b=>b.onclick=()=>{current.path=current.path.slice(0,Number(b.dataset.level));render();});
    if(!departments.length){get('hrbdContent').innerHTML='<div class="hrbd-empty">Department attendance data has not loaded. Open Attendance, click Refresh Live Data and try again.</div>';return;}
    function metric(r){
      const present=num(r.present)||0,absent=num(r.absent)||0,other=num(r.other)||0;
      if(label.includes('overall attendance'))return {value:present+absent?100*present/(present+absent):null,suffix:'%'};
      if(label.includes('present'))return {value:present,suffix:''};
      if(label.includes('absent'))return {value:absent,suffix:''};
      if(label.includes('other'))return {value:other,suffix:''};
      if(label.includes('total employees'))return {value:num(r.headcount),suffix:''};
      if(label.includes('attendance records'))return {value:num(r.total)??present+absent+other,suffix:''};
      if(label.includes('late'))return {value:num(r.lateCount??r.lateInstances),suffix:''};
      if(label.includes('effective'))return {value:num(r.avgEffectiveHours),suffix:' hrs'};
      return {value:null,suffix:''};
    }
    function fmt(v){return v.value===null?'Not available':v.value.toLocaleString('en-IN',{maximumFractionDigits:v.suffix==='%'?1:2})+v.suffix;}
    function detail(r){
      const stats=[['Employees',r.headcount],['Present Records',r.present],['Absent Records',r.absent],['Other Records',r.other],['Attendance Records',r.total??((num(r.present)||0)+(num(r.absent)||0)+(num(r.other)||0))],['Attendance Rate',metric({...r, present:r.present,absent:r.absent}).value]];
      stats[5][1]=(num(r.present)||0)+(num(r.absent)||0)?(100*(num(r.present)||0)/((num(r.present)||0)+(num(r.absent)||0))).toFixed(1)+'%':'—';
      return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-top:16px">'+stats.map(([name,value])=>'<div style="border:1px solid #dce9ed;border-radius:12px;padding:15px;background:#f8fbfc"><div style="color:#6d8790;font-size:12px">'+esc(name)+'</div><strong style="font-size:21px;color:#0e5260">'+esc(value??'—')+'</strong></div>').join('')+'</div>';
    }
    if(path.length){
      const r=departments.find(x=>clean(x.department)===path[0].name);
      if(!r){get('hrbdContent').innerHTML='<div class="hrbd-empty">Department not found in latest data.</div>';return;}
      get('hrbdContent').innerHTML='<div class="hrbd-total"><span>'+esc(r.department)+'</span><strong>'+esc(fmt(metric(r)))+'</strong></div>'+detail(r)+'<p class="hrbd-note" style="margin-top:15px">Individual attendance entries are not included in this API response.</p>';
      return;
    }
    const entries=departments.slice().sort((a,b)=>{const av=metric(a).value,bv=metric(b).value;return (bv??-Infinity)-(av??-Infinity);});
    get('hrbdContent').innerHTML='<div class="hrbd-level">Department-wise '+esc(current.m.label)+' <span>'+entries.length+' departments</span></div>'+entries.map((r,i)=>'<button class="hrbd-row" type="button" data-index="'+i+'"><div class="hrbd-row-top"><strong>'+esc(r.department||'Not mapped')+'</strong><span>'+esc(fmt(metric(r)))+' <b>›</b></span></div><div style="font-size:12px;color:#6d8790;text-align:left;margin-top:6px">'+esc(r.headcount??'—')+' employees · '+esc(r.present??0)+' present · '+esc(r.absent??0)+' absent</div></button>').join('');
    get('hrbdContent').querySelectorAll('.hrbd-row').forEach(b=>b.onclick=()=>{current.path=[{name:clean(entries[Number(b.dataset.index)].department)||'Not mapped'}];render();});
  }

  // Team OB: Department -> Employee -> performance details.
  // Uses the department included in the deployed Team OB dashboard API.
  function renderTeamObBreakdown(){
    const state=current, path=state.path;
    const data=typeof TEAM_OB_DATA!=='undefined'?TEAM_OB_DATA:null;
    const raw=data&&Array.isArray(data.employees)?data.employees:null;
    get('hrbdDescription').textContent='Department → Employee → Performance details';
    get('hrbdFoot').textContent='Source: Team OB live dashboard API. Department comes from the mapped Team OB records. Metrics reflect the current reporting period.';
    const crumbs=['All Departments',...path.map(p=>p.label||p.name)];
    get('hrbdBreadcrumb').innerHTML=crumbs.map((v,i)=>`<button type="button" data-level="${i}">${esc(v)}</button>`).join('<span>›</span>');
    get('hrbdBreadcrumb').querySelectorAll('button').forEach(b=>b.onclick=()=>{state.path=path.slice(0,Number(b.dataset.level));render();});
    if(!raw){get('hrbdContent').innerHTML='<div class="hrbd-empty">Team OB data has not loaded. Open Team OB, wait for the live data, then retry.</div>';return;}

    const valid=v=>clean(v)&&!/^(unknown|not mapped|unassigned|n\/a|null|undefined)$/i.test(clean(v));
    const norm=v=>clean(v).toLowerCase().replace(/\s+/g,'');
    const crm=typeof EMPLOYEE_CRM_DATA!=='undefined'&&EMPLOYEE_CRM_DATA&&Array.isArray(EMPLOYEE_CRM_DATA.employees)?EMPLOYEE_CRM_DATA.employees:[];
    const crmById=new Map(),crmByEmail=new Map();
    crm.forEach(e=>{
      const id=field(e,['employeeCode','employeeId','employeeNumber','Employee ID','emp_code','empCode','employee_id']);
      const email=field(e,['email','Email','emailId','email_id']);
      if(id)crmById.set(norm(id),e);
      if(email)crmByEmail.set(norm(email),e);
    });
    const code=r=>field(r,['employeeCode','emp_code','employeeId','Employee ID','employeeNumber']);
    const name=r=>field(r,['name','emp_name','employeeName','Employee Name'])||'Name unavailable';
    const identity=r=>code(r)?'id:'+norm(code(r)):'name:'+norm(name(r))+'|'+norm(field(r,['email','Email']));
    const department=r=>{
      const direct=field(r,['department','Department','dept','Dept']);
      if(valid(direct))return direct;
      const fallback=crmById.get(norm(code(r)))||crmByEmail.get(norm(field(r,['email','Email'])));
      const fromCrm=fallback?field(fallback,['department','Department','dept','Dept']):'';
      return valid(fromCrm)?fromCrm:'Not mapped';
    };
    // Consolidate employee records so headcount and employee groups never double count.
    const people=new Map();
    raw.forEach(r=>{
      const id=identity(r);
      if(!people.has(id))people.set(id,{...r});
      else {
        const previous=people.get(id);
        // Preserve populated fields from earlier rows, prefer latest populated fields.
        Object.keys(r).forEach(k=>{if(r[k]!==null&&r[k]!==undefined&&clean(r[k])!=='')previous[k]=r[k];});
      }
    });
    const all=[...people.values()];
    const metricKeys={avgActiveHours:'avgActiveHours',avgWorkHours:'avgWorkHours',productivityPct:'productivityPct',avgIdleHours:'avgIdleHours',emailResponsePct:'emailResponsePct',missedCalls:'missedOrRejectedCalls',talkTime:'talkTimeMinutes'};
    const key=metricKeys[state.k];
    const number=(r,k)=>{const v=r[k];return v===null||v===undefined||clean(v)===''?null:num(v);};
    const metric=rows=>{
      if(state.k==='count')return {value:rows.length,unit:'employees'};
      if(!key)return null;
      const eligible=['avgActiveHours','avgWorkHours','productivityPct','avgIdleHours'].includes(state.k)?rows.filter(r=>(number(r,'systemDays')||0)>0):rows;
      const values=eligible.map(r=>number(r,key)).filter(v=>v!==null);
      if(!values.length)return null;
      const total=values.reduce((a,b)=>a+b,0);
      const isSum=state.k==='missedCalls'||state.k==='talkTime';
      return {value:isSum?total:total/values.length,unit:['productivityPct','emailResponsePct'].includes(state.k)?'%':['avgActiveHours','avgWorkHours','avgIdleHours'].includes(state.k)?'hours':state.k==='talkTime'?'minutes':state.k==='missedCalls'?'calls':'',decimal:isSum?0:2};
    };
    const fmt=(v,d=2)=>v===null?'—':v.toLocaleString('en-IN',{maximumFractionDigits:d,minimumFractionDigits:d});
    const selected=path[0]?all.filter(r=>department(r)===path[0].name):all;
    const rows=path[1]?selected.filter(r=>identity(r)===path[1].name):selected;
    const summary=metric(rows);
    if(path.length===2){
      const emp=rows[0];
      if(!emp){get('hrbdContent').innerHTML='<div class="hrbd-empty">Employee not found.</div>';return;}
      const fields=[['Employee Code',code(emp)||'—'],['Department',department(emp)],['System Days',number(emp,'systemDays')===null?'—':fmt(number(emp,'systemDays'),0)],['Avg Work Hours',number(emp,'avgWorkHours')===null?'—':fmt(number(emp,'avgWorkHours'))+' hrs'],['Avg Active Hours',number(emp,'avgActiveHours')===null?'—':fmt(number(emp,'avgActiveHours'))+' hrs'],['Avg Idle Hours',number(emp,'avgIdleHours')===null?'—':fmt(number(emp,'avgIdleHours'))+' hrs'],['Productivity',number(emp,'productivityPct')===null?'—':fmt(number(emp,'productivityPct'))+'%'],['Email Response',number(emp,'emailResponsePct')===null?'—':fmt(number(emp,'emailResponsePct'))+'%'],['Missed / Rejected Calls',number(emp,'missedOrRejectedCalls')===null?'—':fmt(number(emp,'missedOrRejectedCalls'),0)],['Talk Time',number(emp,'talkTimeMinutes')===null?'—':fmt(number(emp,'talkTimeMinutes'))+' min'],['Status',field(emp,['status'])||'—']];
      get('hrbdContent').innerHTML=`<div class="hrbd-level">${esc(name(emp))} <span>${esc(code(emp))}</span></div><div class="hrbd-total"><span>${esc(state.m.label)}</span><strong>${summary?esc(format(summary)):'Unavailable'}</strong></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:10px;margin-top:18px">${fields.map(([label,value])=>`<div style="border:1px solid #dce9ed;border-radius:10px;padding:12px;background:#f8fbfc"><div style="font-size:12px;color:#607985">${esc(label)}</div><strong style="display:block;margin-top:5px;color:#164a55">${esc(value)}</strong></div>`).join('')}</div>`;
      return;
    }
    const groups=new Map();
    rows.forEach(r=>{const group=path.length===0?department(r):identity(r);if(!groups.has(group))groups.set(group,[]);groups.get(group).push(r);});
    const entries=[...groups].map(([id,items])=>({id,items,metric:metric(items)})).sort((a,b)=>(b.metric?.value??-Infinity)-(a.metric?.value??-Infinity)||a.id.localeCompare(b.id));
    get('hrbdContent').innerHTML=`<div class="hrbd-total"><span>${esc(state.m.label)}</span><strong>${summary?esc(format(summary)):'Unavailable'}</strong></div><div class="hrbd-level" style="margin-top:16px">${path.length===0?'Department-wise':'Employee-wise'} Team OB <span>${entries.length} ${path.length===0?'departments':'employees'}</span></div>`+(entries.length?entries.map((x,i)=>`<button class="hrbd-row" type="button" data-index="${i}"><div class="hrbd-row-top"><strong>${esc(path.length===1?name(x.items[0]):x.id)} ${path.length===1?`<small style="font-weight:400;color:#63818a">${esc(code(x.items[0]))}</small>`:''}</strong><span>${x.metric?esc(format(x.metric)):'—'} <b>›</b></span></div><div style="font-size:12px;color:#607985;text-align:left;margin-top:5px">${path.length===0?x.items.length+' employees':esc(department(x.items[0]))}</div></button>`).join(''):'<div class="hrbd-empty">No employee records found.</div>');
    get('hrbdContent').querySelectorAll('.hrbd-row').forEach(b=>b.onclick=()=>{const x=entries[Number(b.dataset.index)];state.path.push({key:path.length===0?'department':'employee',name:x.id,label:path.length===0?x.id:name(x.items[0])});render();});
  }

  // L&D: Region -> Branch -> Employee -> individual training sessions.
  // Calculations use the same source rows and present/active conventions as app.js.
  function renderLearningBreakdown(){
    const state=current, path=state.path;
    const raw=Array.isArray(state.rows)?state.rows:null;
    get('hrbdDescription').textContent='Region → Branch → Employee → Training details';
    get('hrbdFoot').textContent='Source: L&D live training records. Hours count attended sessions; averages exclude missing scores. Training rating is the Feedback Score (out of 5).';
    const names=['All Regions',...path.map(p=>p.name)];
    get('hrbdBreadcrumb').innerHTML=names.map((v,i)=>`<button type="button" data-level="${i}">${esc(v)}</button>`).join('<span>›</span>');
    get('hrbdBreadcrumb').querySelectorAll('button').forEach(b=>b.onclick=()=>{state.path=path.slice(0,Number(b.dataset.level));render();});
    if(!raw){get('hrbdContent').innerHTML='<div class="hrbd-empty">L&D live data has not loaded yet. Open L&D and wait for the Live status, then retry.</div>';return;}
    const val=(r,keys)=>field(r,keys);
    const region=r=>val(r,['Region','region'])||'Not mapped';
    const branch=r=>val(r,['Branch Name','branch','Branch','location'])||'Not mapped';
    const eid=r=>val(r,['Employee ID','Employee ID 2','employeeId','emp_code']);
    const ename=r=>val(r,['Attendees','Employee Name','employeeName','name'])||'Name unavailable';
    const identity=r=>eid(r)?'id:'+eid(r).toLowerCase():'name:'+ename(r).toLowerCase()+'|'+branch(r).toLowerCase();
    const active=r=>val(r,['Status','status']).toLowerCase()!=='not active';
    const present=r=>val(r,['Attendance','attendance']).toLowerCase()==='present';
    const score=(r,keys)=>{const v=val(r,keys);return v===''?null:num(v);};
    const duration=r=>score(r,['Duration (in hours)','Duration','Training Hours','duration']);
    const feedback=r=>score(r,['Feedback Score','Training Rating','Rating','feedbackScore']);
    const assessment=r=>score(r,['Assesment Score','Assessment Score','assessmentScore']);
    const average=xs=>{const ok=xs.filter(x=>x!==null&&Number.isFinite(x));return ok.length?ok.reduce((a,b)=>a+b,0)/ok.length:null;};
    const fmt=(n,d=1)=>n===null?'—':n.toLocaleString('en-IN',{minimumFractionDigits:d,maximumFractionDigits:d});
    const metrics=rows=>{
      const valid=rows.filter(active), attended=valid.filter(present);
      const unique=new Set(attended.map(identity));
      const hours=attended.reduce((sum,r)=>sum+(duration(r)||0),0);
      return {employees:unique.size,sessions:attended.length,hours,avgHours:attended.length?hours/attended.length:null,avgPerEmployee:unique.size?hours/unique.size:null,rating:average(attended.map(feedback)),assessment:average(attended.map(assessment)),attendanceRate:valid.length?attended.length/valid.length*100:null};
    };
    let rows=raw;
    if(path[0])rows=rows.filter(r=>region(r)===path[0].name);
    if(path[1])rows=rows.filter(r=>branch(r)===path[1].name);
    if(path[2])rows=rows.filter(r=>identity(r)===path[2].name);
    const m=metrics(rows);
    const statHtml=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:18px">${[
      ['Employees Trained',String(m.employees)],['Sessions Attended',String(m.sessions)],['Total Training Hours',fmt(m.hours)],['Avg Training Hours / Session',fmt(m.avgHours)],['Avg Hours / Employee',fmt(m.avgPerEmployee)],['Avg Training Rating',m.rating===null?'—':fmt(m.rating)+' / 5'],['Avg Assessment Score',m.assessment===null?'—':fmt(m.assessment)+'%'],['Attendance Rate',m.attendanceRate===null?'—':fmt(m.attendanceRate)+'%']
    ].map(([k,v])=>`<div style="border:1px solid #dce9ed;border-radius:10px;padding:12px;background:#f8fbfc"><div style="font-size:11px;color:#607985">${esc(k)}</div><strong style="display:block;margin-top:5px;font-size:17px;color:#164a55">${esc(v)}</strong></div>`).join('')}</div>`;
    if(path.length===3){
      const sorted=[...rows].sort((a,b)=>String(b.Date||'').localeCompare(String(a.Date||'')));
      get('hrbdContent').innerHTML=`<div class="hrbd-level">${esc(ename(rows[0]||{}))} <span>${esc(eid(rows[0]||{}))}</span></div>${statHtml}<div class="hrbd-level">Employee-wise training details <span>${sorted.length} records</span></div><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>${['Date','Training Topic','Mode','Hours','Attendance','Training Rating','Assessment Score'].map(x=>`<th style="text-align:left;padding:10px 8px;border-bottom:1px solid #dce9ed;white-space:nowrap">${x}</th>`).join('')}</tr></thead><tbody>${sorted.map(r=>`<tr>${[val(r,['Date']),val(r,['Training Topic']),val(r,['Mode']),duration(r)===null?'—':fmt(duration(r)),val(r,['Attendance']),feedback(r)===null?'—':fmt(feedback(r))+' / 5',assessment(r)===null?'—':fmt(assessment(r))+'%'].map(x=>`<td style="padding:10px 8px;border-bottom:1px solid #edf1f3;white-space:nowrap">${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      return;
    }
    const key=path.length===0?region:path.length===1?branch:identity;
    const groups=new Map();
    rows.forEach(r=>{const k=key(r);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);});
    const entries=[...groups].map(([name,items])=>({name,items,m:metrics(items)})).sort((a,b)=>b.m.hours-a.m.hours||a.name.localeCompare(b.name));
    const title=['Region-wise training','Branch-wise training','Employee-wise training'][path.length];
    get('hrbdContent').innerHTML=statHtml+`<div class="hrbd-level">${title} <span>${entries.length} groups</span></div>`+(entries.length?entries.map((x,i)=>{
      const label=path.length===2?ename(x.items[0]):x.name;
      const subtitle=path.length===2?eid(x.items[0]):x.m.employees+' employees trained';
      return `<button class="hrbd-row" type="button" data-index="${i}"><div class="hrbd-row-top"><strong>${esc(label)} <small style="font-weight:400;color:#63818a">${esc(subtitle)}</small></strong><span>${fmt(x.m.hours)} hrs · ${x.m.sessions} sessions <b>›</b></span></div><div style="font-size:12px;color:#607985;margin-top:5px;text-align:left">Avg hours ${fmt(x.m.avgHours)} · Rating ${x.m.rating===null?'—':fmt(x.m.rating)+'/5'} · Assessment ${x.m.assessment===null?'—':fmt(x.m.assessment)+'%'}</div></button>`;
    }).join(''):'<div class="hrbd-empty">No training records match this selection.</div>');
    get('hrbdContent').querySelectorAll('.hrbd-row').forEach(b=>b.onclick=()=>{state.path.push({key:['region','branch','employee'][path.length],name:entries[Number(b.dataset.index)].name});render();});
  }
  // Payroll is aggregate-only. Never infer individual salaries or manager totals.
  function renderPayrollAggregate(){
    const state=current;
    const payload=typeof PAYROLL_DATA!=='undefined' ? PAYROLL_DATA : null;
    const path=state.path;
    const metric=state.k;
    const supported=['payrollCost','totalDeduction','netPayroll','arrearIncrement','employeeCount','salaryHoldCount','lopDays'];
    const label=state.m.label;
    const crumbs=['All Departments',...path.map(p=>p.name)];
    get('hrbdBreadcrumb').innerHTML=crumbs.map((v,i)=>`<button type="button" data-level="${i}">${esc(v)}</button>`).join('<span>›</span>');
    get('hrbdBreadcrumb').querySelectorAll('button').forEach(b=>b.onclick=()=>{state.path=state.path.slice(0,Number(b.dataset.level));render();});
    get('hrbdDescription').textContent='Department → Location → Employee · Latest payroll month';
    get('hrbdFoot').textContent='Source: Payroll live API, '+(payload?.latestMonth||'latest available month')+'. Employee names and IDs are shown; individual salaries remain private.';
    if(!payload || !Array.isArray(payload.latestDepartmentLocationBreakdown)){
      get('hrbdContent').innerHTML='<div class="hrbd-empty">The deployed Payroll API has not returned the Department → Location breakdown. Deploy the updated Code.gs, then refresh Payroll.</div>';
      return;
    }
    if(!supported.includes(metric)){
      get('hrbdContent').innerHTML='<div class="hrbd-empty">This payroll metric is not available in the aggregate API.</div>';return;
    }
    const data=payload.latestDepartmentLocationBreakdown;
    const money=['payrollCost','totalDeduction','netPayroll','arrearIncrement'].includes(metric);
    const fmt=v=>money?'₹'+Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2,minimumFractionDigits:2}):Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:metric==='lopDays'?1:0});
    if(path.length>=2){
      const rows=data.filter(r=>String(r.department||'Not mapped')===path[0].name&&String(r.location||'Not mapped')===path[1].name);
      const total=rows.reduce((sum,r)=>sum+Number(r[metric]||0),0);
      const directory=Array.isArray(payload.latestPayrollEmployeeDirectory)?payload.latestPayrollEmployeeDirectory:[];
      const people=directory.filter(r=>String(r.department||'Not mapped')===path[0].name&&String(r.location||'Not mapped')===path[1].name).sort((a,b)=>String(a.employeeName||'').localeCompare(String(b.employeeName||'')));
      const peopleHtml=people.map(person=>`<div class="hrbd-person" style="display:flex;justify-content:space-between;gap:12px;padding:12px 4px;border-bottom:1px solid #e3edf0"><strong>${esc(person.employeeName||'Name unavailable')}</strong><span style="color:#63818a;font-size:12px;white-space:nowrap">${esc(person.employeeId||'')}</span></div>`).join('');
      get('hrbdContent').innerHTML=`<div class="hrbd-total"><span>${esc(label)} · ${esc(path[1].name)}</span><strong>${fmt(total)}</strong></div><div style="margin-top:18px"><div class="hrbd-level">Employees in ${esc(path[1].name)} <span>${people.length} employees</span></div>${peopleHtml||'<p class="hrbd-note">Employee names are not available yet. Redeploy the updated payroll backend and refresh live data.</p>'}</div><p class="hrbd-note" style="margin-top:12px">Payroll total is for the selected department and location. Individual salary amounts are not published in this dashboard.</p>`;
      return;
    }
    const key=path.length===0?'department':'location';
    const rows=path.length===0?data:data.filter(r=>String(r.department||'Not mapped')===path[0].name);
    const groups=new Map();
    rows.forEach(r=>{const name=String(r[key]||'Not mapped');groups.set(name,(groups.get(name)||0)+Number(r[metric]||0));});
    const entries=[...groups].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
    if(!entries.length){get('hrbdContent').innerHTML='<div class="hrbd-empty">No payroll breakdown records found.</div>';return;}
    const max=Math.max(...entries.map(x=>Math.abs(x.value)),1);
    get('hrbdContent').innerHTML=`<div class="hrbd-level">${path.length===0?'Department-wise':'Location-wise'} ${esc(label)} <span>${entries.length} groups</span></div>`+entries.map((x,i)=>`<button class="hrbd-row" type="button" data-index="${i}"><div class="hrbd-row-top"><strong>${esc(x.name)}</strong><span>${fmt(x.value)} <b>›</b></span></div><div class="hrbd-track"><div style="width:${Math.min(100,Math.abs(x.value)/max*100)}%"></div></div></button>`).join('');
    get('hrbdContent').querySelectorAll('.hrbd-row').forEach(b=>b.onclick=()=>{state.path.push({key,name:entries[Number(b.dataset.index)].name});render();});
  }
   // Executive Overview Total Headcount: Collar -> Department -> Employee details.
   // No additional KPI cards are created.
   function renderHeadcountCollarBreakdown(){
     const state=current,path=state.path;
     const raw=sources.employees();
     get('hrbdDescription').textContent='White / Blue Collar → Department → Employee details';
     get('hrbdFoot').textContent='Source: Employee CRM / Keka live API. Counts use unique active employee records. Unclassified employees remain visible separately until the API mapping is provided.';
     const crumbs=['All Employees',...path.map(p=>p.name)];
     get('hrbdBreadcrumb').innerHTML=crumbs.map((v,i)=>`<button type="button" data-level="${i}">${esc(v)}</button>`).join('<span>›</span>');
     get('hrbdBreadcrumb').querySelectorAll('button').forEach(b=>b.onclick=()=>{state.path=path.slice(0,Number(b.dataset.level));render();});
     if(!Array.isArray(raw)){
       get('hrbdContent').innerHTML='<div class="hrbd-empty">Employee CRM live records have not loaded. Open Employee CRM, refresh live data and retry.</div>';
       return;
     }
     const all=collarEmployees(raw);
     const dept=r=>groupField(r,'department')||'Not mapped';
     const name=r=>field(r,['employeeName','Employee Name','name','emp_name','fullName'])||'Name unavailable';
     const code=r=>field(r,['employeeCode','employeeId','Employee ID','emp_code','employeeNumber']);
     let rows=all;
     if(path[0])rows=rows.filter(r=>collarType(r)===path[0].name);
     if(path[1])rows=rows.filter(r=>dept(r)===path[1].name);
     const summary=`<div class="hrbd-total"><span>${esc(path.length?path[path.length-1].name:'Live Employee Headcount')}</span><strong>${rows.length.toLocaleString('en-IN')} employees</strong></div>`;
     if(path.length>=2){
       const sorted=rows.slice().sort((a,b)=>name(a).localeCompare(name(b)));
       get('hrbdContent').innerHTML=summary+`<div class="hrbd-level" style="margin-top:18px">Employee Details <span>${sorted.length} employees</span></div>`+sorted.map(r=>`<div class="hrbd-person" style="padding:12px 4px;border-bottom:1px solid #e3edf0"><div style="display:flex;justify-content:space-between;gap:12px"><strong>${esc(name(r))}</strong><span style="font-size:12px;color:#63818a">${esc(code(r))}</span></div><div style="font-size:12px;color:#607985;margin-top:5px">${esc(field(r,['designation','Designation','jobTitle','role'])||'Designation not mapped')} · ${esc(field(r,['location','Location','branch','Branch'])||'Location not mapped')} · ${esc(field(r,['reportingManager','Reporting Manager','manager'])||'Manager not mapped')}</div></div>`).join('');
       return;
     }
     const groups=new Map();
     rows.forEach(r=>{const key=path.length===0?collarType(r):dept(r);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);});
     const entries=[...groups].map(([name,items])=>({name,count:items.length})).sort((a,b)=>b.count-a.count);
     get('hrbdContent').innerHTML=summary+`<div class="hrbd-level" style="margin-top:18px">${path.length===0?'Employee Category':'Department-wise Headcount'} <span>${entries.length} groups</span></div>`+entries.map((e,i)=>`<button class="hrbd-row" type="button" data-index="${i}"><div class="hrbd-row-top"><strong>${esc(e.name)}</strong><span>${e.count} employees <b>›</b></span></div></button>`).join('');
     get('hrbdContent').querySelectorAll('.hrbd-row').forEach(b=>b.onclick=()=>{state.path.push({name:entries[Number(b.dataset.index)].name});render();});
   }

  function enhance(){
    document.querySelectorAll(CARD_SELECTOR).forEach(card=>{
      if(card.dataset.hrbdEnhanced)return;
      if(card.closest('#hrBreakdownOverlay'))return;
      card.dataset.hrbdEnhanced='1';
      const button=document.createElement('button');
      button.type='button';button.className='hrbd-trigger';button.textContent='View Breakdown ↗';
      button.setAttribute('aria-label','View KPI breakdown');
      button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();open(card);});
      card.appendChild(button);
    });
  }
  enhance();
  const observer=new MutationObserver(()=>enhance());
  observer.observe(document.body,{childList:true,subtree:true});
})();
