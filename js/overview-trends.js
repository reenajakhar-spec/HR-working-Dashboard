
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
    'Attrition (Rolling 12M)',
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

    let match = text.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

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

    const mappings = [
      ['attrition', 2, '%'],
      ['positions', 3, ''],
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

      if (latest) {
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

    if (data.length && typeof Chart === 'function') {
      state.chart = new Chart(canvas, {
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
            pointRadius: 3
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
            y: {
              beginAtZero: false
            }
          }
        }
      });
    }

    canvas.style.display =
      data.length ? 'block' : 'none';
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
