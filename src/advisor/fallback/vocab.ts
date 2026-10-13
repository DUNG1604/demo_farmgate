// Từ điển "tiếng nông dân" cho fallback parser.
// Mọi mẫu viết trên chữ đã chuẩn hóa: chữ thường, bỏ dấu, đ → d (xem normalize).

/** "Trả 14 Nghìn Rưỡi" → "tra 14 nghin ruoi". Cho phép nông dân gõ không dấu. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d");
}

/** Danh xưng đứng trước tên người mua (giữ dấu, chữ thường). */
export const BUYER_TITLES = [
  "thằng", "ông", "chú", "anh", "bà", "cô", "chị", "dì", "thím", "cậu", "mợ", "em",
];

// ---------- Đơn vị đứng sau con số ----------
export const UNIT_PERCENT = /^\s*(%|phan tram\b|phan\b)/;
export const UNIT_THOUSAND = /^\s*(nghin|ngan|k)\b/;
export const UNIT_MILLION = /^\s*(trieu|tr)\b/;
export const UNIT_HALF = /^\s*ruoi\b/;
export const UNIT_KG = /^\s*(kg|ky|kilo|ki lo|ki)\b/;
export const UNIT_TA = /^\s*ta\b/;
export const UNIT_TAN = /^\s*tan\b/;
export const UNIT_DAY = /^\s*ngay\b/;
export const UNIT_WEEK = /^\s*tuan\b/;
export const UNIT_MONTH = /^\s*thang\b/;
/** Phần lẻ sau "nghìn"/"triệu": "14 nghìn 2", "25 triệu 2", "25 triệu 250" */
export const UNIT_SUFFIX_DIGITS = /^\s*(\d{1,3})(?![\d.,])/;

// ---------- Ngữ cảnh đứng trước con số ----------
/** Số trần nhỏ (vd "giữ giá 14") được hiểu là nghìn đồng khi đứng sau các từ này. */
export const PRICE_CUE_BEFORE = /(tra|gia|mua|de|ban|len|xuong|con|chot|muc)\s+$/;
/** Từ gần con số nhất trong cùng mệnh đề quyết định: "cân 2 tấn" = tổng, "chê loại 300 ký" = hàng loại. */
export const WEIGH_TOTAL_CUE = /\bcan\b/g;
export const WEIGH_REJECT_CUE = /\b(loai|tru|che|bo|hu)\b/g;

// ---------- Cụm từ ----------
export const NO_REJECT = /(mua xo|gia xo|lay xo|bao het|bao vuon|bao luon|khong tru|khong loai)/;

export const DELIVERY_DEPOT = /(cho ra kho|ra kho|giao (tai |o )?kho|cho toi kho|cho ra)/g;
export const DELIVERY_FARM = /(tai vuon|tan vuon|lay tai cho|toi vuon|vao vuon|tai ruong|tan ruong)/g;

export const PAY_CASH = /(tien mat|tra lien|tra ngay|tra luon|lien tay|tien tuoi|tra khi can)/;
export const PAY_WEEK = /(tuan sau (moi )?tra|tra sau (1|mot) tuan|(1|mot) tuan sau)/;
export const PAY_MONTH = /(thang sau (moi )?tra|tra sau (1|mot) thang)/;
export const PAY_DAYS = /(?:(\d+) ngay (?:sau )?(?:moi )?tra|tra sau (\d+) ngay|(\d+) ngay sau)/;

export const UPDATE_CUE = /(goi lai|chiu|giu gia|doi y|nang len|ha xuong|bot xuong|them)/;
export const OFFER_CUE = /(tra|mua|gia|hoi|chao)/;
export const PRONOUN = /(^|\s)(no|ong ay|ong do|thang do|chu ay)(\s|$)/;
