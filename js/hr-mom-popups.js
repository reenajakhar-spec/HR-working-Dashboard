
/* EURONICS HR Command Centre - Month-on-Month KPI Popups */
(function () {
  'use strict';

  const MODULES = {
    employees: '.employee-kpi-card',
    attendance: '.attendance-kpi-card',
    learning: '.lnd-kpi-card'
  };

  const esc = x => String(x ?? '').replace(
    /[&<>"']/g,
    c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;',
      '"': '&quot;', "'": '&#39;'
    }[c])
  );

  function checked(y, m, d) {
    if (!m) return null;
    const v = new Date(y, m - 1, d);
    return v.getFullYear() === y &&
      v.getMonth() === m - 1 &&
      v.getDate() === d ? v : null;
  }

  function dateOf(v) {
    if (v instanceof Date) return isNaN(v) ? null : v;
    const s = String(v ?? '').trim();
    if (!s) return null;

    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return checked(+m[1], +m[2], +m[3]);

    m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
    if (m) return checked(+m[3], +m[2], +m[1]);

    m = s.match(/^(\d{1,2})[\s-]+([a-z]+)[\s,-]+(\d{4})$/i);
    if (m) {
      const months = {
        jan: 1, feb: 2, mar: 3, apr: 4,
        may: 5, jun: 6, jul: 7, aug: 8,
        sep: 9, sept: 9, oct: 10, nov: 11, dec: 12
      };
      return checked(+m[3], months[m[2].toLowerCase()], +m[1]);
    }
    return null;
  }

  const key = d => d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0');

  const number = x => {
    if (x === null || x === undefined || x === '') return null;
    const n = Number(String(x).replace(/[, %]/g, ''));
    return Number.isFinite(n) ? n : null;
  };

  function monthlyCount(rows, dateFields, filter) {
    const m = new Map();
    for (const r of rows) {
      if (filter && !filter(r)) continue;
      const d = dateOf(dateFields.map(f => r[f]).find(v => v));
      if (!d || d > new Date()) continue;
      const k = key(d);
      m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  }

  function employeeSeries(label) {
    const p = typeof EMPLOYEE_CRM_DATA === 'undefined'
      ? null : EMPLOYEE_CRM_DATA;
    if (!p) return null;

    const employees = Array.isArray(p.employees) ? p.employees : [];
    const exits = Array.isArray(p.exits) ? p.exits : [];

    const dept = document.getElementById('employeeDeptFilter')
      ?.value || 'all';

    const match = r =>
      dept === 'all' ||
      String(r.department || r.Department || '')
        .toLowerCase() === dept.toLowerCase();

    const joins = monthlyCount(
      employees,
      ['doj', 'joiningDate', 'dateOfJoining', 'joining', 'joinDate'],
      match
    );

    // Exit classification uses Last Working Day only.
    // Final Status is intentionally ignored.
    const left = monthlyCount(
      exits,
      ['lastWorkingDay'],
      match
    );

    const allKeys = [...new Set([
      ...joins.keys(), ...left.keys()
    ])].sort();

    if (/New Joiners/i.test(label)) {
      return {
        values: joins,
        note: 'Joining dates from employee master. Current department filter applied.'
      };
    }

    if (/Net Change/i.test(label)) {
      const values = new Map(
        allKeys.map(k => [
          k, (joins.get(k) || 0) - (left.get(k) || 0)
        ])
      );
      return {
        values,
        note: 'Joiners minus exit records by Last Working Day. Historical department mapping and duplicate exit records require verification.'
      };
    }

    return {
      values: new Map(),
      note: 'Reliable monthly historical snapshots are required for this KPI. Current employee master alone cannot establish past headcount, tenure or probation totals.'
    };
  }

  function attendanceSeries(label) {
    const p = typeof attendancePayload === 'undefined'
      ? null : attendancePayload;

    if (!p || !Array.isArray(p.daily)) return null;

    const dept =
      document.getElementById('attendanceDepartmentFilter')?.value ||
      document.getElementById('attendanceDeptFilter')?.value ||
      'all';

    // Overall daily history is not department-specific.
    if (dept !== 'all') {
      return {
        values: new Map(),
        note: 'The current daily API series is company-wide. Department-specific historical attendance requires employee-level dated records.'
      };
    }

    const field = /Overall Attendance/i.test(label)
      ? 'attendancePercent'
      : /Present Records/i.test(label)
      ? 'present'
      : /Absent Records/i.test(label)
      ? 'absent'
      : /Other|Leave/i.test(label)
      ? 'other'
      : /Late/i.test(label)
      ? 'lateCount'
      : null;

    if (!field) {
      return {
        values: new Map(),
        note: 'This KPI requires a dated monthly historical source.'
      };
    }

    const grouped = new Map();

    for (const r of p.daily) {
      const d = dateOf(r.date);
      const n = number(r[field]);
      if (!d || n === null) continue;

      const k = key(d);
      if (!grouped.has(k)) grouped.set(k, []);

      const present = number(r.present) || 0;
      const absent = number(r.absent) || 0;

      grouped.get(k).push({
        n,
        w: present + absent,
        present,
        absent
      });
    }

    const values = new Map();

    for (const [k, a] of grouped) {
      if (field === 'attendancePercent') {
        const present = a.reduce((s, x) => s + x.present, 0);
        const absent = a.reduce((s, x) => s + x.absent, 0);
        if (present + absent > 0) {
          values.set(k, 100 * present / (present + absent));
        }
      } else {
        values.set(k, a.reduce((s, x) => s + x.n, 0));
      }
    }

    return {
      values,
      note: field === 'attendancePercent'
        ? 'Monthly attendance = Present / (Present + Absent) × 100. Other states excluded.'
        : 'Monthly totals calculated from available daily attendance records.'
    };
  }

  function learningSeries(label) {
    if (typeof lndRows === 'undefined' || !Array.isArray(lndRows)) {
      return null;
    }

    const rows = typeof getFilteredLndRows === 'function'
      ? getFilteredLndRows() : lndRows;

    const grouped = new Map();

    for (const r of rows) {
      const d = dateOf(r.Date);
      if (!d) continue;

      const k = key(d);
      if (!grouped.has(k)) grouped.set(k, []);
      grouped.get(k).push(r);
    }

    const values = new Map();

    for (const [k, a] of grouped) {
      const present = a.filter(r =>
        String(r.Attendance || '').toLowerCase() === 'present'
      );

      const active = a.filter(r =>
        String(r.Status || '').toLowerCase() !== 'not active'
      );

      const ids = arr => new Set(arr.map(r =>
        String(
          r['Employee ID'] ||
          r['Employee ID 2'] ||
          r.Attendees || ''
        ).trim()
      ).filter(Boolean));

      const trained = ids(present).size;
      const total = ids(active).size;

      const hours = present.reduce(
        (s, r) => s + (number(r['Duration (in hours)']) || 0),
        0
      );

      const programs = new Set(present.map(r =>
        [r['Training Topic'], r.Date, r['Branch Name']].join('|')
      )).size;

      const attended = present.length;
      const absent = a.filter(r =>
        String(r.Attendance || '').toLowerCase() === 'absent'
      ).length;

      const avg = field => {
        const nums = a.map(r => number(r[field]))
          .filter(x => x !== null);
        return nums.length
          ? nums.reduce((s, x) => s + x, 0) / nums.length
          : null;
      };

      let v = null;

      if (/Total Employees/i.test(label)) v = total;
      else if (/Employees Trained/i.test(label)) v = trained;
      else if (/Training Coverage/i.test(label))
        v = total ? trained / total * 100 : null;
      else if (/Total Learning Hours/i.test(label)) v = hours;
      else if (/Avg. Hours/i.test(label))
        v = trained ? hours / trained : null;
      else if (/Programs Conducted/i.test(label)) v = programs;
      else if (/Completion Rate/i.test(label))
        v = attended + absent
          ? attended / (attended + absent) * 100 : null;
      else if (/Training Rating/i.test(label))
        v = avg('Feedback Score');
      else if (/Assessment Score/i.test(label))
        v = avg('Assesment Score');

      if (v !== null) values.set(k, v);
    }

    return {
      values,
      note: 'Based on dated training records with the currently selected L&D filters. Employee totals represent the recorded training population.'
    };
  }

  let chart = null;

  function open(module, card) {
    const label = (
      card.querySelector(
        '.employee-kpi-label,.attendance-kpi-label,.title'
      )?.textContent || 'KPI'
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

    const pairs = result
      ? [...result.values].sort((a, b) => a[0].localeCompare(b[0]))
      : [];

    note.textContent = result?.note ||
      'Load live data first to view historical trends.';

    const pct = /%|Attendance|Coverage|Rate/i.test(label);

    const fmt = v => v === null
      ? '—'
      : (Math.abs(v) >= 1000
          ? v.toLocaleString('en-IN', { maximumFractionDigits: 1 })
          : v.toFixed(pct ? 1 : 2).replace(/\.00$/, '')
        ) + (pct ? '%' : '');

    const last = pairs.length ? pairs[pairs.length - 1][1] : null;
    const prev = pairs.length > 1 ? pairs[pairs.length - 2][1] : null;

    document.getElementById('hrMomLatest').textContent = fmt(last);

    document.getElementById('hrMomChange').textContent =
      last === null || prev === null ? '—' : fmt(last - prev);

    document.getElementById('hrMomHigh').textContent =
      pairs.length ? fmt(Math.max(...pairs.map(x => x[1]))) : '—';

    document.getElementById('hrMomLow').textContent =
      pairs.length ? fmt(Math.min(...pairs.map(x => x[1]))) : '—';

    tbody.innerHTML = pairs.length
      ? pairs.slice().reverse().map(([k, v], i) => {
          const previous = pairs[pairs.length - i - 2]?.[1];
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

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    if (chart) {
      chart.destroy();
      chart = null;
    }

    if (pairs.length && typeof Chart !== 'undefined') {
      chart = new Chart(document.getElementById('hrMomChart'), {
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
          plugins: { legend: { display: false } }
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
    .employee-kpi-card,
    .attendance-kpi-card,
    .lnd-kpi-card {
      cursor: pointer;
    }
    .employee-kpi-card:hover,
    .attendance-kpi-card:hover,
    .lnd-kpi-card:hover {
      box-shadow: 0 12px 32px rgba(12,63,75,.16);
      transform: translateY(-2px);
    }
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

  document.addEventListener('click', e => {
    for (const [module, selector] of Object.entries(MODULES)) {
      const card = e.target.closest(selector);
      if (card) {
        open(module, card);
        return;
      }
    }
  });

})();
