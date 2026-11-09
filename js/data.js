'use strict';
/* =========================================================
 * data.js — đọc CSV, làm sạch, các hàm tổng hợp & định dạng
 * ========================================================= */

const DATA_URL = 'data/urban_retail_sales_hcmc_2025_240.csv';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LABELS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

// Thứ tự cố định cho từng chiều phân loại (giữ nhất quán giữa các biểu đồ)
const DIMENSIONS = {
  Store: ['Quận 1', 'Quận 3', 'Quận 7', 'Thủ Đức'],
  Product_Category: ['Điện tử', 'Thời trang', 'Thể thao', 'Gia dụng', 'Thực phẩm & Đồ uống'],
  Customer_Type: ['Nhân viên văn phòng', 'Sinh viên', 'Gia đình', 'Khách du lịch'],
  Payment_Method: ['Ví điện tử', 'Thẻ tín dụng', 'Tiền mặt', 'Chuyển khoản'],
};

// Một màu cố định cho mỗi danh mục trên toàn trang (nguyên lý Similarity – Gestalt)
const CAT_COLORS = {
  'Điện tử': '#2563eb',
  'Thời trang': '#db2777',
  'Thể thao': '#059669',
  'Gia dụng': '#d97706',
  'Thực phẩm & Đồ uống': '#7c3aed',
};

// Bảng Việt hóa nhãn hiển thị (cửa hàng, danh mục, sản phẩm, thứ, nhóm khách, thanh toán). File CSV giữ nguyên giá trị gốc tiếng Anh; nhãn được dịch khi đọc dữ liệu.
const VI_LABELS = {
  Store: { 'District 1': 'Quận 1', 'District 3': 'Quận 3', 'District 7': 'Quận 7', 'Thu Duc': 'Thủ Đức' },
  Product_Category: {
    'Electronics': 'Điện tử', 'Fashion': 'Thời trang', 'Sports': 'Thể thao',
    'Home': 'Gia dụng', 'Food & Beverage': 'Thực phẩm & Đồ uống',
  },
  Customer_Type: { 'Office Worker': 'Nhân viên văn phòng', 'Student': 'Sinh viên', 'Family': 'Gia đình', 'Tourist': 'Khách du lịch' },
  Product: { 'Backpack': 'Ba lô', 'Jacket': 'Áo khoác', 'Sneakers': 'Giày thời trang', 'T-Shirt': 'Áo thun', 'Smart Watch': 'Đồng hồ thông minh', 'Wireless Earbuds': 'Tai nghe không dây', 'Power Bank': 'Sạc dự phòng', 'Bluetooth Speaker': 'Loa không dây', 'Sports Bottle': 'Bình nước thể thao', 'Yoga Mat': 'Thảm tập yoga', 'Dumbbell Set': 'Bộ tạ tay', 'Running Shoes': 'Giày chạy bộ', 'Water Bottle': 'Bình nước', 'Desk Lamp': 'Đèn bàn', 'Kitchen Set': 'Bộ dụng cụ bếp', 'Storage Box': 'Hộp đựng đồ', 'Coffee Beans': 'Cà phê hạt', 'Protein Drink': 'Đồ uống bổ sung đạm', 'Snack Box': 'Hộp đồ ăn vặt', 'Tea Box': 'Hộp trà' },
  Day_of_Week: { 'Monday': 'Thứ Hai', 'Tuesday': 'Thứ Ba', 'Wednesday': 'Thứ Tư', 'Thursday': 'Thứ Năm', 'Friday': 'Thứ Sáu', 'Saturday': 'Thứ Bảy', 'Sunday': 'Chủ Nhật' },
  Payment_Method: { 'E-wallet': 'Ví điện tử', 'Credit Card': 'Thẻ tín dụng', 'Cash': 'Tiền mặt', 'Bank Transfer': 'Chuyển khoản' },
};

const NUMERIC_COLS = ['Quantity', 'Unit_Price', 'Discount', 'Revenue', 'Cost', 'Profit', 'Customer_Rating', 'Delivery_Days'];

/** Tách CSV đơn giản (bộ dữ liệu không có dấu phẩy trong giá trị). Ô trống → null. */
function parseCSV(text) {
  const lines = text.replace(/^﻿/, '').trim().split(/\r?\n/);
  const header = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).filter(l => l.trim() !== '').map(line => {
    const cells = line.split(',');
    const row = {};
    header.forEach((h, i) => {
      const raw = (cells[i] ?? '').trim();
      row[h] = NUMERIC_COLS.includes(h) ? (raw === '' ? null : Number(raw)) : raw;
    });
    for (const [dim, map] of Object.entries(VI_LABELS)) row[dim] = map[row[dim]] ?? row[dim];
    row.monthIdx = MONTHS.indexOf(row.Month);
    row.quarter = Math.floor(row.monthIdx / 3) + 1;
    row.Margin = row.Revenue ? (row.Profit / row.Revenue) * 100 : null; // biên lợi nhuận (%)
    return row;
  });
}

async function loadData() {
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`Không tải được ${DATA_URL} (HTTP ${res.status})`);
  return parseCSV(await res.text());
}

/** Kiểm tra chất lượng dữ liệu: ô trống + công thức Revenue/Profit có nhất quán không */
function dataQuality(rows) {
  const missing = {};
  NUMERIC_COLS.forEach(c => { missing[c] = rows.filter(r => r[c] === null).length; });
  const inconsistent = rows.filter(r =>
    Math.abs(r.Quantity * r.Unit_Price * (1 - r.Discount / 100) - r.Revenue) > 2 ||
    Math.abs(r.Revenue - r.Cost - r.Profit) > 2
  ).length;
  return { n: rows.length, missing, inconsistent, losses: rows.filter(r => r.Profit < 0).length };
}

const Agg = {
  sum: (rows, k) => rows.reduce((s, r) => s + (r[k] ?? 0), 0),

  /** Trung bình, bỏ qua ô trống */
  mean(rows, k) {
    const v = rows.map(r => r[k]).filter(x => x !== null && !Number.isNaN(x));
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  },

  groupBy(rows, keyFn) {
    const m = new Map();
    for (const r of rows) {
      const k = keyFn(r);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(r);
    }
    return m;
  },

  /** Chỉ số tổng hợp của một nhóm giao dịch. Biên = tổng lợi nhuận / tổng doanh thu (biên gộp). */
  summary(rows) {
    const revenue = Agg.sum(rows, 'Revenue');
    const profit = Agg.sum(rows, 'Profit');
    return {
      n: rows.length,
      revenue,
      profit,
      qty: Agg.sum(rows, 'Quantity'),
      margin: revenue ? (profit / revenue) * 100 : null,
      rating: Agg.mean(rows, 'Customer_Rating'),
      delivery: Agg.mean(rows, 'Delivery_Days'),
      discount: Agg.mean(rows, 'Discount'),
    };
  },

  /** Hệ số tương quan Pearson giữa hai cột (bỏ qua dòng thiếu) */
  pearson(rows, a, b) {
    const p = rows.filter(r => r[a] !== null && r[b] !== null);
    if (p.length < 3) return null;
    const ma = p.reduce((s, r) => s + r[a], 0) / p.length;
    const mb = p.reduce((s, r) => s + r[b], 0) / p.length;
    let num = 0, da = 0, db = 0;
    for (const r of p) {
      num += (r[a] - ma) * (r[b] - mb);
      da += (r[a] - ma) ** 2;
      db += (r[b] - mb) ** 2;
    }
    return da && db ? num / Math.sqrt(da * db) : null;
  },
};

const fmt = {
  million: v => (v / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' Tr',
  vnd: v => Math.round(v).toLocaleString('vi-VN') + ' ₫',
  pct: v => (v === null ? '–' : v.toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + '%'),
  num: (v, d = 2) => (v === null ? '–' : v.toLocaleString('vi-VN', { maximumFractionDigits: d })),
  int: v => Math.round(v).toLocaleString('vi-VN'),
  fix: (v, n = 2) => (v === null ? '–' : v.toLocaleString('vi-VN', { minimumFractionDigits: n, maximumFractionDigits: n })),
};

/** Độ lệch ngẫu nhiên cố định theo mã giao dịch (jitter) để các điểm trùng nhau không chồng khít */
function jitter(id, spread) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ((h % 1000) / 1000 - 0.5) * spread;
}
