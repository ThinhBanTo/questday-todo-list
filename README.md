# QuestDay Todo List

QuestDay Todo List là ứng dụng quản lý công việc cá nhân (Todo List) kết hợp cơ chế RPG / Gamification theo phong cách cuốn sổ tay retro notebook. Ứng dụng giúp người dùng lập kế hoạch công việc hằng ngày, duy trì thói quen với các nhiệm vụ lặp lại, tích lũy điểm kinh nghiệm (XP), tăng cấp độ, theo dõi chuỗi ngày liên tục (Daily Streak) và quản lý dữ liệu an toàn offline.

---

## 1. Giới thiệu

- **Mục tiêu sản phẩm:** Quản lý công việc cá nhân trực quan, tạo động lực làm việc hằng ngày thông qua các cơ chế trò chơi nhập vai cổ điển (RPG Quest Log).
- **Nguyên tắc kỹ thuật:** 100% Vanilla Web (HTML5, CSS3, JavaScript ES6+ thuần). Không sử dụng frontend framework (React, Vue, Angular), không bundler, không build step, không phụ thuộc backend server bên ngoài.
- **Lưu trữ dữ liệu:** Trực tiếp trong `localStorage` của trình duyệt người dùng; các thao tác quản lý dữ liệu không cần backend hoặc tài khoản. Một số font và họa tiết dùng tài nguyên trực tuyến, nên giao diện có thể dùng font dự phòng khi mất mạng.

---

## 2. Chức năng chính

1. **Quản lý công việc hằng ngày (Daily Planning):**
   - Phân tách độc lập giữa Ngày dự kiến thực hiện (`Planned Date`) và Hạn chót (`Due Date`).
   - 5 chế độ lọc chuyên biệt: `Today`, `Upcoming`, `Overdue`, `All`, và `History`.
   - Cơ chế gối đầu thông minh (`Carry-over`): Công việc chưa hoàn thành từ ngày trước tự động chuyển tiếp sang ngày hôm nay mà không thay đổi ngày lập kế hoạch gốc.
   - Trình chỉnh sửa ngày tại chỗ (`Inline Reschedule`) hỗ trợ cập nhật hoặc xóa ngày nhanh chóng.
2. **Nhiệm vụ lặp lại (Recurring Quests):**
   - Hỗ trợ chu kỳ lặp hằng ngày (`Daily`) hoặc hằng tuần (`Weekly`).
   - Tự động duy trì khoảng cách hạn chót tương đối (`dueDateOffsetDays`).
   - Động cơ Lazy Generation tự động sinh lượt mới khi sang ngày mới, áp dụng quy tắc tối đa 1 lượt chưa hoàn thành để chống ngập lụt nhiệm vụ.
   - Hỗ trợ dừng lặp độc lập (`Stop Repeating`) và chốt an toàn ngăn ngừa hoàn tác lượt cũ khi đã có lượt mới (`Undo Guard`).
3. **Gamification, Cấp độ & Chuỗi ngày (XP, Level & Daily Streak):**
   - Thưởng +5 XP khi tạo nhiệm vụ mới, +10 XP khi hoàn thành nhiệm vụ lần đầu (các lượt tự động sinh của nhiệm vụ lặp nhận 0 XP).
   - Thanh tiến trình XP tự động tính toán điểm thăng cấp theo công thức `100 + (level - 1) * 20` kèm hiệu ứng ngôi sao và banner chúc mừng.
   - Theo dõi chuỗi ngày làm việc liên tục (`Current Streak` và `Best Streak`) tính theo ngày lịch địa phương (Local Date).
   - Hoàn tác không trừ XP; hoàn thành lại không cấp trùng XP.
4. **Nhật ký thành tựu (Quest History):**
   - Chế độ xem chỉ đọc (`Read-Only`) gom nhóm các lần hoàn thành theo từng ngày thực tế (`completedDate`) giảm dần.
   - Hiển thị thời gian hoàn thành cụ thể (`HH:mm`), nhãn kế hoạch, deadline và chu kỳ lặp.
   - Nhiệm vụ đã hoàn thành khi bị xóa khỏi danh sách Todo vẫn được bảo tồn lịch sử (gắn nhãn `Archived`).
5. **Sao lưu & Khôi phục dữ liệu (JSON Backup & Restore):**
   - Xuất dữ liệu ra file `questday-backup-YYYY-MM-DD.json` chuẩn hóa gồm 5 nguồn dữ liệu: `tasks`, `xp`, `level`, `completionHistory`, `recurrenceRules`.
   - Kiểm thử cấu trúc, kiểu dữ liệu, phiên bản schema và chống trùng ID trước khi nạp.
   - Hộp thoại tóm tắt xác nhận trước khi thay thế dữ liệu, tích hợp nút tải bản sao dự phòng của dữ liệu hiện tại.
   - Cơ chế rollback cố gắng khôi phục dữ liệu cũ nếu quá trình ghi thất bại và báo rõ khi không thể khôi phục đầy đủ.

---

## 3. Công nghệ sử dụng

- **HTML5:** Cấu trúc ngữ nghĩa (Semantic markup), SVG symbols sprite hệ thống icon outline vintage, template `<template id="questItemTemplate">`.
- **CSS3:** Thiết kế giao diện retro notebook, CSS Custom Properties (Design Tokens), Flexbox/Grid, hiệu ứng animation thuần.
- **JavaScript (ES6+):** Vanilla DOM APIs, Event Delegation, native Date API (xử lý ngày địa phương chuẩn xác), Web Storage API (`localStorage`), Blob & FileReader API.
- **Phông chữ & Họa tiết:** Google Fonts (`Courier Prime`, `Indie Flower`) và họa tiết nền từ transparenttextures.com.

---

## 4. Chạy dự án trên máy (Local Setup)

QuestDay Todo List không cần cài dependencies, không cần `npm install` và không có bước build.

1. Tại **repository QuestDay Todo List này**, chọn **Code → Download ZIP** rồi giải nén, hoặc clone chính repository này nếu bạn sử dụng Git.
2. Mở thư mục `questday-todo-list` vừa tải về.
3. Mở `index.html` bằng trình duyệt để dùng thử.

Để chạy qua HTTP cục bộ (khuyến nghị khi phát triển và debug), mở terminal trong thư mục dự án rồi chạy:

```bash
python -m http.server 8000
```

Truy cập `http://localhost:8000`. Có thể sử dụng extension **Live Server** trong VS Code thay thế.

---

## 5. Hướng dẫn sử dụng

### Lên kế hoạch nhiệm vụ
- Nhập nội dung nhiệm vụ vào ô input chính.
- Thiết lập ngày dự kiến (`Plan`) và hạn chót (`Due`) tại hàng công cụ bên dưới.
- Chọn tần suất tại mục `Repeat` nếu muốn nhiệm vụ lặp lại (`Daily` hoặc `Weekly`).
- Nhấn Enter hoặc nút **(+)** để tạo Quest.

### Quản lý và theo dõi
- **Hoàn thành:** Click vào ô checkbox tròn để hoàn thành và nhận +10 XP.
- **Đánh dấu quan trọng:** Click biểu tượng ngôi sao (⭐) để ghim nhiệm vụ lên đầu danh sách.
- **Sửa nhanh nội dung:** Nháy đúp (double-click) vào dòng chữ nhiệm vụ để chỉnh sửa trực tiếp.
- **Dời lịch:** Click biểu tượng lịch (📅) trên dòng nhiệm vụ để mở form chỉnh ngày tại chỗ.
- **Xem lịch sử:** Chuyển sang tab `History` trên thanh điều hướng để xem nhật ký công việc đã hoàn thành.

---

## 6. Lưu trữ và Sao lưu / Khôi phục dữ liệu

### Khóa lưu trữ LocalStorage
Dữ liệu ứng dụng được lưu cục bộ trong trình duyệt qua 5 khóa:

| Khóa lưu trữ | Kiểu dữ liệu | Nội dung |
| :--- | :--- | :--- |
| `questLog_tasks` | JSON Array | Danh sách nhiệm vụ hiện tại và thông tin kế hoạch, trạng thái hoàn thành. |
| `questLog_xp` | Integer | Điểm kinh nghiệm tích lũy trong cấp độ hiện tại. |
| `questLog_level` | Integer | Cấp độ nhân vật hiện tại (khởi đầu từ 1). |
| `questDay_completionHistory` | JSON Array | Nhật ký các lần hoàn thành nhiệm vụ theo thời gian thực tế. |
| `questDay_recurrenceRules` | JSON Array | Danh sách các quy tắc lặp lại hằng ngày và hằng tuần. |

> [!IMPORTANT]
> **Giới hạn lưu trữ trình duyệt:**
> Dữ liệu `localStorage` nằm riêng biệt trên từng trình duyệt và thiết bị, không tự động đồng bộ qua đám mây. Nếu người dùng xóa dữ liệu duyệt web (Clear Site Data) hoặc chuyển máy, dữ liệu sẽ không còn. Hãy sử dụng tính năng **Export Backup** để lưu file JSON dự phòng định kỳ.

### Thao tác Backup / Restore
1. **Xuất bản sao lưu:** Cuộn xuống chân trang sổ, nhấn nút **Export Backup**. Trình duyệt sẽ tải về file `questday-backup-YYYY-MM-DD.json`.
2. **Khôi phục bản sao lưu:** Nhấn nút **Restore Backup**, chọn file JSON hợp lệ. Xem lại thông tin tóm tắt trong hộp thoại, nhấn **Confirm Replace** để khôi phục hoặc **Save Current Data First** để tải bản lưu dữ liệu hiện tại trước khi thay thế.

---

## 7. Cấu trúc repository

```text
questday-todo-list/
├── .gitignore             # Danh sách loại trừ tệp tạm thời cho Git
├── LICENSE                # Giấy phép MIT License gốc (© 2025 Ankankun)
├── README.md              # Tài liệu giới thiệu và hướng dẫn sử dụng dự án
├── AGENTS.md              # Quy chuẩn kiến trúc và nguyên tắc phát triển
├── index.html             # Cấu trúc HTML chính và hệ thống SVG sprite
├── style.css              # Toàn bộ mã định kiểu retro notebook
├── script.js              # Toàn bộ logic nghiệp vụ, state và persistence
├── docs/                  # Thư mục tài liệu học tập User-Interaction-First
│   ├── USER-FLOWS.md      # Mục lục tổng hợp 20 User Flows (F00–F19)
│   └── flows/             # Tài liệu phân tích chi tiết từng luồng tương tác
│       ├── 00-app-startup.md
│       ├── 01-quest-management.md
│       ├── 02-xp-level.md
│       ├── 03-daily-planning.md
│       ├── 04-history-streak.md
│       ├── 05-recurring-quests.md
│       └── 06-data-backup.md
├── assets/                # Tài nguyên đồ họa gốc của dự án
└── screenshots/           # Ảnh chụp màn hình minh họa giao diện
```

---

## 8. Tài liệu User Flows (Học tập & Lần vết mã nguồn)

Dự án được xây dựng với mục tiêu phục vụ học tập chuyên sâu kỹ thuật Frontend theo triết lý **User-Interaction-First Execution Flow** (phân tích từ thao tác người dùng → DOM Event → Handler → State → Storage → Render → Debug).

👉 **Xem danh mục đầy đủ các luồng tại: [docs/USER-FLOWS.md](docs/USER-FLOWS.md)**

Các nhóm tài liệu chính:
- **[F00: Khởi tạo ứng dụng & Nạp dữ liệu](docs/flows/00-app-startup.md)**
- **[F01 - F05: Quản lý Quest cơ bản](docs/flows/01-quest-management.md)**
- **[F06: Cơ chế XP, Lên cấp & Tiến trình](docs/flows/02-xp-level.md)**
- **[F07 - F10: Quản lý Kế hoạch hằng ngày](docs/flows/03-daily-planning.md)**
- **[F11 - F12: Lịch sử hoàn thành & Chuỗi ngày liên tục](docs/flows/04-history-streak.md)**
- **[F13 - F17: Nhiệm vụ lặp lại & Tự động tái tạo](docs/flows/05-recurring-quests.md)**
- **[F18 - F19: Sao lưu & Khôi phục dữ liệu JSON](docs/flows/06-data-backup.md)**

---

## 9. Hướng dẫn Deploy lên GitHub Pages

Ứng dụng hoàn toàn tương thích với GitHub Pages ở cả thư mục gốc hoặc subpath:

1. Đưa mã nguồn lên repository GitHub của bạn trên nhánh `main`.
2. Truy cập vào mục **Settings** của repository trên GitHub.
3. Điều hướng tới mục **Pages** (tại thanh menu bên trái).
4. Tại mục **Build and deployment**:
   - **Source:** Chọn `Deploy from a branch`.
   - **Branch:** Chọn nhánh `main` và thư mục `/ (root)`.
   - Nhấn **Save**.
5. Chờ 1–2 phút để GitHub Actions hoàn tất việc xuất bản. Trang web sẽ sẵn sàng tại địa chỉ:  
   `https://<username>.github.io/<tên-repository>/`

> [!NOTE]
> Repository này không đặt sẵn tên miền riêng. Nếu sau này sử dụng custom domain, hãy cấu hình tên miền trong GitHub Pages và thêm `CNAME` tương ứng với tên miền **của bạn**.

---

## 10. Bản quyền & Ghi công (License & Attribution)

**QuestDay Todo List** là dự án cá nhân được mở rộng từ mã nguồn [Quest Log của Ankankun](https://github.com/Ankankun/Quest-Log) (MIT). Các phần bổ sung gồm quản lý kế hoạch theo ngày, nhiệm vụ lặp, History, Streak và Backup/Restore.

Giữ thông báo bản quyền nguồn gốc **© 2025 Ankankun** theo [MIT License](LICENSE).
