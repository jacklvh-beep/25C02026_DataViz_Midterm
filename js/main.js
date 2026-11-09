'use strict';
/* =========================================================
 * main.js — trạng thái bộ lọc, đồng bộ các biểu đồ, tương tác
 * ========================================================= */

let ALL = [];
let BY_ID = new Map();

const state = {
  sets: Object.fromEntries(Object.entries(DIMENSIONS).map(([k, v]) => [k, new Set(v)])),
  monthFrom: 0,
  monthTo: 11,
  gran: 'month',
  metric: 'Quantity',
};

const DIM_LABEL = { Store: 'Cửa hàng', Product_Category: 'Danh mục', Customer_Type: 'Khách hàng', Payment_Method: 'Thanh toán' };

function applyFilters(rows) {
  return rows.filter(r =>
    Object.entries(state.sets).every(([dim, set]) => set.has(r[dim])) &&
    r.monthIdx >= state.monthFrom && r.monthIdx <= state.monthTo);
}

/* ---------------- Bộ lọc ---------------- */
function buildFilters() {
  document.querySelectorAll('.filter-group[data-dim]').forEach(group => {
    const dim = group.dataset.dim;
    group.querySelector('.chips').innerHTML = DIMENSIONS[dim].map(v => {
      const dot = dim === 'Product_Category' ? `<span class="dot" style="background:${CAT_COLORS[v]}"></span>` : '';
      return `<button type="button" class="chip" data-value="${v}" aria-pressed="true">${dot}${v}</button>`;
    }).join('');
    group.addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      const set = state.sets[dim];
      const v = chip.dataset.value;
      if (set.has(v)) set.delete(v); else set.add(v);
      update();
    });
  });

  const opts = MONTH_LABELS.map((m, i) => `<option value="${i}">${m}</option>`).join('');
  const from = document.getElementById('month-from');
  const to = document.getElementById('month-to');
  from.innerHTML = opts; to.innerHTML = opts;
  from.value = '0'; to.value = '11';
  const onMonth = () => {
    let a = +from.value, b = +to.value;
    if (a > b) [a, b] = [b, a];
    state.monthFrom = a; state.monthTo = b;
    from.value = a; to.value = b;
    update();
  };
  from.addEventListener('change', onMonth);
  to.addEventListener('change', onMonth);

  document.getElementById('btn-reset').addEventListener('click', resetFilters);
  const collapse = document.getElementById('btn-collapse');
  collapse.addEventListener('click', () => {
    const bar = document.getElementById('filterbar');
    const collapsed = bar.classList.toggle('collapsed');
    collapse.textContent = collapsed ? 'Mở bộ lọc' : 'Thu gọn bộ lọc';
    collapse.setAttribute('aria-expanded', String(!collapsed));
  });
  if (window.matchMedia('(max-width: 860px)').matches) collapse.click(); // màn hình nhỏ: thu gọn sẵn
}

/** Khi bấm mục lục, tiêu đề mục phải nằm dưới thanh lọc dính (không bị che).
 *  Chiều cao thanh lọc thay đổi theo màn hình và khi mở/thu gọn → đo trực tiếp. */
function syncStickyOffset() {
  const bar = document.getElementById('filterbar');
  const apply = () => { document.documentElement.style.scrollPaddingTop = (bar.offsetHeight + 16) + 'px'; };
  apply();
  if ('ResizeObserver' in window) new ResizeObserver(apply).observe(bar);
  else window.addEventListener('resize', apply);
}

function resetFilters() {
  Object.entries(DIMENSIONS).forEach(([k, v]) => { state.sets[k] = new Set(v); });
  state.monthFrom = 0; state.monthTo = 11;
  document.getElementById('month-from').value = '0';
  document.getElementById('month-to').value = '11';
  update();
}

/** Click vào một phần tử biểu đồ: chỉ giữ giá trị đó; click lại lần nữa thì bỏ lọc chiều này */
function focusOn(dim, value) {
  const set = state.sets[dim];
  const onlyThis = set.size === 1 && set.has(value);
  state.sets[dim] = onlyThis ? new Set(DIMENSIONS[dim]) : new Set([value]);
  update();
}

function syncFilterUI(filtered) {
  document.querySelectorAll('.filter-group[data-dim]').forEach(group => {
    const set = state.sets[group.dataset.dim];
    group.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(set.has(c.dataset.value))));
  });
  const parts = [];
  for (const [dim, set] of Object.entries(state.sets)) {
    if (set.size !== DIMENSIONS[dim].length) parts.push(`${DIM_LABEL[dim]}: ${set.size ? [...set].join(', ') : '(không chọn)'}`);
  }
  if (state.monthFrom !== 0 || state.monthTo !== 11) parts.push(`Tháng: ${MONTH_LABELS[state.monthFrom]}–${MONTH_LABELS[state.monthTo]}`);
  document.getElementById('filter-status').innerHTML =
    `Đang xem <b>${filtered.length}/${ALL.length}</b> giao dịch` + (parts.length ? ' · ' + parts.join(' · ') : ' · tất cả dữ liệu');
}

/* ---------------- Vẽ lại toàn bộ ---------------- */
function update() {
  const rows = applyFilters(ALL);
  syncFilterUI(rows);
  Charts.kpis(rows, ALL);
  Charts.category(rows);
  Charts.treemap(rows);
  Charts.storeMix(rows);
  Charts.metric(rows, state.metric);
  Charts.monthly(rows, state.gran, state);
  Charts.catTrend(rows, state.gran, state);
  Charts.delivery(rows);
  Charts.heatmap(rows);
  Charts.storeMap(rows);
  Charts.customer(rows);
  Charts.payment(rows);
  Charts.discount(rows);
  Charts.discountBar(rows);
  Charts.qtyRev(rows);
  Promise.resolve(Charts.parcoords(rows)).then(renderPcSelection);
  Lookup.update(rows);
}

/* ---------------- Tọa độ song song: brushing ---------------- */
function renderPcSelection() {
  const box = document.getElementById('pc-selection');
  const { rows, active } = Charts.pcSelected();
  const total = Charts.pcRows.length;
  if (!active) {
    box.innerHTML = `<p class="note">Chưa chọn vùng nào: đang hiển thị ${total} giao dịch đủ dữ liệu (bỏ qua các dòng thiếu điểm đánh giá/ngày giao). Kéo dọc một trục hoặc bấm nút gợi ý ở trên.</p>`;
    return;
  }
  const s = Agg.summary(rows);
  const top = [...rows].sort((a, b) => a.Margin - b.Margin).slice(0, 12);
  box.innerHTML = `
    <p><b>${rows.length}</b>/${total} giao dịch được chọn · Doanh thu ${fmt.million(s.revenue)} · Lợi nhuận ${fmt.million(s.profit)} · Biên ${fmt.pct(s.margin)} · Đánh giá TB ${fmt.num(s.rating)}
    ${rows.length > top.length ? `<span class="note">(bảng hiển thị ${top.length} giao dịch có biên thấp nhất)</span>` : ''}</p>
    ${rows.length ? `<table>
      <thead><tr><th>Mã</th><th>Cửa hàng</th><th>Sản phẩm</th><th class="num-cell">Giảm</th><th class="num-cell">SL</th><th class="num-cell">Doanh thu</th><th class="num-cell">Lợi nhuận</th><th class="num-cell">Biên</th></tr></thead>
      <tbody>${top.map(r => `<tr>
        <td>${r.Transaction_ID}</td><td>${r.Store}</td><td>${r.Product}</td>
        <td class="num-cell">${r.Discount}%</td><td class="num-cell">${r.Quantity}</td>
        <td class="num-cell">${fmt.vnd(r.Revenue)}</td>
        <td class="num-cell ${r.Profit < 0 ? 'neg' : ''}">${fmt.vnd(r.Profit)}</td>
        <td class="num-cell ${r.Margin < 0 ? 'neg' : ''}">${fmt.pct(r.Margin)}</td></tr>`).join('')}</tbody>
    </table>` : ''}`;
}

function applyPreset(name) {
  const el = document.getElementById('c-parcoords');
  if (!el.data || !el.data[0] || el.data[0].type !== 'parcoords') return;
  const idx = key => Charts.PC_DIMS.findIndex(d => d.key === key);
  const update = {};
  Charts.PC_DIMS.forEach((_, i) => { update[`dimensions[${i}].constraintrange`] = [null]; });
  const profits = el.data[0].dimensions[idx('Profit')].values;
  const revenues = el.data[0].dimensions[idx('Revenue')].values;
  if (name === 'loss') update[`dimensions[${idx('Profit')}].constraintrange`] = [[Math.min(...profits), 0]];
  if (name === 'deep') update[`dimensions[${idx('Discount')}].constraintrange`] = [[24.5, 35.5]];
  if (name === 'big') update[`dimensions[${idx('Revenue')}].constraintrange`] = [[2, Math.max(...revenues)]];
  Plotly.restyle(el, update).then(renderPcSelection);
}

/* ---------------- Chi tiết giao dịch ---------------- */
function showDetail(id) {
  const r = BY_ID.get(id);
  if (!r) return;
  const rows = [
    ['Mã giao dịch', r.Transaction_ID], ['Ngày', `${r.Date.split('-').reverse().join('/')} (${r.Day_of_Week})`], ['Cửa hàng', r.Store],
    ['Sản phẩm', `${r.Product} · ${r.Product_Category}`], ['Khách hàng', r.Customer_Type], ['Thanh toán', r.Payment_Method],
    ['Số lượng × đơn giá', `${r.Quantity} × ${fmt.vnd(r.Unit_Price)}`], ['Giảm giá', r.Discount + '%'],
    ['Doanh thu', fmt.vnd(r.Revenue)], ['Chi phí', fmt.vnd(r.Cost)],
    ['Lợi nhuận', `<span class="${r.Profit < 0 ? 'neg' : ''}">${fmt.vnd(r.Profit)}</span>`], ['Biên lợi nhuận', fmt.pct(r.Margin)],
    ['Điểm đánh giá', r.Customer_Rating === null ? 'trống' : r.Customer_Rating + ' / 5'],
    ['Ngày giao', r.Delivery_Days === null ? 'trống' : r.Delivery_Days + ' ngày'],
  ];
  document.getElementById('detail-body').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  document.getElementById('detail').hidden = false;
}

/* ---------------- Gắn sự kiện cho biểu đồ (một lần) ---------------- */
function bindChartEvents() {
  const on = (id, ev, fn) => document.getElementById(id).on(ev, fn);
  on('c-category', 'plotly_click', e => focusOn('Product_Category', e.points[0].x));
  on('c-storemix', 'plotly_click', e => focusOn('Store', e.points[0].x));
  // Bản đồ vẽ bất đồng bộ (chờ style tải xong) → gắn sự kiện sau khi lần vẽ đầu hoàn tất
  Charts._mapQueue.then(() => on('c-map', 'plotly_click', e => focusOn('Store', e.points[0].customdata[0])));
  on('c-customer', 'plotly_click', e => focusOn('Customer_Type', e.points[0].x));
  on('c-payment', 'plotly_click', e => focusOn('Payment_Method', e.points[0].label));
  on('c-metric', 'plotly_click', e => focusOn('Product_Category', e.points[0].y));
  on('c-discount', 'plotly_click', e => showDetail(e.points[0].customdata[0]));
  on('c-qtyrev', 'plotly_click', e => showDetail(e.points[0].customdata[0]));
  on('c-parcoords', 'plotly_restyle', () => renderPcSelection());

  document.querySelectorAll('.preset-buttons button').forEach(b =>
    b.addEventListener('click', () => applyPreset(b.dataset.preset)));
  document.getElementById('metric-select').addEventListener('change', e => {
    state.metric = e.target.value;
    Charts.metric(applyFilters(ALL), state.metric);
  });
  document.querySelectorAll('#gran-seg button').forEach(b => b.addEventListener('click', () => {
    state.gran = b.dataset.gran;
    document.querySelectorAll('#gran-seg button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    const rows = applyFilters(ALL);
    Charts.monthly(rows, state.gran, state);
    Charts.catTrend(rows, state.gran, state);
  }));
  document.getElementById('detail-close').addEventListener('click', () => { document.getElementById('detail').hidden = true; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') document.getElementById('detail').hidden = true; });
}

/* ---------------- Phần tĩnh: chất lượng dữ liệu, thẻ insight ---------------- */
function renderDataQuality() {
  const q = dataQuality(ALL);
  const miss = Object.entries(q.missing).filter(([, v]) => v > 0).map(([k, v]) => `${k}: ${v} ô trống`);
  document.getElementById('dq-list').innerHTML = `
    <li><b>${q.n}</b> giao dịch, không trùng mã.</li>
    <li>Ô trống: ${miss.length ? miss.join('; ') : 'không có'}.</li>
    <li>Công thức Doanh thu = SL × Đơn giá × (1 − Giảm giá) và Lợi nhuận = Doanh thu − Chi phí: ${q.inconsistent === 0 ? '<b>nhất quán ở mọi dòng</b>' : q.inconsistent + ' dòng lệch'}.</li>
    <li><b>${q.losses}</b> giao dịch có lợi nhuận âm (lỗ).</li>`;
}

function renderKeyInsights() {
  const cards = [...document.querySelectorAll('article.insight')]
    .sort((a, b) => Number(a.dataset.n) - Number(b.dataset.n))
    .map(a => {
      const tag = a.querySelector('.tag').textContent;
      const q = a.querySelector('.question').textContent;
      const h = a.querySelector('.insight-head h3').textContent.trim();
      return `<a class="key-card" href="#${a.id}"><span class="tag">${tag}</span>
        <p class="question">${q}</p><h3>→ ${h}</h3><span class="go">Xem biểu đồ minh chứng →</span></a>`;
    });
  document.getElementById('key-grid').innerHTML = cards.join('');
}

function updateTodoBanner() {
  const n = document.querySelectorAll('.todo, .todo-inline, .draft').length;
  document.getElementById('todo-count').textContent = n;
  document.getElementById('todo-banner').hidden = n === 0;
}

/* ---------------- Khởi động ---------------- */
async function init() {
  try {
    ALL = await loadData();
  } catch (err) {
    document.getElementById('filter-status').innerHTML =
      `<span class="neg">Lỗi tải dữ liệu: ${err.message}. Nếu mở tệp trực tiếp (file://), hãy chạy qua một web server.</span>`;
    console.error(err);
    return;
  }
  BY_ID = new Map(ALL.map(r => [r.Transaction_ID, r]));
  buildFilters();
  syncStickyOffset();
  Lookup.init();
  renderDataQuality();
  renderKeyInsights();
  updateTodoBanner();
  update();
  bindChartEvents();
}

document.addEventListener('DOMContentLoaded', init);
