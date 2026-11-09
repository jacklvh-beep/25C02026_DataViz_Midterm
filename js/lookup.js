'use strict';
/* =========================================================
 * lookup.js — Bảng tra cứu giao dịch khớp với bộ lọc toàn cục
 * Tìm kiếm (không phân biệt dấu), sắp xếp theo cột, phân trang, bấm dòng để xem chi tiết.
 * ========================================================= */

const Lookup = {
  COLS: [
    { key: 'Transaction_ID', label: 'Mã' },
    { key: 'Date', label: 'Ngày', show: r => r.Date.split('-').reverse().join('/') },
    { key: 'Store', label: 'Cửa hàng' },
    { key: 'Product', label: 'Sản phẩm' },
    { key: 'Product_Category', label: 'Danh mục' },
    { key: 'Customer_Type', label: 'Khách hàng' },
    { key: 'Payment_Method', label: 'Thanh toán' },
    { key: 'Quantity', label: 'SL', num: true },
    { key: 'Discount', label: 'Giảm giá', num: true, show: r => r.Discount + '%' },
    { key: 'Revenue', label: 'Doanh thu (đồng)', num: true, show: r => fmt.int(r.Revenue) },
    { key: 'Profit', label: 'Lợi nhuận (đồng)', num: true, show: r => fmt.int(r.Profit), neg: r => r.Profit < 0 },
    { key: 'Margin', label: 'Biên LN', num: true, show: r => fmt.pct(r.Margin), neg: r => r.Margin < 0 },
    { key: 'Customer_Rating', label: 'Đánh giá', num: true, show: r => (r.Customer_Rating === null ? 'trống' : fmt.num(r.Customer_Rating)) },
    { key: 'Delivery_Days', label: 'Ngày giao', num: true, show: r => (r.Delivery_Days === null ? 'trống' : fmt.int(r.Delivery_Days)) },
  ],

  state: { base: [], sortKey: 'Transaction_ID', asc: true, page: 1, size: 15, q: '', lossOnly: false },

  /** Bỏ dấu tiếng Việt để tìm "quan 1" vẫn ra "Quận 1" */
  norm: s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase(),

  init() {
    const st = Lookup.state;
    const search = document.getElementById('lookup-search');
    let timer;
    search.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => { st.q = search.value.trim(); st.page = 1; Lookup.render(); }, 150);
    });
    document.getElementById('lookup-loss').addEventListener('change', e => { st.lossOnly = e.target.checked; st.page = 1; Lookup.render(); });
    document.getElementById('lookup-size').addEventListener('change', e => { st.size = +e.target.value; st.page = 1; Lookup.render(); });

    document.getElementById('lookup-head').addEventListener('click', e => {
      const th = e.target.closest('button[data-key]');
      if (!th) return;
      const key = th.dataset.key;
      if (st.sortKey === key) st.asc = !st.asc; else { st.sortKey = key; st.asc = true; }
      st.page = 1;
      Lookup.render();
    });

    const body = document.getElementById('lookup-body');
    const open = tr => tr && tr.dataset.id && showDetail(tr.dataset.id);
    body.addEventListener('click', e => open(e.target.closest('tr')));
    body.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(e.target.closest('tr')); } });

    document.getElementById('lookup-pager').addEventListener('click', e => {
      const b = e.target.closest('button[data-page]');
      if (!b || b.disabled) return;
      st.page = +b.dataset.page;
      Lookup.render();
    });
  },

  /** Gọi mỗi khi bộ lọc toàn cục thay đổi */
  update(rows) {
    Lookup.state.base = rows;
    Lookup.state.page = 1;
    Lookup.render();
  },

  filtered() {
    const st = Lookup.state;
    let rows = st.base;
    if (st.lossOnly) rows = rows.filter(r => r.Profit < 0);
    if (st.q) {
      const terms = Lookup.norm(st.q).split(/\s+/);
      rows = rows.filter(r => {
        const hay = Lookup.norm([r.Transaction_ID, r.Store, r.Product, r.Product_Category, r.Customer_Type, r.Payment_Method, r.Day_of_Week,
          r.Date.split('-').reverse().join('/')].join(' '));
        return terms.every(t => hay.includes(t));
      });
    }
    const col = Lookup.COLS.find(c => c.key === st.sortKey);
    const dir = st.asc ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = a[st.sortKey], y = b[st.sortKey];
      if (x === null && y === null) return 0;
      if (x === null) return 1;            // ô trống luôn nằm cuối
      if (y === null) return -1;
      return (col.num ? x - y : String(x).localeCompare(String(y), 'vi')) * dir;
    });
  },

  render() {
    const st = Lookup.state;
    const rows = Lookup.filtered();
    const pages = Math.max(1, Math.ceil(rows.length / st.size));
    st.page = Math.min(st.page, pages);
    const slice = rows.slice((st.page - 1) * st.size, st.page * st.size);

    // Tóm tắt (hiện cả khi bảng đang thu gọn)
    document.getElementById('lookup-count').innerHTML =
      `<b>${st.base.length}</b>/${ALL.length} giao dịch khớp bộ lọc`;
    const s = Agg.summary(rows);
    const extra = (st.q || st.lossOnly) ? ` (sau khi ${[st.q && `tìm "${Lookup.esc(st.q)}"`, st.lossOnly && 'chỉ lấy giao dịch lỗ'].filter(Boolean).join(', ')})` : '';
    document.getElementById('lookup-info').innerHTML = rows.length
      ? `<b>${rows.length}</b> giao dịch${extra} · Doanh thu <b>${fmt.num(s.revenue / 1e6, 1)} triệu đồng</b> · Lợi nhuận <b>${fmt.num(s.profit / 1e6, 1)} triệu đồng</b> · Biên <b>${fmt.pct(s.margin)}</b>`
      : `Không có giao dịch nào${extra}.`;

    // Tiêu đề cột (nút sắp xếp)
    document.getElementById('lookup-head').innerHTML = Lookup.COLS.map(c => {
      const active = c.key === st.sortKey;
      const arrow = active ? (st.asc ? ' ▲' : ' ▼') : '';
      const sort = active ? (st.asc ? 'ascending' : 'descending') : 'none';
      return `<th class="${c.num ? 'num-cell' : ''}" aria-sort="${sort}"><button type="button" data-key="${c.key}" title="Sắp xếp theo ${c.label}">${c.label}${arrow}</button></th>`;
    }).join('');

    // Nội dung
    document.getElementById('lookup-body').innerHTML = slice.length
      ? slice.map(r => `<tr tabindex="0" data-id="${r.Transaction_ID}" class="${r.Profit < 0 ? 'row-loss' : ''}">${Lookup.COLS.map(c => {
          const v = c.show ? c.show(r) : r[c.key];
          const cls = [c.num ? 'num-cell' : '', c.neg && c.neg(r) ? 'neg' : '', (r[c.key] === null) ? 'muted' : ''].filter(Boolean).join(' ');
          return `<td class="${cls}">${v}</td>`;
        }).join('')}</tr>`).join('')
      : `<tr><td colspan="${Lookup.COLS.length}" class="lookup-empty">Không có giao dịch phù hợp. Thử bỏ bớt bộ lọc hoặc từ khóa tìm kiếm.</td></tr>`;

    // Phân trang
    const pager = document.getElementById('lookup-pager');
    if (pages <= 1) { pager.innerHTML = ''; return; }
    const from = (st.page - 1) * st.size + 1, to = Math.min(st.page * st.size, rows.length);
    pager.innerHTML = `
      <button type="button" data-page="1" ${st.page === 1 ? 'disabled' : ''} aria-label="Trang đầu">«</button>
      <button type="button" data-page="${st.page - 1}" ${st.page === 1 ? 'disabled' : ''}>‹ Trước</button>
      <span>Trang <b>${st.page}</b>/${pages} · dòng ${from}–${to}</span>
      <button type="button" data-page="${st.page + 1}" ${st.page === pages ? 'disabled' : ''}>Sau ›</button>
      <button type="button" data-page="${pages}" ${st.page === pages ? 'disabled' : ''} aria-label="Trang cuối">»</button>`;
  },

  esc: s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])),
};
