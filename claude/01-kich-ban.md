# 01 — Kịch bản demo chốt (v1)

> Nguồn gốc của mọi sự kiện là **lịch thu hoạch** và những việc có thật ngoài đời:
> thương lái gọi điện, người lạ ghé vườn, dự báo mưa, lúc cân hàng.
> Thương lái **không dùng FarmGate** — chỉ bác Ba nhắn/nói với FarmGate qua chat kiểu Zalo.

## 1. Định vị sản phẩm

**FarmGate = "đứa cháu rành giá cả" trong Zalo của nông dân.**
Bác Ba vẫn bán hàng như cũ (thương lái gọi điện, gặp tại vườn), chỉ cần kể lại cho FarmGate.
FarmGate:
1. Hiểu câu nói lộn xộn → tách thành chào giá có cấu trúc → hỏi bác xác nhận.
2. Tính **tiền thực nhận** (code, không dùng AI) và so với giá tham chiếu khu vực.
3. **Chủ động** nhắc khi sắp thu hoạch, khi trời sắp mưa → đổi khuyến nghị.
4. **Lưu thỏa thuận** khi bác chốt → làm bằng chứng lúc cân, chống ép giá.

**Không làm:** không nhắn tin cho thương lái, không tự chốt bán. Bác Ba luôn là người nói chuyện và quyết định.

## 2. Dữ liệu cố định của kịch bản

| Mục | Giá trị |
|---|---|
| Nông dân | Bác Ba, vườn ở Chợ Gạo, Tiền Giang |
| Sản phẩm | Thanh long ruột đỏ, **2.000 kg** |
| Ngày thu hoạch dự kiến | **Thứ Sáu** |
| Mối quen | Tư |
| Chi phí chở ra kho Tân Hương | **1.500.000đ** / chuyến |
| Giá tham chiếu tại vườn (mock) | **13.000 – 14.500 đ/kg** (loại 1) |
| Giả định | Hàng bị trừ loại **không được tính tiền** |

## 3. Diễn biến — 6 sự kiện

Đồng hồ giả lập hiển thị trên thanh trạng thái điện thoại.

### Sự kiện 1 — Thứ Ba 07:00 · FarmGate chủ động nhắc
- Thời tiết: ☀️ nắng 3 ngày tới.
- 🤖 *"Chào bác Ba, còn 3 ngày nữa vườn thanh long thu hoạch. Giá tại vườn khu mình hôm nay khoảng 13.000–14.500đ/kg (loại 1). Bác bắt đầu hỏi giá các mối được rồi. Ai báo giá thì bác nhắn hoặc nói cho con nghe nhé."*

### Sự kiện 2 — Thứ Tư 08:10 · Mối quen Tư gọi điện
- 👨‍🌾 🎤 (tin thoại giả lập) *"Thằng Tư mới gọi, trả 14 nghìn, trừ loại 10 phần trăm, bắt mình chở ra kho Tân Hương"*
- 🤖 Thẻ xác nhận:
  - Người mua: **Tư** (mối quen) · Giá **14.000đ/kg** · Trừ loại **10%** · Giao: **bác chở ra kho Tân Hương** · Trả tiền: **❓ chưa rõ**
  - *"Chú Tư trả tiền lúc nào bác?"* → chip `[Tiền mặt khi cân]` `[Trả sau]`
- 👨‍🌾 bấm `[Tiền mặt khi cân]` rồi `[✅ Đúng]`
- 🤖 *"Bác cầm về khoảng **23,7 triệu**: 1.800kg × 14.000 = 25.200.000đ, trừ xe ra kho 1.500.000đ. Giá/kg ổn, nhưng tiền xe làm bác hụt. Bác thử nói: 'Chú lấy tận vườn thì tôi để 14' — vậy bác được 25,2 triệu."*

### Sự kiện 3 — Thứ Tư 15:00 · Người lạ ghé vườn
- 👨‍🌾 🎤 *"Có ông Năm ở Cái Bè ghé, mua xô 12 rưỡi, lấy tại vườn, tuần sau trả tiền"*
- 🤖 Thẻ xác nhận: Người mua **Năm** (Cái Bè, **người mới**) · Giá **12.500đ/kg** · Mua xô (**không trừ loại**) · Giao **tại vườn** · Trả **sau 7 ngày** → 👨‍🌾 `[✅ Đúng]`
- 🤖 *"Bác cầm về **25,0 triệu** (2.000kg × 12.500). Giá/kg thấp hơn nhưng không bị trừ loại nên tiền về cao hơn chào giá hiện tại của chú Tư. ⚠️ Người mới và trả chậm 7 ngày: nếu bán, bác nên đòi cọc ít nhất 30% (**7.500.000đ**)."*
- Thẻ so sánh: Năm 25,0tr ⭐ · Tư 23,7tr

### Sự kiện 4 — Thứ Tư 17:00 · Bác gọi lại Tư theo gợi ý
- 👨‍🌾 *"Gọi lại thằng Tư rồi, nó chịu lấy tại vườn, giữ giá 14"*
- 🤖 Thẻ cập nhật chào giá Tư: Giao **kho → tại vườn** → 👨‍🌾 `[✅ Đúng]`
- 🤖 *"Tốt quá bác! Chú Tư giờ là **25,2 triệu**, tiền mặt, mối quen — đang là lựa chọn tốt nhất. Còn 2 ngày, chưa cần chốt vội."*
- Thẻ so sánh: Tư 25,2tr ⭐ · Năm 25,0tr

### Sự kiện 5 — Thứ Năm 06:00 · Dự báo mưa (FarmGate tự phát hiện)
- Thời tiết đổi: 🌧️ mưa lớn tối Thứ Sáu → Chủ nhật.
- 🤖 *"⚠️ Bác ơi, dự báo mưa lớn từ tối thứ Sáu đến Chủ nhật. Thanh long chín gặp mưa dễ nứt, giá có thể rớt 15–20%. Con khuyên bác **chốt trong hôm nay**."*
  - Thẻ so sánh: ⭐ Tư 25,2tr · tiền mặt · mối quen — Năm 25,0tr · trả sau 7 ngày · người mới
  - Câu gợi ý: *"Tư ơi, sáng mai cắt luôn nha, 14 nghìn, lấy tại vườn, trừ loại không quá 10%, trả tiền mặt lúc cân."*
  - Chip: `[✅ Bác đã chốt với Tư]` `[Chọn Năm]` `[Chưa chốt]`
- 👨‍🌾 (tự gọi điện cho Tư) → bấm `[✅ Bác đã chốt với Tư]`
- 🤖 Thẻ **Thỏa thuận đã lưu** (khóa, có giờ): *"Tư · 14.000đ/kg · tại vườn · loại ≤10% (≤200kg) · tiền mặt khi cân · lưu lúc 06:05 Thứ Năm"*

### Sự kiện 6 — Thứ Sáu 09:00 · Cân hàng
- 👨‍🌾 🎤 *"Nó cân 2 tấn mà chê loại hết 300 ký"*
- 🤖 *"⚠️ Thỏa thuận hôm qua: trừ loại tối đa 10% = 200kg. Trừ 300kg là bác thiệt thêm **1.400.000đ** (100kg × 14.000). Bác đưa chú Tư xem thỏa thuận đã lưu nhé."* + thẻ thỏa thuận
- 👨‍🌾 🎤 *"Nó chịu trừ 200 rồi, đưa 25 triệu 2"*
- 🤖 Kiểm tra: 1.800kg × 14.000 = 25.200.000đ ✅ khớp.
  *"✅ Đã ghi nhận: bán 2.000kg cho chú Tư, nhận **25.200.000đ**. So với chào giá đầu tiên (23,7 triệu), bác được thêm **1,5 triệu**."* + thẻ tổng kết

## 4. Bảng số liệu kiểm tra (dùng cho test)

| Tình huống | Phép tính | Kết quả |
|---|---|---|
| Tư lần 1 (chở ra kho) | 2.000 × 90% × 14.000 − 1.500.000 | **23.700.000** |
| Năm (xô, tại vườn) | 2.000 × 100% × 12.500 | **25.000.000** |
| Cọc đề xuất cho Năm | 30% × 25.000.000 | **7.500.000** |
| Tư lần 2 (tại vườn) | 2.000 × 90% × 14.000 | **25.200.000** |
| Thiệt nếu trừ 300kg | (300 − 200) × 14.000 | **1.400.000** |
| Tiền nhận cuối | 1.800 × 14.000 | **25.200.000** |
| Được thêm so với chào giá đầu | 25.200.000 − 23.700.000 | **1.500.000** |

## 5. Thay đổi so với tài liệu gốc (cần cả đội duyệt)

1. Bỏ "4 thương lái + Shopee nhắn tin đồng thời" → thay bằng chào giá đến rải rác qua lời kể của nông dân.
2. Kênh: chat kiểu Zalo + tin thoại, không bắt thương lái dùng app.
3. AI **không** đàm phán với thương lái; phần "tự chủ" = tự theo dõi thời tiết/lịch thu hoạch, tự đổi khuyến nghị, kiểm tra thỏa thuận lúc cân.
4. Vẫn giữ 4 lỗi cấm kỵ: tính sai tiền ròng · tự chốt bán · dùng chào giá hết hạn · bịa dữ liệu.
