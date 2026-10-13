# 02 — Đặc tả giao diện (v1)

Một trang web duy nhất, chạy trên laptop, chia đôi màn hình.

```
┌──────────────────────┬──────────────────────────────────────────┐
│  📱 KHUNG ĐIỆN THOẠI  │  🎬 BẢNG ĐIỀU KHIỂN DEMO                   │
│  (390 × 844)          │                                          │
│ ┌──────────────────┐ │  ① Dòng thời gian (6 sự kiện)             │
│ │ 07:00  Thứ Ba ☀️  │ │  ② Bảng so sánh chào giá (live)           │
│ │ 🌾 FarmGate       │ │  ③ "Bộ não" — AI/code đã làm gì            │
│ │ ───────────────  │ │                                          │
│ │  [tin nhắn...]   │ │  [▶ Bước tiếp] [⏯ Tự chạy] [🔄 Reset]     │
│ │                  │ │  Chế độ AI: ● Fallback  ○ OpenAI (khóa)   │
│ │ ───────────────  │ │                                          │
│ │ [🎤][ nhập... ][➤]│ │                                          │
│ └──────────────────┘ │                                          │
└──────────────────────┴──────────────────────────────────────────┘
```

Màn hình hẹp (< 1024px): xếp chồng, điện thoại ở trên, bảng điều khiển ở dưới.

## A. Khung điện thoại — chat kiểu Zalo

### Thanh trạng thái
Giờ giả lập + thứ + biểu tượng thời tiết hiện tại (☀️ / 🌧️). Đổi theo từng sự kiện.

### Header
Avatar 🌾 + "FarmGate" + dòng phụ "Trợ lý bán nông sản".

### Bong bóng tin nhắn
| Loại | Vị trí / kiểu |
|---|---|
| Tin của bác Ba (chữ) | Phải, nền xanh dương nhạt |
| Tin thoại của bác Ba | Phải, có icon 🎤 + thanh sóng âm + thời lượng giả (vd 0:06), bên dưới là chữ đã chuyển từ giọng nói (in nghiêng, nhỏ) |
| Tin của FarmGate | Trái, nền trắng |
| Tin hệ thống | Giữa, chữ xám nhỏ (vd "— Thứ Tư 08:10 —") |

### Thẻ (card) đặc biệt của FarmGate
| Thẻ | Nội dung | Hành động |
|---|---|---|
| **OfferConfirmCard** | Các trường đã tách: người mua (badge "mối quen"/"người mới"), giá/kg, % loại, nơi giao, trả tiền. Trường thiếu hiện "❓ chưa rõ" màu cam | `[✅ Đúng]` `[✏️ Sửa]`; chip trả lời cho trường thiếu |
| **NetBreakdownCard** | Tiền thực nhận (số to nhất) + phép tính từng dòng | Bấm để mở/thu gọn |
| **ComparisonCard** | Danh sách chào giá xếp theo tiền thực nhận, ⭐ cho lựa chọn tốt nhất, nhãn rủi ro | — |
| **AlertCard** | Viền cam/đỏ, icon ⚠️, nội dung cảnh báo (mưa, bị trừ loại quá mức) | — |
| **SuggestedScriptCard** | "Câu bác có thể nói" | `[📋 Sao chép]` |
| **AgreementCard** | Thỏa thuận đã lưu, icon 🔒, giờ lưu, không sửa được | — |
| **SummaryCard** | Kết quả cuối: đã bán cho ai, nhận bao nhiêu, được thêm bao nhiêu | — |

### Chip trả lời nhanh
Hiện ngay trên ô nhập khi FarmGate đang chờ bác trả lời. Bấm chip = gửi tin.

### Ô nhập
- `🎤` — **giả lập** tin thoại: chèn câu nói của sự kiện hiện tại dưới dạng tin thoại (v1 không thu âm thật).
- Ô chữ — bác có thể **gõ tự do**; bộ tách fallback xử lý, không hiểu thì FarmGate hỏi lại.
- `➤` — gửi.

## B. Bảng điều khiển demo

### ① Dòng thời gian
6 dòng tương ứng 6 sự kiện ở [01-kich-ban.md](01-kich-ban.md). Mỗi dòng: giờ giả lập, tiêu đề ngắn, trạng thái `✔ xong` / `▶ đang diễn ra` / `○ chưa tới`.
- Bấm `▶ Bước tiếp` → chạy sự kiện kế tiếp.
- `⏯ Tự chạy` → tự chạy hết kịch bản, kể cả tự bấm các chip/nút thay bác Ba, mỗi tin cách nhau ~1,2s. Mục tiêu tổng ≈ 90 giây.
- `🔄 Reset` → về trạng thái ban đầu.

### ② Bảng so sánh chào giá (live)
| Người mua | Giá/kg | Trừ loại | Giao | Trả tiền | **Tiền thực nhận** | Rủi ro |
|---|---|---|---|---|---|---|

Dòng tốt nhất có ⭐. Khi một chào giá thay đổi, dòng đó nhấp nháy nhẹ.

### ③ "Bộ não" — nhật ký minh bạch
Mỗi lượt xử lý hiện một khối:
```
[08:10] Tin thoại → chữ: "Thằng Tư mới gọi, trả 14 nghìn..."
  ├─ Tách thông tin (fallback parser): { buyer: "Tư", pricePerKg: 14000, ... }
  ├─ Thiếu: paymentTerms → hỏi lại
  ├─ Tính tiền ròng (code): 2000 × 0.9 × 14000 − 1.500.000 = 23.700.000
  ├─ Luật áp dụng: R2 "phí chở cao → gợi ý đổi sang lấy tại vườn"
  └─ Guard: ✅ số trong câu trả lời khớp số code tính
```
Mục đích: cho giám khảo thấy **AI/luật làm phần nào, code làm phần nào**.

### Công tắc chế độ AI
`● Fallback` (mặc định) / `○ OpenAI` — v1 khóa OpenAI, tooltip "Chưa cấu hình API key".

## C. Phong cách
- Font: Be Vietnam Pro (Google Fonts), hỗ trợ tiếng Việt tốt.
- Màu chủ đạo: xanh lá nông nghiệp; cảnh báo cam; nguy hiểm đỏ; tin của bác Ba xanh dương nhạt như Zalo.
- Tiền: định dạng `vi-VN` — `25.200.000đ`; dạng rút gọn `25,2 triệu`.
- Chữ trong điện thoại tối thiểu 15px, số tiền thực nhận ≥ 24px đậm.
- Không cần dark mode ở v1.
