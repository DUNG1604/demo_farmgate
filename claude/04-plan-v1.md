# 04 — Kế hoạch build v1 (fallback, chưa có API key)

**Mục tiêu v1:** cả team mở trình duyệt, bấm `⏯ Tự chạy` và xem trọn 6 sự kiện trong ~90 giây, đúng số liệu ở [01-kich-ban.md](01-kich-ban.md), không cần API key.

Làm theo thứ tự. Mỗi task xong phải đạt tiêu chí nghiệm thu trước khi sang task sau.

## T0 — Khởi tạo project
- Next.js + TypeScript + Tailwind + ESLint (App Router, thư mục `src/`), thêm Vitest.
- Tạo cấu trúc thư mục như [03-kien-truc.md §3](03-kien-truc.md).
- Script: `npm run dev`, `npm test`, `npm run build`.

✅ `npm run dev` mở được trang trống; `npm test` chạy được 1 test mẫu.

## T1 — Kiểu dữ liệu + dữ liệu kịch bản
- `src/domain/types.ts` theo §4.
- `src/scenario/data.ts`: hồ sơ bác Ba, giá tham chiếu, thời tiết ban đầu.
- `src/lib/format.ts`: `formatVnd(25200000) → "25.200.000đ"`, `formatMillion(25200000) → "25,2 triệu"`, tên thứ tiếng Việt.

✅ Test `format` pass.

## T2 — Bộ tính tiền ròng + kiểm tra lúc cân
- `netCalculator.ts`, `weighCheck.ts` theo §5.

✅ Test tái hiện **đúng 7 dòng** của bảng số liệu ở 01-kich-ban.md §4.

## T3 — Fallback parser tiếng Việt
- `vocab.ts` + `parser.ts` theo bảng mẫu ở §7.

✅ Test:
- 5 câu nói trong kịch bản tách ra đúng các trường như 01-kich-ban.md.
- Thêm tối thiểu 10 cách nói biến thể (vd "13 rưỡi", "14k", "trả liền", "3 tạ", "chú Sáu ở Mỹ Tho").
- Câu vô nghĩa → `unknown`.
- Ghi chú: bộ **20 test độc lập** của Tiến là bộ riêng, người build không xem đáp án trước.

## T4 — Luật khuyến nghị + mẫu câu + Guard
- `rules.ts` (R1–R7), `templates.ts` (tiếng Việt, xưng "con" – gọi "bác"), `guard.ts`, `fallbackAdvisor.ts`.

✅ Test:
- Mỗi luật R1–R7 có ít nhất 1 test.
- Guard chặn được: (a) tin có số tiền không do code tính, (b) khuyến nghị dùng offer đã thay thế, (c) bot cố phát action chốt.

## T5 — Reducer phiên + state machine
- `session.ts` theo §6, kèm `brainLog` (mỗi lượt: input → parse → tính → luật → guard).

✅ Test:
- Không có đường nào tới `DA_CHOT` ngoài `FARMER_CONFIRMED_DEAL`.
- `Agreement` không sửa được sau khi tạo.
- `scenario.e2e.test.ts`: chạy 6 sự kiện chỉ bằng reducer → net cuối 25.200.000, "được thêm" 1.500.000, trạng thái `HOAN_TAT`.

## T6 — Runner kịch bản
- `script.ts` (6 bước, đúng câu nói/giờ/thời tiết), `runner.ts` (bước tiếp, tự chạy, reset, đồng hồ giả lập).

✅ Gọi runner auto-play trong test → kết quả giống T5.

## T7 — UI điện thoại
- Phone frame, status bar, chat list, bubble chữ/thoại, quick replies, input bar (🎤 giả lập, gõ tự do).
- Toàn bộ card ở [02-ui-spec.md §A](02-ui-spec.md).

✅ Bấm thủ công đi được hết 6 sự kiện; gõ tự do một câu chào giá mới thì vẫn ra OfferConfirmCard.

## T8 — UI bảng điều khiển
- Timeline, bảng so sánh live, BrainLog, công tắc chế độ AI (OpenAI khóa).
- Nút `▶ Bước tiếp`, `⏯ Tự chạy`, `🔄 Reset`.

✅ `⏯ Tự chạy` chạy trọn kịch bản trong 80–100 giây, không cần chạm tay; Reset về đúng trạng thái đầu.

## T9 — Hoàn thiện demo
- Responsive (< 1024px xếp chồng), cuộn chat tự động xuống tin mới, hiệu ứng "đang soạn tin…" trước tin bot.
- `npm run build` không lỗi, không warning TypeScript.
- Chạy checklist dưới đây.

## Checklist nghiệm thu v1 (cả team cùng xem)
> Claude đã tự kiểm 2026-10-13 (test + Playwright trên localhost). Cả đội vẫn nên xem lại bằng mắt.

- [x] Mọi con số trên màn hình khớp bảng 01-kich-ban.md §4. — `tests/netCalculator.test.ts`, `scenario.e2e.test.ts`, kiểm bằng mắt trên trình duyệt
- [x] FarmGate không bao giờ tự chốt; chỉ chuyển "đã chốt" sau khi bấm nút. — `tests/session.test.ts` (9 loại action khác + advisor cố tự chốt)
- [x] Trường thiếu (trả tiền của Tư) được hỏi lại, không đoán.
- [x] Sự kiện 5 đổi khuyến nghị từ "chưa vội" → "chốt hôm nay".
- [x] Sự kiện 6 phát hiện trừ loại quá mức, đúng 1.400.000đ.
- [x] BrainLog thể hiện rõ phần nào parser/luật làm, phần nào code tính. — nhãn PARSER / CODE / LUẬT / GUARD
- [x] Tự chạy ≈ 90 giây; Reset sạch. — đo được 89 giây tới khi hết kịch bản, Guard 0 lần chặn
- [x] Không cần `.env`, không gọi mạng ngoài (trừ font). — 0 request ra ngoài, kể cả font (Next tự phục vụ)

## Ngoài phạm vi v1
OpenAI advisor · thu âm/nhận dạng giọng nói thật · chụp ảnh giấy báo giá · giá tham chiếu thật · Zalo thật · backend/database · đăng nhập · nhiều nông dân.

## Sau v1 (gợi ý thứ tự)
1. `OpenAIAdvisor` + API route (xem 03-kien-truc.md §9).
2. Bộ 20 test độc lập của Tiến chạy trên cả Fallback và OpenAI → so sánh.
3. Phỏng vấn 2–3 nông dân, chỉnh kịch bản/câu chữ.
4. Luyện build lại trong 7 giờ (quy định BTC: không nộp code làm sẵn).
