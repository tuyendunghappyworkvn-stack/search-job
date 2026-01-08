import { NextResponse } from "next/server";

export const runtime = "nodejs";

/* =========================
   UTILS
========================= */
function normalize(str: string) {
  return str.toLowerCase();
}

/* =========================
   JOB KEYWORDS
========================= */
const JOB_KEYWORDS = [
  "idea",
  "design",
  "designer",
  "seller",
  "etsy",
  "amazon",
  "shopify",
  "tiktok",
  "ebay",
  "facebook",
  "website",
  "marketing",
  "digital marketing",
  "customer support",
  "support",
  "fulfillment",
  "facebook ads",
  "video editor",
  "video",
];

const LEADER_KEYWORDS = ["leader", "lead", "team lead"];

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
  "quận",
  "huyện",
  "nam từ liêm",
  "bắc từ liêm",
  "thanh xuân",
  "cầu giấy",
  "hoàn kiếm",
];

/* =========================
   POST: PARSE CV TEXT
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
    const jobMatches: string[] = [];

    JOB_KEYWORDS.forEach((k) => {
      if (content.includes(k)) {
        jobMatches.push(k);
      }
    });

    const hasLeader = LEADER_KEYWORDS.some((k) =>
      content.includes(k)
    );

    const finalJobs = jobMatches.map((j) =>
      hasLeader ? `${j} leader` : j
    );

    /* =========================
       2. LOCATION
    ========================= */
    let city = "";
    let district = "";

    CITIES.forEach((c) => {
      if (content.includes(c)) city = c;
    });

    DISTRICTS.forEach((d) => {
      if (content.includes(d)) district = d;
    });

    return NextResponse.json({
      jobKeywords: [...new Set(finalJobs)],
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
