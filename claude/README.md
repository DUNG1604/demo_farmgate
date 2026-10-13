# FarmGate AI v2 — Bộ tài liệu plan cho demo v1

Đội FieldFour (Tô, Tiến, Tèo). Cuộc thi: Codex Hackathon Sea × OpenAI, 31/10/2026, TP.HCM.

| File | Nội dung | Ai cần đọc |
|---|---|---|
| [01-kich-ban.md](01-kich-ban.md) | Kịch bản chốt: 6 sự kiện, câu chữ, số liệu | Cả đội |
| [02-ui-spec.md](02-ui-spec.md) | Giao diện: khung điện thoại + bảng điều khiển | Tiến |
| [03-kien-truc.md](03-kien-truc.md) | Stack, cấu trúc thư mục, dữ liệu, luật, guard | Tèo |
| [04-plan-v1.md](04-plan-v1.md) | Các task T0–T9 + tiêu chí nghiệm thu | Người build |
| [HISTORY.md](HISTORY.md) | **Đã làm gì, làm tiếp task nào** — đọc đầu tiên khi clone | Người build |
| [KNOWN_ISSUES.md](KNOWN_ISSUES.md) | Vấn đề đã biết, việc chờ đội quyết định | Cả đội |

## v1 là gì
Bản demo **chạy hoàn toàn không cần API key** (chế độ Fallback: parser theo mẫu câu + luật cố định), để cả team **thấy demo chạy trên UI** trước khi gắn OpenAI.

## Cách dùng với Claude Code
Mở thư mục `demo-farm-gate` và yêu cầu: *"Đọc claude/HISTORY.md rồi làm task tiếp theo"*.
`CLAUDE.md` ở thư mục gốc đã trỏ tới bộ tài liệu này.

## Lưu ý
- Kịch bản này **khác tài liệu gốc** của Tô ở một số điểm (xem 01-kich-ban.md §5) — cần cả đội duyệt.
- BTC không cho nộp code làm sẵn: v1 là bản tập dượt, ngày thi phải build lại.
