import { NextResponse } from "next/server";

export const runtime = "nodejs";

/* =========================
   UTILS
========================= */
function normalize(str: string) {
  return str.toLowerCase();
}

/* =========================
   JOB KEYWORD MAP (GIỐNG FE)
========================= */
const JOB_KEYWORD_MAP: Record<string, string[]> = {
  idea: ["idea"],

  design: ["design", "designer"],

  customer_support: ["customer support", "supporter"],

  etsy: ["etsy"],
  amazon: ["amazon"],
  ebay: ["ebay"],
  tiktok: ["tiktok", "tiktok shop"],
  shopify: ["shopify", "website"],

  facebook: [
    "facebook",
    "ads",
    "marketing",
    "digital marketing",
    "performance",
  ],

  video: ["video", "video editor"],

  seller: ["seller", "seller pod", "pod"],

  fulfillment: ["fulfill", "fulfillment"],
};

/* =========================
   PLATFORM KEYS
========================= */
const PLATFORM_KEYS = ["etsy", "amazon", "ebay", "tiktok", "shopify"];

/* =========================
   LOCATION KEYWORDS
========================= */
const CITIES = [
  "hà nội",
  "hồ chí minh",
  "tp.hcm",
  "tp hcm",
  "đà nẵng",
  "cần thơ",
];

const DISTRICTS = [
  "nam từ liêm",
  "bắc từ liêm",
  "thanh xuân",
  "cầu giấy",
  "hoàn kiếm",
  "hoàng mai",
  "đống đa",
];

/* =========================
   POST: PARSE CV
========================= */
export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: "Missing CV text" },
        { status: 400 }
      );
    }

    const content = normalize(text);

    /* =========================
       1. JOB KEYWORDS
    ========================= */
    const detected = new Set<string>();

    for (const [group, keywords] of Object.entries(
      JOB_KEYWORD_MAP
    )) {
      if (keywords.some((k) => content.includes(k))) {
        detected.add(group);
      }
    }

    const hasPlatform = PLATFORM_KEYS.some((p) =>
      detected.has(p)
    );

    // ❌ BỎ seller nếu đã có platform
    if (hasPlatform) {
      detected.delete("seller");
    }

    const jobKeywords = Array.from(detected);

    /* =========================
       2. LOCATION
    ========================= */
    let city = "";
    let district = "";

    for (const c of CITIES) {
      if (content.includes(c)) {
        city = c;
        break;
      }
    }

    for (const d of DISTRICTS) {
      if (content.includes(d)) {
        district = d;
        break;
      }
    }

    return NextResponse.json({
      jobKeywords,
      city,
      district,
    });
  } catch (err: any) {
    console.error("PARSE CV ERROR:", err);
    return NextResponse.json(
      { error: "Cannot parse CV" },
      { status: 500 }
    );
  }
}
