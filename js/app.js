const pageTitles = {
  overview: ['Executive Overview', 'CEO & CHRO command view'],
  employees: ['Employee CRM', 'Searchable employee 360° operating view'],
  recruitment: ['Recruitment Pipeline', 'Requisition-to-joining funnel'],
  attendance: ['Attendance & Leave', 'Attendance health and regularisation'],
  performance: ['Performance Management', 'Green / Yellow / Red / PIP view'],
  payroll: ['Payroll & Compensation', 'Cost and compensation health'],
  learning: ['L&D / EuroVersity', 'Training and certification'],
  engagement: ['Engagement & Culture', 'Sentiment and recognition'],
  compliance: ['Compliance & Statutory', 'Statutory readiness'],
  alerts: ['Alerts & Action Centre', 'Ownership, due dates and follow-up']
};

/* =========================================================
   DOM COMPATIBILITY SAFETY
   Keeps the full app.js running even when a page section is
   not present in the current index.html build. Real elements
   are always returned when they exist.
========================================================= */

const __nativeGetElementById = document.getElementById.bind(document);
const __missingElements = Object.create(null);

document.getElementById = function(id) {
  const real = __nativeGetElementById(id);
  if (real) return real;

  if (!__missingElements[id]) {
    const dummy = document.createElement('div');
    dummy.id = '__missing__' + id;
    dummy.value = '';
    __missingElements[id] = dummy;
  }

  return __missingElements[id];
};

function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById(page);
  if (pageEl) pageEl.classList.add('active');

  const navBtn = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navBtn) navBtn.classList.add('active');

  if (pageTitles[page]) {
    document.getElementById('pageTitle').textContent = pageTitles[page][0];
    document.getElementById('pageSub').textContent = pageTitles[page][1];
  }

  /* Hide only the outer HR header while Recruitment is open. */
  document.body.classList.toggle('recruitment-mode', page === 'recruitment');

  /* Keep menu compact after selection. */
  if (window.innerWidth <= 760) {
    document.body.classList.remove('mobile-menu-open');
  } else {
    document.body.classList.add('sidebar-collapsed');
  }

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });

  if (
    page === 'attendance' &&
    typeof loadAttendanceLive === 'function'
  ) {
    setTimeout(function() {
      loadAttendanceLive(false);
    }, 50);
  }

  if (
    page === 'learning' &&
    typeof loadLndLive === 'function'
  ) {
    setTimeout(function() {
      loadLndLive(false);
    }, 50);
  }

  if (
  page === 'employees' &&
  typeof loadEmployeeCrmLive === 'function'
) {

  setTimeout(
    function() {

      loadEmployeeCrmLive(false);

    },
    50
  );

}
}

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    navigate(btn.dataset.page);
  });
});

document.querySelectorAll('[data-page-jump]').forEach(btn => {
  btn.addEventListener('click', () => {
    navigate(btn.dataset.pageJump);
  });
});


function kpi(label, value, sub = '', cls = '') {
  return `
    <div class="kpi-card ${cls}">
      <div class="label">${label}</div>
      <div class="value">${value}</div>
      <div class="sub ${sub.includes('▲') ? 'good' : sub.includes('▼') ? 'bad' : ''}">
        ${sub}
      </div>
    </div>
  `;
}


/* =========================
   OVERVIEW
========================= */

document.getElementById('overviewKpis').innerHTML = [
  kpi('Total Headcount', '612', '▲ +6 vs June'),
  kpi('Attendance Rate', '93.4%', 'Jul MTD avg'),
  kpi('Open Positions', '18', '3 aged >8 weeks', 'warn'),
  kpi(
    'Attrition (Rolling 12M)',
    '14.2%',
    'Sales 18.4% · Non-Sales 9.7%'
  ),
  kpi('PIP Cases', '4', '2 Sales · 1 Plant · 1 Corp'),
  kpi('eNPS Score', '+32', '▲ +4 vs last survey', 'highlight')
].join('');


makeLineChart(
  'headcountChart',
  ['Apr', 'May', 'Jun', 'Jul', 'Aug'],
  [605, 606, 606, 612, 618],
  'Headcount'
);


makeLineChart(
  'attritionChart',
  ['Apr', 'May', 'Jun', 'Jul', 'Aug'],
  [15.4, 15.1, 14.8, 14.2, 13.9],
  'Attrition %'
);


const departments = [
  ['Production', 89.1, 81, 'red'],
  ['Sales & BD', 96.2, 74, 'amber'],
  ['Quality', 94.8, 85, 'green'],
  ['Supply Chain', 95.5, 79, 'green'],
  ['Engineering/NPD', 97.1, 88, 'green']
];


document.getElementById('departmentHealth').innerHTML =
  departments.map(d => `
    <div class="health-row">

      <div class="health-main">

        <div class="health-dot ${d[3]}"></div>

        <div>
          <div class="health-name">
            ${d[0]}
          </div>

          <div class="health-meta">
            Attendance ${d[1]}% · Avg KRA ${d[2]}%
          </div>
        </div>

      </div>

      <div class="health-score">
        ${d[2]}%
      </div>

    </div>
  `).join('');


function alertCard(a) {
  const cls = a.priority.toLowerCase();

  return `
    <div class="alert-card">

      <div class="alert-left">

        <span class="priority-pill priority-${cls}">
          ${a.priority}
        </span>

        <div>
          <div class="alert-title">
            ${a.action}
          </div>

          <div class="alert-meta">
            ${a.owner} · Due ${a.due}
          </div>
        </div>

      </div>

      <span class="status-pill status-${a.status.toLowerCase().replaceAll(' ', '')}">
        ${a.status}
      </span>

    </div>
  `;
}


document.getElementById('priorityAlerts').innerHTML =
  HR_DATA.alerts
    .slice(0, 4)
    .map(alertCard)
    .join('');


/* =========================
   EMPLOYEE CRM
========================= */

function renderEmployees() {

  const q =
    document.getElementById('employeeSearch')
      .value
      .toLowerCase();

  const globalQ =
    document.getElementById('globalSearch')
      .value
      .toLowerCase();

  const loc =
    document.getElementById('filterLocation')
      .value;

  const dept =
    document.getElementById('filterDepartment')
      .value;

  const manager =
    document.getElementById('filterManager')
      .value;

  const status =
    document.getElementById('filterStatus')
      .value;


  const rows = HR_DATA.employees.filter(e => {

    const text =
      `${e.name} ${e.role} ${e.department} ${e.manager} ${e.location}`
        .toLowerCase();


    return (

      (!q || text.includes(q)) &&

      (!globalQ || text.includes(globalQ)) &&

      (loc === 'all' || e.location === loc) &&

      (dept === 'all' || e.department === dept) &&

      (manager === 'all' || e.manager === manager) &&

      (status === 'all' || e.status === status)

    );

  });


  document.getElementById('employeeCount').textContent =
    rows.length;


  document.getElementById('employeeTableBody').innerHTML =
    rows.map(e => `

      <tr>

        <td>

          <div class="emp-name">
            ${e.name}
          </div>

          <div class="emp-role">
            ${e.role}
          </div>

        </td>


        <td>
          ${e.department}
        </td>


        <td>
          ${e.manager}
        </td>


        <td>
          ${e.location}
        </td>


        <td>
          ${e.attendance}%
        </td>


        <td>
          ${e.kra}%
        </td>


        <td>

          <span class="status-pill status-${e.status.toLowerCase()}">
            ${e.status}
          </span>

        </td>


        <td>

          <button
            class="view-btn"
            onclick="openEmployee(${e.id})"
          >
            View 360°
          </button>

        </td>

      </tr>

    `).join('');

}


document
  .getElementById('employeeSearch')
  .addEventListener(
    'input',
    renderEmployees
  );


document
  .getElementById('globalSearch')
  .addEventListener(
    'input',
    renderEmployees
  );


[
  'filterLocation',
  'filterDepartment',
  'filterManager',
  'filterStatus'
].forEach(id => {

  document
    .getElementById(id)
    .addEventListener(
      'change',
      renderEmployees
    );

});


document
  .getElementById('resetFilters')
  .addEventListener(
    'click',
    () => {

      [
        'filterLocation',
        'filterDepartment',
        'filterManager',
        'filterStatus'
      ].forEach(id => {

        document
          .getElementById(id)
          .value = 'all';

      });


      document
        .getElementById('globalSearch')
        .value = '';


      document
        .getElementById('employeeSearch')
        .value = '';


      renderEmployees();

    }
  );


renderEmployees();


/* =========================
   EMPLOYEE 360 DRAWER
========================= */

function openEmployee(id) {

  const e =
    HR_DATA.employees.find(
      x => x.id === id
    );


  if (!e) return;


  document
    .getElementById('drawerName')
    .textContent = e.name;


  document
    .getElementById('drawerRole')
    .textContent =
      `${e.role} · ${e.department}`;


  document
    .getElementById('drawerBody')
    .innerHTML = `

      <div class="profile-grid">

        ${profileCard('Manager', e.manager)}

        ${profileCard('Location', e.location)}

        ${profileCard('Joining Date', e.joining)}

        ${profileCard('Tenure', e.tenure)}

        ${profileCard('Attendance', e.attendance + '%')}

        ${profileCard('KRA Score', e.kra + '%')}

        ${profileCard('Status', e.status)}

        ${profileCard('Band', e.band)}

        ${profileCard('Leave Balance', e.leave)}

        ${profileCard('Training', e.training)}

        ${profileCard('Recognition', e.recognition)}

      </div>


      <div class="profile-section">

        <h4>
          Employee Timeline
        </h4>


        ${e.timeline.map(t => {

          const split =
            t.split(' · ');


          return `

            <div class="timeline-item">

              <strong>
                ${split[0]}
              </strong>

              ${split[1] || ''}

            </div>

          `;

        }).join('')}

      </div>

    `;


  document
    .getElementById('employeeDrawer')
    .classList
    .add('open');


  document
    .getElementById('drawerOverlay')
    .classList
    .add('open');

}


function profileCard(label, value) {

  return `

    <div class="profile-card">

      <div class="profile-label">
        ${label}
      </div>

      <div class="profile-value">
        ${value}
      </div>

    </div>

  `;

}


function closeDrawer() {

  document
    .getElementById('employeeDrawer')
    .classList
    .remove('open');


  document
    .getElementById('drawerOverlay')
    .classList
    .remove('open');

}


document
  .getElementById('drawerClose')
  .addEventListener(
    'click',
    closeDrawer
  );


document
  .getElementById('drawerOverlay')
  .addEventListener(
    'click',
    closeDrawer
  );


/* =========================
   RECRUITMENT
========================= */

/* Recruitment is now the existing Apps Script TA Panel embedded in index.html.
   No JSON/fetch layer is required here. */

function toggleSidebar() {
  if (window.innerWidth <= 760) {
    document.body.classList.toggle('mobile-menu-open');
    return;
  }

  document.body.classList.toggle('sidebar-collapsed');
}

function recruitmentFrameLoaded() {
  /* Kept intentionally light: iframe itself is the live dashboard. */
}

function refreshRecruitmentDashboard() {
  const frame = document.getElementById('recruitmentFrame');
  if (!frame) return;

  frame.src = 'https://script.google.com/a/macros/euronics.co.in/s/AKfycbxA8vc8YBnpl1u3lbi8L-K_jHOKVXJPc3j1h1Ggs7c_M2MhpUFxFSGZFDyy88zMLTPg/exec?refresh=' + Date.now();
}

/* Mobile hamburger remains available even when the sidebar is off canvas. */
(function createMobileMenuButton() {
  if (document.querySelector('.mobile-menu-fab')) return;

  const btn = document.createElement('button');
  btn.className = 'mobile-menu-fab';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Open navigation');
  btn.innerHTML = '&#9776;';
  btn.addEventListener('click', toggleSidebar);
  document.body.appendChild(btn);
})();

/* Default desktop view: compact sidebar. */
if (window.innerWidth > 760) {
  document.body.classList.add('sidebar-collapsed');
}

/* =========================
   PERFORMANCE
========================= */

document.getElementById('performanceKpis').innerHTML = [

  kpi(
    'Avg KRA Score',
    '78%',
    'Company-wide'
  ),

  kpi(
    'Green',
    '71%',
    'Healthy workforce'
  ),

  kpi(
    'Yellow',
    '18%',
    'Coaching required',
    'warn'
  ),

  kpi(
    'Red / PIP',
    '11%',
    'Immediate action'
  )

].join('');


document.getElementById('performanceMatrix').innerHTML = `

  <div class="matrix-row matrix-head">

    <div>Employee</div>
    <div>Attendance</div>
    <div>KRA</div>
    <div>Status</div>
    <div>Manager</div>

  </div>


  ${HR_DATA.employees
    .slice(0, 8)
    .map(e => `

      <div class="matrix-row">

        <div class="matrix-name">
          ${e.name}
        </div>

        <div>
          ${e.attendance}%
        </div>

        <div>
          ${e.kra}%
        </div>

        <div>

          <span
            class="status-pill
            status-${e.status.toLowerCase()}"
          >
            ${e.status}
          </span>

        </div>

        <div>
          ${e.manager}
        </div>

      </div>

    `)
    .join('')}

`;


/* =========================
   PAYROLL
========================= */

document.getElementById('payrollKpis').innerHTML = [

  kpi(
    'Payroll Cost',
    '₹1.42 Cr/mo',
    'Excl Directors'
  ),

  kpi(
    'OT Cost',
    '₹4.8 L',
    '▲ 6% vs Jun',
    'warn'
  ),

  kpi(
    'Comp Ratio',
    '0.96',
    'Vs band midpoint'
  ),

  kpi(
    'Increment Budget',
    '68%',
    'FY26-27 utilised'
  )

].join('');


makeLineChart(
  'payrollChart',
  ['Apr', 'May', 'Jun', 'Jul', 'Aug'],
  [1.34, 1.36, 1.39, 1.42, 1.44],
  'Payroll ₹Cr'
);


/* =========================================================
   L&D / EUROVERSITY - LIVE PROFESSIONAL DASHBOARD
========================================================= */

const LND_API_URL =
  'https://script.google.com/macros/s/AKfycbxqmkCfNuLBmohAKGlFR9W8R8rdqXqlJkHn5kt0xLio3n37J2JhGndSyhIJ2Mu3gqMw3Q/exec';


let lndRows = [];
let lndLoaded = false;
let lndGroupFilter = 'all';

const LND_CHARTS = {};


const LND_COLORS = {

  teal: '#17616E',

  tealDeep: '#0F444E',

  green: '#70AD47',

  amber: '#FFC000',

  navy: '#1F3864',

  light: '#EEF1F4',

  muted: '#5B6472'

};


/* =========================================================
   HELPERS
========================================================= */

function lndClean(value){

  return String(
    value === undefined ||
    value === null
      ? ''
      : value
  ).trim();

}


function lndNumber(value){

  const cleaned =
    lndClean(value)
      .replace(/,/g,'')
      .replace(/%/g,'');

  const num =
    parseFloat(cleaned);

  return Number.isFinite(num)
    ? num
    : null;

}


function lndEscape(value){

  return lndClean(value)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');

}


function lndDate(value){

  let text =
    lndClean(value);

  if(!text){
    return null;
  }

  text =
    text
      .replace(
        /(\d+)(st|nd|rd|th)/gi,
        '$1'
      )
      .replace(/\s+/g,' ')
      .trim();

  if(!/\b\d{4}\b/.test(text)){
    text += ' 2026';
  }

  const d =
    new Date(text);

  return Number.isNaN(
    d.getTime()
  )
    ? null
    : d;

}


function lndIsPresent(row){

  return (
    lndClean(
      row.Attendance
    ).toLowerCase()
    ===
    'present'
  );

}


function lndIsActive(row){

  return (
    lndClean(
      row.Status
    ).toLowerCase()
    !==
    'not active'
  );

}


function lndEmployeeKey(row){

  return (
    lndClean(row['Employee ID']) ||
    lndClean(row['Employee ID 2']) ||
    lndClean(row.Attendees).toLowerCase()
  );

}


function lndAverage(values){

  const valid =
    values.filter(
      value =>
        value !== null &&
        Number.isFinite(value)
    );

  if(!valid.length){
    return null;
  }

  return (
    valid.reduce(
      (sum,value) =>
        sum + value,
      0
    )
    /
    valid.length
  );

}


function lndUnique(values){

  return [
    ...new Set(
      values
        .map(lndClean)
        .filter(Boolean)
    )
  ];

}


function destroyLndChart(id){

  if(
    LND_CHARTS[id]
  ){

    LND_CHARTS[id].destroy();

    delete LND_CHARTS[id];

  }

}


/* =========================================================
   LIVE FETCH
========================================================= */

let lndRequestTimer = null;

function setLndStatus(text, type = '') {
  const status = __nativeGetElementById('learningLiveStatus');
  if (!status) return;

  status.textContent = text;
  status.classList.remove('live', 'error');
  if (type) status.classList.add(type);
}

function loadLndLive(force = false) {
  if (lndLoaded && !force) {
    renderLndDashboard();
    return;
  }

  setLndStatus('Connecting...');

  const recordCount = __nativeGetElementById('lndHeaderRecordCount');
  if (recordCount) recordCount.textContent = '-';

  const previous = __nativeGetElementById('lndJsonpScript');
  if (previous) previous.remove();

  if (lndRequestTimer) clearTimeout(lndRequestTimer);

  window.receiveLndData = function(payload) {
    console.log('L&D JSONP response:', payload);

    if (lndRequestTimer) clearTimeout(lndRequestTimer);

    try {
      if (!payload || payload.ok !== true) {
        throw new Error((payload && payload.error) || 'L&D API returned an invalid response');
      }

      if (!Array.isArray(payload.rows)) {
        throw new Error('rows[] missing from L&D response');
      }

      lndRows = payload.rows;
      lndLoaded = true;

      if (recordCount) {
        recordCount.textContent = payload.rowCount ?? lndRows.length;
      }

      setLndStatus('● Live', 'live');
      initialiseLndFilters();
      renderLndDashboard();

      console.log('L&D dashboard loaded successfully:', lndRows.length, 'records');
    } catch (error) {
      console.error('L&D response processing failed:', error);
      setLndStatus('Data Error', 'error');
    }
  };

  const script = document.createElement('script');
  script.id = 'lndJsonpScript';

  const separator = LND_API_URL.includes('?') ? '&' : '?';
  script.src =
    LND_API_URL +
    separator +
    'callback=receiveLndData' +
    '&_=' +
    Date.now();

  script.async = true;

  script.onload = function() {
    console.log('L&D JSONP script loaded:', script.src);
  };

  script.onerror = function(event) {
    console.error('Unable to load L&D JSONP endpoint:', event, script.src);
    if (lndRequestTimer) clearTimeout(lndRequestTimer);
    setLndStatus('Connection Failed', 'error');
  };

  document.head.appendChild(script);

  lndRequestTimer = setTimeout(function() {
    if (!lndLoaded) {
      console.error('L&D request timeout. URL:', script.src);
      setLndStatus('Connection Timeout', 'error');
    }
  }, 15000);
}


/* =========================================================
   FILTER SETUP
========================================================= */

function populateLndSelect(
  id,
  values,
  firstLabel
){

  const el =
    document.getElementById(id);


  if(!el){
    return;
  }


  el.innerHTML =

    '<option value="all">' +
    firstLabel +
    '</option>' +

    lndUnique(values)
      .sort(
        (a,b) =>
          a.localeCompare(b)
      )
      .map(
        value =>

          '<option value="' +
          lndEscape(value) +
          '">' +

          lndEscape(value) +

          '</option>'

      )
      .join('');

}


function initialiseLndFilters(){

  populateLndSelect(
    'lndRegion',
    lndRows.map(
      row => row.Region
    ),
    'Region: All'
  );


  populateLndSelect(
    'lndBranch',
    lndRows.map(
      row =>
        row['Branch Name']
    ),
    'Branch: All'
  );


  populateLndSelect(
    'lndMode',
    lndRows.map(
      row => row.Mode
    ),
    'Mode: All'
  );


  populateLndSelect(
    'lndTopic',
    lndRows.map(
      row =>
        row['Training Topic']
    ),
    'All Training Topics'
  );

}


function setLndGroupFilter(
  group,
  button
){

  lndGroupFilter =
    group;


  document
    .querySelectorAll(
      '.lnd-chip'
    )
    .forEach(
      el =>
        el.classList.remove(
          'active'
        )
    );


  button.classList.add(
    'active'
  );


  renderLndDashboard();

}


/* =========================================================
   FILTER DATA
========================================================= */

function getFilteredLndRows(){

  const search =
    lndClean(
      document.getElementById(
        'lndSearch'
      )?.value
    ).toLowerCase();


  const region =
    document.getElementById(
      'lndRegion'
    )?.value ||
    'all';


  const branch =
    document.getElementById(
      'lndBranch'
    )?.value ||
    'all';


  const mode =
    document.getElementById(
      'lndMode'
    )?.value ||
    'all';


  const topic =
    document.getElementById(
      'lndTopic'
    )?.value ||
    'all';


  const attendance =
    document.getElementById(
      'lndAttendance'
    )?.value ||
    'all';


  return lndRows.filter(
    row => {

      const group =
        lndClean(
          row.Group
        );


      const text =
        [

          row.Attendees,

          row[
            'Training Topic'
          ],

          row[
            'Branch Name'
          ],

          row.Region,

          row.L1,

          row.L2

        ]
        .map(lndClean)
        .join(' ')
        .toLowerCase();


      return (

        (
          !search ||
          text.includes(search)
        )

        &&

        (
          region === 'all' ||
          lndClean(
            row.Region
          ) === region
        )

        &&

        (
          branch === 'all' ||
          lndClean(
            row[
              'Branch Name'
            ]
          ) === branch
        )

        &&

        (
          mode === 'all' ||
          lndClean(
            row.Mode
          ) === mode
        )

        &&

        (
          topic === 'all' ||
          lndClean(
            row[
              'Training Topic'
            ]
          ) === topic
        )

        &&

        (
          attendance === 'all' ||
          lndClean(
            row.Attendance
          ) === attendance
        )

        &&

        (
          lndGroupFilter === 'all' ||
          group
            .toLowerCase()
            .includes(
              lndGroupFilter
                .toLowerCase()
            )
        )

      );

    }
  );

}


/* =========================================================
   KPI CARDS
========================================================= */

function renderProfessionalLndKpis(rows){

  const active =
    rows.filter(
      lndIsActive
    );


  const present =
    active.filter(
      lndIsPresent
    );


  const employees =
    new Set(
      active
        .map(
          lndEmployeeKey
        )
        .filter(Boolean)
    );


  const trained =
    new Set(
      present
        .map(
          lndEmployeeKey
        )
        .filter(Boolean)
    );


  const totalEmployees =
    employees.size;


  const employeesTrained =
    trained.size;


  const coverage =
    totalEmployees
      ?
        employeesTrained /
        totalEmployees *
        100
      :
        0;


  const hours =
    present.reduce(
      (sum,row) =>

        sum +
        (
          lndNumber(
            row[
              'Duration (in hours)'
            ]
          )
          || 0
        ),

      0
    );


  const avgHours =
    employeesTrained
      ?
        hours /
        employeesTrained
      :
        0;


  const programs =
    new Set(

      present.map(
        row =>

          [

            row[
              'Training Topic'
            ],

            row.Date,

            row[
              'Branch Name'
            ]

          ]
          .map(lndClean)
          .join('|')

      )

    ).size;


  const attended =
    rows.filter(
      lndIsPresent
    ).length;


  const absent =
    rows.filter(
      row =>
        lndClean(
          row.Attendance
        ).toLowerCase()
        ===
        'absent'
    ).length;


  const completion =
    attended + absent
      ?
        attended /
        (
          attended +
          absent
        )
        *
        100
      :
        0;


  const feedback =
    lndAverage(
      rows.map(
        row =>
          lndNumber(
            row[
              'Feedback Score'
            ]
          )
      )
    );


  const assessment =
    lndAverage(
      rows.map(
        row =>
          lndNumber(
            row[
              'Assesment Score'
            ]
          )
      )
    );


  const data = [

    {
      title:
        'Total Employees',

      value:
        totalEmployees,

      sub:
        'Active employee population',

      accent:
        LND_COLORS.teal
    },

    {
      title:
        'Employees Trained',

      value:
        employeesTrained,

      sub:
        'Unique employees attended training',

      accent:
        LND_COLORS.teal
    },

    {
      title:
        'Training Coverage %',

      value:
        coverage.toFixed(1) +
        '%',

      sub:
        'Trained ÷ active employees',

      accent:
        LND_COLORS.green
    },

    {
      title:
        'Total Learning Hours',

      value:
        hours.toFixed(1),

      sub:
        'Aggregate learning hours',

      accent:
        LND_COLORS.teal
    },

    {
      title:
        'Avg. Hours / Employee',

      value:
        avgHours.toFixed(1),

      sub:
        'Learning hours per employee',

      accent:
        LND_COLORS.navy
    },

    {
      title:
        'Programs Conducted',

      value:
        programs,

      sub:
        'Unique training sessions',

      accent:
        LND_COLORS.amber
    },

    {
      title:
        'Completion Rate %',

      value:
        completion.toFixed(1) +
        '%',

      sub:
        attended +
        ' present · ' +
        absent +
        ' absent',

      accent:
        LND_COLORS.green
    },

    {
      title:
        'Avg. Training Rating',

      value:
        feedback === null
          ? '-'
          : feedback.toFixed(1) +
            ' / 5',

      sub:
        'Participant feedback',

      accent:
        LND_COLORS.amber
    },

    {
      title:
        'Assessment Score',

      value:
        assessment === null
          ? '-'
          : assessment.toFixed(1) +
            '%',

      sub:
        'Average assessment score',

      accent:
        LND_COLORS.navy
    }

  ];


  const target =
    document.getElementById(
      'learningKpis'
    );


  if(!target){
    return;
  }


  target.innerHTML =
    data.map(
      item => `

        <div
          class="lnd-kpi-card"
          style="--accent:${item.accent}"
        >

          <div class="title">
            ${item.title}
          </div>

          <div class="value">
            ${item.value}
          </div>

          <div class="sub">
            ${item.sub}
          </div>

        </div>

      `
    )
    .join('');

}


/* =========================================================
   MONTHLY DATA
========================================================= */

function getLndMonthly(rows){

  const map = {};


  rows.forEach(
    row => {

      const date =
        lndDate(
          row.Date
        );


      if(!date){
        return;
      }


      const key =
        date.getFullYear() +
        '-' +
        String(
          date.getMonth() + 1
        ).padStart(
          2,
          '0'
        );


      if(!map[key]){

        map[key] = {

          hours:0,

          sessions:
            new Set(),

          employees:
            new Set(),

          activeEmployees:
            new Set(),

          assessment:[]

        };

      }


      const item =
        map[key];


      if(
        lndIsActive(row)
      ){

        item.activeEmployees.add(
          lndEmployeeKey(row)
        );

      }


      if(
        lndIsPresent(row)
      ){

        item.employees.add(
          lndEmployeeKey(row)
        );


        item.hours +=

          lndNumber(
            row[
              'Duration (in hours)'
            ]
          )
          || 0;


        item.sessions.add(

          [

            row[
              'Training Topic'
            ],

            row.Date,

            row[
              'Branch Name'
            ]

          ]
          .map(lndClean)
          .join('|')

        );

      }


      const assessment =
        lndNumber(
          row[
            'Assesment Score'
          ]
        );


      if(
        assessment !== null
      ){

        item.assessment.push(
          assessment
        );

      }

    }
  );


  return Object
    .keys(map)
    .sort()
    .map(
      key => {

        const [
          year,
          month
        ] =
          key.split('-');


        const item =
          map[key];


        return {

          key,

          label:
            new Date(
              Number(year),
              Number(month) - 1,
              1
            )
            .toLocaleString(
              'en-IN',
              {
                month:'short'
              }
            ),

          hours:
            Number(
              item.hours
                .toFixed(1)
            ),

          programs:
            item.sessions.size,

          coverage:
            item.activeEmployees.size
              ?
                item.employees.size /
                item.activeEmployees.size *
                100
              :
                0,

          assessment:
            lndAverage(
              item.assessment
            )

        };

      }
    );

}


/* =========================================================
   CHARTS
========================================================= */

function renderLndCharts(rows){

  Chart.defaults.font.family =
    "'Segoe UI','Inter',sans-serif";

  Chart.defaults.color =
    '#5B6472';

  Chart.defaults.font.size =
    11;


  const monthly =
    getLndMonthly(rows);


  const labels =
    monthly.map(
      item =>
        item.label
    );


  /* HOURS + PROGRAMS */

  destroyLndChart(
    'hoursPrograms'
  );


  const hoursCanvas =
    document.getElementById(
      'lndHoursProgramsChart'
    );


  if(hoursCanvas){

    LND_CHARTS.hoursPrograms =
      new Chart(
        hoursCanvas,
        {

          type:'bar',

          data:{

            labels,

            datasets:[

              {

                label:
                  'Learning Hours',

                data:
                  monthly.map(
                    item =>
                      item.hours
                  ),

                backgroundColor:
                  LND_COLORS.teal,

                borderRadius:4,

                maxBarThickness:30,

                yAxisID:'y'

              },

              {

                label:
                  'Programs Conducted',

                type:'line',

                data:
                  monthly.map(
                    item =>
                      item.programs
                  ),

                borderColor:
                  LND_COLORS.amber,

                backgroundColor:
                  LND_COLORS.amber,

                tension:.35,

                pointRadius:3,

                yAxisID:'y1'

              }

            ]

          },

          options:{

            responsive:true,

            maintainAspectRatio:false,

            plugins:{

              legend:{

                position:'bottom',

                labels:{
                  boxWidth:10,
                  padding:14
                }

              }

            },

            scales:{

              x:{
                grid:{
                  display:false
                }
              },

              y:{

                beginAtZero:true,

                grid:{
                  color:'#EEF1F4'
                },

                title:{
                  display:true,
                  text:'Hours'
                }

              },

              y1:{

                beginAtZero:true,

                position:'right',

                grid:{
                  display:false
                },

                title:{
                  display:true,
                  text:'Programs'
                }

              }

            }

          }

        }
      );

  }


  /* COVERAGE */

  destroyLndChart(
    'coverage'
  );


  const coverageCanvas =
    document.getElementById(
      'lndCoverageChart'
    );


  if(coverageCanvas){

    LND_CHARTS.coverage =
      new Chart(
        coverageCanvas,
        {

          type:'line',

          data:{

            labels,

            datasets:[{

              label:
                'Coverage %',

              data:
                monthly.map(
                  item =>
                    Number(
                      item.coverage
                        .toFixed(1)
                    )
                ),

              borderColor:
                LND_COLORS.teal,

              backgroundColor:
                'rgba(23,97,110,.12)',

              fill:true,

              tension:.4,

              pointRadius:3

            }]

          },

          options:{

            responsive:true,

            maintainAspectRatio:false,

            plugins:{
              legend:{
                display:false
              }
            },

            scales:{

              x:{
                grid:{
                  display:false
                }
              },

              y:{

                beginAtZero:true,

                max:100,

                grid:{
                  color:'#EEF1F4'
                },

                ticks:{
                  callback:
                    value =>
                      value + '%'
                }

              }

            }

          }

        }
      );

  }


  /* COMPLETION */

  destroyLndChart(
    'completion'
  );


  const present =
    rows.filter(
      lndIsPresent
    ).length;


  const absent =
    rows.filter(
      row =>
        lndClean(
          row.Attendance
        ).toLowerCase()
        ===
        'absent'
    ).length;


  const total =
    present + absent;


  const completion =
    total
      ?
        present /
        total *
        100
      :
        0;


  const completionCanvas =
    document.getElementById(
      'lndCompletionChart'
    );


  if(completionCanvas){

    LND_CHARTS.completion =
      new Chart(
        completionCanvas,
        {

          type:'doughnut',

          data:{

            labels:[
              'Present',
              'Absent'
            ],

            datasets:[{

              data:[

                completion,

                100 -
                completion

              ],

              backgroundColor:[

                LND_COLORS.green,

                '#EEF1F4'

              ],

              borderWidth:0

            }]

          },

          options:{

            responsive:true,

            maintainAspectRatio:false,

            cutout:'72%',

            plugins:{

              legend:{

                position:'bottom',

                labels:{
                  boxWidth:10
                }

              }

            }

          }

        }
      );

  }


  /* RATING BY TOPIC */

  destroyLndChart(
    'rating'
  );


  const topicRatings = {};


  rows.forEach(
    row => {

      const topic =
        lndClean(
          row[
            'Training Topic'
          ]
        );


      const rating =
        lndNumber(
          row[
            'Feedback Score'
          ]
        );


      if(
        !topic ||
        rating === null
      ){
        return;
      }


      if(!topicRatings[topic]){

        topicRatings[topic] =
          [];

      }


      topicRatings[topic]
        .push(
          rating
        );

    }
  );


  const ratingData =
    Object
      .entries(
        topicRatings
      )
      .map(
        ([topic,values]) => ({

          topic,

          rating:
            lndAverage(
              values
            )

        })
      )
      .sort(
        (a,b) =>
          b.rating -
          a.rating
      )
      .slice(
        0,
        5
      );


  const ratingCanvas =
    document.getElementById(
      'lndRatingChart'
    );


  if(ratingCanvas){

    LND_CHARTS.rating =
      new Chart(
        ratingCanvas,
        {

          type:'bar',

          data:{

            labels:
              ratingData.map(
                item =>
                  item.topic
              ),

            datasets:[{

              data:
                ratingData.map(
                  item =>
                    Number(
                      item.rating
                        .toFixed(1)
                    )
                ),

              backgroundColor:
                LND_COLORS.amber,

              borderRadius:4,

              maxBarThickness:26

            }]

          },

          options:{

            indexAxis:'y',

            responsive:true,

            maintainAspectRatio:false,

            plugins:{
              legend:{
                display:false
              }
            },

            scales:{

              x:{

                beginAtZero:true,

                max:5,

                grid:{
                  color:'#EEF1F4'
                }

              },

              y:{
                grid:{
                  display:false
                }
              }

            }

          }

        }
      );

  }


  /* ASSESSMENT */

  destroyLndChart(
    'assessment'
  );


  const assessmentCanvas =
    document.getElementById(
      'lndAssessmentChart'
    );


  if(assessmentCanvas){

    LND_CHARTS.assessment =
      new Chart(
        assessmentCanvas,
        {

          type:'line',

          data:{

            labels,

            datasets:[{

              label:
                'Assessment %',

              data:
                monthly.map(
                  item =>
                    item.assessment === null
                      ? null
                      : Number(
                          item.assessment
                            .toFixed(1)
                        )
                ),

              borderColor:
                LND_COLORS.navy,

              backgroundColor:
                'rgba(31,56,100,.08)',

              fill:true,

              tension:.4,

              pointRadius:3

            }]

          },

          options:{

            responsive:true,

            maintainAspectRatio:false,

            plugins:{
              legend:{
                display:false
              }
            },

            scales:{

              x:{
                grid:{
                  display:false
                }
              },

              y:{

                beginAtZero:true,

                max:100,

                grid:{
                  color:'#EEF1F4'
                },

                ticks:{
                  callback:
                    value =>
                      value + '%'
                }

              }

            }

          }

        }
      );

  }

}


/* =========================================================
   REGION TABLE
========================================================= */

function renderLndRegionTable(rows){

  const map = {};


  rows.forEach(
    row => {

      const region =
        lndClean(
          row.Region
        ) ||
        'Unknown';


      if(!map[region]){

        map[region] = {

          employees:
            new Set(),

          hours:0,

          present:0,

          absent:0,

          assessment:[],

          feedback:[]

        };

      }


      const item =
        map[region];


      if(
        lndIsPresent(row)
      ){

        item.employees.add(
          lndEmployeeKey(row)
        );


        item.present++;


        item.hours +=

          lndNumber(
            row[
              'Duration (in hours)'
            ]
          )
          || 0;

      }


      if(
        lndClean(
          row.Attendance
        ).toLowerCase()
        ===
        'absent'
      ){

        item.absent++;

      }


      const assessment =
        lndNumber(
          row[
            'Assesment Score'
          ]
        );


      if(
        assessment !== null
      ){

        item.assessment.push(
          assessment
        );

      }


      const feedback =
        lndNumber(
          row[
            'Feedback Score'
          ]
        );


      if(
        feedback !== null
      ){

        item.feedback.push(
          feedback
        );

      }

    }
  );


  const target =
    document.getElementById(
      'lndRegionTableBody'
    );


  if(!target){
    return;
  }


  target.innerHTML =

    Object
      .entries(map)

      .sort(
        (a,b) =>
          b[1].employees.size -
          a[1].employees.size
      )

      .map(
        ([region,item]) => {


          const total =
            item.present +
            item.absent;


          const attendance =
            total
              ?
                item.present /
                total *
                100
              :
                0;


          const assessment =
            lndAverage(
              item.assessment
            );


          const feedback =
            lndAverage(
              item.feedback
            );


          let status =
            {
              text:'On Track',
              cls:'green'
            };


          if(
            attendance <
            75
          ){

            status = {
              text:'At Risk',
              cls:'red'
            };

          }else if(
            attendance <
            85
          ){

            status = {
              text:'Watch',
              cls:'amber'
            };

          }


          return `

            <tr>

              <td>
                <strong>
                  ${lndEscape(region)}
                </strong>
              </td>

              <td>
                ${item.employees.size}
              </td>

              <td>
                ${item.hours.toFixed(1)}
              </td>

              <td>

                <div class="lnd-progress-cell">

                  <div class="lnd-progress">

                    <div
                      class="lnd-progress-fill"
                      style="width:${attendance}%"
                    ></div>

                  </div>

                  <span>
                    ${attendance.toFixed(0)}%
                  </span>

                </div>

              </td>

              <td>
                ${
                  assessment === null
                    ? '-'
                    : assessment.toFixed(1) +
                      '%'
                }
              </td>

              <td>
                ${
                  feedback === null
                    ? '-'
                    : feedback.toFixed(1)
                }
              </td>

              <td>

                <span
                  class="lnd-status-tag ${status.cls}"
                >
                  ${status.text}
                </span>

              </td>

            </tr>

          `;

        }
      )
      .join('');

}


/* =========================================================
   REGISTER
========================================================= */

function renderLndRegister(rows){

  const target =
    document.getElementById(
      'lndAttendanceBody'
    );


  const count =
    document.getElementById(
      'lndVisibleCount'
    );


  if(count){

    count.textContent =
      rows.length;

  }


  if(!target){
    return;
  }


  const sorted =
    [...rows]
      .sort(
        (a,b) => {

          const da =
            lndDate(
              a.Date
            );

          const db =
            lndDate(
              b.Date
            );


          return (

            (
              db
                ? db.getTime()
                : 0
            )

            -

            (
              da
                ? da.getTime()
                : 0
            )

          );

        }
      );


  target.innerHTML =

    sorted.map(
      row => {


        const attendance =
          lndClean(
            row.Attendance
          );


        const tagClass =
          attendance
            .toLowerCase()
            ===
            'present'

            ?
              'green'

            :
              'red';


        return `

          <tr>

            <td>
              ${lndEscape(row.Date)}
            </td>

            <td>

              <strong>
                ${lndEscape(
                  row.Attendees
                )}
              </strong>

            </td>

            <td>
              ${lndEscape(
                row.Region
              )}
            </td>

            <td>
              ${lndEscape(
                row[
                  'Branch Name'
                ]
              )}
            </td>

            <td>
              ${lndEscape(
                row[
                  'Training Topic'
                ]
              )}
            </td>

            <td>
              ${lndEscape(
                row.Mode
              )}
            </td>

            <td>
              ${lndEscape(
                row[
                  'Duration (in hours)'
                ]
              )}
            </td>

            <td>

              <span
                class="lnd-status-tag ${tagClass}"
              >
                ${attendance}
              </span>

            </td>

            <td>
              ${
                lndEscape(
                  row[
                    'Assesment Score'
                  ]
                ) ||
                '-'
              }
            </td>

            <td>
              ${
                lndEscape(
                  row[
                    'Feedback Score'
                  ]
                ) ||
                '-'
              }
            </td>

            <td>
              ${lndEscape(
                row.L1
              )}
            </td>

          </tr>

        `;

      }
    )
    .join('');

}


/* =========================================================
   MASTER RENDER
========================================================= */

function renderLndDashboard(){

  const rows =
    getFilteredLndRows();


  renderProfessionalLndKpis(
    rows
  );


  renderLndCharts(
    rows
  );


  renderLndRegionTable(
    rows
  );


  renderLndRegister(
    rows
  );

}


/* =========================================================
   EVENTS
========================================================= */

[

  'lndSearch',

  'lndRegion',

  'lndBranch',

  'lndMode',

  'lndTopic',

  'lndAttendance'

]
.forEach(
  id => {

    const el =
      document.getElementById(
        id
      );


    if(!el){
      return;
    }


    el.addEventListener(

      id ===
      'lndSearch'
        ?
          'input'
        :
          'change',

      renderLndDashboard

    );

  }
);


loadLndLive(false);


/* =========================
   COMPLIANCE
========================= */

document.getElementById('complianceKpis').innerHTML = [

  kpi(
    'PF Compliance',
    '100%',
    'On-time filing'
  ),

  kpi(
    'ESI Compliance',
    '100%',
    'On-time filing'
  ),

  kpi(
    'POSH Cases',
    '0',
    'No pending cases'
  ),

  kpi(
    'Audit Pending',
    '1',
    'Factories Act · Aug',
    'warn'
  )

].join('');


document.getElementById('complianceList').innerHTML = [

  [
    'PF Filing',
    'Compliant',
    'Green'
  ],

  [
    'ESI Filing',
    'Compliant',
    'Green'
  ],

  [
    'POSH Committee',
    'Compliant',
    'Green'
  ],

  [
    'Factories Act Audit',
    'Scheduled — August',
    'Yellow'
  ]

].map(r => `

  <div class="compliance-row">

    <div>

      <div class="health-name">
        ${r[0]}
      </div>

      <div class="health-meta">
        ${r[1]}
      </div>

    </div>

    <span
      class="status-pill
      status-${r[2].toLowerCase()}"
    >
      ${r[2]}
    </span>

  </div>

`).join('');


/* =========================
   ALERT CENTRE
========================= */

document.getElementById('alertTableBody').innerHTML =

  HR_DATA.alerts.map(a => `

    <tr>

      <td>

        <span
          class="priority-pill
          priority-${a.priority.toLowerCase()}"
        >
          ${a.priority}
        </span>

      </td>


      <td>

        <strong>
          ${a.action}
        </strong>

      </td>


      <td>
        ${a.owner}
      </td>


      <td>
        ${a.due}
      </td>


      <td>

        <span
          class="status-pill
          status-${a.status
            .toLowerCase()
            .replaceAll(' ', '')}"
        >
          ${a.status}
        </span>

      </td>


      <td>

        <button class="view-btn">
          Open
        </button>

      </td>

    </tr>

  `).join('');
  /* =========================================================
   EMPLOYEE CRM + ATTENDANCE
   UI STRUCTURE ONLY
========================================================= */

const HR_STRUCTURE_CHARTS = {};


function createStructureChart(
  id,
  config
){

  const el =
    document.getElementById(id);

  if(
    !el ||
    typeof Chart === 'undefined'
  ){
    return;
  }

  if(
    HR_STRUCTURE_CHARTS[id]
  ){
    HR_STRUCTURE_CHARTS[id]
      .destroy();
  }

  HR_STRUCTURE_CHARTS[id] =
    new Chart(
      el,
      config
    );

}


/* EMPLOYEE CRM */

function renderEmployeeStructureCharts(){

  createStructureChart(
    'employeeDeptChart',
    {

      type:'bar',

      data:{

        labels:[
          'Sales',
          'Service',
          'Admin',
          'Assembly',
          'Warehouse',
          'Others'
        ],

        datasets:[{

          data:[
            148,
            99,
            31,
            23,
            18,
            139
          ],

          backgroundColor:
            '#17616e',

          borderRadius:5

        }]

      },

      options:{

        responsive:true,
        maintainAspectRatio:false,

        plugins:{
          legend:{
            display:false
          }
        },

        scales:{

          x:{
            grid:{
              display:false
            }
          },

          y:{
            beginAtZero:true,
            grid:{
              color:'#eef2f3'
            }
          }

        }

      }

    }
  );


  createStructureChart(
    'employeeLocationChart',
    {

      type:'bar',

      data:{

        labels:[
          'Gurgaon',
          'Delhi',
          'Mumbai',
          'Bangalore',
          'Ahmedabad'
        ],

        datasets:[{

          data:[
            210,
            74,
            68,
            59,
            47
          ],

          backgroundColor:
            '#2a8a9e',

          borderRadius:5

        }]

      },

      options:{

        responsive:true,
        maintainAspectRatio:false,

        plugins:{
          legend:{
            display:false
          }
        },

        scales:{

          x:{
            grid:{
              display:false
            }
          },

          y:{
            beginAtZero:true,
            grid:{
              color:'#eef2f3'
            }
          }

        }

      }

    }
  );


  createStructureChart(
    'employeeTenureChart',
    {

      type:'bar',

      data:{

        labels:[
          '<1 Yr',
          '1-3 Yrs',
          '3-5 Yrs',
          '5-8 Yrs',
          '8+ Yrs'
        ],

        datasets:[{

          data:[
            63,
            174,
            116,
            72,
            33
          ],

          backgroundColor:
            '#3875b7',

          borderRadius:5

        }]

      },

      options:{

        responsive:true,
        maintainAspectRatio:false,

        plugins:{
          legend:{
            display:false
          }
        },

        scales:{

          x:{
            grid:{
              display:false
            }
          },

          y:{
            beginAtZero:true,
            grid:{
              color:'#eef2f3'
            }
          }

        }

      }

    }
  );


  createStructureChart(
    'employeeGenderChart',
    {

      type:'doughnut',

      data:{

        labels:[
          'Male',
          'Female'
        ],

        datasets:[{

          data:[
            72,
            28
          ],

          backgroundColor:[
            '#17616e',
            '#ca477b'
          ],

          borderWidth:0

        }]

      },

      options:{

        responsive:true,
        maintainAspectRatio:false,

        cutout:'70%',

        plugins:{

          legend:{
            position:'bottom'
          }

        }

      }

    }
  );

}


/* =========================================================
   KEKA ATTENDANCE - LIVE DASHBOARD
========================================================= */

const ATTENDANCE_API_URL =
  'https://script.google.com/macros/s/AKfycbxWzFltc06j3OmPFG62gtuvbj_SumQe3dvbPCcc5BurhqyXeeqRTXJjutzNKStXSJl-/exec';


let attendancePayload = null;
let attendanceLoaded = false;
let attendanceRequestTimer = null;

const ATTENDANCE_CHARTS = {};


/* =========================================================
   HELPERS
========================================================= */

function attendanceNumber(value) {

  const num = Number(value);

  return Number.isFinite(num)
    ? num
    : 0;

}


function attendanceFormatNumber(value) {

  return attendanceNumber(value)
    .toLocaleString('en-IN');

}


function attendanceEscape(value) {

  return String(
    value === undefined ||
    value === null
      ? ''
      : value
  )
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

}


function setAttendanceStatus(
  text,
  type = ''
) {

  const el =
    document.getElementById(
      'attendanceLiveStatus'
    );

  if (!el) return;

  el.textContent = text;

  el.classList.remove(
    'live',
    'error'
  );

  if (type) {
    el.classList.add(type);
  }

}


function destroyAttendanceChart(id) {

  /*
    Destroy our stored chart
  */

  if (ATTENDANCE_CHARTS[id]) {

    ATTENDANCE_CHARTS[id]
      .destroy();

    delete ATTENDANCE_CHARTS[id];

  }


  /*
    Also destroy any old placeholder Chart.js
    instance already attached to this canvas.
  */

  if (
    typeof Chart !== 'undefined' &&
    typeof Chart.getChart === 'function'
  ) {

    const existing =
      Chart.getChart(id);

    if (existing) {
      existing.destroy();
    }

  }

}


/* =========================================================
   LOAD LIVE DATA
========================================================= */

function loadAttendanceLive(
  force = false
) {

  if (
    attendanceLoaded &&
    !force
  ) {

    renderLiveAttendanceDashboard();
    return;

  }


  setAttendanceStatus(
    'Connecting...'
  );


  const oldScript =
    document.getElementById(
      'attendanceJsonpScript'
    );

  if (oldScript) {
    oldScript.remove();
  }


  if (attendanceRequestTimer) {

    clearTimeout(
      attendanceRequestTimer
    );

  }


  window.receiveAttendanceData =
    function(payload) {

      if (attendanceRequestTimer) {

        clearTimeout(
          attendanceRequestTimer
        );

      }


      try {

        console.log(
          'Attendance API response:',
          payload
        );


        if (
          !payload ||
          payload.ok !== true
        ) {

          throw new Error(
            payload?.error ||
            'Invalid attendance response'
          );

        }


        if (
          !payload.summary ||
          !Array.isArray(
            payload.departments
          ) ||
          !Array.isArray(
            payload.daily
          )
        ) {

          throw new Error(
            'Attendance response structure is incomplete'
          );

        }


        attendancePayload =
          payload;

        attendanceLoaded =
          true;


        setAttendanceStatus(
          '● Live',
          'live'
        );


        initialiseAttendanceFilters();

        renderLiveAttendanceDashboard();


        console.log(
          'Attendance dashboard loaded:',
          payload.attendanceRecordCount,
          'records'
        );


      } catch (error) {

        console.error(
          'Attendance processing error:',
          error
        );


        setAttendanceStatus(
          'Data Error',
          'error'
        );

      }

    };


  const script =
    document.createElement(
      'script'
    );


  script.id =
    'attendanceJsonpScript';

  script.async =
    true;


  script.src =
    ATTENDANCE_API_URL +
    '?callback=receiveAttendanceData&_=' +
    Date.now();


  script.onerror =
    function(error) {

      console.error(
        'Attendance API connection failed:',
        error
      );


      setAttendanceStatus(
        'Connection Failed',
        'error'
      );

    };


  document.body.appendChild(
    script
  );


  attendanceRequestTimer =
    setTimeout(
      function() {

        if (!attendanceLoaded) {

          setAttendanceStatus(
            'Connection Timeout',
            'error'
          );

        }

      },
      20000
    );

}


/* =========================================================
   FILTERS
========================================================= */

function initialiseAttendanceFilters() {

  if (!attendancePayload) {
    return;
  }


  const deptSelect =
    document.getElementById(
      'attendanceDeptFilter'
    );

  const branchSelect =
    document.getElementById(
      'attendanceLocationFilter'
    );


  if (deptSelect) {

    const current =
      deptSelect.value || 'all';


    deptSelect.innerHTML =
      '<option value="all">All Departments</option>' +

      attendancePayload.departments

        .map(
          row =>
            row.department
        )

        .filter(Boolean)

        .sort()

        .map(
          name => `

            <option value="${attendanceEscape(name)}">
              ${attendanceEscape(name)}
            </option>

          `
        )

        .join('');


    deptSelect.value =
      [...deptSelect.options]
        .some(
          option =>
            option.value === current
        )
        ? current
        : 'all';

  }


  if (branchSelect) {

    const current =
      branchSelect.value || 'all';


    const branches =
      Array.isArray(
        attendancePayload.branches
      )
        ? attendancePayload.branches
        : [];


    branchSelect.innerHTML =
      '<option value="all">All Locations / Branches</option>' +

      branches

        .map(
          row =>
            row.branch
        )

        .filter(Boolean)

        .sort()

        .map(
          name => `

            <option value="${attendanceEscape(name)}">
              ${attendanceEscape(name)}
            </option>

          `
        )

        .join('');


    branchSelect.value =
      [...branchSelect.options]
        .some(
          option =>
            option.value === current
        )
        ? current
        : 'all';

  }


  /*
    Current API is aggregated and does not yet
    return manager-level summaries.

    Keep Manager filter disabled rather than
    showing misleading results.
  */

  const managerSelect =
    document.getElementById(
      'attendanceManagerFilter'
    );

  if (managerSelect) {

    managerSelect.innerHTML =
      '<option value="all">All Managers</option>';

    managerSelect.disabled =
      true;

    managerSelect.title =
      'Manager filter will be enabled when manager-level API aggregation is added.';

  }


  /*
    Status filter is also not required because
    the API summary already contains Present /
    Absent / Other aggregate values.
  */

  const statusSelect =
    document.getElementById(
      'attendanceStatusFilter'
    );

  if (statusSelect) {

    statusSelect.disabled =
      true;

    statusSelect.title =
      'Status filtering will be enabled with record-level filtering.';

  }


  /*
    Current API returns all available dates.
    Period selection is therefore temporarily
    informational only.
  */

  const periodSelect =
    document.getElementById(
      'attendancePeriodFilter'
    );

  if (periodSelect) {

    periodSelect.disabled =
      true;

    periodSelect.title =
      'Period filter will be enabled in the next API version.';

  }


  /*
    Re-render department-related view
    when filter changes.
  */

  if (
    deptSelect &&
    !deptSelect.dataset.liveBound
  ) {

    deptSelect.addEventListener(
      'change',
      renderLiveAttendanceDashboard
    );

    deptSelect.dataset.liveBound =
      '1';

  }


  if (
    branchSelect &&
    !branchSelect.dataset.liveBound
  ) {

    branchSelect.addEventListener(
      'change',
      renderLiveAttendanceDashboard
    );

    branchSelect.dataset.liveBound =
      '1';

  }

}


/* =========================================================
   MAIN RENDER
========================================================= */

function renderLiveAttendanceDashboard() {

  if (!attendancePayload) {
    return;
  }


  renderAttendanceKpis();

  renderAttendanceTrendChart();

  renderAttendanceMixChart();

  renderAttendanceDepartmentChart();

  renderAttendanceBranchChart();

  renderAttendanceDepartmentTable();

  renderAttendanceExceptionTable();

}


/* =========================================================
   KPI CARDS
========================================================= */

function setAttendanceKpi(
  id,
  value
) {

  const el =
    document.getElementById(id);

  if (el) {
    el.innerHTML = value;
  }

}


function renderAttendanceKpis() {

  const data =
    attendancePayload;

  const summary =
    data.summary || {};


  setAttendanceKpi(
    'attKpiOverall',
    attendanceNumber(
      summary.attendancePercent
    ).toFixed(1) + '%'
  );


  setAttendanceKpi(
    'attKpiPresent',
    attendanceFormatNumber(
      summary.present
    )
  );


  setAttendanceKpi(
    'attKpiAbsent',
    attendanceFormatNumber(
      summary.absent
    )
  );


  /*
    Third card:
    use API "other" records.
  */

  setAttendanceKpi(
    'attKpiLeave',
    attendanceFormatNumber(
      summary.other
    )
  );


  /*
    Fourth card:
    late attendance records.
  */

  setAttendanceKpi(
    'attKpiLeaveRequests',
    attendanceFormatNumber(
      summary.lateCount
    )
  );


  /*
    Avg effective hours.
  */

  setAttendanceKpi(
    'attKpiRegularisation',
    attendanceNumber(
      summary.avgEffectiveHours
    ).toFixed(2) +
    ' <span>hrs</span>'
  );


  /*
    Employees.
  */

  setAttendanceKpi(
    'attKpiLiability',
    attendanceFormatNumber(
      data.employeeCount
    )
  );


  /*
    Attendance records.
  */

  setAttendanceKpi(
    'attKpiExceptions',
    attendanceFormatNumber(
      data.attendanceRecordCount
    )
  );

}


/* =========================================================
   DAILY ATTENDANCE TREND
========================================================= */

function renderAttendanceTrendChart() {

  const canvas =
    document.getElementById(
      'attendanceTrendChart'
    );

  if (
    !canvas ||
    typeof Chart === 'undefined'
  ) {
    return;
  }


  destroyAttendanceChart(
    'attendanceTrendChart'
  );


  const rows =
    [...attendancePayload.daily]
      .sort(
        (a, b) =>
          String(a.date)
            .localeCompare(
              String(b.date)
            )
      );


  /*
    Keep most recent 30 dates in the chart.
  */

  const recent =
    rows.slice(-30);


  ATTENDANCE_CHARTS[
    'attendanceTrendChart'
  ] =
    new Chart(
      canvas,
      {

        type: 'line',

        data: {

          labels:
            recent.map(
              row => {

                const d =
                  new Date(
                    row.date + 'T00:00:00'
                  );

                if (
                  Number.isNaN(
                    d.getTime()
                  )
                ) {
                  return row.date;
                }

                return d.toLocaleDateString(
                  'en-IN',
                  {
                    day: '2-digit',
                    month: 'short'
                  }
                );

              }
            ),

          datasets: [

            {

              label:
                'Attendance %',

              data:
                recent.map(
                  row =>
                    attendanceNumber(
                      row.attendancePercent
                    )
                ),

              borderColor:
                '#17616e',

              backgroundColor:
                'rgba(23,97,110,.08)',

              fill: true,

              tension: 0.35,

              pointRadius: 2,

              pointHoverRadius: 4,

              borderWidth: 2.2

            }

          ]

        },


        options: {

          responsive: true,

          maintainAspectRatio:
            false,

          interaction: {
            intersect: false,
            mode: 'index'
          },

          plugins: {

            legend: {
              display: false
            },

            tooltip: {

              callbacks: {

                label:
                  context =>
                    context.parsed.y
                      .toFixed(1) +
                    '%'

              }

            }

          },

          scales: {

            x: {

              grid: {
                display: false
              }

            },

            y: {

              beginAtZero: true,

              max: 100,

              ticks: {

                callback:
                  value =>
                    value + '%'

              },

              grid: {

                color:
                  'rgba(15,68,78,.07)'

              }

            }

          }

        }

      }
    );

}


/* =========================================================
   PRESENT / ABSENT / OTHER
========================================================= */

function renderAttendanceMixChart() {

  const canvas =
    document.getElementById(
      'attendanceMixChart'
    );

  if (
    !canvas ||
    typeof Chart === 'undefined'
  ) {
    return;
  }


  destroyAttendanceChart(
    'attendanceMixChart'
  );


  const summary =
    attendancePayload.summary;


  ATTENDANCE_CHARTS[
    'attendanceMixChart'
  ] =
    new Chart(
      canvas,
      {

        type: 'doughnut',

        data: {

          labels: [
            'Present',
            'Absent',
            'Other'
          ],

          datasets: [

            {

              data: [

                attendanceNumber(
                  summary.present
                ),

                attendanceNumber(
                  summary.absent
                ),

                attendanceNumber(
                  summary.other
                )

              ],

              backgroundColor: [
                '#70ad47',
                '#c22a4d',
                '#899ba0'
              ],

              borderWidth: 0

            }

          ]

        },


        options: {

          responsive: true,

          maintainAspectRatio:
            false,

          cutout: '68%',

          plugins: {

            legend: {
              position: 'bottom'
            }

          }

        }

      }
    );

}


/* =========================================================
   DEPARTMENT CHART
========================================================= */

function getSelectedDepartment() {

  const el =
    document.getElementById(
      'attendanceDeptFilter'
    );

  return el
    ? el.value
    : 'all';

}


function renderAttendanceDepartmentChart() {

  const canvas =
    document.getElementById(
      'attendanceDeptChart'
    );

  if (
    !canvas ||
    typeof Chart === 'undefined'
  ) {
    return;
  }


  destroyAttendanceChart(
    'attendanceDeptChart'
  );


  let departments =
    [...attendancePayload.departments];


  const selected =
    getSelectedDepartment();


  if (selected !== 'all') {

    departments =
      departments.filter(
        row =>
          row.department ===
          selected
      );

  }


  /*
    Sort high to low.
  */

  departments.sort(
    (a, b) =>
      attendanceNumber(
        b.attendancePercent
      )
      -
      attendanceNumber(
        a.attendancePercent
      )
  );


  ATTENDANCE_CHARTS[
    'attendanceDeptChart'
  ] =
    new Chart(
      canvas,
      {

        type: 'bar',

        data: {

          labels:
            departments.map(
              row =>
                row.department
            ),

          datasets: [

            {

              label:
                'Attendance %',

              data:
                departments.map(
                  row =>
                    attendanceNumber(
                      row.attendancePercent
                    )
                ),

              backgroundColor:
                '#17616e',

              borderRadius: 5,

              maxBarThickness: 30

            }

          ]

        },


        options: {

          indexAxis:
            departments.length > 6
              ? 'y'
              : 'x',

          responsive: true,

          maintainAspectRatio:
            false,

          plugins: {

            legend: {
              display: false
            }

          },

          scales: {

            x: {

              beginAtZero: true,

              grid: {
                display: false
              }

            },

            y: {

              beginAtZero: true,

              grid: {

                color:
                  'rgba(15,68,78,.06)'

              }

            }

          }

        }

      }
    );

}


/* =========================================================
   BRANCH CHART

   We reuse attendanceLeaveMixChart canvas because leave data
   is not available in the current API.
========================================================= */

function renderAttendanceBranchChart() {

  const canvas =
    document.getElementById(
      'attendanceLeaveMixChart'
    );

  if (
    !canvas ||
    typeof Chart === 'undefined'
  ) {
    return;
  }


  destroyAttendanceChart(
    'attendanceLeaveMixChart'
  );


  let branches =
    Array.isArray(
      attendancePayload.branches
    )
      ? [...attendancePayload.branches]
      : [];


  const branchFilter =
    document.getElementById(
      'attendanceLocationFilter'
    );


  if (
    branchFilter &&
    branchFilter.value !== 'all'
  ) {

    branches =
      branches.filter(
        row =>
          row.branch ===
          branchFilter.value
      );

  }


  branches.sort(
    (a, b) =>
      attendanceNumber(
        b.attendancePercent
      )
      -
      attendanceNumber(
        a.attendancePercent
      )
  );


  ATTENDANCE_CHARTS[
    'attendanceLeaveMixChart'
  ] =
    new Chart(
      canvas,
      {

        type: 'bar',

        data: {

          labels:
            branches.map(
              row =>
                row.branch
            ),

          datasets: [

            {

              label:
                'Attendance %',

              data:
                branches.map(
                  row =>
                    attendanceNumber(
                      row.attendancePercent
                    )
                ),

              backgroundColor:
                '#3875b7',

              borderRadius: 5,

              maxBarThickness: 30

            }

          ]

        },


        options: {

          indexAxis:
            branches.length > 6
              ? 'y'
              : 'x',

          responsive: true,

          maintainAspectRatio:
            false,

          plugins: {

            legend: {
              display: false
            }

          }

        }

      }
    );

}


/* =========================================================
   DEPARTMENT TABLE
========================================================= */

function renderAttendanceDepartmentTable() {

  const tbody =
    document.getElementById(
      'attendanceDeptBody'
    );

  if (!tbody) {
    return;
  }


  let rows =
    [...attendancePayload.departments];


  const selected =
    getSelectedDepartment();


  if (
    selected !== 'all'
  ) {

    rows =
      rows.filter(
        row =>
          row.department ===
          selected
      );

  }


  rows.sort(
    (a, b) =>
      attendanceNumber(
        b.attendancePercent
      )
      -
      attendanceNumber(
        a.attendancePercent
      )
  );


  tbody.innerHTML =
    rows.map(
      row => {

        const pct =
          attendanceNumber(
            row.attendancePercent
          );


        let cls =
          'green';

        let status =
          'Healthy';


        if (pct < 80) {

          cls =
            'red';

          status =
            'Critical';

        } else if (
          pct < 90
        ) {

          cls =
            'amber';

          status =
            'Watch';

        }


        return `

          <tr>

            <td>
              ${attendanceEscape(
                row.department
              )}
            </td>

            <td>
              ${attendanceFormatNumber(
                row.total
              )}
            </td>

            <td>
              <strong>
                ${pct.toFixed(1)}%
              </strong>
            </td>

            <td>
              ${attendanceFormatNumber(
                row.present
              )}
            </td>

            <td>
              ${attendanceFormatNumber(
                row.absent
              )}
            </td>

            <td>
              ${attendanceFormatNumber(
                row.other
              )}
            </td>

            <td>

              <span
                class="module-status ${cls}"
              >
                ${status}
              </span>

            </td>

          </tr>

        `;

      }
    )
    .join('');

}


/* =========================================================
   EXCEPTION TABLE
========================================================= */

function renderAttendanceExceptionTable() {

  const tbody =
    document.getElementById(
      'attendanceExceptionBody'
    );

  if (!tbody) {
    return;
  }


  let rows =
    Array.isArray(
      attendancePayload.exceptions
    )
      ? [...attendancePayload.exceptions]
      : [];


  const department =
    getSelectedDepartment();


  if (
    department !== 'all'
  ) {

    rows =
      rows.filter(
        row =>
          row.department ===
          department
      );

  }


  const branchFilter =
    document.getElementById(
      'attendanceLocationFilter'
    );


  if (
    branchFilter &&
    branchFilter.value !== 'all'
  ) {

    rows =
      rows.filter(
        row =>
          row.branch ===
          branchFilter.value
      );

  }


  const counter =
    document.getElementById(
      'attendanceExceptionCount'
    );

  if (counter) {

    counter.textContent =
      attendanceFormatNumber(
        rows.length
      );

  }


  if (!rows.length) {

    tbody.innerHTML = `

      <tr>

        <td
          colspan="8"
          style="
            text-align:center;
            padding:24px;
            color:#81979d;
          "
        >
          No attendance exceptions found.
        </td>

      </tr>

    `;

    return;

  }


  tbody.innerHTML =
    rows

      .slice(0, 100)

      .map(
        row => {

          const pct =
            attendanceNumber(
              row.attendancePercent
            );


          let cls =
            'amber';

          let issue =
            'Attendance Watch';


          if (pct < 75) {

            cls =
              'red';

            issue =
              'Low Attendance';

          }


          return `

            <tr>

              <td>

                <div class="employee-cell-name">

                  ${attendanceEscape(
                    row.employeeName
                  )}

                </div>

                <div class="employee-cell-sub">

                  ${attendanceEscape(
                    row.employeeNumber
                  )}

                </div>

              </td>


              <td>
                ${attendanceEscape(
                  row.department
                )}
              </td>


              <td>
                ${attendanceEscape(
                  row.manager || '-'
                )}
              </td>


              <td>

                <strong>
                  ${pct.toFixed(1)}%
                </strong>

              </td>


              <td>
                ${attendanceFormatNumber(
                  row.absent
                )}
              </td>


              <td>
                ${attendanceFormatNumber(
                  row.other
                )}
              </td>


              <td>

                <span
                  class="module-status ${cls}"
                >
                  ${issue}
                </span>

              </td>


              <td>

                <button
                  type="button"
                  class="module-action-btn"
                  onclick="openAttendanceEmployee('${attendanceEscape(
                    row.employeeNumber
                  )}')"
                >
                  View
                </button>

              </td>

            </tr>

          `;

        }
      )

      .join('');

}


/* =========================================================
   TEMPORARY UNUSED CHARTS
========================================================= */

/*
The current Keka API does not contain actual leave data.

So instead of showing fake leave usage / regularisation charts,
we show a clear placeholder.
*/

function renderAttendanceUnavailableSections() {

  [
    'leaveUsageChart',
    'regularisationTrendChart'
  ]
  .forEach(
    id => {

      const canvas =
        document.getElementById(id);

      if (!canvas) {
        return;
      }


      const parent =
        canvas.parentElement;

      if (!parent) {
        return;
      }


      canvas.style.display =
        'none';


      let note =
        parent.querySelector(
          '.attendance-api-note'
        );


      if (!note) {

        note =
          document.createElement(
            'div'
          );

        note.className =
          'attendance-api-note';

        note.style.cssText = `
          min-height:220px;
          display:flex;
          align-items:center;
          justify-content:center;
          text-align:center;
          color:#81979d;
          font-size:12px;
          padding:24px;
        `;

        note.innerHTML =
          'Leave API data not connected yet.';

        parent.appendChild(
          note
        );

      }

    }
  );

}


/* =========================================================
   EMPLOYEE DETAIL
========================================================= */

function openAttendanceEmployee(
  employeeNumber
) {

  if (!attendancePayload) {
    return;
  }


  const employee =
    attendancePayload.exceptions
      ?.find(
        row =>
          String(
            row.employeeNumber
          ) ===
          String(
            employeeNumber
          )
      );


  if (!employee) {

    alert(
      'Employee attendance detail is not available in the current aggregate response.'
    );

    return;

  }


  alert(

    employee.employeeName +

    '\n\nEmployee ID: ' +
    employee.employeeNumber +

    '\nDepartment: ' +
    (
      employee.department ||
      '-'
    ) +

    '\nBranch: ' +
    (
      employee.branch ||
      '-'
    ) +

    '\nManager: ' +
    (
      employee.manager ||
      '-'
    ) +

    '\nAttendance: ' +
    employee.attendancePercent +
    '%' +

    '\nPresent Records: ' +
    employee.present +

    '\nAbsent Records: ' +
    employee.absent

  );

}


/* =========================================================
   LOAD WHEN ATTENDANCE TAB IS OPEN
========================================================= */

function initialiseLiveAttendance() {

  renderAttendanceUnavailableSections();


  const attendancePage =
    document.getElementById(
      'attendance'
    );


  /*
    If Attendance happens to be the initial page,
    load immediately.
  */

  if (
    attendancePage &&
    attendancePage.classList.contains(
      'active'
    )
  ) {

    loadAttendanceLive(false);

  }

}


if (
  document.readyState ===
  'loading'
) {

  document.addEventListener(
    'DOMContentLoaded',
    initialiseLiveAttendance
  );

} else {

  initialiseLiveAttendance();

}


/* PLACEHOLDER POPUPS */

function openEmployeeCrmProfile(
  employeeId
){

  console.log(
    'Employee 360:',
    employeeId
  );

}


function openAttendanceEmployee(
  employeeId
){

  console.log(
    'Attendance employee:',
    employeeId
  );

}


/* INITIALISE STRUCTURE */

window.addEventListener(
  'DOMContentLoaded',
  function(){

    renderEmployeeStructureCharts();

    renderAttendanceStructureCharts();

  }
);
/* =========================================================
   EMPLOYEE CRM LIVE DATA
========================================================= */

const EMPLOYEE_CRM_API_URL =
  'https://script.google.com/macros/s/AKfycbxWzFltc06j3OmPFG62gtuvbj_SumQe3dvbPCcc5BurhqyXeeqRTXJjutzNKStXSJl-/exec';

let EMPLOYEE_CRM_DATA = null;
let EMPLOYEE_CRM_FILTERED = [];
let EMPLOYEE_CRM_LOADED = false;

const EMPLOYEE_CHARTS = {};


/* =========================================================
   LOAD LIVE EMPLOYEE CRM
========================================================= */

function loadEmployeeCrmLive(forceRefresh) {

  if (
    EMPLOYEE_CRM_LOADED &&
    !forceRefresh
  ) {

    renderEmployeeCrmDashboard(
      EMPLOYEE_CRM_DATA
    );

    return;

  }


  setEmployeeLiveStatus(
    'Connecting...',
    'loading'
  );


  const oldScript =
    document.getElementById(
      'employeeCrmJsonpScript'
    );


  if (oldScript) {
    oldScript.remove();
  }


  const script =
    document.createElement(
      'script'
    );


  script.id =
    'employeeCrmJsonpScript';


  script.src =
    EMPLOYEE_CRM_API_URL +
    '?module=employees' +
    '&callback=receiveEmployeeCrmData' +
    '&_=' +
    Date.now();


  script.onerror =
    function() {

      setEmployeeLiveStatus(
        'Connection Failed',
        'error'
      );

      console.error(
        'Employee CRM API could not be loaded.'
      );

    };


  document.body.appendChild(
    script
  );

}


/* =========================================================
   JSONP CALLBACK
========================================================= */

function receiveEmployeeCrmData(
  data
) {

  if (
    !data ||
    data.ok !== true
  ) {

    console.error(
      'Employee CRM API Error:',
      data
    );

    setEmployeeLiveStatus(
      'Data Error',
      'error'
    );

    return;

  }


  EMPLOYEE_CRM_DATA =
    data;

  EMPLOYEE_CRM_LOADED =
    true;


  setEmployeeLiveStatus(
    'Live',
    'success'
  );


  renderEmployeeCrmDashboard(
    data
  );


  initialiseEmployeeCrmFilters(
    data
  );

}


/* =========================================================
   STATUS
========================================================= */

function setEmployeeLiveStatus(
  text,
  state
) {

  const el =
    document.getElementById(
      'employeeLiveStatus'
    );


  if (!el) {
    return;
  }


  el.textContent =
    state === 'success'
      ? '● ' + text
      : text;


  el.classList.remove(
    'green',
    'amber',
    'red'
  );


  if (state === 'success') {

    el.classList.add(
      'green'
    );

  }

  else if (
    state === 'error'
  ) {

    el.classList.add(
      'red'
    );

  }

  else {

    el.classList.add(
      'amber'
    );

  }

}


/* =========================================================
   MAIN RENDER
========================================================= */

function renderEmployeeCrmDashboard(
  data
) {

  if (
    !data ||
    !data.summary
  ) {
    return;
  }


  renderEmployeeCrmKpis(
    data.summary
  );


  renderEmployeeDepartmentChart(
    data.departments || []
  );


  renderEmployeeBranchChart(
    data.branches || []
  );


  renderEmployeeTenureChart(
    data.tenureBuckets || {}
  );


  renderEmployeeSpanOfControl(
    data.managers || []
  );


  EMPLOYEE_CRM_FILTERED =
    (
      data.employees ||
      []
    ).slice();


  renderEmployeeMaster(
    EMPLOYEE_CRM_FILTERED
  );

}


/* =========================================================
   KPI CARDS
========================================================= */

function renderEmployeeCrmKpis(
  summary
) {

  setEmployeeText(
    'empKpiTotal',
    summary.totalEmployees || 0
  );


  setEmployeeText(
    'empKpiActive',
    summary.activeEmployees || 0
  );


  setEmployeeText(
    'empKpiJoiners',
    summary.newJoinersMtd || 0
  );


  /*
    Current HTML ID retained,
    but KPI now means Under 3 Months.
  */

  setEmployeeText(
    'empKpiProbation',
    summary.under3Months || 0
  );


  const tenure =
    Number(
      summary.avgTenure || 0
    );


  const tenureEl =
    document.getElementById(
      'empKpiTenure'
    );


  if (tenureEl) {

    tenureEl.innerHTML =
      tenure.toFixed(2) +
      ' <span>yrs</span>';

  }


  /*
    Existing Gender card reused for
    Net Change MTD until gender data exists.
  */

  const net =
    Number(
      summary.netChangeMtd || 0
    );


  setEmployeeText(
    'empKpiGender',
    net > 0
      ? '+' + net
      : String(net)
  );


  const countEl =
    document.getElementById(
      'employeeMasterCount'
    );


  if (countEl) {

    countEl.textContent =
      summary.totalEmployees || 0;

  }

}


/* =========================================================
   SAFE TEXT
========================================================= */

function setEmployeeText(
  id,
  value
) {

  const el =
    document.getElementById(
      id
    );


  if (el) {

    el.textContent =
      value;

  }

}


/* =========================================================
   CHART - DEPARTMENT
========================================================= */

function renderEmployeeDepartmentChart(
  rows
) {

  const canvas =
    document.getElementById(
      'employeeDeptChart'
    );


  if (
    !canvas ||
    typeof Chart === 'undefined'
  ) {
    return;
  }


  if (
    EMPLOYEE_CHARTS.department
  ) {

    EMPLOYEE_CHARTS
      .department
      .destroy();

  }


  const cleanRows =
    rows
      .filter(
        function(row) {
          return (
            row.department &&
            row.headcount > 0
          );
        }
      )
      .slice(
        0,
        20
      );


  EMPLOYEE_CHARTS.department =
    new Chart(
      canvas,
      {

        type:
          'bar',

        data: {

          labels:
            cleanRows.map(
              function(row) {
                return row.department;
              }
            ),

          datasets: [
            {

              label:
                'Headcount',

              data:
                cleanRows.map(
                  function(row) {
                    return row.headcount;
                  }
                ),

              borderWidth:
                1

            }
          ]

        },

        options: {

          responsive:
            true,

          maintainAspectRatio:
            false,

          indexAxis:
            'y',

          plugins: {

            legend: {
              display:
                false
            }

          },

          scales: {

            x: {

              beginAtZero:
                true,

              ticks: {

                precision:
                  0

              }

            }

          }

        }

      }
    );

}


/* =========================================================
   CHART - BRANCH
========================================================= */

function renderEmployeeBranchChart(
  rows
) {

  const canvas =
    document.getElementById(
      'employeeLocationChart'
    );


  if (
    !canvas ||
    typeof Chart === 'undefined'
  ) {
    return;
  }


  if (
    EMPLOYEE_CHARTS.branch
  ) {

    EMPLOYEE_CHARTS
      .branch
      .destroy();

  }


  const cleanRows =
    rows
      .filter(
        function(row) {
          return (
            row.branch &&
            row.headcount > 0
          );
        }
      );


  EMPLOYEE_CHARTS.branch =
    new Chart(
      canvas,
      {

        type:
          'bar',

        data: {

          labels:
            cleanRows.map(
              function(row) {
                return row.branch;
              }
            ),

          datasets: [
            {

              label:
                'Headcount',

              data:
                cleanRows.map(
                  function(row) {
                    return row.headcount;
                  }
                ),

              borderWidth:
                1

            }
          ]

        },

        options: {

          responsive:
            true,

          maintainAspectRatio:
            false,

          indexAxis:
            'y',

          plugins: {

            legend: {
              display:
                false
            }

          },

          scales: {

            x: {

              beginAtZero:
                true,

              ticks: {

                precision:
                  0

              }

            }

          }

        }

      }
    );

}


/* =========================================================
   CHART - TENURE
========================================================= */

function renderEmployeeTenureChart(
  buckets
) {

  const canvas =
    document.getElementById(
      'employeeTenureChart'
    );


  if (
    !canvas ||
    typeof Chart === 'undefined'
  ) {
    return;
  }


  if (
    EMPLOYEE_CHARTS.tenure
  ) {

    EMPLOYEE_CHARTS
      .tenure
      .destroy();

  }


  const labels = [
    '<1 Yr',
    '1-3 Yrs',
    '3-5 Yrs',
    '5-8 Yrs',
    '8+ Yrs'
  ];


  EMPLOYEE_CHARTS.tenure =
    new Chart(
      canvas,
      {

        type:
          'bar',

        data: {

          labels:
            labels,

          datasets: [
            {

              label:
                'Employees',

              data:
                labels.map(
                  function(label) {

                    return Number(
                      buckets[
                        label
                      ] || 0
                    );

                  }
                ),

              borderWidth:
                1

            }
          ]

        },

        options: {

          responsive:
            true,

          maintainAspectRatio:
            false,

          plugins: {

            legend: {
              display:
                false
            }

          },

          scales: {

            y: {

              beginAtZero:
                true,

              ticks: {

                precision:
                  0

              }

            }

          }

        }

      }
    );

}


/* =========================================================
   SPAN OF CONTROL
========================================================= */

function renderEmployeeSpanOfControl(
  rows
) {

  const body =
    document.getElementById(
      'employeeSpanBody'
    );


  if (!body) {
    return;
  }


  const topManagers =
    rows
      .filter(
        function(row) {

          return (
            row.manager &&
            row.manager !==
              'Unassigned'
          );

        }
      )
      .slice(
        0,
        20
      );


  if (
    !topManagers.length
  ) {

    body.innerHTML =
      '<tr><td colspan="5">No manager data available.</td></tr>';

    return;

  }


  body.innerHTML =
    topManagers
      .map(
        function(row) {


          const reports =
            Number(
              row.directReports || 0
            );


          let status =
            'Normal';

          let cls =
            'green';


          if (
            reports >= 25
          ) {

            status =
              'High';

            cls =
              'red';

          }

          else if (
            reports >= 15
          ) {

            status =
              'Watch';

            cls =
              'amber';

          }


          return `
            <tr>
              <td>${escapeEmployeeHtml(row.manager)}</td>

              <td>${escapeEmployeeHtml(row.department || '-')}</td>

              <td>${reports}</td>

              <td>${Number(row.share || 0).toFixed(1)}%</td>

              <td>
                <span class="module-status ${cls}">
                  ${status}
                </span>
              </td>
            </tr>
          `;

        }
      )
      .join('');

}


/* =========================================================
   EMPLOYEE MASTER
========================================================= */

function renderEmployeeMaster(
  employees
) {

  const body =
    document.getElementById(
      'employeeMasterBody'
    );


  if (!body) {
    return;
  }


  const count =
    document.getElementById(
      'employeeMasterCount'
    );


  if (count) {

    count.textContent =
      employees.length;

  }


  if (
    !employees.length
  ) {

    body.innerHTML =
      '<tr><td colspan="10">No employees found.</td></tr>';

    return;

  }


  body.innerHTML =
    employees
      .map(
        function(emp) {


          return `
            <tr>

              <td>
                ${escapeEmployeeHtml(emp.employeeId)}
              </td>

              <td>

                <div class="employee-cell-name">
                  ${escapeEmployeeHtml(emp.name)}
                </div>

                <div class="employee-cell-sub">
                  ${escapeEmployeeHtml(emp.email || '')}
                </div>

              </td>

              <td>
                ${escapeEmployeeHtml(emp.designation || '-')}
              </td>

              <td>
                ${escapeEmployeeHtml(emp.department || '-')}
              </td>

              <td>
                ${escapeEmployeeHtml(emp.manager || '-')}
              </td>

              <td>
                ${escapeEmployeeHtml(emp.branch || '-')}
              </td>

              <td>
                ${escapeEmployeeHtml(emp.doj || '-')}
              </td>

              <td>
                ${escapeEmployeeHtml(emp.tenureLabel || '-')}
              </td>

              <td>

                <span class="module-status ${
                  emp.active
                    ? 'green'
                    : 'red'
                }">

                  ${
                    emp.active
                      ? 'Active'
                      : 'Inactive'
                  }

                </span>

              </td>

              <td>

                <button
                  class="module-action-btn"
                  onclick="openEmployeeCrmProfile('${escapeEmployeeAttr(emp.employeeId)}')"
                >
                  View 360°
                </button>

              </td>

            </tr>
          `;

        }
      )
      .join('');

}


/* =========================================================
   FILTER INITIALISATION
========================================================= */

function initialiseEmployeeCrmFilters(
  data
) {

  populateEmployeeSelect(
    'employeeDeptFilter',
    'All Departments',
    (
      data.departments ||
      []
    ).map(
      function(row) {
        return row.department;
      }
    )
  );


  populateEmployeeSelect(
    'employeeLocationFilter',
    'All Locations',
    (
      data.branches ||
      []
    ).map(
      function(row) {
        return row.branch;
      }
    )
  );


  populateEmployeeSelect(
    'employeeManagerFilter',
    'All Managers',
    (
      data.managers ||
      []
    )
      .map(
        function(row) {
          return row.manager;
        }
      )
      .filter(
        function(name) {
          return (
            name &&
            name !==
              'Unassigned'
          );
        }
      )
  );


  const search =
    document.getElementById(
      'employeeCrmSearch'
    );


  const dept =
    document.getElementById(
      'employeeDeptFilter'
    );


  const branch =
    document.getElementById(
      'employeeLocationFilter'
    );


  const manager =
    document.getElementById(
      'employeeManagerFilter'
    );


  const status =
    document.getElementById(
      'employeeStatusFilter'
    );


  [
    search,
    dept,
    branch,
    manager,
    status
  ].forEach(
    function(el) {

      if (
        el &&
        !el.dataset.employeeFilterBound
      ) {

        el.dataset.employeeFilterBound =
          '1';


        el.addEventListener(
          el.tagName === 'INPUT'
            ? 'input'
            : 'change',
          applyEmployeeCrmFilters
        );

      }

    }
  );

}


/* =========================================================
   POPULATE SELECT
========================================================= */

function populateEmployeeSelect(
  id,
  firstLabel,
  values
) {

  const select =
    document.getElementById(
      id
    );


  if (!select) {
    return;
  }


  const current =
    select.value;


  const unique =
    Array.from(
      new Set(
        values
          .filter(Boolean)
          .sort(
            function(a, b) {
              return a.localeCompare(b);
            }
          )
      )
    );


  select.innerHTML =
    '<option value="all">' +
    escapeEmployeeHtml(
      firstLabel
    ) +
    '</option>' +
    unique
      .map(
        function(value) {

          return (
            '<option value="' +
            escapeEmployeeAttr(value) +
            '">' +
            escapeEmployeeHtml(value) +
            '</option>'
          );

        }
      )
      .join('');


  if (
    Array.from(
      select.options
    ).some(
      function(option) {
        return (
          option.value ===
          current
        );
      }
    )
  ) {

    select.value =
      current;

  }

}


/* =========================================================
   APPLY FILTERS
========================================================= */

function applyEmployeeCrmFilters() {

  if (
    !EMPLOYEE_CRM_DATA
  ) {
    return;
  }


  const search =
    (
      document.getElementById(
        'employeeCrmSearch'
      )?.value ||
      ''
    )
      .trim()
      .toLowerCase();


  const department =
    document.getElementById(
      'employeeDeptFilter'
    )?.value ||
    'all';


  const branch =
    document.getElementById(
      'employeeLocationFilter'
    )?.value ||
    'all';


  const manager =
    document.getElementById(
      'employeeManagerFilter'
    )?.value ||
    'all';


  const status =
    document.getElementById(
      'employeeStatusFilter'
    )?.value ||
    'all';


  EMPLOYEE_CRM_FILTERED =
    (
      EMPLOYEE_CRM_DATA
        .employees ||
      []
    )
      .filter(
        function(emp) {


          if (
            search
          ) {

            const haystack =
              [
                emp.employeeId,
                emp.name,
                emp.email,
                emp.designation,
                emp.department,
                emp.branch,
                emp.manager
              ]
                .join(' ')
                .toLowerCase();


            if (
              !haystack.includes(
                search
              )
            ) {

              return false;

            }

          }


          if (
            department !==
              'all' &&
            emp.department !==
              department
          ) {

            return false;

          }


          if (
            branch !==
              'all' &&
            emp.branch !==
              branch
          ) {

            return false;

          }


          if (
            manager !==
              'all' &&
            emp.manager !==
              manager
          ) {

            return false;

          }


          if (
            status ===
              'Active' &&
            !emp.active
          ) {

            return false;

          }


          if (
            status ===
              'Inactive' &&
            emp.active
          ) {

            return false;

          }


          /*
            We don't yet have true probation status.
            So ignore Probation rather than invent data.
          */

          if (
            status ===
            'Probation'
          ) {

            return false;

          }


          return true;

        }
      );


  renderEmployeeMaster(
    EMPLOYEE_CRM_FILTERED
  );

}


/* =========================================================
   EMPLOYEE 360 POPUP
========================================================= */

function openEmployeeCrmProfile(
  employeeId
) {

  if (
    !EMPLOYEE_CRM_DATA
  ) {
    return;
  }


  const emp =
    (
      EMPLOYEE_CRM_DATA
        .employees ||
      []
    )
      .find(
        function(row) {

          return (
            row.employeeId ===
            employeeId
          );

        }
      );


  if (!emp) {
    return;
  }


  alert(
    emp.name +
    '\n\nEmployee ID: ' +
    emp.employeeId +

    '\nDesignation: ' +
    (
      emp.designation ||
      '-'
    ) +

    '\nDepartment: ' +
    (
      emp.department ||
      '-'
    ) +

    '\nLocation: ' +
    (
      emp.branch ||
      '-'
    ) +

    '\nManager: ' +
    (
      emp.manager ||
      '-'
    ) +

    '\nDOJ: ' +
    (
      emp.doj ||
      '-'
    ) +

    '\nTenure: ' +
    (
      emp.tenureLabel ||
      '-'
    ) +

    '\nStatus: ' +
    (
      emp.active
        ? 'Active'
        : 'Inactive'
    )
  );

}


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeEmployeeHtml(
  value
) {

  return String(
    value ?? ''
  )
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#039;'
    );

}


function escapeEmployeeAttr(
  value
) {

  return escapeEmployeeHtml(
    value
  );

}


/* =========================================================
   INITIAL LOAD
========================================================= */

function initialiseEmployeeCrmLive() {

  const page =
    document.getElementById(
      'employees'
    );


  if (
    page &&
    page.classList.contains(
      'active'
    )
  ) {

    loadEmployeeCrmLive(
      false
    );

  }

}


if (
  document.readyState ===
  'loading'
) {

  document.addEventListener(
    'DOMContentLoaded',
    initialiseEmployeeCrmLive
  );

} else {

  initialiseEmployeeCrmLive();

}
