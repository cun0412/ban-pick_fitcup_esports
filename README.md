# 🎮 Esports Ban/Pick Tool

Ứng dụng web Ban/Pick phục vụ livestream giải đấu esports gồm 2 bộ môn:
- **Liên Quân Mobile**: Ban/Pick tướng chuyên nghiệp.
- **Valorant**: Ban/Pick map (Veto Bo1/Bo3/Bo5) + Chế độ **Quay Map** ngẫu nhiên.

## 1. Cài đặt & Chạy ngay
```bash
npm install
npm run dev
```
Sau đó mở trình duyệt tại `http://localhost:5173`.

## 2. Cấu trúc trang
- `/` : Trang chủ chọn game.
- `/lq/control` : Bảng điều khiển Ban/Pick Liên Quân Mobile.
- `/lq/overlay` : Màn hình hiển thị 1920x1080 cho OBS (Liên Quân).
- `/lq/admin` : Trang quản trị vai trò, ẩn/hiện và đổi ảnh tướng Liên Quân.
- `/valorant/control` : Bảng điều khiển Valorant (tab Veto & tab Quay Map).
- `/valorant/overlay` : Màn hình hiển thị 1920x1080 cho OBS (Valorant).

## 3. Các script dữ liệu
```bash
# Đối chiếu Hero/heroes.json + public/heroes/ để sinh src/data/lq-heroes.json và in báo cáo
npm run build-heroes

# Tải sẵn ảnh map Valorant 5v5 từ valorant-api.com về public/maps/ và sinh src/data/valorant-maps.json
npm run download-maps
```

## 4. Cách thêm tướng Liên Quân mới
1. Copy file ảnh tướng (`.png`, `.jpg`, `.gif`, `.webp`) đặt tên theo `slug` vào thư mục `public/heroes/`.
2. Thêm object `{ "slug": "...", "name": "...", "src": "" }` vào `Hero/heroes.json` (hoặc `public/heroes/heroes.json`).
3. Chạy `npm run build-heroes`.
4. Vào `/lq/admin` để gán vai trò cho tướng mới (hoặc gán nhanh theo lô, Export/Import JSON).
- Ngoài ra có thể upload thay ảnh trực tiếp trên `/lq/admin` (lưu trong `localStorage`).

## 5. Cách cập nhật map pool Valorant
- Hệ thống tự động lấy danh sách map 5v5 mới nhất từ `https://valorant-api.com/v1/maps` và cache vào `localStorage`.
- Có thể chạy `npm run download-maps` để lưu sẵn ảnh vào `public/maps/` phục vụ offline/khi mạng livestream chập chờn.
- Ở trang `/valorant/control`, mở phần **Map Pool** để bật/tắt từng map theo mùa giải.

## 6. Hướng dẫn thêm Overlay vào OBS Studio
1. Mở **OBS Studio** → Sources → nhấn `+` → chọn **Browser**.
2. Đặt tên (VD: `LQ Overlay` hoặc `Valorant Overlay`).
3. Nhập **URL**:
   - Liên Quân: `http://localhost:5173/lq/overlay`
   - Valorant: `http://localhost:5173/valorant/overlay`
4. Chọn nền qua tham số `?bg=`:
   - `?bg=transparent` : Nền trong suốt (mặc định nên dùng trong OBS).
   - `?bg=chroma` : Nền xanh lá `#00ff00` (dùng với bộ lọc Chroma Key).
   - `?bg=dark` : Nền tối (phù hợp khi dùng trực tiếp làm cảnh chờ/full screen).
5. Đặt **Width**: `1920`, **Height**: `1080`.
6. Bấm OK. Mọi thao tác trên trang Control sẽ tự đồng bộ thời gian thực sang OBS qua `BroadcastChannel` (có fallback `localStorage`).

## 7. Phím tắt
- `Ctrl + Z` : Hoàn tác (Undo) lượt vừa thao tác.
- `Esc` : Bỏ chọn tướng hiện tại / đóng hộp thoại.
- `Space` : Quay map nhanh (khi đang ở chế độ Quay Map Valorant).
