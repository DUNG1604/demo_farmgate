# KNOWN ISSUES — Vấn đề đã biết & việc còn treo

> Cập nhật khi phát hiện vấn đề mới hoặc khi xử lý xong (chuyển xuống mục "Đã xử lý").
> Mức độ: 🔴 chặn demo · 🟠 nên xử lý trước khi quay video · 🟡 chấp nhận được cho v1 · 🔵 cần quyết định của đội

## Cần đội quyết định 🔵

| # | Vấn đề | Ghi chú |
|---|---|---|
| D1 | Kịch bản khác tài liệu gốc của Tô: bỏ "4 thương lái + Shopee nhắn tin", bỏ kênh Shopee, AI không đàm phán với thương lái | 01-kich-ban.md §5 — cần Tô, Tiến, Tèo đồng ý |
| D2 | Giả định hàng bị trừ loại **không được tính tiền** | Ảnh hưởng mọi con số tiền ròng |
| D3 | Giá tham chiếu 13.000–14.500đ/kg và chi phí xe 1,5tr là số mock | Cần số thực tế khi phỏng vấn nông dân |
| D4 | Chưa kiểm chứng kịch bản với nông dân/thương lái thật | Gợi ý 5 câu hỏi phỏng vấn trong lịch sử trao đổi |

## Kỹ thuật

| # | Mức | Vấn đề | Hướng xử lý |
|---|---|---|---|
| K1 | 🟠 | Thư mục **chưa là git repo** | `git init` + commit trước khi push/clone |
| K2 | 🟡 | `npm install` báo **5 lỗ hổng high** trong dependency | Chưa chạy `npm audit fix --force` (có thể nâng major, phá build). Demo chạy local nên tạm chấp nhận |
| K3 | 🟡 | Next.js 16 khác kiến thức cũ; `next dev` tự ghi lại `AGENTS.md` | Đọc `node_modules/next/dist/docs/` trước khi dùng API Next |
| K5 | 🟡 | `src/domain/guard.ts` import từ `src/advisor/` (rules, templates) — domain phụ thuộc advisor | Chấp nhận cho v1; nếu cần tách sạch thì chuyển `allowedAmounts` sang domain |

## Advisor / Guard

| # | Mức | Vấn đề | Hướng xử lý |
|---|---|---|---|
| A1 | 🟡 | Guard chỉ nhận ra số tiền dạng `25.200.000` và `25,2 triệu`; cách nói "14 nghìn" trong câu gợi ý không bị kiểm | Câu gợi ý do code sinh từ giá đã xác nhận nên an toàn; với OpenAI cần mở rộng mẫu |
| A2 | 🟡 | Luôn gọi người mua là "chú X" (parser không lưu danh xưng ông/anh/thằng) | Lưu danh xưng vào `Offer` nếu đội muốn tự nhiên hơn |
| A3 | 🟡 | Nhận xét giá so với giá tham chiếu chỉ áp dụng khi có trừ loại (giá tham chiếu là loại 1) | Cần giá tham chiếu cho hàng xô nếu muốn so |
| A4 | 🟡 | "15–20%" (mức rớt giá khi mưa) là câu cố định trong mẫu, không do code tính | Số mock — cần nguồn thật hoặc bỏ con số |

## Phiên (session)

| # | Mức | Vấn đề | Hướng xử lý |
|---|---|---|---|
| S1 | 🟡 | Đang có thẻ chờ mà nông dân nói chào giá của người khác → thẻ cũ bị bỏ, không hỏi lại | Chấp nhận cho v1 |
| S2 | 🟡 | Chỉ một thỏa thuận mỗi phiên; không hủy chốt được | Ngoài phạm vi v1 |
| S4 | 🟡 | Chạy tay mà bác bấm/gõ khác kịch bản → con trỏ đứng yên; muốn quay lại kịch bản phải Reset | Chấp nhận — Reset nhanh |
| S5 | 🟡 | `holdMs` chỉnh tay theo cảm giác (tổng 95,5s), chưa đo với tốc độ đọc thật | Chỉnh sau khi xem thử trên UI |
| S3 | 🟡 | Chưa có `expiresAt` trong kịch bản (bản cũ có "C hết hạn 17:00") — luật hết hạn có test nhưng UI chưa có sự kiện nào kích hoạt | Thêm sự kiện nếu muốn khoe luật này |

## Parser (fallback)

| # | Mức | Vấn đề | Hướng xử lý |
|---|---|---|---|
| P1 | 🟡 | Tên người mua phải **viết hoa** ("ong nam" → không nhận tên) | Bot hỏi lại tên. OpenAI advisor sẽ xử lý tốt hơn |
| P2 | 🟡 | Số liệu cân chỉ được đọc khi `stage = "weighing"` | Cố ý: bỏ dấu thì "cần" = "cân" |
| P3 | 🟡 | Số trần nhỏ (vd "14") chỉ hiểu là giá khi đứng sau từ gợi ý (trả, giá, mua, để, bán, lên, xuống, còn, chốt) | Thêm từ gợi ý nếu test độc lập lộ ra cách nói khác |
| P4 | 🟡 | Giá hợp lệ khi là số trần trong khoảng 1.000–500.000đ | Nông sản giá > 500k/kg sẽ không nhận |
| P5 | 🟡 | Danh xưng bỏ dấu "ba", "co" trùng từ thường ("ba" = 3, "có") | Chỉ nhận khi chữ sau viết hoa nên rủi ro thấp |
| P6 | 🟡 | "trả sau" không kèm thời hạn → `payment` thiếu, bot phải hỏi | Cố ý, không đoán |
| P7 | 🟡 | Tên "Tư" trùng "Thứ Tư" nếu nông dân nói thứ trong câu | Chưa gặp trong kịch bản |

## Demo / phạm vi v1

| # | Mức | Vấn đề |
|---|---|---|
| V1 | 🟡 | Nút 🎤 chỉ **giả lập** (chèn câu nói sẵn), chưa thu âm/nhận dạng giọng nói |
| V2 | 🟡 | Chế độ OpenAI bị khóa — chưa có API key |
| V3 | 🟠 | BTC cấm nộp code làm sẵn → v1 chỉ để tập dượt, ngày 31/10 phải build lại trong ~7 giờ |
| V4 | 🟡 | Cọc đề xuất làm tròn **xuống** 100.000đ (vd 7.125.000 → 7.100.000) |

## Giao diện

| # | Mức | Vấn đề | Hướng xử lý |
|---|---|---|---|
| U1 | 🟡 | Màn hình < 1024px: điện thoại và bảng điều khiển xếp chồng; điện thoại cao tối đa bằng chiều cao màn hình | Quay video ở màn rộng ≥ 1280px |
| U3 | 🟡 | Thẻ cũ trong chat (vd thẻ chào giá đã xác nhận) vẫn hiển thị như thẻ mới, không đánh dấu "đã xác nhận" | Chấp nhận cho v1 |
| U7 | 🟡 | Hiệu ứng "đang soạn tin…" có thể bị bỏ qua cho vài tin đầu nếu bấm Reset rồi chạy lại ngay | Chỉ ảnh hưởng hiệu ứng, không ảnh hưởng nội dung |
| U8 | 🟡 | Ở chế độ dev, nút "N" của Next.js nằm đè góc trái dưới (gần nút 🎤 trên màn hẹp) | Quay video bằng bản build (`npm run build && npm start`) — không có nút này |
| U6 | 🟡 | Trong lúc Tự chạy, bác Ba vẫn gõ/bấm được trên điện thoại → có thể làm lệch kịch bản (runner báo lỗi đỏ và dừng) | Chấp nhận; bấm Reset |
| U4 | 🟡 | Khi `next dev` đang chạy, Next 16 không cho mở thêm server thứ hai cùng thư mục (báo PID đang chạy) | Dùng server có sẵn hoặc tắt bằng `taskkill /PID <pid> /F` |

## Đã xử lý
- **K4** (T4) — Chốt tên: `ParseContext` cho `parse`, `AdvisorContext` cho `respond`.
- **U2** (T9) — Có hiệu ứng "đang soạn tin…" trước tin của FarmGate.
- **U5** (T9) — Màn rộng: cột phải cuộn riêng, điện thoại đứng yên.
