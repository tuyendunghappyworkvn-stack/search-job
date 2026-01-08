import { NextResponse } from "next/server";

export const runtime = "nodejs";

/* ===== ENV ===== */
const APP_ID = process.env.LARK_APP_ID!;
const APP_SECRET = process.env.LARK_APP_SECRET!;
const BASE_ID = process.env.LARK_BASE_ID!;
const TABLE_ID = process.env.LARK_TABLE_ID!;

/* ===== UTILS ===== */
function normalize(str: any): string {
  if (!str) return "";
  return String(str).toLowerCase().trim();
}

/* ===== TOKEN ===== */
async function getTenantToken(): Promise<string> {
  const res = await fetch(
    "https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: APP_ID,
        app_secret: APP_SECRET,
      }),
    }
  );

  const data = await res.json();
  return data.tenant_access_token;
}

/* ===== GET ALL RECORDS ===== */
async function getAllRecords(token: string) {
  let all: any[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(
      `https://open.larksuite.com/open-apis/bitable/v1/apps/${BASE_ID}/tables/${TABLE_ID}/records`
    );
    url.searchParams.set("page_size", "100");
    if (pageToken) url.searchParams.set("page_token", pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    all = all.concat(data?.data?.items || []);
    pageToken = data?.data?.page_token;
  } while (pageToken);

  return all;
}

/* =========================
   POST: SEARCH BY CV
========================= */
export async function POST(req: Request) {
  try {
    const { cvText } = await req.json();
    if (!cvText) {
      return NextResponse.json({ total: 0, companies: [] });
    }

    const { jobKeywords, city, district } = extractFromCV(cvText);

    const token = await getTenantToken();
    const records = await getAllRecords(token);

    const results = records.filter((r) => {
      const f = r.fields || {};

      const job = normalize(f["Công việc"]);
      const jobCity = normalize(f["Thành phố"]);
      const jobDistrict = normalize(f["Quận"]);

      /* ===== 1. BẮT BUỘC: JOB ===== */
      const matchJob = jobKeywords.some((k) => job.includes(k));
      if (!matchJob) return false;

      /* ===== 2. CITY (CÓ THÌ MỚI SO) ===== */
      if (city && jobCity !== city) return false;

      /* ===== 3. DISTRICT (CÓ THÌ MỚI SO) ===== */
      if (district && !jobDistrict.includes(district)) return false;

      return true;
    });

    return NextResponse.json({
      total: results.length,
      companies: results.map((r) => {
        const f = r.fields || {};
        return {
          company: f["Công ty"] || "",
          job: f["Công việc"] || "",
          address: f["Địa chỉ"] || "",
          working_time: f["Thời gian làm việc"] || "",
          salary_min: f["Lương tối thiểu"] || 0,
          salary_max: f["Lương tối đa"] || 0,
          jd_link: f["Link JD"] || "",
        };
      }),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Search by CV failed" },
      { status: 500 }
    );
  }
}

/* ===== IMPORT ===== */
const JOB_KEYWORDS = [
  "idea",
  "design",
  "designer",
  "seller etsy",
  "seller amazon",
  "seller shopify",
  "seller tiktok",
  "seller ebay",
  "seller facebook",
  "seller website",
  "seller",
  "marketing",
  "digital marketing",
  "customer support",
  "fulfillment",
  "facebook ads",
  "video editor",
  "video",
  "lead",
  "leader",
];

function extractFromCV(cvText: string) {
  const text = normalize(cvText);

  const jobKeywords = JOB_KEYWORDS.filter((k) =>
    text.includes(k)
  );

  let city = "";
  if (text.includes("hà nội")) city = "hà nội";
  else if (text.includes("hồ chí minh") || text.includes("tp.hcm")) city = "hồ chí minh";

  let district = "";
  const DISTRICTS = [
    "nam từ liêm",
    "bắc từ liêm",
    "thanh xuân",
    "cầu giấy",
    "đống đa",
    "quận 1",
    "quận 3",
    "quận 7",
  ];

  for (const d of DISTRICTS) {
    if (text.includes(d)) {
      district = d;
      break;
    }
  }

  return { jobKeywords, city, district };
}
