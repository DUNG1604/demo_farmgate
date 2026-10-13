# FarmGate AI v2 — Demo

Trợ lý bán nông sản trong chat kiểu Zalo: nông dân kể lại chào giá của thương lái, FarmGate tính tiền thực nhận, theo dõi thời tiết, đổi khuyến nghị, lưu thỏa thuận để kiểm tra lúc cân.
Bản demo v1 chạy ở chế độ **Fallback** (luật cố định, **không cần API key**).

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # 106 test (Vitest)
npm run build   # build production
```

## Cách trình diễn
- **⏯ Tự chạy** — chạy trọn 6 sự kiện trong ~90 giây, không cần chạm tay (dùng khi quay video).
- **▶ Bước tiếp** — chạy từng sự kiện; đến lượt bác Ba thì bấm 🎤 (tin thoại có sẵn) hoặc tự bấm nút/gõ chữ trên điện thoại.
- **🔄 Reset** — về đầu kịch bản.
- Quay video nên dùng bản build ở màn rộng ≥ 1280px: `npm run build && npm start`.

Tài liệu: [claude/README.md](claude/README.md) · Tiến độ: [claude/HISTORY.md](claude/HISTORY.md) · Vấn đề đã biết: [claude/KNOWN_ISSUES.md](claude/KNOWN_ISSUES.md)
