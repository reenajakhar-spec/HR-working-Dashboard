/* Euronics HR Command Centre: MoM popups for Employee CRM, Attendance, L&D.
   Payroll and Team OB retain their existing dedicated popups.
   No invented historical values. */
(function () {
  'use strict';
  if (window.__euronicsHrMomInstalled) return;
  window.__euronicsHrMomInstalled = true;
  const MODULES = {
    employees: '#employees .employee-kpi-card',
    attendance: '#attendance .attendance-kpi-card',
    learning: '#learning .lnd-kpi-card,#learning .lnd-kpi,#learning #learningKpis > div'
  };
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[c]));
  function checked(y,m,d) {
    if (!m) return null;
    const x = new Date(y,m-1,d);
    return x.getFullYear()===y && x.getMonth()===m-1 && x.getDate()===d ? x : null;
  }
  function dateOf(v) {
    if (v instanceof Date) return isNaN(v) ? null : v;
    if (typeof v === 'number' && v > 20000 && v < 100000) {
      const d = new Date(Date.UTC(1899,11,30) + v*86400000);
      return checked(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate());
    }
    const s=String(v??'').trim();
    if (!s) return null;
    let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if(m) return checked(+m[1],+m[2],+m[3]);
    m=s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
    if(m) return checked(+m[3],+m[2],+m[1]);
    m=s.match(/^(\d{1,2})[\s-]+([a-z]+)[\s,-]+(\d{4})$/i);
    if(m) {
      const months={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,sept:9,oct:10,nov:11,dec:12};
      return checked(+m[3],months[m[2].toLowerCase()],+m[1]);
    }
    return null;
  }
  const key=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  function monthShift(k,offset) {
    const [y,m]=k.split('-').map(Number);
    return key(new Date(y,m-1+offset,1));
  }
  const number=x=>{
    if(x===null || x===undefined || x==='') return null;
    const n=Number(String(x).replace(/[, %]/g,''));
    return Number.isFinite(n)?n:null;
  };
  function getGlobal(name) { try { return window[name] ?? eval(name); } catch(e) { return null; } }
  function selected(id) { return document.getElementById(id)?.value || 'all'; }
  function normalized(v) { return String(v??'').trim().toLowerCase(); }
  function monthCount(rows,fields,filter) {
    const values=new Map(), now=new Date();
    for(const r of rows) {
      if(filter && !filter(r)) continue;
      const d=dateOf(fields.map(f=>r[f]).find(v=>v!==null && v!==undefined && v!==''));
      if(!d || d>now) continue;
      const k=key(d);
      values.set(k,(values.get(k)||0)+1);
    }
    return values;
  }
  function employeeSeries(label) {
    const p=getGlobal('EMPLOYEE_CRM_DATA');
    if(!p || !Array.isArray(p.employees)) return null;
    const rows=p.employees, exits=Array.isArray(p.exits)?p.exits:[];
    const filters=[
      ['employeeDeptFilter',['department','Department']],
      ['employeeLocationFilter',['location','Location']],
      ['employeeManagerFilter',['manager','reportingManager','managerName']]
    ];
    const match=r=>filters.every(([id,fields])=>{
      const value=selected(id);
      return value==='all' || fields.some(f=>normalized(r[f])===normalized(value));
    });
    const search=normalized(document.getElementById('employeeCrmSearch')?.value);
    const status=selected('employeeStatusFilter');
    if(search || status!=='all') return {
      values:new Map(),
      note:'Historical employee-level search/status snapshots are not available. Clear the search and select All Status to view supported monthly trends.'
    };
    const scoped=filters.some(([id])=>selected(id)!=='all');
    const today=new Date();
    const joinFields=['doj','joiningDate','dateOfJoining','joining','joinDate'];
    const joinDate=r=>dateOf(joinFields.map(f=>r[f]).find(v=>v!==null && v!==undefined && v!==''));
    const personId=r=>normalized(r.employeeId||r.employeeNumber||r.empCode||r.emp_code||r.id);
    const personName=r=>normalized(r.employeeName||r.displayName||r.name||r.fullName);
    const people=rows.filter(match);
    const joiners=monthCount(people,joinFields);
    // The exit sheet's Last Working Day is authoritative. Final Status is ignored.
    // Do not count future exits or repeated exit rows for the same person/date.
    const exitSeen=new Set(), exitRecords=[];
    for(const r of exits) {
      const end=dateOf(r.lastWorkingDay);
      if(!end || end>today) continue;
      const id=personId(r), name=personName(r);
      const fingerprint=(id?'id:'+id:name?'name:'+name:'row:'+JSON.stringify(r))+'|'+key(end)+'-'+end.getDate();
      if(exitSeen.has(fingerprint)) continue;
      exitSeen.add(fingerprint);
      exitRecords.push({row:r,end,id,name});
    }
    const left=scoped?new Map():monthCount(exitRecords.map(x=>({lastWorkingDay:x.end})),['lastWorkingDay']);
    if(/New Joiners/i.test(label)) return {
      values:joiners,
      note:'Monthly joiners by Date of Joining from employee master. Existing department/location/manager filters applied.'
    };
    if(/Net Change/i.test(label)) {
      if(scoped) return {values:new Map(),note:'Filtered historical exits cannot be verified because some exit records lack department/location/manager information.'};
      const keys=[...new Set([...joiners.keys(),...left.keys()])].sort();
      return {values:new Map(keys.map(k=>[k,(joiners.get(k)||0)-(left.get(k)||0)])),
        note:'Provisional monthly net change: joiners minus unique exits by Last Working Day; Final Status ignored. Missing joiners in historical employee master may affect totals.'};
    }
    // Reconstruct only from employees with dated joining records. Exit-only
    // employees are included only when their own joining date is known.
    // Never assume an unknown joining date or invent an historical snapshot.
    const indexed=new Map();
    for(const r of rows) {
      const id=personId(r), name=personName(r), doj=joinDate(r);
      if(!doj || doj>today) continue;
      const k=id?'id:'+id:name?'name:'+name:null;
      if(id && !indexed.has('id:'+id)) indexed.set('id:'+id,r);
      if(name && !indexed.has('name:'+name)) indexed.set('name:'+name,r);
    }
    const matchedEnd=new Map();
    const historical=[];
    let missingExitDoj=0;
    for(const x of exitRecords) {
      const matchKey=x.id && indexed.has('id:'+x.id)?'id:'+x.id:
        x.name && indexed.has('name:'+x.name)?'name:'+x.name:null;
      if(matchKey) {
        const old=matchedEnd.get(matchKey);
        if(!old || x.end<old) matchedEnd.set(matchKey,x.end);
        continue;
      }
      const doj=joinDate(x.row);
      if(!doj || doj>x.end) {missingExitDoj++;continue;}
      historical.push({r:x.row,doj,end:x.end});
    }
    for(const r of rows) {
      const doj=joinDate(r);
      if(!doj || doj>today) continue;
      const id=personId(r),name=personName(r);
      const k=id && indexed.has('id:'+id)?'id:'+id:
        name && indexed.has('name:'+name)?'name:'+name:null;
      historical.push({r,doj,end:k?matchedEnd.get(k)||null:null});
    }
    const values=new Map();
    const start=new Date(2026,3,1);
    for(let month=new Date(start.getFullYear(),start.getMonth(),1);
        month<=today;month=new Date(month.getFullYear(),month.getMonth()+1,1)) {
      const lastDay=new Date(month.getFullYear(),month.getMonth()+1,0);
      const asOf=lastDay>today?today:lastDay;
      const active=historical.filter(x=>x.doj<=asOf && (!x.end || x.end>asOf) && match(x.r));
      let v=null;
      if(/Total Employees|Active Employees/i.test(label)) v=active.length;
      else if(/Under 3 Months/i.test(label)) {
        const threshold=new Date(asOf.getFullYear(),asOf.getMonth()-3,asOf.getDate());
        v=active.filter(x=>x.doj>threshold).length;
      } else if(/Avg\.?\s*Tenure/i.test(label)) {
        v=active.length?active.reduce((sum,x)=>sum+(asOf-x.doj)/86400000/365.2425,0)/active.length:null;
      }
      if(v!==null) values.set(key(month),v);
    }
    const coverage=missingExitDoj
      ? missingExitDoj+' exit records lack a usable joining date/match and are excluded from reconstructed headcount. '
      : '';
    return {values,note:'PROVISIONAL reconstructed workforce, not verified month-end snapshots. Based on available joining dates and Last Working Day (Final Status ignored). '+coverage+'Earlier months may undercount former employees; current-month value may differ from live KPI. Department/location/manager filters use present-day attributes.'};
  }
  function attendanceSeries(label) {
    const p=getGlobal('attendancePayload');
    if(!p || !Array.isArray(p.daily)) return null;
    const filters=['attendanceDeptFilter','attendanceLocationFilter','attendanceManagerFilter','attendanceStatusFilter'];
    if(filters.some(id=>selected(id)!=='all')) return {
      values:new Map(),
      note:'Historical attendance is company-wide in the available daily feed. A filtered month-on-month view requires dated employee-level attendance records.'
    };
    let field=null;
    if(/Overall Attendance/i.test(label)) field='attendancePercent';
    else if(/Present Records/i.test(label)) field='present';
    else if(/Absent Records/i.test(label)) field='absent';
    else if(/Other Records/i.test(label)) field='other';
    else if(/Late Instances/i.test(label)) field='lateCount';
    if(!field) return {
      values:new Map(),
      note:'The available dated attendance feed does not establish this KPI month by month. No historical value has been fabricated.'
    };
    const grouped=new Map();
    for(const r of p.daily) {
      const d=dateOf(r.date);
      if(!d || d>new Date()) continue;
      const k=key(d);
      if(!grouped.has(k)) grouped.set(k,[]);
      grouped.get(k).push(r);
    }
    const values=new Map();
    for(const [k,rs] of grouped) {
      if(field==='attendancePercent') {
        const valid=rs.filter(r=>number(r.present)!==null && number(r.absent)!==null);
        const present=valid.reduce((a,r)=>a+number(r.present),0);
        const absent=valid.reduce((a,r)=>a+number(r.absent),0);
        if(present+absent>0) values.set(k,100*present/(present+absent));
      } else {
        const valid=rs.map(r=>number(r[field])).filter(x=>x!==null);
        if(valid.length) values.set(k,valid.reduce((a,b)=>a+b,0));
      }
    }
    return {values,note:field==='attendancePercent'
      ? 'Monthly attendance: sum of present / sum of present and absent × 100, using available dated daily records.'
      : 'Monthly totals from available dated daily attendance records. Incomplete months may not be comparable.'};
  }
  function learningSeries(label) {
    const all=window.lndRows || getGlobal('lndRows');
    if(!Array.isArray(all)) return null;
    const fn=getGlobal('getFilteredLndRows');
    const rows=typeof fn==='function'?fn():all;
    const grouped=new Map();
    for(const r of rows) {
      const d=dateOf(r.Date);
      if(!d || d>new Date()) continue;
      const k=key(d);
      if(!grouped.has(k)) grouped.set(k,[]);
      grouped.get(k).push(r);
    }
    const values=new Map();
    for(const [k,rs] of grouped) {
      const present=rs.filter(r=>normalized(r.Attendance)==='present');
      const absent=rs.filter(r=>normalized(r.Attendance)==='absent');
      const ids=arr=>new Set(arr.map(r=>String(r['Employee ID']||r['Employee ID 2']||r.Attendees||'').trim()).filter(Boolean));
      const trained=ids(present).size;
      const active=ids(rs.filter(r=>normalized(r.Status)!=='not active')).size;
      const hours=present.reduce((a,r)=>a+(number(r['Duration (in hours)'])||0),0);
      const programs=new Set(present.map(r=>[r['Training Topic'],r.Date,r['Branch Name']].join('|'))).size;
      const avg=field=>{
        const nums=rs.map(r=>number(r[field])).filter(x=>x!==null);
        return nums.length?nums.reduce((a,b)=>a+b,0)/nums.length:null;
      };
      let v=null;
      if(/Total Employees/i.test(label)) v=active;
      else if(/Employees Trained/i.test(label)) v=trained;
      else if(/Training Coverage/i.test(label)) v=active?100*trained/active:null;
      else if(/Total Learning Hours/i.test(label)) v=hours;
      else if(/Avg\.?\s*Hours/i.test(label)) v=trained?hours/trained:null;
      else if(/Programs Conducted/i.test(label)) v=programs;
      else if(/Completion Rate/i.test(label)) v=present.length+absent.length?100*present.length/(present.length+absent.length):null;
      else if(/Training Rating/i.test(label)) v=avg('Feedback Score');
      else if(/Assessment Score/i.test(label)) v=avg('Assesment Score');
      if(v!==null) values.set(k,v);
    }
    return {values,note:'Derived from dated L&D records using the existing L&D filters. Total Employees means employees represented in that month’s training records, not verified company headcount.'};
  }
  let chart = null;

  function open(module, card) {
    const label = (
      card.querySelector(
        '.employee-kpi-label,.attendance-kpi-label,.lnd-kpi-label,.lnd-card-label,.lnd-kpi-title,.lnd-kpi-name,.kpi-label,.title,h3,h4'
      )?.textContent || card.firstElementChild?.textContent || 'KPI'
    ).trim();

    const result = module === 'employees'
      ? employeeSeries(label)
      : module === 'attendance'
      ? attendanceSeries(label)
      : learningSeries(label);

    const overlay = document.getElementById('hrMomOverlay');
    const title = document.getElementById('hrMomTitle');
    const note = document.getElementById('hrMomNote');
    const tbody = document.getElementById('hrMomRows');

    title.textContent = label + ' · Month-on-Month';

    
// Current Financial Year: April to March
const today = new Date();
const fyStartYear = today.getMonth() >= 3
  ? today.getFullYear()
  : today.getFullYear() - 1;

const fyStart = `${fyStartYear}-04`;
const fyEnd = `${fyStartYear + 1}-03`;

const currentMonth = today.getFullYear() + '-' +
  String(today.getMonth() + 1).padStart(2, '0');

// Show only current FY, excluding future months
const pairs = result
  ? [...result.values]
      .filter(([month]) =>
        month >= fyStart &&
        month <= fyEnd &&
        month <= currentMonth
      )
      .sort((a, b) => a[0].localeCompare(b[0]))
  : [];


    note.textContent = result?.note ||
      'Load live data first to view historical trends.';

    const pct = /%|Overall Attendance|Coverage|Completion Rate/i.test(label);

    const fmt = v => v === null
      ? '—'
      : (Math.abs(v) >= 1000
          ? v.toLocaleString('en-IN', { maximumFractionDigits: 1 })
          : v.toFixed(pct ? 1 : 2).replace(/\.00$/, '')
        ) + (pct ? '%' : '');

    const last = pairs.length ? pairs[pairs.length - 1][1] : null;
    const previousKey = pairs.length ? monthShift(pairs[pairs.length - 1][0], -1) : null;
    const prev = previousKey && result?.values.has(previousKey) ? result.values.get(previousKey) : null;

    document.getElementById('hrMomLatest').textContent = fmt(last);

    document.getElementById('hrMomChange').textContent =
      last === null || prev === null ? '—' : fmt(last - prev);

    document.getElementById('hrMomHigh').textContent =
      pairs.length ? fmt(Math.max(...pairs.map(x => x[1]))) : '—';

    document.getElementById('hrMomLow').textContent =
      pairs.length ? fmt(Math.min(...pairs.map(x => x[1]))) : '—';

    tbody.innerHTML = pairs.length
      ? pairs.slice().reverse().map(([k, v], i) => {
          const previous = result.values.get(monthShift(k, -1));
          const month = new Date(k + '-01T00:00:00')
            .toLocaleDateString('en-IN', {
              month: 'long', year: 'numeric'
            });

          return `<tr>
            <td>${esc(month)}</td>
            <td>${esc(fmt(v))}</td>
            <td>${esc(
              previous === undefined ? '—' : fmt(v - previous)
            )}</td>
          </tr>`;
        }).join('')
      : '<tr><td colspan="3">Historical data unavailable for this KPI.</td></tr>';

    if (!overlay) return;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    if (chart) {
      chart.destroy();
      chart = null;
    }

    const canvas = document.getElementById('hrMomChart');
    if (pairs.length && canvas && typeof Chart !== 'undefined') {
      chart = new Chart(canvas, {
        type: 'line',
        data: {
          labels: pairs.map(([k]) =>
            new Date(k + '-01T00:00:00').toLocaleDateString(
              'en-IN', { month: 'short', year: '2-digit' }
            )
          ),
          datasets: [{
            label,
            data: pairs.map(x => x[1]),
            borderColor: '#17616e',
            backgroundColor: 'rgba(23,97,110,.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 4
          }]
        },
        
options: {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false }
  },
  
scales: {
  y: {
    beginAtZero: true,
    min: 0,
    ticks: {
      precision: 0,
      maxTicksLimit: 7
    }
  }
}
}

      });
    }
  }

  function close() {
    document.getElementById('hrMomOverlay')
      ?.classList.remove('open');
    document.body.style.overflow = '';
  }

  const css = document.createElement('style');

  css.textContent = `
    #employees .employee-kpi-card,
    #attendance .attendance-kpi-card,
    #learning #learningKpis > div {
      cursor: pointer;
    }
    #employees .employee-kpi-card:hover,
    #attendance .attendance-kpi-card:hover,
    #learning #learningKpis > div:hover {
      box-shadow: 0 12px 32px rgba(12,63,75,.16);
      transform: translateY(-2px);
    }
    #employees .employee-kpi-card::after,#attendance .attendance-kpi-card::after,#learning #learningKpis > div::after {content:'View MoM ↗';display:block;margin-top:10px;font-size:11px;font-weight:800;color:#17616e;}
    .hr-mom-overlay {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 999999;
      background: rgba(5,29,38,.62);
      padding: 20px;
      align-items: center;
      justify-content: center;
    }
    .hr-mom-overlay.open { display: flex; }
    .hr-mom-panel {
      width: min(960px,96vw);
      max-height: 92vh;
      overflow: auto;
      background: #fff;
      border-radius: 22px;
      color: #163f49;
      box-shadow: 0 25px 90px #0004;
    }
    .hr-mom-header {
      padding: 22px 26px;
      border-bottom: 1px solid #e4ecee;
      display: flex;
      justify-content: space-between;
      gap: 15px;
    }
    .hr-mom-header h2 { margin: 0; font-size: 23px; }
    .hr-mom-header p {
      margin: 8px 0 0;
      color: #657c85;
      font-size: 13px;
    }
    .hr-mom-close {
      border: 0;
      background: #eaf1f3;
      border-radius: 50%;
      width: 38px;
      height: 38px;
      font-size: 24px;
      cursor: pointer;
    }
    .hr-mom-body { padding: 22px 26px; }
    .hr-mom-stats {
      display: grid;
      grid-template-columns: repeat(4,1fr);
      gap: 12px;
    }
    .hr-mom-stats > div {
      background: #f1f7f8;
      border-radius: 12px;
      padding: 14px;
    }
    .hr-mom-stats small {
      display: block;
      color: #627b83;
      font-size: 11px;
    }
    .hr-mom-stats strong { font-size: 22px; }
    .hr-mom-chart { height: 270px; margin: 22px 0; }
    .hr-mom-table {
      width: 100%;
      border-collapse: collapse;
    }
    .hr-mom-table th,
    .hr-mom-table td {
      padding: 12px;
      border-bottom: 1px solid #e5ecee;
      text-align: left;
      font-size: 13px;
    }
    .hr-mom-table th { background: #edf5f6; }
    @media(max-width:600px) {
      .hr-mom-stats { grid-template-columns: repeat(2,1fr); }
    }
  `;

  document.head.appendChild(css);

  const div = document.createElement('div');
  div.id = 'hrMomOverlay';
  div.className = 'hr-mom-overlay';

  div.innerHTML = `
    <div class="hr-mom-panel" role="dialog"
         aria-modal="true" aria-labelledby="hrMomTitle">
      <header class="hr-mom-header">
        <div>
          <h2 id="hrMomTitle">Month-on-Month</h2>
          <p id="hrMomNote"></p>
        </div>
        <button class="hr-mom-close" id="hrMomClose"
                type="button" aria-label="Close">×</button>
      </header>
      <div class="hr-mom-body">
        <div class="hr-mom-stats">
          <div><small>LATEST</small><strong id="hrMomLatest">—</strong></div>
          <div><small>VS PREVIOUS</small><strong id="hrMomChange">—</strong></div>
          <div><small>HIGHEST</small><strong id="hrMomHigh">—</strong></div>
          <div><small>LOWEST</small><strong id="hrMomLow">—</strong></div>
        </div>
        <div class="hr-mom-chart">
          <canvas id="hrMomChart"></canvas>
        </div>
        <table class="hr-mom-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Value</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody id="hrMomRows"></tbody>
        </table>
      </div>
    </div>
  `;

  document.body.appendChild(div);

  document.getElementById('hrMomClose')
    .addEventListener('click', close);

  div.addEventListener('click', e => {
    if (e.target === div) close();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && div.classList.contains('open')) {
      close();
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest?.(Object.values(MODULES).join(','));
    if (card) { e.preventDefault(); card.click(); }
  });

  document.addEventListener('click', e => {
    if (!(e.target instanceof Element) || e.target.closest('#hrMomOverlay')) return;
    for (const [module, selector] of Object.entries(MODULES)) {
      const card = e.target.closest(selector);
      if (card) {
        open(module, card);
        return;
      }
    }
  });

})();
