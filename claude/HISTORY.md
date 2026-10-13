# HISTORY — Nhật ký tiến độ build demo v1

> Đọc file này đầu tiên khi clone sang máy mới. Cập nhật ở cuối mỗi task (mới nhất ở trên cùng).
> Vấn đề còn tồn đọng: [KNOWN_ISSUES.md](KNOWN_ISSUES.md) · Kế hoạch: [04-plan-v1.md](04-plan-v1.md)

## Trạng thái hiện tại

| Task | Trạng thái |
|---|---|
| T0 Khởi tạo project | ✅ Xong |
| T1 Kiểu dữ liệu + dữ liệu kịch bản | ✅ Xong |
| T2 Tính tiền ròng + kiểm tra cân | ✅ Xong |
| T3 Fallback parser tiếng Việt | ✅ Xong |
| T4 Luật R1–R7 + mẫu câu + Guard | ✅ Xong |
| T5 Reducer phiên + state machine | ✅ Xong |
| T6 Runner kịch bản | ✅ Xong |
| T7 UI điện thoại | ✅ Xong |
| T8 UI bảng điều khiển | ✅ Xong |
| T9 Hoàn thiện demo | ✅ Xong — **v1 hoàn tất** |

**Việc tiếp theo (ngoài v1):** xem mục "Sau v1" trong [04-plan-v1.md](04-plan-v1.md) — OpenAI advisor, 20 test độc lập của Tiến, phỏng vấn nông dân, luyện build lại trong 7 giờ.

**Test:** 106/106 pass · `tsc --noEmit` sạch · `npm run lint` sạch.

## Bắt đầu trên máy mới

```bash
git clone <repo> && cd demo-farm-gate
npm install          # cần Node ≥ 20.9 (đang dùng 20.19.6)
npm test             # phải ra 106 passed
npm run dev          # http://localhost:3000 — bấm "⏯ Tự chạy" để xem trọn kịch bản (~96 giây)
```
Với Claude Code: mở thư mục rồi nói *"Đọc claude/HISTORY.md rồi làm task tiếp theo"*.

---

## Nhật ký

### 2026-10-13 — T9: Hoàn thiện demo (v1 hoàn tất)
**File:** `src/app/components/phone/Phone.tsx` (`useRevealedChat`, `TypingBubble`, header có ngày), `DemoApp.tsx`; tích checklist trong 04-plan-v1.md.
- Hiệu ứng **"đang soạn tin…"**: tin của FarmGate hiện lần lượt, mỗi tin sau 600 ms (`BOT_TYPING_MS`); chip trả lời nhanh chỉ hiện khi bot nói xong. Chỉ là hiển thị — trạng thái phiên đã xong từ trước nên không ảnh hưởng runner.
- Màn rộng (≥ 1024px): trang cố định chiều cao màn hình, **cột phải cuộn riêng**, điện thoại đứng yên (đóng U5).
- Màn hẹp: thanh trạng thái chỉ còn giờ + thời tiết (tránh "tai thỏ"), ngày chuyển sang nhãn 📅 ở header chat; không cuộn ngang ở 390px.
- `npm run build` sạch, không cảnh báo.

**Kiểm tra (Playwright):** Tự chạy hết kịch bản 89 giây, không lỗi runner, Guard 0 lần chặn; 0 request ra ngoài; màn 390px không cuộn ngang.

**Checklist nghiệm thu:** 8/8 đạt — xem 04-plan-v1.md.

### 2026-10-13 — T8: UI bảng điều khiển
**File:** `src/app/components/control/Timeline.tsx`, `control/OffersTable.tsx`, `control/BrainLog.tsx`, `DemoApp.tsx` (viết lại phần bảng điều khiển), `globals.css` (hiệu ứng `animate-flash`); sửa nhỏ `Phone.tsx`, `Cards.tsx`, `fallbackAdvisor.ts`.
- Thanh điều khiển: **▶ Bước tiếp** (khóa khi đang chờ bác Ba / đang tự chạy) · **⏯ Tự chạy / ⏸ Tạm dừng / Chạy lại từ đầu** · **🔄 Reset** · tổng thời gian ≈ 96 giây · công tắc **● Fallback / ○ OpenAI 🔒** (OpenAI khóa, tooltip "Chưa cấu hình API key") · lỗi runner hiện khung đỏ.
- ① Dòng thời gian: 6 sự kiện ✔ / ▶ / ○, sự kiện đang chạy có gợi ý cho người trình diễn khi đến lượt bác Ba.
- ② Bảng so sánh trực tiếp: mọi chào giá (kể cả đã thay thế — gạch ngang), ⭐ tốt nhất, 🔒 đã chốt, dòng mới nháy vàng.
- ③ Bộ não: mỗi lượt có nhãn **PARSER** / **CODE** / **LUẬT** / **LUỒNG** / **GUARD** — cho giám khảo thấy phần nào luật/AI làm, phần nào code tính.
- Tự chạy: `useEffect` hẹn giờ theo `holdMs` của nhịp vừa chạy → `AUTO_BEAT`; tự dừng khi hết kịch bản hoặc có lỗi.

**Đã kiểm tra trên trình duyệt (1500×1000):** Tự chạy hết kịch bản, Guard 12 lượt hợp lệ / 0 lần chặn, không lỗi console, trang không bị giật cuộn.

**Sửa trong lúc kiểm tra:** cuộn chat/Bộ não dùng `scrollTop` của khung thay `scrollIntoView` (tránh cuộn cả trang); Bộ não cuộn tức thì thay vì "smooth" (cuộn mượt dừng giữa chừng khi nhiều dòng tới liên tiếp); bảng so sánh rút gọn nhãn + không xuống dòng; nhãn "người mới" không gãy chữ; trace R7 định dạng tiền.

### 2026-10-13 — T7: UI điện thoại
**File:** `src/app/components/DemoApp.tsx`, `src/app/components/phone/Phone.tsx`, `src/app/components/cards/Cards.tsx`, `src/app/components/labels.ts`, `src/app/page.tsx`; `.gitignore` thêm `/.playwright-mcp`.
- `DemoApp` (client component) giữ `useReducer(createDemoReducer(fallbackAdvisor))`; trang chủ chỉ render `<DemoApp/>`.
- Điện thoại: khung 390×844, thanh trạng thái (giờ giả lập, thứ, ☀️ → 🌧️ khi có dự báo), header FarmGate, chat kiểu Zalo (bác Ba xanh dương bên phải, bot trắng bên trái, dòng giờ ở giữa), tin thoại có sóng âm + chữ đã chuyển, chip trả lời nhanh, ô nhập (🎤 nhấp nháy khi kịch bản đang chờ câu nói; gõ tự do vẫn chạy).
- 7 thẻ: chào giá (trường thiếu "❓ chưa rõ" màu cam), tiền thực nhận (bấm xem cách tính), so sánh (⭐ + nhãn rủi ro), cảnh báo (cam/đỏ), câu gợi ý (nút sao chép), thỏa thuận 🔒, tổng kết (nền xanh, "Được thêm 1,5 triệu").
- Bảng điều khiển **tạm**: sự kiện hiện tại + gợi ý cho người trình diễn + Bước tiếp / Reset. T8 thay thế.

**Đã kiểm tra trên trình duyệt (Playwright, localhost:3000):** bấm tay đi hết 6 sự kiện, số liệu đúng, không lỗi/cảnh báo console; gõ tự do "ông Bảy ở Mỹ Tho trả 13 rưỡi, lấy tận vườn" → ra thẻ chào giá + hỏi trừ loại kèm chip.

**Sửa trong lúc kiểm tra:** thẻ tổng kết bị chữ trắng trên nền trắng (lớp `bg-white` dùng chung đè `bg-green-700`) → bỏ nền khỏi lớp chung; "loại không (mua xô)" → "mua xô".

### 2026-10-13 — T6: Runner kịch bản
**File:** `src/scenario/script.ts`, `src/scenario/runner.ts`, `tests/runner.test.ts` (8 test); cập nhật 03-kien-truc.md §8.
- `SCENARIO`: 6 sự kiện = chuỗi nhịp (`clock`, `weather`, `tick` | `say`, `tap`), mỗi nhịp có `holdMs`; sự kiện có `hint` cho người trình diễn.
- `createDemoReducer(advisor)` + `createDemoState()` — UI chỉ cần `useReducer` cái này.
- Tự chạy hết bằng `AUTO_BEAT` cho kết quả giống hệt e2e T5 (HOAN_TAT, nhận 25,2tr, +1,5tr, thỏa thuận lưu 06:05, Guard không chặn).

**Quyết định:**
- Đổi thiết kế `farmerVoice[]` + `autoTaps[]` (trong plan) sang **chuỗi nhịp có thứ tự** — rõ thứ tự xen kẽ giữa đồng hồ, tin nhắn, nút bấm (vd SK5: 06:00 → mưa → 06:05 → bấm chốt).
- Bấm chip được khớp theo **nhãn bắt đầu bằng** (vd `"✅ Bác đã chốt với"`) để không phụ thuộc tên người mua.
- Chạy tay mà bác làm khác kịch bản → phiên vẫn xử lý bình thường, con trỏ đứng yên (người trình diễn có thể ứng biến).
- Nhịp tự chạy không thấy chip → `error` (UI hiện đỏ), không đi tiếp.
- Tổng `holdMs` = 95,5 giây (có test 80–100s). Chỉnh trong `script.ts` khi quay video.

**Ghi chú cho T7/T8:** UI dùng `const [demo, dispatch] = useReducer(createDemoReducer(fallbackAdvisor), undefined, createDemoState)`. Điện thoại đọc `demo.session.chat/chips/now/weather`; nút 🎤 → `FARMER_BEAT` (chỉ bật khi `pendingFarmerBeat(demo)?.beat.kind === "say"`, chèn đúng câu đó); gõ chữ/bấm chip → `{ type: "SESSION", action }` (dùng `chipToAction`). Tự chạy: `setTimeout(dispatch AUTO_BEAT, beat.holdMs)` lặp tới `isFinished`.

### 2026-10-13 — T5: Reducer phiên + state machine
**File:** `src/domain/session.ts`, `tests/session.test.ts` (16 test), `tests/scenario.e2e.test.ts` (7 test); sửa nhỏ `parser.ts`, `types.ts`, `templates.ts`, `fallbackAdvisor.ts`; +2 test parser.
- `createSessionReducer(advisor)` → reducer thuần dùng được với `useReducer`. `createInitialSession()`, `chipToAction(chip)`.
- `SessionState`: `phase`, `now`, `weather`, `offers`, `draft` (thẻ chờ xác nhận, có `updateOf` khi là cập nhật), `agreement`, `weigh` (cộng dồn), `lastBuyer`, `recommendation`, `chips`, `chat`, `brain`, `seq`.
- Action: `TICK`, `CLOCK_ADVANCED`, `WEATHER_CHANGED`, `FARMER_MESSAGE`, `FARMER_SET_FIELD`, `FARMER_CONFIRMED_OFFER`, `FARMER_EDIT_OFFER`, `FARMER_CONFIRMED_DEAL`, `FARMER_DECLINED_DEAL`, `RESET`.
- Mọi lượt: advisor → `guardReply` → tin vào `chat` + 1 dòng `brain` (input, parse, trigger, trace, violations).
- **E2E chạy trọn 6 sự kiện chỉ bằng reducer**: 23,7tr → 25,0tr (cọc 7,5tr) → 25,2tr → mưa → chốt Tư → thiệt 1,4tr → nhận 25,2tr, được thêm 1,5tr, `HOAN_TAT`, Guard không chặn lần nào.

**Quyết định:**
- `ParseContext.pendingDraft`: đang có thẻ chờ thì câu ngắn ("tiền mặt", "trừ 5%, lấy tại vườn") được gộp vào thẻ; nói tên người khác → mở thẻ mới.
- Thêm trigger `offer_discarded` (bác bấm Sửa).
- Chốt chỉ hợp lệ khi phase `DANG_HOI_GIA` và chào giá còn hợp lệ (`isEligible`); `Agreement` và `payment` bên trong được `Object.freeze`.
- `maxRejectKg = round(totalKg × rejectRate)`.
- Sau khi đã chốt, đổi thời tiết chỉ cập nhật state, không khuyên thêm.
- Báo cân thiếu `rejectKg` (chưa từng báo) → trả "không hiểu", hỏi lại.
- `HOAN_TAT` khi không trừ loại quá mức **và** tiền nhận khớp.

**Ghi chú cho T6 (runner):** e2e test đã có sẵn chuỗi action của 6 sự kiện — `script.ts` nên mô tả đúng chuỗi đó dạng dữ liệu (giờ, thời tiết, câu nói, chip tự bấm theo nhãn). Ở SK5 cần `CLOCK_ADVANCED` 06:05 trước khi bấm chốt để thỏa thuận lưu đúng giờ.

### 2026-10-13 — T4: Luật R1–R7 + mẫu câu + Guard
**File:** `src/advisor/types.ts` (mở rộng), `src/advisor/fallback/rules.ts`, `src/advisor/fallback/templates.ts`, `src/advisor/fallbackAdvisor.ts`, `src/domain/guard.ts`, `tests/rules.test.ts` (26 test)
- Tách 3 lớp: **rules.ts** = sự thật do code tính (R1–R7, xếp hạng, `allowedAmounts`) · **templates.ts** = lời tiếng Việt · **fallbackAdvisor.ts** = nối hai thứ theo `Trigger`. OpenAI advisor sau này dùng lại rules.ts, chỉ thay phần viết lời.
- `Trigger`: `tick`, `offer_draft`, `offer_confirmed` (+`previousOfferId` khi cập nhật), `weather_changed`, `deal_confirmed`, `deal_declined`, `weigh`, `unknown`.
- `AdvisorReply` = `messages` (text + card) · `chips` (nút cho nông dân) · `recommendation` · `effects` · `trace` (cho BrainLog).
- Guard tự tính lại tập số tiền hợp lệ từ context (không tin advisor), chặn: số tiền lạ trong lời nói, khuyến nghị/bảng so sánh dùng chào giá hết hạn/thay thế/thiếu thông tin, tiền ròng trong bảng sai, effect `confirm_deal`. Vi phạm → thay bằng tin an toàn + ghi trace.
- Đã in thử lời thoại cả 6 sự kiện: khớp 01-kich-ban.md.

**Quyết định:**
- Chốt tên: `ParseContext` cho parse, `AdvisorContext` cho respond (đóng K4).
- Hòa nhau (chênh < 500.000đ) → ưu tiên tiền mặt (2 điểm) rồi mối quen (1 điểm).
- Hỏi trường thiếu **lần lượt từng trường**; chip có sẵn cho trừ loại / nơi giao / trả tiền; tên và giá thì nông dân gõ.
- Nút chốt (`confirm_deal`) chỉ là **chip cho nông dân bấm**; advisor không bao giờ phát effect chốt.
- Câu so sánh "giá/kg thấp hơn nhưng tiền về cao hơn" tự bật khi xảy ra — đây là insight chính của sản phẩm.

**Ghi chú cho T5 (reducer):**
- Chip `set_field` → gộp patch vào draft đang chờ → gọi lại `offer_draft` với `missing` mới.
- Nông dân gõ tự do khi đang có draft (vd trả lời tên/giá) → gộp các trường parse được vào draft.
- `confirm_offer` → tạo `Offer` (id duy nhất, `isRegular`, `receivedAt = now`); nếu cùng người mua đã có offer → offer cũ `superseded`, truyền `previousOfferId`.
- `confirm_deal` (chỉ từ chip nông dân bấm) → tạo `Agreement` với `maxRejectKg = totalKg × rejectRate`, `savedAt = now` → `stage = "weighing"`.
- Báo cân thiếu `totalKg` → lấy `agreement.totalKg`; thiếu `rejectKg` → giữ số lần báo trước.
- Mọi reply đi qua `guardReply` trước khi vào danh sách tin.

### 2026-10-13 — T3: Fallback parser tiếng Việt
**File:** `src/advisor/types.ts`, `src/advisor/fallback/vocab.ts`, `src/advisor/fallback/parser.ts`, `tests/parser.test.ts` (22 test)
- `parseMessage(text, ctx)` → `offer` (kèm `missing`) / `offer_update` / `weigh` / `unknown`.
- Chuẩn hóa bỏ dấu trước khi so mẫu → gõ không dấu vẫn hiểu.
- Tách số kèm đơn vị: nghìn/ngàn/k, rưỡi, triệu (+ phần lẻ "25 triệu 2"), %, kg/ký/tạ/tấn, ngày/tuần/tháng.
- Tên người mua = danh xưng + chữ viết hoa; tên đã biết đứng một mình cũng nhận.
- Người mua đã có chào giá → `offer_update`; "nó" → `ctx.lastBuyer`.

**Quyết định:**
- `ParseContext.stage === "weighing"` mới đọc số liệu cân (tránh "cần" ≈ "cân" khi bỏ dấu).
- `weigh.report` là `Partial<WeighReport>` — thiếu `totalKg` thì T5 lấy từ `Agreement`. Đã ghi vào 03-kien-truc.md §7.
- "trả sau" không rõ số ngày → để thiếu, không mặc định 7 ngày.

### 2026-10-13 — T2: Tính tiền ròng + kiểm tra cân
**File:** `src/domain/netCalculator.ts`, `src/domain/weighCheck.ts`, `tests/netCalculator.test.ts` (12 test)
- `calculateNet` trả `billableKg, gross, transportCost, net, lines[]` (dòng phép tính tiếng Việt cho thẻ NetBreakdown).
- `checkWeigh(agreement, report)` → `allowedRejectKg, excessKg, loss, expectedCash, cashMatches`.
- Cả 7 dòng bảng số liệu 01-kich-ban.md §4 có test riêng.

**Quyết định (ngoài plan):** thêm `suggestedDeposit` (làm tròn xuống 100.000đ) và `calculateGain` để mọi con số hiển thị đều do code tính → Guard ở T4 kiểm được.

### 2026-10-13 — T1: Kiểu dữ liệu + dữ liệu kịch bản
**File:** `src/domain/types.ts`, `src/domain/time.ts`, `src/lib/format.ts`, `src/scenario/data.ts`, `tests/format.test.ts` (13 test)
- Kiểu theo 03-kien-truc.md §4; `Offer.payment: Payment | null` (null = phải hỏi); `Agreement` toàn `readonly`.
- `format.ts`: `formatVnd`, `formatMillion`, `formatKg`, `formatPercent`, `dayLabel`, `formatSimTime`.
- `data.ts`: `FARMER_PROFILE`, `SCENARIO_START` (Thứ Ba 07:00), `INITIAL_WEATHER`, `RAIN_WEATHER`, `DEPOSIT_RATE = 0.3`.

**Quyết định (ngoài plan):** thêm `domain/time.ts` (`compareSimTime`, `daysBetween`) cho luật R1/R5/R6; thêm `Agreement.totalKg`.

### 2026-10-13 — T0: Khởi tạo project
- Next.js **16.4** (App Router, `src/`) + React 19 + TypeScript + Tailwind 4 + ESLint 9; Vitest 3.2.
- Script: `dev`, `build`, `start`, `lint`, `test` (`vitest run`), `test:watch`.
- Font Be Vietnam Pro (`latin` + `vietnamese`), `lang="vi"`, bỏ dark mode và asset mặc định.
- Next 16 tự sinh `AGENTS.md` yêu cầu đọc `node_modules/next/dist/docs/` trước khi dùng API Next.

### 2026-10-13 — Chốt kịch bản & plan
- Tạo `claude/01–04` + `CLAUDE.md`. Kịch bản chuyển sang "bác Ba kể lại cho FarmGate qua chat kiểu Zalo" (khác tài liệu gốc — xem KNOWN_ISSUES).
