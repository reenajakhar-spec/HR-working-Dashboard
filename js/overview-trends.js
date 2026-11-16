
/* =========================================================
   EURONICS HR COMMAND CENTRE
   EXECUTIVE OVERVIEW - LIVE KPI & TREND INTEGRATION

   File: js/overview-trends.js

   Requires:
   - js/app.js loaded before this file
   - Chart.js
   - Existing Executive Overview HTML elements
========================================================= */

(function () {
  'use strict';

  const $ = id => document.getElementById(id);

  const cards = $('overviewKpis');
  const overlay = $('execTrendOverlay');

  if (!cards || !overlay) {
    console.warn('Executive Overview elements not found.');
    return;
  }

  const keys = [
    'headcount',
    'attendance',
    'attrition',
    'positions',
    'enps'
  ];

  const names = [
    'Total Headcount',
    'Attendance Rate',
    'Attrition (FY 2026–27)',
    'Open Positions',
    'eNPS Score'
  ];

  const state = {
    key: 'headcount',
    period: 'month',
    segment: 'all',
    chart: null
  };

  /* =========================
     GENERAL HELPERS
  ========================= */

  const norm = value =>
    String(value == null ? '' : value)
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, '');

  function get(row, ...keys) {
    if (!row) return '';

    for (const key of keys) {
      const value = row[key];

      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ''
      ) {
        return value;
      }
    }

    const normalized = {};

    Object.keys(row).forEach(key => {
      const normalizedKey = String(key)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

      normalized[normalizedKey] = row[key];
    });

    for (const key of keys) {
      const normalizedKey = String(key)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

      const value = normalized[normalizedKey];

      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ''
      ) {
        return value;
      }
    }

    return '';
  }

  function getEmployeePayload() {
    return typeof EMPLOYEE_CRM_DATA !== 'undefined'
      ? EMPLOYEE_CRM_DATA
      : null;
  }

  function getEmployeeRows() {
    const payload = getEmployeePayload();

    if (!payload || !Array.isArray(payload.employees)) {
      return null;
    }

    const seen = new Set();

    return payload.employees.filter((employee, index) => {
      const id = norm(get(
        employee,
        'employeeId',
        'employeeCode',
        'Employee ID',
        'emp_code'
      ));

      const key = id || 'row' + index;

      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });
  }

  /* =========================
     LIVE TA RECRUITMENT API (JSONP)
     Counts OPEN requisitions, not sum of headcount.
     TA history is not available from the current API.
  ========================= */
  const TA_API_URL = 'https://script.google.com/a/macros/euronics.co.in/s/AKfycbxA8vc8YBnpl1u3lbi8L-K_jHOKVXJPc3j1h1Ggs7c_M2MhpUFxFSGZFDyy88zMLTPg/exec';
  let taPayload = null;
  let taError = '';
  let taLoading = false;
  let taRequestId = 0;

  function taSegment(row) {
    const explicit = norm(get(row, 'employeeCategory', 'category', 'collarType', 'workerType'));
    const department = norm(get(row, 'department', 'dept'));
    const positionType = norm(get(row, 'positionType'));
    if (explicit === 'bluecollar' || explicit === 'blue' || positionType === 'bluecollar') return 'blue';
    if (department === 'sales' || department === 'salesmarketing' || department === 'salesandmarketing') return 'sales';
    if (department) return 'nonsales';
    return 'unknown';
  }

  function openRequisitions() {
    if (!taPayload || !Array.isArray(taPayload.data)) return null;
    return taPayload.data.filter(row => norm(get(row, 'status')) === 'open');
  }

  function refreshTaCard() {
    const open = openRequisitions();
    if (!open) {
      setCard(3, '—', taError || (taLoading ? 'Loading live TA API…' : 'TA data unavailable'));
      return;
    }
    const counts = {sales: 0, nonsales: 0, blue: 0, unknown: 0};
    open.forEach(row => { counts[taSegment(row)]++; });
    const detail = ['Sales ' + counts.sales, 'Non-Sales ' + counts.nonsales, 'Blue ' + counts.blue];
    if (counts.unknown) detail.push('Unclassified ' + counts.unknown);
    setCard(3, open.length.toLocaleString('en-IN'), detail.join(' · ') + ' · Live TA');
  }

  function loadTaRecruitment() {
    if (taLoading) return;
    taLoading = true;
    taError = '';
    refreshTaCard();
    const requestId = ++taRequestId;
    const callback = '__euronicsTaCallback_' + requestId;
    const script = document.createElement('script');
    const timeout = setTimeout(() => finish(new Error('TA API timed out. Check Workspace access or deployment permissions.')), 45000);
    let finished = false;
    function finish(error, payload) {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      delete window[callback];
      script.remove();
      taLoading = false;
      if (error || !payload || payload.success !== true || !Array.isArray(payload.data)) {
        taError = error ? error.message : 'Invalid TA API response';
      } else {
        taPayload = payload;
        taError = '';
      }
      refreshTaCard();
      if (state.key === 'positions' && overlay.classList.contains('open')) renderTrend();
    }
    window[callback] = payload => finish(null, payload);
    script.onerror = () => finish(new Error('TA API could not load (JSONP).'));
    script.src = TA_API_URL + '?api=recruitment&callback=' + encodeURIComponent(callback) + '&_=' + Date.now();
    document.head.appendChild(script);
  }
  window.refreshTaRecruitment = loadTaRecruitment;

  /* =========================
     EMPLOYEE CLASSIFICATION
  ========================= */

  function classify(employee) {
    const category = norm(get(
      employee,
      'employeeCategory',
      'Employee Category',
      'employee_category',
      'collarType',
      'workerType',
      'employeeType'
    ));

    const subDepartment = norm(get(
      employee,
      'subDepartment',
      'Sub-Department',
      'sub_department',
      'subDept'
    ));

    // Blue Collar always takes priority.
    if (
      category === 'bluecollar' ||
      category === 'blue'
    ) {
      return 'blue';
    }

    if (
      category === 'whitecollar' ||
      category === 'white'
    ) {
      if (subDepartment === 'sales') {
        return 'sales';
      }

      if (subDepartment === 'nonsales') {
        return 'nonsales';
      }
    }

    return 'unknown';
  }

  function isActive(employee) {
    const raw = get(
      employee,
      'active',
      'Active',
      'status',
      'employmentStatus'
    );

    if (raw === true) return true;
    if (raw === false) return false;

    const value = norm(raw);

    return (
      value === '' ||
      value === 'yes' ||
      value === 'active' ||
      value === 'true' ||
      value === '1'
    );
  }

  function getHeadcount() {
    const rows = getEmployeeRows();

    if (!rows) return null;

    const result = {
      all: 0,
      sales: 0,
      nonsales: 0,
      blue: 0,
      unknown: 0
    };

    rows.forEach(employee => {
      if (!isActive(employee)) return;

      result.all++;
      result[classify(employee)]++;
    });

    return result;
  }

  /* =========================
     DATE HELPERS
  ========================= */

  function validDate(year, month, day) {
    const d = new Date(year, month - 1, day);

    if (
      d.getFullYear() !== year ||
      d.getMonth() !== month - 1 ||
      d.getDate() !== day
    ) {
      return null;
    }

    return d;
  }

  
function parseDate(value) {
  if (value instanceof Date && !isNaN(value)) {
    return new Date(
      value.getFullYear(),
      value.getMonth(),
      value.getDate()
    );
  }

  const text = String(value || '').trim();
  if (!text) return null;

  const months = {
    jan: 0, feb: 1, mar: 2, apr: 3,
    may: 4, jun: 5, jul: 6, aug: 7,
    sep: 8, sept: 8, oct: 9,
    nov: 10, dec: 11
  };

  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);

  if (match) {
    return validDate(
      Number(match[1]),
      Number(match[2]),
      Number(match[3])
    );
  }

  match = text.match(
    /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/
  );

  if (match) {
    return validDate(
      Number(match[3]),
      Number(match[2]),
      Number(match[1])
    );
  }

  match = text.match(
    /^(\d{1,2})[\s-]+([a-zA-Z]+)[\s,-]+(\d{4})$/
  );

  if (match) {
    const month = months[match[2].toLowerCase()];

    if (month === undefined) return null;

    return validDate(
      Number(match[3]),
      month + 1,
      Number(match[1])
    );
  }

  return null;
}


  function dateKey(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');
  }

  function formatDate(date) {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  /* =========================
     ATTENDANCE DATA
  ========================= */

  function getAttendancePayload() {
    if (typeof attendancePayload !== 'undefined') {
      return attendancePayload;
    }

    return window.HR_ATTENDANCE_PAYLOAD || null;
  }

  function getAttendanceRate() {
    const attendance = getAttendancePayload();

    if (
      !attendance ||
      attendance.ok !== true ||
      !attendance.summary
    ) {
      return null;
    }

    const raw = attendance.summary.attendancePercent;

    if (
      raw === undefined ||
      raw === null ||
      String(raw).trim() === ''
    ) {
      return null;
    }

    const rate = Number(raw);

    return Number.isFinite(rate) ? rate : null;
  }

  /* =========================
     KPI RENDERING
  ========================= */

  function setCard(index, value, subtitle) {
    const card = cards.querySelectorAll('.kpi-card')[index];

    if (!card) return;

    const valueElement = card.querySelector('.value');
    const subtitleElement = card.querySelector('.sub');

    if (valueElement) {
      valueElement.textContent = value;
    }

    if (subtitleElement) {
      subtitleElement.textContent = subtitle;
    }
  }

  function getConnectedHistory() {
    return (
      window.EXEC_OVERVIEW_HISTORY ||
      window.HR_OVERVIEW_HISTORY ||
      {}
    );
  }

  // Verified April-October 2026 monthly headcount, supplied by HR.
  // Sales and Non-Sales partition ALL; Blue Collar is an overlapping dimension.
  const FY_ATTRITION_START = new Date(2026, 3, 1);
  const FY_HEADCOUNT_THROUGH = new Date(2026, 9, 31, 23, 59, 59, 999);
  const FY_ATTRITION_HEADCOUNT = [
    {month:3, all:446, sales:140, nonsales:306, blue:149},
    {month:4, all:450, sales:144, nonsales:306, blue:149},
    {month:5, all:443, sales:141, nonsales:302, blue:147},
    {month:6, all:442, sales:140, nonsales:302, blue:149},
    {month:7, all:443, sales:141, nonsales:302, blue:151},
    {month:8, all:438, sales:139, nonsales:299, blue:150},
    {month:9, all:437, sales:138, nonsales:299, blue:151}
  ];
  const FY_MONTHLY_HEADCOUNTS = FY_ATTRITION_HEADCOUNT.map(r => r.all);
  const FY_AVERAGE_HEADCOUNT_APR_OCT = FY_MONTHLY_HEADCOUNTS.reduce((a,b) => a+b, 0) / FY_MONTHLY_HEADCOUNTS.length;

  function attritionExitRows() {
    const payload = getEmployeePayload();
    if (!payload || !Array.isArray(payload.exits)) return null;
    const master = new Map();
    (getEmployeeRows() || []).forEach(row => {
      const id = norm(get(row, 'employeeId', 'employeeCode', 'Employee ID', 'emp_code'));
      if (id) master.set(id, row);
    });
    const seen = new Set(), rows = [];
    let invalidDates = 0, duplicates = 0, outsideWindow = 0, unclassified = 0;
    payload.exits.forEach((row, index) => {
      const date = parseDate(get(row, 'lastWorkingDay', 'Last Working Day', 'Last working Day', 'dateOfExit', 'Date of Exit', 'exitDate', 'Exit Date', 'LWD'));
      if (!date) { invalidDates++; return; }
      if (date < FY_ATTRITION_START || date > FY_HEADCOUNT_THROUGH || date > new Date()) { outsideWindow++; return; }
      const id = norm(get(row, 'employeeId', 'employeeCode', 'Employee ID', 'emp_code'));
      const name = norm(get(row, 'employeeName', 'Employee Name'));
      const key = id || (name ? name + ':' + dateKey(date) : 'row:' + index);
      if (seen.has(key)) { duplicates++; return; }
      seen.add(key);
      const employee = master.get(id) || row;
      const cat = norm(get(employee, 'employeeCategory', 'Employee Category', 'collarType', 'workerType', 'employeeType'));
      const dept = norm(get(employee, 'subDepartment', 'Sub-Department', 'sub_department', 'subDept', 'department', 'Department'));
      const sales = dept === 'sales' || dept === 'salesmarketing' || dept === 'salesandmarketing';
      const nonsales = dept === 'nonsales' || dept === 'nonsale' || (dept && !sales);
      const blue = cat === 'bluecollar' || cat === 'blue';
      if (!sales && !nonsales) unclassified++;
      rows.push({date, id, sales, nonsales, blue});
    });
    return {rows, invalidDates, duplicates, outsideWindow, unclassified};
  }

  function getFyAttrition() {
    const source = attritionExitRows();
    if (!source) return null;
    const today = new Date();
    const cutoff = new Date(Math.min(today.getTime(), FY_HEADCOUNT_THROUGH.getTime()));
    if (cutoff < FY_ATTRITION_START) return null;
    const months = FY_ATTRITION_HEADCOUNT.filter(m => new Date(2026, m.month, 1) <= cutoff);
    const avg = months.reduce((n,m) => n+m.all, 0) / months.length;
    const exits = source.rows.filter(r => r.date <= cutoff).length;
    return {rate: exits / avg * 100, exits, averageHeadcount: avg, through: cutoff,
      invalidDates:source.invalidDates, duplicates:source.duplicates,
      outsideWindow:source.outsideWindow, unclassified:source.unclassified,
      note:'April-October 2026; verified monthly headcount; later months pending.'};
  }

  window.checkHrAttritionData = function () {
    const result = getFyAttrition();
    const exits = attritionExitRows();
    console.log('HR FY ATTRITION DIAGNOSTIC', result, exits && {
      matchedSales:exits.rows.filter(r=>r.sales).length,
      matchedNonSales:exits.rows.filter(r=>r.nonsales).length,
      matchedBlue:exits.rows.filter(r=>r.blue).length,
      unclassified:exits.unclassified
    });
    return result;
  };

  function refreshOverview() {
    const headcount = getHeadcount();

    if (headcount) {
      const subtitle = [
        'Sales ' + headcount.sales,
        'Non-Sales ' + headcount.nonsales,
        'Blue ' + headcount.blue
      ];

      if (headcount.unknown) {
        subtitle.push(
          'Unclassified ' + headcount.unknown
        );
      }

      setCard(
        0,
        headcount.all.toLocaleString('en-IN'),
        subtitle.join(' · ')
      );
    } else {
      setCard(
        0,
        '—',
        'Waiting for employee master'
      );
    }

    const attendanceRate = getAttendanceRate();

    if (attendanceRate !== null) {
      setCard(
        1,
        attendanceRate.toFixed(1) + '%',
        'Live attendance API'
      );
    } else {
      setCard(
        1,
        '—',
        'Waiting for attendance records'
      );
    }

    const history = getConnectedHistory();
    const attrition = getFyAttrition();
    if (attrition) {
      setCard(2, attrition.rate.toFixed(1) + '%',
        'Apr–Oct 2026 · ' + attrition.exits + ' exits · avg headcount ' + attrition.averageHeadcount.toFixed(2));
    } else {
      setCard(2, '—', 'Apr–Oct 2026 · waiting for Exit Employee Data Sheet');
    }
    if (!Array.isArray(history.enps) || !history.enps.length) {
      setCard(4, '—', 'Employee eNPS survey data not connected');
    }

    refreshTaCard();

    const mappings = [
      ['attrition', 2, '%'],
      ['enps', 4, '']
    ];

    mappings.forEach(([key, index, unit]) => {
      const rows = Array.isArray(history[key])
        ? history[key]
        : [];

      const valid = rows
        .filter(row => {
          const parsed = parseDate(
            row.date ||
            row.snapshotDate ||
            row.surveyDate
          );

          return (
            parsed &&
            row.value !== null &&
            row.value !== undefined &&
            String(row.value).trim() !== '' &&
            Number.isFinite(Number(row.value))
          );
        })
        .sort((a, b) => {
          const dateA = parseDate(
            a.date || a.snapshotDate || a.surveyDate
          );

          const dateB = parseDate(
            b.date || b.snapshotDate || b.surveyDate
          );

          return dateA - dateB;
        });

      const latest = valid[valid.length - 1];

      if (latest && key !== 'attrition') {
        setCard(
          index,
          String(latest.value) + unit,
          'Latest connected historical record'
        );
      }
    });
  }

  window.refreshExecOverview = refreshOverview;

  /* =========================
     TREND PERIOD ENDPOINTS
  ========================= */

  function getPeriodEndpoints() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(2026, 3, 1);
    const points = [];

    if (state.period === 'month') {
      let date = new Date(
        start.getFullYear(),
        start.getMonth() + 1,
        0
      );

      while (date <= today) {
        points.push(new Date(date));

        date = new Date(
          date.getFullYear(),
          date.getMonth() + 2,
          0
        );
      }
    } else {
      let date = new Date(start);

      date.setDate(
        date.getDate() + (7 - date.getDay()) % 7
      );

      while (date <= today) {
        points.push(new Date(date));
        date.setDate(date.getDate() + 7);
      }
    }

    if (
      !points.length ||
      dateKey(points[points.length - 1]) !== dateKey(today)
    ) {
      points.push(today);
    }

    return points;
  }

  /* =========================
     HISTORICAL HEADCOUNT
  ========================= */

  function getWorkforceHistory() {
    const employees = getEmployeeRows();

    if (!employees) {
      return {
        data: [],
        warning: 'Employee master has not loaded.'
      };
    }

    const employeePayload = getEmployeePayload();

    const exits = (
      employeePayload &&
      Array.isArray(employeePayload.exits)
    ) ? employeePayload.exits : [];

    const exitMap = new Map();

    exits.forEach(exit => {
      const id = norm(get(
        exit,
        'employeeId',
        'employeeCode',
        'Employee ID'
      ));

      const exitDate = parseDate(get(
        exit,
        'lastWorkingDay',
        'Last Working Day',
        'dateOfExit',
        'Date of Exit'
      ));

      if (id && exitDate) {
        exitMap.set(id, exitDate);
      }
    });

    const relevant = employees.filter(employee =>
      state.segment === 'all' ||
      classify(employee) === state.segment
    );

    const missingJoining = relevant.filter(employee =>
      !parseDate(get(
        employee,
        'doj',
        'dateOfJoining',
        'Date of Joining'
      ))
    ).length;

    const missingExit = relevant.filter(employee => {
      if (isActive(employee)) return false;

      const id = norm(get(
        employee,
        'employeeId',
        'employeeCode',
        'Employee ID'
      ));

      return !exitMap.has(id);
    }).length;

    if (missingJoining || missingExit) {
      return {
        data: [],
        warning:
          'Historical headcount cannot be verified: ' +
          missingJoining + ' missing joining dates and ' +
          missingExit + ' inactive employees without matched exit dates.'
      };
    }

    const points = getPeriodEndpoints().map(date => {
      let count = 0;

      relevant.forEach(employee => {
        const joining = parseDate(get(
          employee,
          'doj',
          'dateOfJoining',
          'Date of Joining'
        ));

        const id = norm(get(
          employee,
          'employeeId',
          'employeeCode',
          'Employee ID'
        ));

        const exit = exitMap.get(id);

        if (
          joining &&
          joining <= date &&
          (!exit || exit > date) &&
          (isActive(employee) || Boolean(exit))
        ) {
          count++;
        }
      });

      return {
        date,
        value: count
      };
    });

    return {
      data: points,
      warning:
        'Calculated from available joining and exit records. ' +
        'Employees missing from both historical sources cannot be reconstructed. ' +
        'Verify against historical Keka snapshots.'
    };
  }

  /* =========================
     OTHER KPI HISTORY
  ========================= */

  // Build actual attendance trends from the connected attendance API daily rows.
  // Aggregate PRESENT and ABSENT counts, never average daily percentages.
  function getAttendanceTrend() {
    const payload = getAttendancePayload();
    if (!payload || !Array.isArray(payload.daily)) {
      return { data: [], warning: 'Attendance API daily records have not loaded.' };
    }
    if (state.segment !== 'all') {
      return { data: [], warning: 'Sales / Non-Sales / Blue Collar attendance needs employee-level dated attendance records in the API. The current daily summary has no employee category.' };
    }
    const buckets = new Map();
    const today = new Date(); today.setHours(23,59,59,999);
    const earliest = new Date(2026, 3, 1);
    payload.daily.forEach(row => {
      const d = parseDate(get(row, 'date', 'Attendance Date'));
      if (!d || d < earliest || d > today) return;
      const present = Number(get(row, 'present'));
      const absent = Number(get(row, 'absent'));
      if (!Number.isFinite(present) || !Number.isFinite(absent) || present + absent <= 0) return;
      let periodEnd;
      let key;
      if (state.period === 'month') {
        periodEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        key = d.getFullYear() + '-' + d.getMonth();
      } else {
        periodEnd = new Date(d);
        periodEnd.setDate(d.getDate() + (7 - d.getDay()) % 7);
        key = dateKey(periodEnd);
      }
      const bucket = buckets.get(key) || { date: periodEnd, present: 0, absent: 0 };
      bucket.present += present;
      bucket.absent += absent;
      buckets.set(key, bucket);
    });
    const data = [...buckets.values()].map(b => ({
      date: b.date > today ? today : b.date,
      value: 100 * b.present / (b.present + b.absent)
    })).sort((a,b) => a.date - b.date);
    return { data, warning: data.length ? 'Live Attendance Sheet · Present / (Present + Absent), weighted by records. Only dates available from the API are shown.' : 'No dated attendance records found from 01 Apr 2026.' };
  }

  // FY-to-date cumulative attrition, using category-specific verified monthly headcount.
  // Weekly values are cumulative FY-to-date snapshots, not weekly annualized rates.
  function getAttritionTrend() {
    const source = attritionExitRows();
    if (!source) return {data: [], warning:'Exit Employee Data Sheet has not loaded.'};
    const result = getFyAttrition();
    if (!result) return {data: [], warning:'FY attrition data unavailable.'};
    const segment = state.segment;
    if (!['all','sales','nonsales','blue'].includes(segment)) return {data:[],warning:'Unknown segment.'};
    const selected = source.rows.filter(row => segment === 'all' || row[segment]);
    const months = FY_ATTRITION_HEADCOUNT.filter(m => new Date(2026,m.month,1) <= result.through);
    const points = [];
    function addPoint(date) {
      const relevantMonths = months.filter(m => new Date(2026,m.month,1) <= date);
      if (!relevantMonths.length) return;
      const denominator = relevantMonths.reduce((sum,m)=>sum+m[segment],0)/relevantMonths.length;
      if (!denominator) return;
      const count = selected.filter(row=>row.date<=date).length;
      points.push({date, value:100*count/denominator});
    }
    if (state.period === 'month') {
      months.forEach(m => {
        const monthEnd = new Date(2026,m.month+1,0,23,59,59,999);
        if (monthEnd <= result.through) addPoint(monthEnd);
      });
    } else {
      let cursor = new Date(FY_ATTRITION_START);
      cursor.setDate(cursor.getDate() + (7-cursor.getDay())%7);
      while (cursor <= result.through) {
        addPoint(new Date(cursor.getFullYear(),cursor.getMonth(),cursor.getDate(),23,59,59,999));
        cursor.setDate(cursor.getDate()+7);
      }
    }
    const warning = 'FY-to-date cumulative exits / average verified monthly '+segment+' headcount (Apr–Oct 2026). ' +
      (segment !== 'all' ? 'Exit categories matched from employee master/exit fields; unmatched exits are excluded from segment rates. ' : '') +
      (source.unclassified ? source.unclassified+' exits lack Sales/Non-Sales classification; segment figures require reconciliation. ' : '') +
      'November onward pending verified headcount.';
    return {data:points,warning};
  }

  function getPositionsTrend() {
    const open = openRequisitions();
    if (!open) return { data: [], warning: taError || 'Waiting for the live TA API.' };
    const count = open.filter(row => state.segment === 'all' || taSegment(row) === state.segment).length;
    // The API exposes CURRENT status only. Do not invent historical status.
    return {
      data: [{date: new Date(), value: count}],
      warning: 'Live current open requisitions only. Accurate month/week history requires dated TA status changes or server-side snapshots. The API does not supply past open-position counts.'
    };
  }

  function getSourceHistory() {
    const history = getConnectedHistory();
    const rows = history[state.key];

    if (!Array.isArray(rows)) {
      return {
        data: [],
        warning:
          'No live dated history is connected for this KPI.'
      };
    }

    const filtered = rows
      .filter(row => {
        const segment = norm(
          row.segment || row.group || 'all'
        );

        return segment === state.segment;
      })
      .map(row => ({
        date: parseDate(
          row.date ||
          row.snapshotDate ||
          row.surveyDate
        ),
        value: Number(row.value)
      }))
      .filter(row =>
        row.date &&
        Number.isFinite(row.value)
      )
      .sort((a, b) => a.date - b.date);

    const byPeriod = new Map();

    filtered.forEach(row => {
      const d = row.date;

      let key;

      if (state.period === 'month') {
        key = d.getFullYear() + '-' + d.getMonth();
      } else {
        const sunday = new Date(d);

        sunday.setDate(
          sunday.getDate() +
          (7 - sunday.getDay()) % 7
        );

        key = dateKey(sunday);
      }

      byPeriod.set(key, row);
    });

    return {
      data: [...byPeriod.values()],
      warning: filtered.length
        ? 'Source-backed dated records only.'
        : 'No records available for the selected category.'
    };
  }

  /* =========================
     TREND POPUP RENDERING
  ========================= */

  function renderTrend() {
    const index = keys.indexOf(state.key);

    $('execTrendTitle').textContent =
      names[index] +
      ' — ' +
      (state.period === 'month'
        ? 'Month-on-Month'
        : 'Week-on-Week');

    $('execTrendNote').textContent =
      'All / Sales / Non-Sales / Blue Collar · From 01 Apr 2026';

    document.querySelectorAll(
      '#execPeriod button'
    ).forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.period === state.period
      );
    });

    document.querySelectorAll(
      '#execSegment button'
    ).forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.segment === state.segment
      );
    });

    const result = state.key === 'headcount'
      ? getWorkforceHistory()
      : state.key === 'attendance'
        ? getAttendanceTrend()
        : state.key === 'attrition'
          ? getAttritionTrend()
          : state.key === 'positions'
            ? getPositionsTrend()
            : getSourceHistory();

    const data = result.data;

    $('execWarning').textContent = result.warning;

    const values = data.map(row => row.value);

    const latest = values.length
      ? values[values.length - 1]
      : null;

    const previous = values.length > 1
      ? values[values.length - 2]
      : null;

    const unit = (
      state.key === 'attendance' ||
      state.key === 'attrition'
    ) ? '%' : '';

    const formatNumber = value =>
      value == null
        ? '—'
        : Number(value.toFixed(2))
            .toLocaleString('en-IN') + unit;

    $('execLatest').textContent =
      formatNumber(latest);

    $('execDelta').textContent =
      previous == null
        ? '—'
        : formatNumber(latest - previous);

    $('execHighest').textContent =
      values.length
        ? formatNumber(Math.max(...values))
        : '—';

    $('execLowest').textContent =
      values.length
        ? formatNumber(Math.min(...values))
        : '—';

    const tableBody = $('execTrendRows');
    tableBody.replaceChildren();

    if (!data.length) {
      const row = tableBody.insertRow();
      const cell = row.insertCell();

      cell.colSpan = 3;
      cell.textContent = 'Historical data unavailable';
    }

    data.forEach((row, index) => {
      const tr = tableBody.insertRow();

      const difference = index
        ? row.value - data[index - 1].value
        : null;

      [
        formatDate(row.date),
        formatNumber(row.value),
        formatNumber(difference)
      ].forEach(value => {
        tr.insertCell().textContent = value;
      });
    });

    if (state.chart) {
      state.chart.destroy();
      state.chart = null;
    }

    const canvas = $('execTrendChart');

    
if (canvas && data.length && typeof Chart === 'function') {

  let yAxisConfig;

  
if (state.key === 'headcount') {

  // All = 100 gap
  // Sales, Non-Sales, Blue Collar = 50 gap
  const step = state.segment === 'all' ? 100 : 50;

  const maximum = Math.max(...values, 0);

  yAxisConfig = {
    min: 0,
    max: Math.max(
      step,
      Math.ceil(maximum / step) * step
    ),
    ticks: {
      stepSize: step,
      precision: 0
    }
  };

}
 else if (
    state.key === 'attendance' ||
    state.key === 'attrition'
  ) {
    yAxisConfig = {
      min: 0,
      max: 100,
      ticks: {
        stepSize: 20,
        callback: value => value + '%'
      }
    };

  } else if (state.key === 'enps') {
    yAxisConfig = {
      min: -100,
      max: 100,
      ticks: {
        stepSize: 25
      }
    };

  } else {
    const maximum = Math.max(...values);

    const step = maximum <= 20 ? 5 : 10;

    yAxisConfig = {
      min: 0,
      max: Math.max(
        step,
        Math.ceil(maximum / step) * step
      ),
      ticks: {
        stepSize: step,
        precision: 0
      }
    };
  }

  state.chart = new Chart($('execTrendChart'), {
    type: 'line',
    data: {
      labels: data.map(row => formatDate(row.date)),
      datasets: [{
        label: names[index],
        data: values,
        borderColor: '#147b8d',
        backgroundColor: 'rgba(20,123,141,.12)',
        fill: true,
        tension: 0.25,
        pointRadius: 3,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: yAxisConfig,
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  });
}

    if (canvas) canvas.style.display = data.length ? 'block' : 'none';
  }

  /* =========================
     POPUP INTERACTIONS
  ========================= */

  function openTrend(index) {
    state.key = keys[index];
    state.period = 'month';
    state.segment = 'all';

    overlay.classList.add('open');
    renderTrend();
  }

  function closeTrend() {
    overlay.classList.remove('open');

    if (state.chart) {
      state.chart.destroy();
      state.chart = null;
    }
  }

  cards.addEventListener('click', event => {
    if (event.target.closest('.hrbd-trigger')) return;

    const card = event.target.closest('.kpi-card');

    if (!card || !cards.contains(card)) return;

    const index = [
      ...cards.querySelectorAll('.kpi-card')
    ].indexOf(card);

    if (index >= 0 && index < 5) {
      openTrend(index);
    }
  });

  cards.addEventListener('keydown', event => {
    if (!['Enter', ' '].includes(event.key)) return;

    const card = event.target.closest('.kpi-card');

    if (!card) return;

    event.preventDefault();

    const index = [
      ...cards.querySelectorAll('.kpi-card')
    ].indexOf(card);

    if (index >= 0 && index < 5) {
      openTrend(index);
    }
  });

  const observer = new MutationObserver(() => {
    cards.querySelectorAll('.kpi-card').forEach(card => {
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
    });
  });

  observer.observe(cards, {
    childList: true
  });

  $('execPeriod').addEventListener('click', event => {
    const button = event.target.closest('[data-period]');

    if (!button) return;

    state.period = button.dataset.period;
    renderTrend();
  });

  $('execSegment').addEventListener('click', event => {
    const button = event.target.closest('[data-segment]');

    if (!button) return;

    state.segment = button.dataset.segment;
    renderTrend();
  });

  $('execTrendClose').addEventListener(
    'click',
    closeTrend
  );

  overlay.addEventListener('click', event => {
    if (event.target === overlay) {
      closeTrend();
    }
  });

  document.addEventListener('keydown', event => {
    if (
      event.key === 'Escape' &&
      overlay.classList.contains('open')
    ) {
      closeTrend();
    }
  });

  /* =========================
     DIAGNOSTIC FUNCTION
  ========================= */

  window.checkHrOverviewData = function () {
    const rows = getEmployeeRows() || [];
    const counts = getHeadcount();
    const attendance = getAttendancePayload();

    const result = {
      employeeRecords: rows.length,
      groups: counts,
      firstEmployeeFields: rows.length
        ? Object.keys(rows[0])
        : [],
      firstEmployeeCategory: rows.length
        ? get(
            rows[0],
            'employeeCategory',
            'Employee Category'
          )
        : null,
      firstEmployeeSubDepartment: rows.length
        ? get(
            rows[0],
            'subDepartment',
            'Sub-Department'
          )
        : null,
      attendanceLoaded: Boolean(attendance),
      attendanceRate: getAttendanceRate()
    };

    console.log('HR OVERVIEW DIAGNOSTIC', result);

    return result;
  };

  /* =========================
     INITIAL LOAD
  ========================= */

  refreshOverview();
  loadTaRecruitment();
   
  // Automatically refresh Executive Overview after
  // employee and attendance API data has loaded.

  let lastOverviewSignature = '';

  const overviewRefreshTimer = setInterval(() => {
    const employees = getEmployeePayload();
    const attendance = getAttendancePayload();

    if (
      !employees?.ok ||
      !attendance?.ok
    ) {
      return;
    }

    const signature = JSON.stringify({
      employeeCount: employees.employees?.length,
      exitCount: employees.exits?.length,
      employeeUpdated: employees.generatedAt,
      attendanceUpdated: attendance.generatedAt,
      attendanceRate: attendance.summary?.attendancePercent
    });

    if (signature !== lastOverviewSignature) {
      lastOverviewSignature = signature;
      refreshOverview();
    }
  }, 1000);


  if (
    typeof loadEmployeeCrmLive === 'function' &&
    !getEmployeeRows()
  ) {
    loadEmployeeCrmLive(false);
  }

  // Load attendance even when the Attendance page
  // has not been opened.
  if (
    typeof loadAttendanceLive === 'function' &&
    !getAttendancePayload()
  ) {
    loadAttendanceLive(false);
  }

})();
