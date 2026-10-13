// Dữ liệu cố định của kịch bản — xem claude/01-kich-ban.md §2.
import type { FarmerProfile, SimTime, Weather } from "@/domain/types";

export const FARMER_PROFILE: FarmerProfile = {
  name: "Ba",
  location: "Chợ Gạo, Tiền Giang",
  crop: "Thanh long ruột đỏ",
  totalKg: 2_000,
  harvestDay: "thu6",
  regularBuyers: ["Tư"],
  depotName: "Tân Hương",
  depotTransportCost: 1_500_000,
  refPrice: { min: 13_000, max: 14_500 },
};

export const SCENARIO_START: SimTime = { day: "thu3", time: "07:00" };

export const INITIAL_WEATHER: Weather = { now: "sunny" };

/** Dự báo mưa xuất hiện ở sự kiện 5: tối Thứ Sáu → Chủ nhật. */
export const RAIN_WEATHER: Weather = {
  now: "sunny",
  rainForecast: {
    from: { day: "thu6", time: "18:00" },
    to: { day: "cn", time: "23:59" },
  },
};

/** Tỷ lệ cọc đề xuất khi người mua mới và trả chậm (luật R3). */
export const DEPOSIT_RATE = 0.3;
