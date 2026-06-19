# Batch Reference Image Studio

Ứng dụng web tĩnh giúp tạo hàng loạt biến thể ảnh từ một ảnh tham chiếu. Người dùng có thể chọn tỷ lệ khung hình, nhập prompt style, tùy chỉnh số lượng ảnh và tải kết quả hàng loạt.

## Tính năng

- Tải lên một ảnh tham chiếu từ máy.
- Nhập prompt style để định hướng phong cách biến thể.
- Chọn khung hình xuất: `16:9`, `1:1`, hoặc `9:16`.
- Tùy chỉnh số lượng ảnh xuất ra từ 1 đến 60 ảnh.
- Tùy chỉnh độ biến thể và tiền tố tên file.
- Xem gallery kết quả ngay trên trình duyệt.
- Tải từng ảnh, tải hàng loạt từng file hoặc tải toàn bộ dưới dạng ZIP.

## Chạy cục bộ

Mở trực tiếp `index.html` trong trình duyệt hoặc chạy một static server:

```bash
python3 -m http.server 8000
```

Sau đó truy cập `http://localhost:8000`.

## Ghi chú tích hợp AI

Bản hiện tại tạo biến thể bằng Canvas ngay trên trình duyệt để hoạt động không cần backend. Nếu muốn kết nối API tạo ảnh thật, thay phần xử lý trong hàm `generateVariant` của `app.js` bằng lời gọi backend/API phù hợp.
