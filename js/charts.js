'use strict';
/* =========================================================
 * charts.js — mỗi hàm vẽ một biểu đồ từ tập dòng ĐÃ LỌC
 * ========================================================= */

const BASE_LAYOUT = {
  font: { family: '"Be Vietnam Pro", system-ui, sans-serif', size: 12, color: '#1f2937' },
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(0,0,0,0)',
  margin: { t: 24, r: 24, b: 56, l: 64 },
  hoverlabel: { bgcolor: '#ffffff', bordercolor: '#cbd5e1', font: { color: '#111827' } },
  // Chú thích đặt phía trên vùng vẽ để không đè lên tiêu đề trục X
  legend: { orientation: 'h', x: 0, xanchor: 'left', y: 1.02, yanchor: 'bottom' },
  // automargin: lề tự nới theo độ dài nhãn trục → nhãn không bị cắt hay đè tiêu đề trục
  xaxis: { gridcolor: '#eef2f7', zerolinecolor: '#cbd5e1', automargin: true },
  yaxis: { gridcolor: '#eef2f7', zerolinecolor: '#cbd5e1', automargin: true },
};
// Từ điển tiếng Việt cho thanh công cụ và định dạng số của Plotly (dấu phẩy thập phân, dấu chấm hàng nghìn)
Plotly.register({
  moduleType: 'locale', name: 'vi',
  dictionary: {
    'Zoom': 'Phóng to vùng chọn', 'Pan': 'Kéo di chuyển', 'Zoom in': 'Phóng to', 'Zoom out': 'Thu nhỏ',
    'Reset axes': 'Đặt lại trục', 'Autoscale': 'Tự động co giãn', 'Reset view': 'Đặt lại khung nhìn', 'Reset views': 'Đặt lại khung nhìn',
    'Download plot as a png': 'Tải biểu đồ (PNG)', 'Download plot': 'Tải biểu đồ',
    'Box Select': 'Chọn vùng chữ nhật', 'Lasso Select': 'Chọn vùng tự do',
    'Show closest data on hover': 'Hiện điểm gần nhất khi rê chuột', 'Compare data on hover': 'So sánh dữ liệu khi rê chuột',
    'Toggle show closest data on hover': 'Bật/tắt hiện điểm gần nhất', 'Toggle Spike Lines': 'Bật/tắt đường dóng',
    'Double-click to zoom back out': 'Nhấp đúp để thu nhỏ lại', 'Double-click on legend to isolate one trace': 'Nhấp đúp vào chú thích để chỉ hiện một nhóm',
    'Taking snapshot - this may take a few seconds': 'Đang chụp ảnh biểu đồ, vui lòng chờ…', 'Snapshot succeeded': 'Đã tải ảnh biểu đồ',
    'Sorry, there was a problem downloading your snapshot!': 'Xin lỗi, không tải được ảnh biểu đồ!',
    'Produced with Plotly.js': 'Tạo bằng Plotly.js', 'Reset': 'Đặt lại', 'trace': 'nhóm', 'lat:': 'vĩ độ:', 'lon:': 'kinh độ:',
  },
  format: {
    days: ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'],
    shortDays: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
    months: ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'],
    shortMonths: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
    date: '%d/%m/%Y', decimal: ',', thousands: '.',
  },
});

const PLOT_CONFIG = {
  locale: 'vi',
  responsive: true,
  displaylogo: false,
  modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d', 'toggleSpikelines'],
};

// Thang màu phân kỳ cam → vàng nhạt → xanh dương (thân thiện người mù màu đỏ-lục)
const MARGIN_SCALE = [[0, '#c2410c'], [0.5, '#fef3c7'], [1, '#1d4ed8']];

function mergeLayout(extra) {
  // Sao chép sâu: Plotly ghi thêm thuộc tính (type, range…) vào object layout được truyền vào,
  // nếu dùng chung BASE_LAYOUT thì biểu đồ này sẽ "làm bẩn" trục của biểu đồ khác.
  const base = JSON.parse(JSON.stringify(BASE_LAYOUT));
  const out = { ...base, ...extra };
  ['xaxis', 'yaxis', 'margin', 'legend'].forEach(k => {
    if (extra[k]) out[k] = { ...base[k], ...extra[k] };
  });
  if (out.yaxis2) out.yaxis2 = { automargin: true, ...out.yaxis2 };
  return out;
}

/** Vẽ (hoặc cập nhật) biểu đồ. traces = null → hiện thông báo "không có dữ liệu" */
function draw(id, traces, layout = {}) {
  const el = document.getElementById(id);
  const empty = !traces || traces.length === 0;
  el.classList.toggle('is-empty', empty);
  // Điện thoại: ẩn thanh công cụ Plotly vì nó đè lên chú thích (vẫn chụm 2 ngón để phóng to được)
  const config = el.clientWidth < 420 ? { ...PLOT_CONFIG, displayModeBar: false } : PLOT_CONFIG;
  return Plotly.react(el, empty ? [] : traces, mergeLayout(layout), config);
}

const present = (dim, rows) => DIMENSIONS[dim].filter(v => rows.some(r => r[dim] === v));
const toM = v => v / 1e6;

/** Khung hẹp (điện thoại) → rút gọn nhãn để chữ không đè nhau */
const isNarrow = id => document.getElementById(id).clientWidth < 420;
/** Ngắt nhãn dài thành nhiều dòng, mỗi dòng tối đa `max` ký tự */
const wrapLabel = (s, max = 12) => {
  const lines = []; let cur = '';
  for (const w of String(s).split(' ')) {
    if (cur && (cur + ' ' + w).length > max) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) lines.push(cur);
  return lines.join('<br>');
};
/** Trục danh mục: giữ giá trị gốc (để bấm lọc), chỉ hiển thị nhãn đã ngắt dòng */
const catAxis = (values, max) => ({ tickmode: 'array', tickvals: values, ticktext: values.map(v => wrapLabel(v, max)), tickangle: 0 });

const Charts = {
  /* ---------------- KPI ---------------- */
  kpis(rows, all) {
    const s = Agg.summary(rows);
    const a = Agg.summary(all);
    const filtered = rows.length !== all.length;
    const empty = rows.length === 0;
    const aov = x => (x.n ? x.revenue / x.n : null);           // giá trị trung bình mỗi đơn
    const unit = v => `${fmt.num(v / 1e6, 1)}<span class="kpi-unit-sm"> triệu đồng</span>`;
    const trieu = v => `${fmt.num(v / 1e6, 1)} triệu đồng`;   // thẻ KPI ghi rõ đơn vị, không viết tắt
    const pctOfAll = (v, t) => (t ? `chiếm ${fmt.pct((v / t) * 100)} toàn bộ` : '');

    // So sánh với toàn bộ dữ liệu: ▲ tốt hơn / ▼ kém hơn (higherIsBetter = false cho số ngày giao)
    const cmp = (v, base, text, higherIsBetter = true) => {
      if (v === null || base === null) return text;
      const diff = v - base;
      if (Math.abs(diff) < 1e-9) return `${text} · bằng toàn bộ`;
      const good = (diff > 0) === higherIsBetter;
      return `<span class="${good ? 'up' : 'down'}">${good ? '▲' : '▼'}</span> ${text}`;
    };

    // [nhãn, giá trị, dòng giải thích khi xem toàn bộ, dòng so sánh khi đang lọc]
    const items = [
      ['Số giao dịch', fmt.int(s.n), 'đơn hàng trong năm 2025',
        `${pctOfAll(s.n, a.n)} (${fmt.int(a.n)} đơn)`],
      ['Doanh thu', unit(s.revenue), 'tổng tiền khách đã trả',
        `${pctOfAll(s.revenue, a.revenue)} (${trieu(a.revenue)})`],
      ['Lợi nhuận', unit(s.profit), 'doanh thu trừ giá vốn',
        `${pctOfAll(s.profit, a.profit)} (${trieu(a.profit)})`],
      ['Biên lợi nhuận', fmt.pct(s.margin),
        s.margin === null ? '' : `bán 100 đồng lãi ${fmt.num(s.margin, 0)} đồng`,
        cmp(s.margin, a.margin, `toàn bộ: ${fmt.pct(a.margin)}`)],
      ['Giá trị TB mỗi đơn', aov(s) === null ? '–' : `${fmt.int(aov(s) / 1e3)}<span class="kpi-unit-sm"> nghìn đồng</span>`,
        'doanh thu ÷ số đơn',
        cmp(aov(s), aov(a), `toàn bộ: ${fmt.int(aov(a) / 1e3)} nghìn đồng`)],
      ['Số lượng bán', `${fmt.int(s.qty)}<span class="kpi-unit-sm"> sản phẩm</span>`,
        s.n ? `trung bình ${fmt.fix(s.qty / s.n, 2)} sản phẩm mỗi đơn` : '',
        `${pctOfAll(s.qty, a.qty)} (${fmt.int(a.qty)} sản phẩm)`],
      ['Điểm đánh giá TB', s.rating === null ? '–' : `${fmt.num(s.rating)}<span class="kpi-unit-sm"> / 5</span>`,
        'mức hài lòng của khách (thang 1–5)',
        cmp(s.rating, a.rating, `toàn bộ: ${fmt.num(a.rating)} / 5`)],
      ['Thời gian giao TB', s.delivery === null ? '–' : `${fmt.num(s.delivery, 1)}<span class="kpi-unit-sm"> ngày</span>`,
        'từ lúc mua đến lúc nhận hàng',
        cmp(s.delivery, a.delivery, `toàn bộ: ${fmt.num(a.delivery, 1)} ngày`, false)],
    ];
    document.getElementById('kpis').innerHTML = items.map(([label, value, explain, compare]) => `
      <div class="kpi">
        <div class="kpi-label">${label}</div>
        <div class="kpi-value">${empty ? '–' : value}</div>
        <div class="kpi-sub">${empty ? 'không có dữ liệu' : (filtered ? compare : explain)}</div>
      </div>`).join('');

    // Câu tóm tắt bằng lời
    const summary = document.getElementById('kpi-summary');
    summary.innerHTML = empty
      ? 'Không có giao dịch nào khớp với bộ lọc hiện tại.'
      : `${filtered ? 'Với bộ lọc hiện tại, ' : 'Cả năm 2025, '}<b>${fmt.int(s.n)} đơn hàng</b> mang về <b>${trieu(s.revenue)}</b> doanh thu `
        + `và <b>${trieu(s.profit)}</b> lợi nhuận, tức là cứ bán <b>100 đồng</b> thì lãi khoảng <b>${fmt.num(s.margin, 0)} đồng</b>.`;
  },

  /* ---------------- Insight 1: danh mục ---------------- */
  category(rows) {
    if (!rows.length) return draw('c-category', null);
    const g = Agg.groupBy(rows, r => r.Product_Category);
    const cats = present('Product_Category', rows)
      .map(c => ({ c, s: Agg.summary(g.get(c)) }))
      .sort((a, b) => b.s.revenue - a.s.revenue);
    const x = cats.map(d => d.c);
    return draw('c-category', [
      {
        type: 'bar', name: 'Doanh thu', x, y: cats.map(d => toM(d.s.revenue)),
        marker: { color: '#94a3b8' }, customdata: cats.map(d => d.s.n),
        hovertemplate: '<b>%{x}</b><br>Doanh thu: %{y:.1f} Tr<br>Số giao dịch: %{customdata}<extra></extra>',
      },
      {
        type: 'bar', name: 'Lợi nhuận', x, y: cats.map(d => toM(d.s.profit)),
        marker: { color: '#0f766e' },
        hovertemplate: '<b>%{x}</b><br>Lợi nhuận: %{y:.1f} Tr<extra></extra>',
      },
      {
        // Màn hình hẹp: bỏ nhãn số trên đường (các điểm quá gần nhau), xem số khi rê chuột
        type: 'scatter', mode: isNarrow('c-category') ? 'lines+markers' : 'lines+markers+text', name: 'Biên lợi nhuận (%)', x,
        y: cats.map(d => d.s.margin), yaxis: 'y2',
        text: cats.map(d => fmt.pct(d.s.margin)), textposition: 'top center',
        line: { color: '#c2410c', width: 2 }, marker: { size: 8 },
        hovertemplate: '<b>%{x}</b><br>Biên lợi nhuận: %{y:.1f}%<extra></extra>',
      },
    ], {
      barmode: 'group',
      // Điện thoại: ẩn nhãn trục phải để vùng vẽ đủ rộng cho 5 nhãn danh mục (biên LN vẫn xem khi rê chuột)
      xaxis: { ...catAxis(x, isNarrow('c-category') ? 7 : 12), tickfont: { size: isNarrow('c-category') ? 10 : 12 } },
      yaxis: { title: { text: 'Tr' } },
      yaxis2: isNarrow('c-category')
        ? { overlaying: 'y', side: 'right', range: [0, 45], showticklabels: false, showgrid: false }
        : { title: { text: 'Biên lợi nhuận (%)' }, overlaying: 'y', side: 'right', range: [0, 45], tickvals: [10, 20, 30, 40], ticktext: ['10%', '20%', '30%', '40%'], showgrid: false },
      margin: { r: isNarrow('c-category') ? 12 : 64 },
    });
  },

  /* Treemap Danh mục → Sản phẩm */
  treemap(rows) {
    if (!rows.length) return draw('c-treemap', null);
    const total = Agg.summary(rows);
    const ids = ['root'], labels = ['Tất cả'], parents = [''], values = [total.revenue];
    const colors = [total.margin], custom = [[toM(total.revenue), toM(total.profit), total.margin, total.n]];
    const byCat = Agg.groupBy(rows, r => r.Product_Category);
    for (const cat of present('Product_Category', rows)) {
      const cr = byCat.get(cat);
      const cs = Agg.summary(cr);
      ids.push(cat); labels.push(cat); parents.push('root'); values.push(cs.revenue);
      colors.push(cs.margin); custom.push([toM(cs.revenue), toM(cs.profit), cs.margin, cs.n]);
      for (const [prod, pr] of Agg.groupBy(cr, r => r.Product)) {
        const ps = Agg.summary(pr);
        ids.push(`${cat}/${prod}`); labels.push(prod); parents.push(cat); values.push(ps.revenue);
        colors.push(ps.margin); custom.push([toM(ps.revenue), toM(ps.profit), ps.margin, ps.n]);
      }
    }
    return draw('c-treemap', [{
      type: 'treemap', ids, labels, parents, values, branchvalues: 'total', customdata: custom,
      marker: { colors, colorscale: MARGIN_SCALE, cmin: 10, cmax: 36, line: { color: '#fff', width: 1 },
        colorbar: { title: { text: 'Biên LN' }, ticksuffix: '%', thickness: 12 } },
      texttemplate: '<b>%{label}</b><br>%{customdata[2]:.0f}%',
      hovertemplate: '<b>%{label}</b><br>Doanh thu: %{customdata[0]:.2f} Tr<br>Lợi nhuận: %{customdata[1]:.2f} Tr<br>Biên LN: %{customdata[2]:.1f}%<br>Số giao dịch: %{customdata[3]}<extra></extra>',
      pathbar: { visible: true },
    }], { margin: { t: 30, r: 8, b: 8, l: 8 } });
  },

  /* ---------------- Insight 2: cơ cấu cửa hàng ---------------- */
  storeMix(rows) {
    if (!rows.length) return draw('c-storemix', null);
    const stores = present('Store', rows);
    const byStore = Agg.groupBy(rows, r => r.Store);
    const storeSum = new Map(stores.map(s => [s, Agg.summary(byStore.get(s))]));
    const traces = present('Product_Category', rows).map(cat => {
      const vals = stores.map(s => {
        const rs = byStore.get(s).filter(r => r.Product_Category === cat);
        const rev = Agg.sum(rs, 'Revenue');
        return { share: (rev / storeSum.get(s).revenue) * 100, rev, n: rs.length };
      });
      return {
        type: 'bar', name: cat, x: stores, y: vals.map(v => v.share),
        marker: { color: CAT_COLORS[cat] },
        customdata: vals.map(v => [toM(v.rev), v.n]),
        text: vals.map(v => (v.share >= 7 ? v.share.toFixed(0) + '%' : '')), textposition: 'inside',
        insidetextfont: { color: '#fff' },
        hovertemplate: `<b>%{x}</b> · ${cat}<br>Tỷ trọng: %{y:.1f}%<br>Doanh thu: %{customdata[0]:.1f} Tr<br>Số giao dịch: %{customdata[1]}<extra></extra>`,
      };
    });
    const annotations = stores.map(s => ({
      x: s, y: 100, yanchor: 'bottom', showarrow: false, font: { size: 12, color: '#1f2937' },
      // Màn hình hẹp: chỉ ghi biên lợi nhuận để 4 nhãn không đè nhau
      text: isNarrow('c-storemix') ? `<b>${fmt.pct(storeSum.get(s).margin)}</b>`
        : `<b>Biên ${fmt.pct(storeSum.get(s).margin)}</b><br>${fmt.million(storeSum.get(s).revenue)}`,
    }));
    return draw('c-storemix', traces, {
      barmode: 'stack',
      yaxis: { title: { text: '% doanh thu của cửa hàng' }, range: [0, 118], tickvals: [0, 20, 40, 60, 80, 100], ticktext: ['0%', '20%', '40%', '60%', '80%', '100%'] },
      margin: { t: 16 },
      xaxis: { tickangle: 0 },
      // Biểu đồ này có nhãn biên lợi nhuận ở trên đầu cột → đặt chú thích phía dưới
      legend: { traceorder: 'normal', y: -0.1, yanchor: 'top' },
      annotations,
    });
  },

  /* Khám phá: xếp hạng theo thước đo */
  metric(rows, metric) {
    if (!rows.length) return draw('c-metric', null);
    const g = Agg.groupBy(rows, r => r.Product_Category);
    const pick = s => ({ Quantity: s.qty, Revenue: toM(s.revenue), Profit: toM(s.profit), Margin: s.margin })[metric];
    const unit = { Quantity: ' sp', Revenue: ' Tr', Profit: ' Tr', Margin: '%' }[metric];
    const d = present('Product_Category', rows).map(c => ({ c, v: pick(Agg.summary(g.get(c))) }))
      .sort((a, b) => a.v - b.v); // tăng dần để cột lớn nhất nằm trên cùng
    return draw('c-metric', [{
      type: 'bar', orientation: 'h', y: d.map(x => x.c), x: d.map(x => x.v),
      marker: { color: d.map(x => CAT_COLORS[x.c]) },
      text: d.map(x => fmt.num(x.v, 1) + unit), textposition: 'outside', cliponaxis: false,
      hovertemplate: `<b>%{y}</b><br>%{x:.1f}${unit}<extra></extra>`,
    }], { margin: { r: 70, b: 40 }, xaxis: { ticksuffix: unit, rangemode: 'tozero' },
      yaxis: { tickmode: 'array', tickvals: d.map(x => x.c), ticktext: d.map(x => wrapLabel(x.c, isNarrow('c-metric') ? 10 : 22)) } });
  },

  /* ---------------- Insight 3: xu hướng ---------------- */
  buckets(rows, gran, state) {
    if (gran === 'quarter') {
      const qs = [];
      for (let q = 1; q <= 4; q++) {
        const first = (q - 1) * 3, last = first + 2;
        if (last >= state.monthFrom && first <= state.monthTo) qs.push({ label: 'Quý ' + q, test: r => r.quarter === q });
      }
      return qs;
    }
    const out = [];
    for (let m = state.monthFrom; m <= state.monthTo; m++) out.push({ label: MONTH_LABELS[m], test: r => r.monthIdx === m });
    return out;
  },

  monthly(rows, gran, state) {
    if (!rows.length) return draw('c-monthly', null);
    const b = Charts.buckets(rows, gran, state).map(bk => ({ label: bk.label, s: Agg.summary(rows.filter(bk.test)) }));
    const x = b.map(d => d.label);
    return draw('c-monthly', [
      {
        type: 'bar', name: 'Doanh thu (Tr)', x, y: b.map(d => toM(d.s.revenue)),
        marker: { color: '#cbd5e1' }, customdata: b.map(d => [d.s.n, toM(d.s.profit)]),
        hovertemplate: '<b>%{x}</b><br>Doanh thu: %{y:.1f} Tr<br>Lợi nhuận: %{customdata[1]:.1f} Tr<br>Số giao dịch: %{customdata[0]}<extra></extra>',
      },
      {
        type: 'scatter', mode: 'lines+markers', name: 'Biên lợi nhuận (%)', x, y: b.map(d => d.s.margin), yaxis: 'y2',
        line: { color: '#0f766e', width: 2.5 }, connectgaps: false,
        hovertemplate: '<b>%{x}</b><br>Biên LN: %{y:.1f}%<extra></extra>',
      },
      {
        type: 'scatter', mode: 'lines+markers', name: 'Giảm giá TB (%)', x, y: b.map(d => d.s.discount), yaxis: 'y2',
        line: { color: '#c2410c', width: 2, dash: 'dot' }, connectgaps: false,
        hovertemplate: '<b>%{x}</b><br>Giảm giá TB: %{y:.1f}%<extra></extra>',
      },
    ], {
      yaxis: { title: { text: 'Doanh thu (Tr)' } },
      yaxis2: { title: { text: '%' }, overlaying: 'y', side: 'right', range: [0, 40], tickvals: [10, 20, 30], ticktext: ['10%', '20%', '30%'], showgrid: false },
      margin: { r: 56 },
      hovermode: 'x unified',
    });
  },

  catTrend(rows, gran, state) {
    if (!rows.length) return draw('c-cattrend', null);
    const bks = Charts.buckets(rows, gran, state);
    const x = bks.map(b => b.label);
    const traces = present('Product_Category', rows).map(cat => {
      const cr = rows.filter(r => r.Product_Category === cat);
      return {
        type: 'scatter', mode: 'lines+markers', name: cat, x,
        y: bks.map(b => toM(Agg.sum(cr.filter(b.test), 'Revenue'))),
        line: { color: CAT_COLORS[cat], width: 2 },
        hovertemplate: `${cat}: %{y:.1f} Tr<extra></extra>`,
      };
    });
    return draw('c-cattrend', traces, { yaxis: { title: { text: 'Doanh thu (Tr)' } }, hovermode: 'x unified' });
  },

  /* ---------------- Insight 4: giao hàng & rating ---------------- */
  delivery(rows) {
    const valid = rows.filter(r => r.Delivery_Days !== null && r.Customer_Rating !== null);
    const r = Agg.pearson(valid, 'Delivery_Days', 'Customer_Rating');
    document.getElementById('r-delivery').textContent = r === null ? '' : `r = ${fmt.fix(r, 2)}`;
    if (!valid.length) return draw('c-delivery', null);
    const days = [1, 2, 3, 4].filter(d => valid.some(x => x.Delivery_Days === d));
    const d = days.map(day => {
      const g = valid.filter(x => x.Delivery_Days === day);
      return { day, rating: Agg.mean(g, 'Customer_Rating'), n: g.length };
    });
    return draw('c-delivery', [{
      type: 'bar', x: d.map(v => v.day + ' ngày'), y: d.map(v => v.rating),
      marker: { color: d.map(v => (v.rating < 4 ? '#c2410c' : '#1d4ed8')) },
      text: d.map(v => fmt.fix(v.rating, 2)), textposition: 'outside', cliponaxis: false,
      customdata: d.map(v => v.n),
      hovertemplate: 'Giao trong %{x}<br>Đánh giá TB: %{y:.2f} / 5<br>Số giao dịch: %{customdata}<extra></extra>',
    }], {
      yaxis: { title: { text: 'Điểm đánh giá TB (1–5)' }, range: [0, 5.3] },
      xaxis: { title: { text: 'Thời gian giao hàng' } },
      shapes: [{ type: 'line', xref: 'paper', x0: 0, x1: 1, y0: 4, y1: 4, line: { color: '#94a3b8', dash: 'dot', width: 1 } }],
    });
  },

  heatmap(rows) {
    const valid = rows.filter(r => r.Delivery_Days !== null && r.Customer_Rating !== null);
    if (!valid.length) return draw('c-heatmap', null);
    const stores = present('Store', valid);
    const days = [1, 2, 3, 4];
    const z = [], text = [];
    for (const s of stores) {
      const zr = [], tr = [];
      for (const d of days) {
        const g = valid.filter(r => r.Store === s && r.Delivery_Days === d);
        const m = Agg.mean(g, 'Customer_Rating');
        zr.push(m);
        tr.push(m === null ? '' : `${fmt.fix(m, 2)}<br>n=${g.length}`);
      }
      z.push(zr); text.push(tr);
    }
    return draw('c-heatmap', [{
      type: 'heatmap', z, x: days.map(d => d + ' ngày'), y: stores, text, texttemplate: '%{text}',
      colorscale: MARGIN_SCALE, zmin: 3.4, zmax: 4.7, xgap: 2, ygap: 2,
      colorbar: { title: { text: 'Đánh giá' }, thickness: 12 },
      hovertemplate: '<b>%{y}</b> · giao %{x}<br>Đánh giá TB: %{z:.2f}<extra></extra>',
    }], { margin: { l: 90 }, xaxis: { title: { text: 'Thời gian giao hàng' } } });
  },

  /* Khám phá: nhóm khách */
  customer(rows) {
    if (!rows.length) return draw('c-customer', null);
    const g = Agg.groupBy(rows, r => r.Customer_Type);
    const d = present('Customer_Type', rows).map(c => ({ c, s: Agg.summary(g.get(c)) }));
    return draw('c-customer', [
      {
        type: 'bar', name: 'Số giao dịch', x: d.map(v => v.c), y: d.map(v => v.s.n), marker: { color: '#94a3b8' },
        customdata: d.map(v => [toM(v.s.revenue), v.s.margin]),
        hovertemplate: '<b>%{x}</b><br>Số giao dịch: %{y}<br>Doanh thu: %{customdata[0]:.1f} Tr<br>Biên LN: %{customdata[1]:.1f}%<extra></extra>',
      },
      {
        type: 'scatter', mode: 'lines+markers+text', name: 'SP / giao dịch', x: d.map(v => v.c), y: d.map(v => v.s.qty / v.s.n),
        yaxis: 'y2', line: { color: '#7c3aed' }, text: d.map(v => fmt.fix(v.s.qty / v.s.n, 2)), textposition: 'top center',
        hovertemplate: '<b>%{x}</b><br>%{y:.2f} sản phẩm / giao dịch<extra></extra>',
      },
    ], {
      xaxis: { ...catAxis(d.map(v => v.c), isNarrow('c-customer') ? 10 : 14), tickfont: { size: isNarrow('c-customer') ? 10 : 12 } },
      yaxis: { title: { text: 'Số giao dịch' } },
      // Điện thoại: ẩn nhãn trục phải (số món/đơn đã ghi ngay trên đường)
      yaxis2: isNarrow('c-customer')
        ? { overlaying: 'y', side: 'right', range: [0, 3.5], showticklabels: false, showgrid: false }
        : { title: { text: 'Sản phẩm / giao dịch' }, overlaying: 'y', side: 'right', range: [0, 3.5], tickvals: [1, 2, 3], showgrid: false },
      margin: { r: isNarrow('c-customer') ? 12 : 60 },
    });
  },

  /* Bản đồ chi nhánh: vị trí = trung tâm quận (minh họa, dữ liệu gốc không có tọa độ) */
  STORE_COORDS: {
    'Quận 1': [10.7769, 106.7009],
    'Quận 3': [10.7843, 106.6844],
    'Quận 7': [10.7340, 106.7218],
    'Thủ Đức': [10.8494, 106.7537],
  },

  // Bản đồ WebGL không cập nhật được khi lần vẽ trước chưa xong (lỗi "Style is not done loading").
  // → Các lần vẽ chạy nối tiếp; nếu người dùng lọc liên tục thì chỉ vẽ theo bộ lọc mới nhất.
  _mapQueue: Promise.resolve(),
  _mapPending: null,
  storeMap(rows) {
    const scheduled = Charts._mapPending !== null;
    Charts._mapPending = rows;
    if (scheduled) return Charts._mapQueue; // lần vẽ đang chờ sẽ dùng dữ liệu mới nhất
    Charts._mapQueue = Charts._mapQueue
      .then(() => {
        const latest = Charts._mapPending;
        Charts._mapPending = null;
        return Charts._drawStoreMap(latest);
      })
      .catch(err => console.warn('Bản đồ:', err && err.message));
    return Charts._mapQueue;
  },

  _drawStoreMap(rows) {
    if (!rows.length) return draw('c-map', null);
    const g = Agg.groupBy(rows, r => r.Store);
    const stores = present('Store', rows);
    const S = stores.map(s => Agg.summary(g.get(s)));
    const maxRev = Math.max(...S.map(s => s.revenue));
    // Mỗi chi nhánh một trace để đặt nhãn khác hướng (Quận 1 và Quận 3 rất gần nhau)
    const LABEL_POS = { 'Quận 1': 'bottom right', 'Quận 3': 'top left', 'Quận 7': 'bottom center', 'Thủ Đức': 'top center' };
    const traces = stores.map((st, i) => ({
      type: 'scattermapbox', mode: 'markers+text', showlegend: false,
      lat: [Charts.STORE_COORDS[st][0]], lon: [Charts.STORE_COORDS[st][1]],
      text: [`${st} · ${fmt.num(S[i].delivery, 2)} ngày`], textposition: LABEL_POS[st],
      textfont: { size: 13, color: '#111827' },
      marker: { size: 18 + 32 * Math.sqrt(S[i].revenue / maxRev), color: [S[i].delivery], coloraxis: 'coloraxis', opacity: 0.85 },
      customdata: [[st, toM(S[i].revenue), S[i].margin, S[i].delivery, S[i].rating, S[i].n]],
      hovertemplate: '<b>%{customdata[0]}</b><br>Doanh thu: %{customdata[1]:.1f} Tr<br>Biên LN: %{customdata[2]:.1f}%<br>Giao hàng TB: %{customdata[3]:.2f} ngày<br>Đánh giá TB: %{customdata[4]:.2f}<br>Số giao dịch: %{customdata[5]}<extra></extra>',
    }));
    return draw('c-map', traces, {
      // Tâm = giữa 4 chi nhánh; zoom tính theo bề rộng khung để cả 4 điểm luôn nằm trong khung
      mapbox: {
        style: 'open-street-map', center: { lat: 10.7915, lon: 106.719 },
        zoom: document.getElementById('c-map').clientWidth < 700 ? 10.6 : 11.1,
      },
      coloraxis: {
        colorscale: [[0, '#1d4ed8'], [0.5, '#fef3c7'], [1, '#c2410c']], cmin: 1.6, cmax: 2.9,
        colorbar: { title: { text: 'Ngày giao TB' }, thickness: 12 },
      },
      margin: { t: 0, r: 0, b: 0, l: 0 },
    });
  },

  payment(rows) {
    if (!rows.length) return draw('c-payment', null);
    const labels = present('Payment_Method', rows);
    const colors = { 'Ví điện tử': '#1d4ed8', 'Thẻ tín dụng': '#60a5fa', 'Tiền mặt': '#94a3b8', 'Chuyển khoản': '#cbd5e1' };
    return draw('c-payment', [{
      type: 'pie', hole: 0.55, labels, values: labels.map(l => rows.filter(r => r.Payment_Method === l).length),
      marker: { colors: labels.map(l => colors[l]), line: { color: '#fff', width: 2 } },
      // Màn hình hẹp: chỉ ghi % trong lát, tên phương thức chuyển xuống chú thích
      textinfo: isNarrow('c-payment') ? 'percent' : 'label+percent', textposition: 'inside', insidetextorientation: 'horizontal',
      sort: false, direction: 'clockwise',
      hovertemplate: '<b>%{label}</b><br>%{value} giao dịch (%{percent})<extra></extra>',
    }], {
      showlegend: isNarrow('c-payment'), margin: { t: 20, b: 20, l: 20, r: 20 },
      legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: -0.02, yanchor: 'top' },
    });
  },

  /* ---------------- Insight 5: giảm giá ---------------- */
  discount(rows) {
    const r = Agg.pearson(rows, 'Discount', 'Margin');
    document.getElementById('r-discount').textContent = r === null ? '' : `r = ${fmt.fix(r, 2)}`;
    if (!rows.length) return draw('c-discount', null);
    const traces = present('Product_Category', rows).map(cat => {
      const cr = rows.filter(x => x.Product_Category === cat);
      return {
        type: 'scatter', mode: 'markers', name: cat,
        x: cr.map(x => x.Discount + jitter(x.Transaction_ID, 3)), y: cr.map(x => x.Margin),
        marker: {
          color: CAT_COLORS[cat], size: cr.map(x => (x.Profit < 0 ? 12 : 8)), opacity: 0.8,
          symbol: cr.map(x => (x.Profit < 0 ? 'x' : 'circle')), line: { color: '#fff', width: 0.5 },
        },
        customdata: cr.map(x => [x.Transaction_ID, x.Product, x.Store, x.Discount, toM(x.Profit)]),
        hovertemplate: '<b>%{customdata[0]}</b> · %{customdata[1]}<br>%{customdata[2]}<br>Giảm giá: %{customdata[3]}%<br>Biên LN: %{y:.1f}%<br>Lợi nhuận: %{customdata[4]:.3f} Tr<extra></extra>',
      };
    });
    return draw('c-discount', traces, {
      xaxis: { title: { text: 'Mức giảm giá (%)' }, range: [-3, 38], dtick: 5, ticksuffix: '%' },
      yaxis: { title: { text: 'Biên lợi nhuận (%)' }, ticksuffix: '%' },
      shapes: [
        { type: 'rect', x0: 17.5, x1: 38, yref: 'paper', y0: 0, y1: 1, fillcolor: 'rgba(194,65,12,0.07)', line: { width: 0 }, layer: 'below' },
        { type: 'line', xref: 'paper', x0: 0, x1: 1, y0: 0, y1: 0, line: { color: '#dc2626', width: 1, dash: 'dash' } },
      ],
      // Nhãn vùng đặt bên trong vùng vẽ để không đụng chú thích phía trên
      annotations: [{ x: 27.5, yref: 'paper', y: 0.99, yanchor: 'top', text: 'Giảm ≥ 20%', showarrow: false, font: { color: '#c2410c', size: 11 } }],
    });
  },

  discountBar(rows) {
    if (!rows.length) return draw('c-discount-bar', null);
    const levels = [...new Set(rows.map(r => r.Discount))].sort((a, b) => a - b);
    const d = levels.map(l => ({ l, s: Agg.summary(rows.filter(r => r.Discount === l)) }));
    return draw('c-discount-bar', [{
      type: 'bar', x: d.map(v => v.l + '%'), y: d.map(v => v.s.margin),
      marker: { color: d.map(v => (v.s.margin < 20 ? '#c2410c' : '#1d4ed8')) },
      text: d.map(v => fmt.pct(v.s.margin)), textposition: 'outside', cliponaxis: false,
      customdata: d.map(v => [v.s.n, v.s.rating]),
      hovertemplate: 'Giảm %{x}<br>Biên LN gộp: %{y:.1f}%<br>Số giao dịch: %{customdata[0]}<br>Đánh giá TB: %{customdata[1]:.2f}<extra></extra>',
    }], {
      xaxis: { title: { text: 'Mức giảm giá' }, type: 'category' },
      // Chừa khoảng dưới 0 để nhãn của cột âm (vd. −1,3%) không đè lên nhãn trục X
      yaxis: { title: { text: 'Biên lợi nhuận gộp (%)' }, ticksuffix: '%',
        range: [Math.min(0, ...d.map(v => v.s.margin)) - 7, Math.max(...d.map(v => v.s.margin)) + 6] },
    });
  },

  /* ---------------- Insight 6: số lượng × doanh thu ---------------- */
  qtyRev(rows) {
    const r1 = Agg.pearson(rows, 'Quantity', 'Revenue');
    const r2 = Agg.pearson(rows, 'Unit_Price', 'Revenue');
    document.getElementById('r-qtyrev').textContent =
      r1 === null ? '' : `r(số lượng, doanh thu) = ${fmt.fix(r1, 2)} · r(đơn giá, doanh thu) = ${fmt.fix(r2, 2)}`;
    if (!rows.length) return draw('c-qtyrev', null);
    const traces = present('Product_Category', rows).map(cat => {
      const cr = rows.filter(x => x.Product_Category === cat);
      return {
        type: 'scatter', mode: 'markers', name: cat,
        x: cr.map(x => x.Quantity + jitter(x.Transaction_ID, 0.35)), y: cr.map(x => toM(x.Revenue)),
        marker: { color: CAT_COLORS[cat], opacity: 0.75, size: cr.map(x => x.Unit_Price), sizemode: 'area', sizeref: 1778000 / 30 ** 2, sizemin: 4, line: { color: '#fff', width: 0.5 } },
        customdata: cr.map(x => [x.Transaction_ID, x.Product, x.Quantity, fmt.vnd(x.Unit_Price), x.Store]),
        hovertemplate: '<b>%{customdata[0]}</b> · %{customdata[1]}<br>%{customdata[4]}<br>Số lượng: %{customdata[2]}<br>Đơn giá: %{customdata[3]}<br>Doanh thu: %{y:.2f} Tr<extra></extra>',
      };
    });
    return draw('c-qtyrev', traces, {
      xaxis: { title: { text: isNarrow('c-qtyrev') ? 'Số sản phẩm / đơn' : 'Số lượng sản phẩm trong giao dịch' }, dtick: 1, range: [0.3, 10.7] },
      yaxis: { title: { text: 'Doanh thu giao dịch (Tr)' } },
    });
  },

  /* ---------------- Tọa độ song song ---------------- */
  PC_DIMS: [
    { key: 'Discount', label: 'Giảm giá %', f: v => v, tf: '.0f' },
    { key: 'Quantity', label: 'Số lượng', f: v => v, tf: '.0f' },
    { key: 'Unit_Price', label: 'Đơn giá (nghìn)', f: v => v / 1e3, tf: ',.0f' },
    { key: 'Revenue', label: 'Doanh thu (Tr)', f: v => v / 1e6, tf: '.1f' },
    { key: 'Profit', label: 'Lợi nhuận (Tr)', f: v => v / 1e6, tf: '.2f' },
    { key: 'Margin', label: 'Biên LN %', f: v => v, tf: '.0f' },
    { key: 'Customer_Rating', label: 'Đánh giá', f: v => v, tf: '.1f' },
    { key: 'Delivery_Days', label: 'Ngày giao', f: v => v, tf: '.0f' },
  ],
  pcRows: [],

  parcoords(rows) {
    // Tọa độ song song không vẽ được giá trị trống → chỉ dùng các dòng đủ dữ liệu
    Charts.pcRows = rows.filter(r => Charts.PC_DIMS.every(d => r[d.key] !== null));
    if (!Charts.pcRows.length) return draw('c-parcoords', null);
    const dims = Charts.PC_DIMS.map(d => {
      const v = Charts.pcRows.map(r => d.f(r[d.key]));
      const dim = { label: d.label, values: v, tickformat: d.tf || '' };
      if (d.key === 'Delivery_Days') { dim.tickvals = [1, 2, 3, 4]; dim.range = [1, 4]; }
      if (d.key === 'Quantity') dim.range = [1, 10];
      return dim;
    });
    return draw('c-parcoords', [{
      type: 'parcoords',
      line: {
        color: Charts.pcRows.map(r => r.Margin), colorscale: MARGIN_SCALE, cmin: 0, cmax: 40, showscale: true,
        colorbar: { title: { text: 'Biên LN' }, ticksuffix: '%', thickness: 12 },
      },
      dimensions: dims,
      labelfont: { size: 12 }, tickfont: { size: 10 },
      // Ẩn số min/max ở hai đầu trục: chúng đè lên tên trục, và trục đã có vạch chia
      rangefont: { size: 1, color: 'rgba(0,0,0,0)' },
    }], { margin: { t: 48, r: 70, b: 24, l: 56 } });
  },

  /** Đọc vùng brushing hiện tại → danh sách giao dịch được chọn */
  pcSelected() {
    const el = document.getElementById('c-parcoords');
    const trace = el.data && el.data[0];
    if (!trace || trace.type !== 'parcoords') return { rows: [], active: false };
    const ranges = trace.dimensions.map(d => {
      const c = d.constraintrange;
      if (!c || !c.length) return null;
      return Array.isArray(c[0]) ? c : [c]; // có thể chọn nhiều khoảng trên một trục
    });
    const active = ranges.some(Boolean);
    const sel = Charts.pcRows.filter((r, i) => ranges.every((rg, k) => {
      if (!rg) return true;
      const v = trace.dimensions[k].values[i];
      return rg.some(([lo, hi]) => v >= lo && v <= hi);
    }));
    return { rows: sel, active };
  },
};
