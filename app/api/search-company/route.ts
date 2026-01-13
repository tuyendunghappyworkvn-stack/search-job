import { NextResponse } from "next/server";

export const runtime = "nodejs";

/* =========================
   ENV
========================= */
const APP_ID = process.env.LARK_APP_ID!;
const APP_SECRET = process.env.LARK_APP_SECRET!;
const BASE_ID = process.env.LARK_BASE_ID!;
const TABLE_ID = process.env.LARK_TABLE_ID!;

/* =========================
   UTILS
========================= */
function normalize(str: any): string {
  if (!str) return "";
  return String(str).toLowerCase().trim();
}

function normalizeDistrict(str: any): string {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .replace("quận", "")
    .replace("huyện", "")
    .replace("thị xã", "")
    .trim();
}

/* =========================
   KEYWORDS CONFIG
========================= */
const LEADER_KEYWORDS = ["lead", "leader", "trưởng nhóm", "team lead"];

const PLATFORMS = [
  "etsy",
  "amazon",
  "ebay",
  "tiktok",
  "shopify",
  "facebook",
];

const SPECIAL_GROUPS = {
  video: ["video", "media"],
  design: ["design", "designer"],
  support: ["support", "customer support", "supporter"],
  fulfill: ["fulfill", "fulfillment"],
  marketing: ["facebook", "marketing", "performance", "digital"],
};

/* =========================
   HELPERS
========================= */
function hasAny(text: string, keywords: string[]) {
  return keywords.some((k) => text.includes(k));
}

function extractPlatform(keyword: string) {
  return PLATFORMS.find((p) => keyword.includes(p)) || null;
}

function matchLocation(
  cityCV: string,
  districtCV: string,
  jobCity: string,
  jobDistrict: string,
  jobAddress: string
) {
  const isRemote =
    jobAddress.includes("remote") || jobAddress.includes("freelancer");

  if (isRemote) {
    if (cityCV) return jobCity.includes(cityCV);
    return true;
  }

  if (cityCV && districtCV) {
    return jobCity.includes(cityCV) && jobDistrict.includes(districtCV);
  }

  if (districtCV) return jobDistrict.includes(districtCV);
  if (cityCV) return jobCity.includes(cityCV);

  return true;
}
/* =========================
   RULE SEARCH
========================= */
function matchJob(
  r: any,
  jobKeyword: string,
  companyKeyword: string,
  cityN: string,
  districtN: string
) {
  const f = r.fields || {};

  const cCompany = normalize(f["Công ty"]);
  const cJob = normalize(f["Công việc"]);
  const cCity = normalize(f["Thành phố"]);
  const cDistrict = normalizeDistrict(f["Quận"]);
  const cAddress = normalize(f["Địa chỉ"]);

  const isSeller = jobKeyword.includes("seller");
  const isLeader = hasAny(jobKeyword, LEADER_KEYWORDS);
  const platform = extractPlatform(jobKeyword);

  /* ===== COMPANY (chỉ lọc khi có companyKeyword thật) ===== */
  if (companyKeyword && companyKeyword.length > 0) {
    if (cCompany !== companyKeyword) return false;
  }

  /* ===== LOCATION ===== */
  // 👉 chỉ lọc location khi CV có city hoặc district
  if (cityN || districtN) {
    if (
      !matchLocation(
        cityN,
        districtN,
        cCity,
        cDistrict,
        cAddress
      )
    ) {
      return false;
    }
  }

  /* ===== LEADER ===== */
  if (isLeader && !hasAny(cJob, LEADER_KEYWORDS)) return false;

  /* ===== SELLER + PLATFORM ===== */
  if (isSeller && platform) {
    return cJob.includes(platform);
  }

  /* ===== SELLER POD ===== */
  if (jobKeyword.includes("seller pod")) {
    return cJob.includes("seller");
  }

  /* ===== SELLER ONLY ===== */
  if (isSeller) {
    return cJob.includes("seller");
  }

  /* ===== LEAD POD ===== */
  if (jobKeyword.includes("lead pod")) {
    return (
      hasAny(cJob, LEADER_KEYWORDS) &&
      hasAny(cJob, PLATFORMS)
    );
  }

  /* ===== SPECIAL GROUPS ===== */
  for (const group of Object.values(SPECIAL_GROUPS)) {
    if (hasAny(jobKeyword, group)) {
      return hasAny(cJob, group);
    }
  }

  /* ===== DEFAULT ===== */
  if (!jobKeyword) return true;

  return jobKeyword
    .split(" ")
    .some((k) => cJob.includes(k));
}

/* =========================
   POST: SEARCH
========================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const rawJobKeyword = body.jobKeyword || "";

    const jobKeywords = rawJobKeyword
      .split(",")
      .map((k: string) => normalize(k))
      .filter(Boolean); // bỏ keyword rỗng
      // 👉 TAB 2: nếu không có job keyword thì vẫn search (bỏ qua điều kiện job)
    if (jobKeywords.length === 0) {
      jobKeywords.push("");
    }

    const companyKeyword = normalize(body.companyKeyword);
    const cityN = normalize(body.city);
    const districtN = normalizeDistrict(body.district);


    const token = await getTenantToken();
    const records = await getAllRecords(token);

    /* =========================
      CORE FILTER (MULTI KEYWORD)
    ========================= */

    let results: any[] = [];

    for (const keyword of jobKeywords) {
      const matched = records.filter((r) =>
        matchJob(
          r,
          keyword,
          companyKeyword,
          cityN,
          districtN
        )
      );

      results = results.concat(matched);
    }

    // remove duplicate jobs
    const uniqueResults = Array.from(
      new Map(results.map((r) => [r.record_id, r])).values()
    );

    return NextResponse.json({
      total: uniqueResults.length,
      companies: uniqueResults.map((r) => {
        const f = r.fields || {};
        return {
          company: f["Công ty"] || "",
          job: f["Công việc"] || "",
          address: f["Địa chỉ"] || "",
          working_time: f["Thời gian làm việc"] || "",
          salary_min: f["Lương tối thiểu"] || 0,
          salary_max: f["Lương tối đa"] || 0,
          jd_link: f["Link JD"] || "",
          experience: f["Kinh nghiệm"] || "",
          status: f["Trạng thái"] || "",
        };
      }),
    });
  } catch (err: any) {
    console.error("SEARCH ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Search failed" },
      { status: 500 }
    );
  }
}

/* =========================
   TOKEN + RECORDS
========================= */
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
  if (!data?.tenant_access_token) {
    throw new Error("Cannot get tenant access token");
  }
  return data.tenant_access_token;
}

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
