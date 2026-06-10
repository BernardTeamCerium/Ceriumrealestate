/*
 * Cerium Real Estate — Accounting Dashboard
 * Vanilla JS single-page app. State lives in localStorage so edits persist.
 */

const STORE_KEY = 'cerium-accounting-v1';

/* ----------------------------- State ----------------------------- */

function loadState() {
  const raw = localStorage.getItem(STORE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch (e) { /* fall through to seed */ }
  }
  return structuredClone(SEED_DATA);
}

function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

let state = loadState();
let currentView = 'overview';
let charts = {}; // live Chart.js instances, destroyed before re-render

/* ----------------------------- Helpers ----------------------------- */

const CURRENCY = state.meta?.currency || 'USD';
const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 }).format(n || 0);
const fmtMonth = (ym) => new Date(ym + '-01T00:00:00').toLocaleDateString('en-US', { month: 'short' });
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const today = () => new Date('2026-06-10'); // anchored "today" for the demo dataset
const daysUntil = (d) => Math.ceil((new Date(d + 'T00:00:00') - today()) / 86400000);
const uid = () => Math.random().toString(36).slice(2, 9);
const propName = (id) => (state.properties.find((p) => p.id === id) || {}).name || 'Unassigned';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Derived financial aggregates used across views.
function metrics() {
  const totalExpenses = state.expenses.reduce((s, e) => s + e.amount, 0);
  const owedToVendors = state.expenses.reduce((s, e) => s + Math.max(0, e.amount - e.paid), 0); // payables
  const receivablesOpen = state.receivables.filter((r) => r.status !== 'paid').reduce((s, r) => s + r.amount, 0);
  const receivablesOverdue = state.receivables.filter((r) => r.status === 'overdue').reduce((s, r) => s + r.amount, 0);
  const upcomingFixCost = state.tasks.filter((t) => t.status !== 'done').reduce((s, t) => s + (t.estCost || 0), 0);
  const projIncome = state.projections.reduce((s, p) => s + p.income, 0);
  const projExpenses = state.projections.reduce((s, p) => s + p.expenses, 0);
  return {
    totalExpenses, owedToVendors, receivablesOpen, receivablesOverdue,
    upcomingFixCost, projIncome, projExpenses, projNet: projIncome - projExpenses,
  };
}

const badgeFor = (status) => {
  const map = {
    paid: ['green', 'Paid'], pending: ['amber', 'Pending'], overdue: ['red', 'Overdue'],
    current: ['blue', 'Current'], due: ['amber', 'Due'],
    open: ['gray', 'Open'], scheduled: ['blue', 'Scheduled'], 'in-progress': ['amber', 'In progress'], done: ['green', 'Done'],
  };
  const [cls, label] = map[status] || ['gray', status];
  return `<span class="badge ${cls}">${label}</span>`;
};
const priorityBadge = (p) => `<span class="badge ${p === 'high' ? 'red' : p === 'medium' ? 'amber' : 'green'}">${p}</span>`;

/* ----------------------------- Views ----------------------------- */

function renderOverview() {
  const m = metrics();
  const upcoming = [...state.tasks].filter((t) => t.status !== 'done').sort((a, b) => a.due.localeCompare(b.due)).slice(0, 4);

  return `
    <div class="page-head">
      <div><h2>Overview</h2><p>Financial snapshot for ${esc(state.meta.company)} — FY ${state.meta.fiscalYear}</p></div>
    </div>

    <div class="kpi-grid">
      <div class="kpi">
        <div class="label"><span class="dot" style="background:var(--accent)"></span>Total Expenses (YTD)</div>
        <div class="value">${fmt(m.totalExpenses)}</div>
        <div class="sub">${state.expenses.length} recorded entries</div>
      </div>
      <div class="kpi">
        <div class="label"><span class="dot" style="background:var(--red)"></span>Money Owed (Payables)</div>
        <div class="value">${fmt(m.owedToVendors)}</div>
        <div class="sub down">Across ${state.expenses.filter((e) => e.amount > e.paid).length} unpaid expenses</div>
      </div>
      <div class="kpi">
        <div class="label"><span class="dot" style="background:var(--green)"></span>Receivables Outstanding</div>
        <div class="value">${fmt(m.receivablesOpen)}</div>
        <div class="sub ${m.receivablesOverdue ? 'down' : ''}">${fmt(m.receivablesOverdue)} overdue</div>
      </div>
      <div class="kpi">
        <div class="label"><span class="dot" style="background:var(--amber)"></span>Projected Net (FY)</div>
        <div class="value">${fmt(m.projNet)}</div>
        <div class="sub ${m.projNet >= 0 ? 'up' : 'down'}">${fmt(m.projIncome)} in · ${fmt(m.projExpenses)} out</div>
      </div>
    </div>

    <div class="grid-2-1">
      <div class="panel">
        <h3>Income vs Expenses — Projected <span class="hint">FY ${state.meta.fiscalYear}</span></h3>
        <div class="chart-box"><canvas id="chartOverview"></canvas></div>
      </div>
      <div class="panel">
        <h3>Expenses by Category</h3>
        <div class="chart-box"><canvas id="chartCategory"></canvas></div>
      </div>
    </div>

    <div class="grid-2">
      <div class="panel">
        <h3>Upcoming Fixes <span class="hint">${state.tasks.filter((t) => t.status !== 'done').length} open</span></h3>
        <div class="task-list">
          ${upcoming.length ? upcoming.map(taskRow).join('') : '<div class="empty">Nothing pending 🎉</div>'}
        </div>
      </div>
      <div class="panel">
        <h3>Attention Needed</h3>
        <div class="task-list">
          ${attentionItems()}
        </div>
      </div>
    </div>
  `;
}

function attentionItems() {
  const items = [];
  state.expenses.filter((e) => e.status === 'overdue').forEach((e) =>
    items.push(`<div class="task high"><div class="t-main"><div class="t-title">⚠️ Overdue payment: ${esc(e.vendor)}</div><div class="t-meta">${esc(propName(e.property))} · ${esc(e.description)}</div></div><div class="t-cost">${fmt(e.amount - e.paid)}</div></div>`));
  state.receivables.filter((r) => r.status === 'overdue').forEach((r) =>
    items.push(`<div class="task high"><div class="t-main"><div class="t-title">📥 Overdue rent: ${esc(r.tenant)}</div><div class="t-meta">${esc(propName(r.property))} · due ${fmtDate(r.dueDate)}</div></div><div class="t-cost">${fmt(r.amount)}</div></div>`));
  state.tasks.filter((t) => t.status !== 'done' && daysUntil(t.due) < 0).forEach((t) =>
    items.push(`<div class="task high"><div class="t-main"><div class="t-title">🔧 Overdue fix: ${esc(t.title)}</div><div class="t-meta">${esc(propName(t.property))} · was due ${fmtDate(t.due)}</div></div><div class="t-cost">${fmt(t.estCost)}</div></div>`));
  return items.length ? items.join('') : '<div class="empty">All clear — no overdue items ✅</div>';
}

function taskRow(t) {
  const dleft = daysUntil(t.due);
  const overdue = t.status !== 'done' && dleft < 0;
  const dueLabel = dleft < 0 ? `${Math.abs(dleft)}d overdue` : dleft === 0 ? 'due today' : `in ${dleft}d`;
  return `
    <div class="task ${t.priority} ${overdue ? 'overdue-flag' : ''}">
      <div class="t-main">
        <div class="t-title">${esc(t.title)}</div>
        <div class="t-meta">${esc(propName(t.property))} · <span class="t-due">${fmtDate(t.due)} (${dueLabel})</span> · ${badgeFor(t.status)}</div>
      </div>
      <div class="t-cost">${fmt(t.estCost)}</div>
    </div>`;
}

function renderExpenses() {
  const rows = [...state.expenses].sort((a, b) => b.date.localeCompare(a.date)).map((e) => {
    const owed = e.amount - e.paid;
    const pct = e.amount ? (e.paid / e.amount) * 100 : 100;
    return `<tr>
      <td>${fmtDate(e.date)}</td>
      <td>${esc(e.description)}<div style="color:var(--text-dim);font-size:11px">${esc(e.vendor)}</div></td>
      <td>${esc(propName(e.property))}</td>
      <td><span class="badge gray">${esc(e.category)}</span></td>
      <td class="num">${fmt(e.amount)}</td>
      <td class="num">${owed > 0 ? `<span style="color:var(--red)">${fmt(owed)}</span>` : '<span style="color:var(--green)">—</span>'}
        <div class="bar-mini" style="margin-top:5px"><div style="width:${pct}%;background:${pct >= 100 ? 'var(--green)' : 'var(--amber)'}"></div></div></td>
      <td>${badgeFor(e.status)}</td>
      <td><div class="row-actions">
        <button class="icon-btn" onclick="openExpense('${e.id}')" title="Edit">✏️</button>
        <button class="icon-btn del" onclick="del('expenses','${e.id}')" title="Delete">🗑️</button>
      </div></td>
    </tr>`;
  }).join('');

  return `
    <div class="page-head">
      <div><h2>Expenses</h2><p>Track every cost and how much is still owed per expense</p></div>
      <button class="btn" onclick="openExpense()">＋ Add Expense</button>
    </div>
    <div class="panel">
      <div class="table-wrap"><table>
        <thead><tr><th>Date</th><th>Expense</th><th>Property</th><th>Category</th><th class="num">Amount</th><th class="num">Owed</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows || '<tr><td colspan="8"><div class="empty">No expenses yet.</div></td></tr>'}</tbody>
      </table></div>
    </div>`;
}

function renderProjections() {
  const m = metrics();
  const rows = state.projections.map((p) => {
    const net = p.income - p.expenses;
    return `<tr>
      <td>${new Date(p.month + '-01T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</td>
      <td class="num">${fmt(p.income)}</td>
      <td class="num">${fmt(p.expenses)}</td>
      <td class="num" style="color:${net >= 0 ? 'var(--green)' : 'var(--red)'}">${fmt(net)}</td>
    </tr>`;
  }).join('');

  return `
    <div class="page-head">
      <div><h2>Projections</h2><p>Forecasted income vs expenses across the fiscal year</p></div>
    </div>
    <div class="kpi-grid">
      <div class="kpi"><div class="label">Projected Income</div><div class="value">${fmt(m.projIncome)}</div></div>
      <div class="kpi"><div class="label">Projected Expenses</div><div class="value">${fmt(m.projExpenses)}</div></div>
      <div class="kpi"><div class="label">Projected Net</div><div class="value" style="color:${m.projNet >= 0 ? 'var(--green)' : 'var(--red)'}">${fmt(m.projNet)}</div></div>
      <div class="kpi"><div class="label">Avg Monthly Net</div><div class="value">${fmt(m.projNet / 12)}</div></div>
    </div>
    <div class="panel">
      <h3>Projected Cash Flow <span class="hint">monthly</span></h3>
      <div class="chart-box"><canvas id="chartProj"></canvas></div>
    </div>
    <div class="panel">
      <h3>Cumulative Net Position</h3>
      <div class="chart-box sm"><canvas id="chartCumulative"></canvas></div>
    </div>
    <div class="panel">
      <h3>Monthly Breakdown</h3>
      <div class="table-wrap"><table>
        <thead><tr><th>Month</th><th class="num">Income</th><th class="num">Expenses</th><th class="num">Net</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    </div>`;
}

function renderOwed() {
  const m = metrics();
  // Payables: unpaid portions of expenses.
  const payables = state.expenses.filter((e) => e.amount > e.paid).sort((a, b) => (b.amount - b.paid) - (a.amount - a.paid));
  const payRows = payables.map((e) => `<tr>
    <td>${esc(e.vendor)}<div style="color:var(--text-dim);font-size:11px">${esc(e.description)}</div></td>
    <td>${esc(propName(e.property))}</td>
    <td>${fmtDate(e.date)}</td>
    <td class="num">${fmt(e.amount - e.paid)}</td>
    <td>${badgeFor(e.status)}</td>
    <td><div class="row-actions"><button class="btn ghost sm" onclick="settleExpense('${e.id}')">Mark paid</button></div></td>
  </tr>`).join('');

  // Receivables: money owed to the company.
  const recv = [...state.receivables].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const recvRows = recv.map((r) => `<tr>
    <td>${esc(r.tenant)}<div style="color:var(--text-dim);font-size:11px">${esc(r.description)}</div></td>
    <td>${esc(propName(r.property))}</td>
    <td>${fmtDate(r.dueDate)}</td>
    <td class="num">${fmt(r.amount)}</td>
    <td>${badgeFor(r.status)}</td>
    <td><div class="row-actions">
      ${r.status !== 'paid' ? `<button class="btn ghost sm" onclick="settleReceivable('${r.id}')">Mark paid</button>` : ''}
      <button class="icon-btn del" onclick="del('receivables','${r.id}')" title="Delete">🗑️</button>
    </div></td>
  </tr>`).join('');

  return `
    <div class="page-head">
      <div><h2>Money Owed</h2><p>What the company owes (payables) and what it's owed (receivables)</p></div>
      <button class="btn" onclick="openReceivable()">＋ Add Receivable</button>
    </div>
    <div class="kpi-grid">
      <div class="kpi"><div class="label"><span class="dot" style="background:var(--red)"></span>Owed to Vendors</div><div class="value">${fmt(m.owedToVendors)}</div><div class="sub">${payables.length} open payables</div></div>
      <div class="kpi"><div class="label"><span class="dot" style="background:var(--green)"></span>Owed to Us</div><div class="value">${fmt(m.receivablesOpen)}</div><div class="sub">${recv.filter((r) => r.status !== 'paid').length} open receivables</div></div>
      <div class="kpi"><div class="label"><span class="dot" style="background:var(--amber)"></span>Net Position</div><div class="value" style="color:${m.receivablesOpen - m.owedToVendors >= 0 ? 'var(--green)' : 'var(--red)'}">${fmt(m.receivablesOpen - m.owedToVendors)}</div><div class="sub">receivables − payables</div></div>
    </div>

    <div class="panel">
      <h3>💸 Payables — money we owe</h3>
      <div class="table-wrap"><table>
        <thead><tr><th>Vendor</th><th>Property</th><th>Date</th><th class="num">Owed</th><th>Status</th><th></th></tr></thead>
        <tbody>${payRows || '<tr><td colspan="6"><div class="empty">No outstanding payables ✅</div></td></tr>'}</tbody>
      </table></div>
    </div>

    <div class="panel">
      <h3>📥 Receivables — money owed to us</h3>
      <div class="table-wrap"><table>
        <thead><tr><th>Tenant</th><th>Property</th><th>Due</th><th class="num">Amount</th><th>Status</th><th></th></tr></thead>
        <tbody>${recvRows || '<tr><td colspan="6"><div class="empty">No receivables tracked.</div></td></tr>'}</tbody>
      </table></div>
    </div>`;
}

function renderFixes() {
  const sorted = [...state.tasks].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    if (a.status === 'done' && b.status !== 'done') return 1;
    if (b.status === 'done' && a.status !== 'done') return -1;
    return order[a.priority] - order[b.priority] || a.due.localeCompare(b.due);
  });
  const open = state.tasks.filter((t) => t.status !== 'done');

  const rows = sorted.map((t) => {
    const dleft = daysUntil(t.due);
    const overdue = t.status !== 'done' && dleft < 0;
    return `<tr>
      <td>${esc(t.title)}<div style="color:var(--text-dim);font-size:11px">${esc(t.notes || '')}</div></td>
      <td>${esc(propName(t.property))}</td>
      <td>${priorityBadge(t.priority)}</td>
      <td style="${overdue ? 'color:var(--red);font-weight:600' : ''}">${fmtDate(t.due)}${overdue ? ` (${Math.abs(dleft)}d late)` : ''}</td>
      <td class="num">${fmt(t.estCost)}</td>
      <td>${badgeFor(t.status)}</td>
      <td><div class="row-actions">
        <button class="icon-btn" onclick="openTask('${t.id}')" title="Edit">✏️</button>
        <button class="icon-btn del" onclick="del('tasks','${t.id}')" title="Delete">🗑️</button>
      </div></td>
    </tr>`;
  }).join('');

  return `
    <div class="page-head">
      <div><h2>Upcoming Fixes</h2><p>Maintenance and repairs that need attention, with estimated cost</p></div>
      <button class="btn" onclick="openTask()">＋ Add Fix</button>
    </div>
    <div class="kpi-grid">
      <div class="kpi"><div class="label">Open Items</div><div class="value">${open.length}</div></div>
      <div class="kpi"><div class="label">High Priority</div><div class="value" style="color:var(--red)">${open.filter((t) => t.priority === 'high').length}</div></div>
      <div class="kpi"><div class="label">Overdue</div><div class="value" style="color:var(--red)">${open.filter((t) => daysUntil(t.due) < 0).length}</div></div>
      <div class="kpi"><div class="label">Est. Cost (open)</div><div class="value">${fmt(metrics().upcomingFixCost)}</div></div>
    </div>
    <div class="panel">
      <div class="table-wrap"><table>
        <thead><tr><th>Item</th><th>Property</th><th>Priority</th><th>Due</th><th class="num">Est. Cost</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows || '<tr><td colspan="7"><div class="empty">No fixes logged.</div></td></tr>'}</tbody>
      </table></div>
    </div>`;
}

/* ----------------------------- Charts ----------------------------- */

function buildCharts() {
  Object.values(charts).forEach((c) => c.destroy());
  charts = {};
  if (!window.Chart) return;

  const gridColor = 'rgba(255,255,255,0.06)';
  const tick = '#9aa7b4';
  Chart.defaults.color = tick;
  Chart.defaults.font.family = "-apple-system, 'Segoe UI', Roboto, sans-serif";
  const money = (v) => '$' + (v / 1000).toFixed(0) + 'k';
  const baseScales = { y: { grid: { color: gridColor }, ticks: { callback: money } }, x: { grid: { display: false } } };

  if (document.getElementById('chartOverview')) {
    charts.ov = new Chart('chartOverview', {
      type: 'bar',
      data: {
        labels: state.projections.map((p) => fmtMonth(p.month)),
        datasets: [
          { label: 'Income', data: state.projections.map((p) => p.income), backgroundColor: '#3fb950', borderRadius: 5 },
          { label: 'Expenses', data: state.projections.map((p) => p.expenses), backgroundColor: '#f85149', borderRadius: 5 },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: baseScales },
    });
  }

  if (document.getElementById('chartCategory')) {
    const byCat = {};
    state.expenses.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
    charts.cat = new Chart('chartCategory', {
      type: 'doughnut',
      data: {
        labels: Object.keys(byCat),
        datasets: [{ data: Object.values(byCat), backgroundColor: ['#2f81f7', '#3fb950', '#d29922', '#f85149', '#a371f7', '#39c5cf', '#db61a2', '#e3b341'], borderWidth: 0 }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, padding: 10 } } }, cutout: '60%' },
    });
  }

  if (document.getElementById('chartProj')) {
    charts.proj = new Chart('chartProj', {
      type: 'line',
      data: {
        labels: state.projections.map((p) => fmtMonth(p.month)),
        datasets: [
          { label: 'Income', data: state.projections.map((p) => p.income), borderColor: '#3fb950', backgroundColor: 'rgba(63,185,80,0.1)', fill: true, tension: 0.35 },
          { label: 'Expenses', data: state.projections.map((p) => p.expenses), borderColor: '#f85149', backgroundColor: 'rgba(248,81,73,0.1)', fill: true, tension: 0.35 },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: baseScales },
    });
  }

  if (document.getElementById('chartCumulative')) {
    let run = 0;
    const cum = state.projections.map((p) => (run += p.income - p.expenses));
    charts.cum = new Chart('chartCumulative', {
      type: 'line',
      data: {
        labels: state.projections.map((p) => fmtMonth(p.month)),
        datasets: [{ label: 'Cumulative Net', data: cum, borderColor: '#2f81f7', backgroundColor: 'rgba(47,129,247,0.12)', fill: true, tension: 0.35 }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: baseScales },
    });
  }
}

/* ----------------------------- Router ----------------------------- */

const VIEWS = { overview: renderOverview, expenses: renderExpenses, projections: renderProjections, owed: renderOwed, fixes: renderFixes };

function render() {
  document.getElementById('view').innerHTML = (VIEWS[currentView] || renderOverview)();
  document.querySelectorAll('.nav button').forEach((b) => b.classList.toggle('active', b.dataset.view === currentView));
  buildCharts();
}

function go(view) { currentView = view; render(); }

/* ----------------------------- CRUD / Modals ----------------------------- */

function modal(title, bodyHtml, onSave) {
  const overlay = document.getElementById('modal');
  overlay.querySelector('.modal-head h3').textContent = title;
  overlay.querySelector('.modal-body').innerHTML = bodyHtml;
  overlay.classList.add('open');
  const saveBtn = overlay.querySelector('#modalSave');
  const newBtn = saveBtn.cloneNode(true); // strip old listeners
  saveBtn.parentNode.replaceChild(newBtn, saveBtn);
  newBtn.addEventListener('click', () => { if (onSave() !== false) closeModal(); });
}
function closeModal() { document.getElementById('modal').classList.remove('open'); }
const val = (id) => document.getElementById(id).value;

function propOptions(sel) {
  return state.properties.map((p) => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
}

function openExpense(id) {
  const e = state.expenses.find((x) => x.id === id) || { date: '2026-06-10', category: 'Maintenance', paid: 0, status: 'pending', property: state.properties[0].id };
  modal(id ? 'Edit Expense' : 'Add Expense', `
    <div class="field"><label>Description</label><input id="f_desc" value="${esc(e.description || '')}" placeholder="e.g. Boiler servicing"></div>
    <div class="field-row">
      <div class="field"><label>Vendor</label><input id="f_vendor" value="${esc(e.vendor || '')}"></div>
      <div class="field"><label>Date</label><input id="f_date" type="date" value="${e.date}"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Property</label><select id="f_prop">${propOptions(e.property)}</select></div>
      <div class="field"><label>Category</label><select id="f_cat">${['Maintenance', 'Repairs', 'Utilities', 'Insurance', 'Property Tax', 'Landscaping', 'Cleaning', 'Management', 'Other'].map((c) => `<option ${c === e.category ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Total Amount</label><input id="f_amt" type="number" min="0" value="${e.amount || ''}"></div>
      <div class="field"><label>Amount Paid</label><input id="f_paid" type="number" min="0" value="${e.paid || 0}"></div>
    </div>
    <div class="field"><label>Status</label><select id="f_status">${['paid', 'pending', 'overdue'].map((s) => `<option ${s === e.status ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
  `, () => {
    const amount = +val('f_amt'), paid = +val('f_paid');
    if (!val('f_desc') || !amount) { alert('Description and amount are required.'); return false; }
    const rec = { date: val('f_date'), property: val('f_prop'), category: val('f_cat'), vendor: val('f_vendor'), description: val('f_desc'), amount, paid, status: val('f_status') };
    if (id) Object.assign(e, rec); else state.expenses.push({ id: uid(), ...rec });
    saveState(); render();
  });
}

function openReceivable(id) {
  const r = state.receivables.find((x) => x.id === id) || { dueDate: '2026-06-10', status: 'due', property: state.properties[0].id };
  modal(id ? 'Edit Receivable' : 'Add Receivable', `
    <div class="field"><label>Tenant / Payer</label><input id="f_tenant" value="${esc(r.tenant || '')}"></div>
    <div class="field"><label>Description</label><input id="f_desc" value="${esc(r.description || '')}" placeholder="e.g. Unit 4A rent - June"></div>
    <div class="field-row">
      <div class="field"><label>Property</label><select id="f_prop">${propOptions(r.property)}</select></div>
      <div class="field"><label>Due Date</label><input id="f_due" type="date" value="${r.dueDate}"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Amount</label><input id="f_amt" type="number" min="0" value="${r.amount || ''}"></div>
      <div class="field"><label>Status</label><select id="f_status">${['current', 'due', 'overdue', 'paid'].map((s) => `<option ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
    </div>
  `, () => {
    if (!val('f_tenant') || !+val('f_amt')) { alert('Tenant and amount are required.'); return false; }
    const rec = { tenant: val('f_tenant'), description: val('f_desc'), property: val('f_prop'), dueDate: val('f_due'), amount: +val('f_amt'), status: val('f_status') };
    if (id) Object.assign(r, rec); else state.receivables.push({ id: uid(), ...rec });
    saveState(); render();
  });
}

function openTask(id) {
  const t = state.tasks.find((x) => x.id === id) || { due: '2026-06-30', priority: 'medium', status: 'open', estCost: 0, property: state.properties[0].id };
  modal(id ? 'Edit Fix' : 'Add Fix', `
    <div class="field"><label>Title</label><input id="f_title" value="${esc(t.title || '')}" placeholder="e.g. Fix roof leak"></div>
    <div class="field-row">
      <div class="field"><label>Property</label><select id="f_prop">${propOptions(t.property)}</select></div>
      <div class="field"><label>Due Date</label><input id="f_due" type="date" value="${t.due}"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Priority</label><select id="f_prio">${['high', 'medium', 'low'].map((p) => `<option ${p === t.priority ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
      <div class="field"><label>Status</label><select id="f_status">${['open', 'scheduled', 'in-progress', 'done'].map((s) => `<option value="${s}" ${s === t.status ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
    </div>
    <div class="field"><label>Estimated Cost</label><input id="f_cost" type="number" min="0" value="${t.estCost || 0}"></div>
    <div class="field"><label>Notes</label><textarea id="f_notes" rows="2">${esc(t.notes || '')}</textarea></div>
  `, () => {
    if (!val('f_title')) { alert('Title is required.'); return false; }
    const rec = { title: val('f_title'), property: val('f_prop'), due: val('f_due'), priority: val('f_prio'), status: val('f_status'), estCost: +val('f_cost'), notes: val('f_notes') };
    if (id) Object.assign(t, rec); else state.tasks.push({ id: uid(), ...rec });
    saveState(); render();
  });
}

function settleExpense(id) {
  const e = state.expenses.find((x) => x.id === id);
  if (e) { e.paid = e.amount; e.status = 'paid'; saveState(); render(); }
}
function settleReceivable(id) {
  const r = state.receivables.find((x) => x.id === id);
  if (r) { r.status = 'paid'; saveState(); render(); }
}
function del(collection, id) {
  if (!confirm('Delete this item?')) return;
  state[collection] = state[collection].filter((x) => x.id !== id);
  saveState(); render();
}
function resetData() {
  if (!confirm('Reset all data back to the sample dataset? This erases your changes.')) return;
  state = structuredClone(SEED_DATA); saveState(); render();
}

/* ----------------------------- Boot ----------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav button').forEach((b) => b.addEventListener('click', () => go(b.dataset.view)));
  document.getElementById('resetBtn').addEventListener('click', resetData);
  document.querySelector('#modal .close').addEventListener('click', closeModal);
  document.getElementById('modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
  render();
});

// Expose handlers used in inline onclick attributes.
Object.assign(window, { openExpense, openReceivable, openTask, settleExpense, settleReceivable, del });
