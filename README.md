# 25C02026_DataViz_Midterm — Lê Văn Hoàng Son

Trang web trực quan hóa tương tác cho bộ dữ liệu **Urban Retail Sales – HCMC 2025** (240 giao dịch).

## Cấu trúc

```
index.html      Trang chính: 8 phần (theo mục 13 của đề + phần Tra cứu giao dịch)
css/style.css   Giao diện
js/data.js      Đọc CSV, làm sạch, hàm tổng hợp (summary, pearson…)
js/charts.js    Mỗi biểu đồ là một hàm, nhận danh sách giao dịch đã lọc
js/main.js      Trạng thái bộ lọc, đồng bộ biểu đồ, click/brushing/chi tiết
js/lookup.js    Bảng tra cứu giao dịch: tìm kiếm, sắp xếp, phân trang theo bộ lọc
data/           File CSV gốc
```

## Chạy thử trên máy

Trình duyệt chặn đọc CSV khi mở file trực tiếp (`file://`), nên phải chạy qua web server:

```bash
python -m http.server 8765
```

Rồi mở http://localhost:8765

## Nội dung

7 insight (cấu trúc Tiêu đề → Biểu đồ → Biểu đồ cho thấy / Quy luật / Vì sao quan trọng), 15 biểu đồ:
cột nhóm, cột chồng 100%, treemap, xếp hạng theo thước đo, đường theo tháng/quý, heatmap, bản đồ chi nhánh,
donut, scatter (2), tọa độ song song có brushing, KPI. Tất cả đồng bộ theo bộ lọc toàn cục.

## Trước khi nộp

1. Tự kiểm chứng lại số liệu trong phần giải thích (lọc trên chính trang hoặc Pivot Table trong Excel) và chỉnh lời văn theo cách hiểu của mình. Phải giải thích được khi được hỏi (mục 7 và 10 của đề).
2. Deploy (bên dưới), mở URL ở chế độ ẩn danh và trên điện thoại.
3. Nộp `25C02026.pdf` gồm họ tên, MSHV và URL có thể click được.

## Deploy lên GitHub Pages

1. Tạo repo **Public** tên `<MSHV>_DataViz_Midterm`, đẩy toàn bộ thư mục này lên (file `index.html` nằm ở gốc repo).
2. Vào **Settings → Pages → Source: Deploy from a branch → `main` / root → Save**.
3. Sau 1–2 phút, URL có dạng `https://<username>.github.io/<MSHV>_DataViz_Midterm/`.
4. Mở URL ở chế độ ẩn danh và trên điện thoại để kiểm tra lại. **Không xóa, đổi tên hay chuyển repo sang Private** cho tới khi có điểm.

Lưu ý: Netlify/Vercel không cho dùng `_` và chữ hoa trong tên miền con, nên GitHub Pages là cách giữ đúng tên `<MSHV>_DataViz_Midterm`.
