# FarmGate AI v2 — demo

Trợ lý bán nông sản trong chat kiểu Zalo: nông dân kể lại chào giá của thương lái, FarmGate tính tiền thực nhận, theo dõi thời tiết, đổi khuyến nghị, lưu thỏa thuận để kiểm tra lúc cân.

Tài liệu plan nằm trong [claude/](claude/README.md). Đọc theo thứ tự 01 → 04 trước khi code.

## Tiếp tục công việc
- **Đọc [claude/HISTORY.md](claude/HISTORY.md) trước tiên** — task nào đã xong, task nào làm tiếp, các quyết định đã chốt.
- Vấn đề tồn đọng: [claude/KNOWN_ISSUES.md](claude/KNOWN_ISSUES.md).
- **Sau mỗi task:** thêm mục mới lên đầu phần Nhật ký trong HISTORY.md (file, quyết định, số test), cập nhật bảng trạng thái; ghi vấn đề mới vào KNOWN_ISSUES.md.

## Quy tắc bắt buộc
- Mọi số tiền do `src/domain/netCalculator.ts` / `weighCheck.ts` tính. Parser, luật, AI không tự tạo số.
- Không có đường nào chuyển sang "đã chốt" ngoài hành động bấm nút của nông dân.
- Thiếu thông tin → hỏi lại, không đoán. Không dùng chào giá hết hạn/đã thay thế.
- `src/domain` không import React.
- v1 không gọi API ngoài, không cần `.env`. Chế độ AI mặc định: Fallback.
- Số liệu kịch bản phải khớp bảng ở `claude/01-kich-ban.md` §4; `tests/scenario.e2e.test.ts` là chốt chặn.
- Văn bản hiển thị bằng tiếng Việt, xưng "con" – gọi "bác".

## Lệnh
`npm run dev` · `npm test` · `npm run lint` · `npm run build`

## Next.js
Dự án dùng Next.js 16 — xem [AGENTS.md](AGENTS.md): đọc tài liệu trong `node_modules/next/dist/docs/` trước khi dùng API Next.js.
