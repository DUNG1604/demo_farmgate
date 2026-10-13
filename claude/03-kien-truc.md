# 03 — Kiến trúc kỹ thuật (v1, chưa có API key)

## 1. Nguyên tắc
1. **Code tính tiền, AI/luật chỉ hiểu chữ và viết lời.** Không con số nào trong câu trả lời được tạo ra ngoài `netCalculator`.
2. **Lõi nghiệp vụ (`src/domain`) là TypeScript thuần**, không import React — test được bằng Vitest, dùng lại được khi chuyển sang server/OpenAI.
3. **Advisor có một interface, hai bản cài đặt**: `FallbackAdvisor` (v1) và `OpenAIAdvisor` (sau này). UI không biết đang dùng bản nào.
4. **Nông dân luôn là người chốt.** Không có action nào chuyển sang trạng thái "đã chốt" ngoài hành động bấm nút của nông dân.
5. v1 chạy **hoàn toàn trên trình duyệt**, không backend, không database. Khi thêm OpenAI mới thêm API route để giấu key.

## 2. Stack
| Phần | Chọn |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Style | Tailwind CSS |
| State | React `useReducer` (không thêm thư viện state) |
| Test | Vitest |
| Font | Be Vietnam Pro qua `next/font/google` |
| Package manager | npm |

## 3. Cấu trúc thư mục
```
demo-farm-gate/
├── CLAUDE.md
├── claude/                       # tài liệu plan (thư mục này)
├── src/
│   ├── domain/                   # lõi nghiệp vụ — KHÔNG import React
│   │   ├── types.ts
│   │   ├── netCalculator.ts
│   │   ├── weighCheck.ts
│   │   ├── guard.ts
│   │   └── session.ts            # reducer + state machine
│   ├── advisor/
│   │   ├── types.ts              # interface Advisor
│   │   ├── fallback/
│   │   │   ├── parser.ts         # câu tiếng Việt → OfferDraft / WeighReport / Command
│   │   │   ├── vocab.ts          # từ điển: "rưỡi", "tạ", "ký", "xô", "thằng/ông/chú"...
│   │   │   ├── rules.ts          # luật khuyến nghị R1..R7
│   │   │   └── templates.ts      # mẫu câu trả lời tiếng Việt
│   │   └── fallbackAdvisor.ts
│   ├── scenario/
│   │   ├── data.ts               # hồ sơ bác Ba, thời tiết, giá tham chiếu
│   │   ├── script.ts             # 6 sự kiện + hành động tự bấm khi auto-play
│   │   └── runner.ts             # đồng hồ giả lập, bước tiếp, tự chạy
│   ├── lib/format.ts             # định dạng tiền, giờ tiếng Việt
│   └── app/
│       ├── page.tsx
│       └── components/
│           ├── phone/            # PhoneFrame, StatusBar, ChatList, Bubble, VoiceBubble, InputBar, QuickReplies
│           ├── cards/            # OfferConfirmCard, NetBreakdownCard, ComparisonCard, AlertCard,
│           │                     # SuggestedScriptCard, AgreementCard, SummaryCard
│           └── control/          # Timeline, OffersTable, BrainLog, ModeToggle
└── tests/
    ├── netCalculator.test.ts
    ├── parser.test.ts
    ├── rules.test.ts
    ├── session.test.ts
    └── scenario.e2e.test.ts      # chạy cả 6 sự kiện bằng reducer, so với bảng số ở 01-kich-ban.md
```

## 4. Mô hình dữ liệu (`src/domain/types.ts`)
```ts
type Money = number; // VND, số nguyên

interface FarmerProfile {
  name: string;                 // "Ba"
  crop: string;                 // "Thanh long ruột đỏ"
  totalKg: number;              // 2000
  harvestDay: SimDay;           // "thu6"
  regularBuyers: string[];      // ["Tư"]
  depotTransportCost: Money;    // 1_500_000
  refPrice: { min: Money; max: Money }; // 13000–14500
}

type Delivery = "farm" | "depot";
type Payment =
  | { kind: "cash_on_weigh" }
  | { kind: "deferred"; days: number };

interface Offer {
  id: string;
  buyer: string;                // "Tư"
  buyerOrigin?: string;         // "Cái Bè"
  isRegular: boolean;           // tra từ profile.regularBuyers
  pricePerKg: Money;
  rejectRate: number;           // 0.10; mua xô = 0
  delivery: Delivery;
  payment: Payment | null;      // null = chưa rõ → phải hỏi
  receivedAt: SimTime;
  expiresAt?: SimTime;
  status: "draft" | "confirmed" | "superseded" | "expired";
}

interface NetResult {
  billableKg: number;
  gross: Money;
  transportCost: Money;
  net: Money;
  lines: string[];              // các dòng phép tính để hiển thị
}

interface Agreement {           // bất biến sau khi tạo
  offerId: string;
  buyer: string;
  pricePerKg: Money;
  maxRejectKg: number;          // 200
  delivery: Delivery;
  payment: Payment;
  savedAt: SimTime;
}

interface WeighReport { totalKg: number; rejectKg: number; cashReceived?: Money; }

interface Weather { now: "sunny" | "rain"; rainForecast?: { from: SimTime; to: SimTime } }
```

## 5. Công thức (`netCalculator.ts`)
```
billableKg    = totalKg × (1 − rejectRate)
gross         = billableKg × pricePerKg
transportCost = delivery === "depot" ? profile.depotTransportCost : 0
net           = gross − transportCost
```
Làm tròn: tất cả là số nguyên VND. Hàng loại không được tính tiền.

`weighCheck.ts`:
```
allowedRejectKg = totalKg × agreedRejectRate          // 200
excessKg        = max(0, reportedRejectKg − allowedRejectKg)
loss            = excessKg × pricePerKg               // 1.400.000
expectedCash    = (totalKg − reportedRejectKg) × pricePerKg
cashMatches     = cashReceived === expectedCash
```

## 6. Trạng thái phiên (`session.ts`)
```
CHUAN_BI ──(có chào giá đầu tiên)──▶ DANG_HOI_GIA ──(nông dân bấm "đã chốt")──▶ DA_CHOT
                                          ▲  │                                       │
                                          └──┘ chào giá mới / thời tiết đổi           ▼
                                             → đánh giá lại                     DANG_CAN ──(tiền khớp)──▶ HOAN_TAT
```
- Chỉ action `FARMER_CONFIRMED_DEAL` (sinh ra từ nút bấm của nông dân) được chuyển sang `DA_CHOT`. Advisor không phát ra action này.
- Khi `DA_CHOT`: tạo `Agreement` bất biến.

Action chính của reducer:
`FARMER_MESSAGE` · `FARMER_TAP_CHIP` · `FARMER_CONFIRMED_OFFER` · `FARMER_CONFIRMED_DEAL` · `CLOCK_ADVANCED` · `WEATHER_CHANGED` · `ADVISOR_REPLIED` · `RESET`

## 7. Advisor
```ts
interface Advisor {
  // hiểu tin của nông dân
  parse(text: string, ctx: AdvisorContext): ParseResult;
  // sinh tin trả lời từ trạng thái + kết quả code đã tính
  respond(trigger: Trigger, ctx: AdvisorContext): BotMessage[];
}
type ParseResult =
  | { kind: "offer"; draft: Partial<Offer>; missing: (keyof Offer)[] }
  | { kind: "offer_update"; buyer: string; patch: Partial<Offer> }
  | { kind: "weigh"; report: Partial<WeighReport> } // thiếu totalKg → lấy từ Agreement
  | { kind: "unknown" };
```

### Fallback parser — các mẫu cần hiểu
| Ý | Cách nói | Kết quả |
|---|---|---|
| Giá | "14 nghìn", "14k", "14.000", "12 rưỡi", "13 rưỡi" | 14000, 12500, 13500 |
| % loại | "trừ loại 10 phần trăm", "trừ 10%", "loại 10 phần" | 0.10 |
| Mua xô | "mua xô", "giá xô", "bao hết" | rejectRate = 0 |
| Giao | "chở ra kho", "ra kho X" → depot · "tại vườn", "lấy tận vườn" → farm | |
| Trả tiền | "tiền mặt", "trả liền" → cash · "tuần sau trả" → 7 ngày · "N ngày sau trả" → N | |
| Người mua | "thằng/ông/chú/anh/bà/cô + Tên" ; "ở X" → buyerOrigin | |
| Cập nhật | "gọi lại … chịu …", "giữ giá" + tên đã có | offer_update |
| Cân | "cân N tấn", "chê loại (hết) N ký/kg" | weigh |
| Nhận tiền | "đưa 25 triệu 2", "25,2 triệu" | 25.200.000 |
| Khối lượng | "2 tấn" = 2000, "3 tạ" = 300, "300 ký" = 300 | |

Không khớp mẫu nào → `unknown` → FarmGate trả lời *"Con chưa hiểu rõ, bác nói lại giá, trừ loại và giao ở đâu giúp con nhé"* + chip gợi ý.

### Luật khuyến nghị (`rules.ts`)
| Mã | Điều kiện | Hành động |
|---|---|---|
| R1 | Còn ≥ 3 ngày tới thu hoạch, chưa có chào giá | Nhắc bắt đầu hỏi giá + giá tham chiếu |
| R2 | Chào giá giao `depot` và nếu đổi sang `farm` thì net tăng | Gợi ý câu "lấy tận vườn thì tôi để giá X" |
| R3 | Người mua mới **và** trả sau | Cảnh báo, đề xuất cọc 30% net (làm tròn 100.000đ) |
| R4 | Chọn tốt nhất = net cao nhất trong các offer `confirmed`, chưa hết hạn. Chênh < 500.000đ thì ưu tiên: tiền mặt > mối quen | Gắn ⭐ |
| R5 | Mưa trong dự báo trùng hoặc ngay sau ngày thu hoạch | Đổi khuyến nghị → "chốt trong hôm nay" + câu gợi ý |
| R6 | Không có mưa, còn ≥ 2 ngày | "Chưa cần chốt vội" |
| R7 | Lúc cân: `excessKg > 0` | Cảnh báo + số tiền thiệt + hiện AgreementCard |

### Guard (`guard.ts`) — chạy trên mọi tin bot trước khi hiển thị
1. Mọi số tiền trong tin phải thuộc tập số do `netCalculator`/`weighCheck` trả về ở lượt này.
2. Không dùng offer `expired`/`superseded` trong khuyến nghị.
3. Bot không được phát action chốt.
4. Không gợi ý dựa trên offer còn trường `null` (phải hỏi trước).
Vi phạm → thay bằng tin an toàn + ghi lỗi vào BrainLog (đỏ).

## 8. Kịch bản và runner
`script.ts` mô tả 6 sự kiện dạng dữ liệu; mỗi sự kiện là chuỗi **nhịp** (beat) theo thứ tự:
```ts
type Beat =
  | { kind: "clock"; to: SimTime }          // nhịp thế giới
  | { kind: "weather"; weather: Weather }   // nhịp thế giới
  | { kind: "tick" }                        // nhịp thế giới — FarmGate tự lên tiếng
  | { kind: "say"; text: string; voice: boolean } // nhịp bác Ba
  | { kind: "tap"; label: string };         // nhịp bác Ba — bấm chip có nhãn bắt đầu bằng label
type TimedBeat = Beat & { holdMs: number }; // dừng bao lâu sau nhịp khi auto-play

interface ScenarioStep { id: number; at: SimTime; title: string; hint?: string; beats: TimedBeat[] }
```
`runner.ts` — `createDemoReducer(advisor)` bọc reducer phiên, giữ `cursor` (nhịp kế tiếp):
- `NEXT_STEP`: chạy các nhịp thế giới của sự kiện hiện tại, dừng ở lượt bác Ba (đang chờ bác Ba thì không làm gì).
- `FARMER_BEAT` (nút 🎤): gửi câu nói đang chờ, rồi chạy tiếp nhịp thế giới.
- `SESSION`: bác Ba tự gõ/bấm chip; khớp nhịp đang chờ thì con trỏ đi tiếp, không khớp thì phiên vẫn chạy, con trỏ đứng yên.
- `AUTO_BEAT`: chạy đúng 1 nhịp bất kỳ — UI hẹn giờ theo `holdMs`. Tổng ≈ 95 giây.
- `RESET`. Truy vấn cho UI: `pendingFarmerBeat`, `stepStatus`, `isFinished`, `totalHoldMs`.

## 9. Đường nâng cấp lên OpenAI (ngoài v1)
- Thêm `src/app/api/advisor/route.ts` (server) đọc `OPENAI_API_KEY` từ `.env.local`.
- `OpenAIAdvisor.parse` dùng structured output trả đúng schema `ParseResult`; `respond` nhận các số đã tính sẵn và chỉ viết lời.
- Guard giữ nguyên. Lỗi API/timeout → tự rơi về `FallbackAdvisor`.
- Chuyển giọng nói thật: thêm sau, vẫn giữ nút giả lập cho demo.
