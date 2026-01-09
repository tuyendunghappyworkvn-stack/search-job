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
   LEADER KEYWORDS
========================= */
const LEADER_KEYWORDS = [
  "lead",
  "leader",
  "trưởng nhóm",
  "team lead",
];

/* =========================
   JOB KEYWORD MAP
========================= */
const JOB_KEYWORD_MAP = [
  { keys: ["design", "designer"], search: ["design", "designer"] },
  { keys: ["etsy"], search: ["etsy"] },
  { keys: ["amazon"], search: ["amazon"] },
  { keys: ["ebay"], search: ["ebay"] },
  { keys: ["tiktok"], search: ["tiktok"] },
  { keys: ["shopify", "website", "web"], search: ["shopify"] },
  {
    keys: ["facebook", "ads", "marketing", "digital", "performance"],
    search: ["facebook", "ads", "marketing", "digital", "performance"],
  },
  { keys: ["google", "google ads"], search: ["google"] },
  { keys: ["email marketing"], search: ["email"] },
  { keys: ["video"], search: ["video"] },
  { keys: ["seller pod", "pod seller"], search: ["seller pod", "seller"] },
  { keys: ["seller"], search: ["seller"] },
  {
    keys: ["fulfill", "fulfillment"],
    search: ["fulfillment", "support fulfill"],
  },
  {
    keys: ["customer support", "supporter"],
    search: ["customer support", "supporter"],
  },
  { keys: ["idea"], search: ["idea"] },
];

/* =========================
   EXTRACT JOB KEYWORDS
========================= */
function extractJobKeywords(text: string): string[] {
  if (!text) return [];
  const t = text.toLowerCase();
  const result = new Set<string>();

  for (const rule of JOB_KEYWORD_MAP) {
    if (rule.keys.some((k) => t.includes(k))) {
      rule.search.forEach((s) => result.add(s));
    }
  }

  return Array.from(result);
}

/* =========================
   JOB KEYWORD MATCH
========================= */
function matchJob(jobText: string, keywords: string[]) {
  if (keywords.length === 0) return true;
  return keywords.some((kw) => jobText.includes(kw));
}

/* =========================
   LEADER CHECK
========================= */
function hasLeader(text: string) {
  return LEADER_KEYWORDS.some((k) => text.includes(k));
}

/* =========================
   LOCATION MATCH
========================= */
function matchLocation(
  cityCV: string,
  districtCV: string,
  jobCity: string,
  jobDistrict: string,
  jobAddress: string
) {
  const isRemote =
    jobAddress.includes("remote") ||
    jobAddress.includes("freelancer");

  if (isRemote) {
    if (cityCV) return jobCity.includes(cityCV);
    return true;
  }

  if (cityCV && districtCV) {
    return (
      jobCity.includes(cityCV) &&
      jobDistrict.includes(districtCV)
    );
  }

  if (districtCV) {
    return jobDistrict.includes(districtCV);
  }

  if (cityCV) {
    return jobCity.includes(cityCV);
  }

  return true;
}

/* =========================
   POST: SEARCH
========================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const companyKeyword = normalize(body.companyKeyword);
    const jobKeyword = normalize(body.jobKeyword);

    /* ===== USER INTENT (QUAN TRỌNG) ===== */
    const rawJobKeyword = jobKeyword;

    const intentGoogle = rawJobKeyword.includes("google");
    const intentEmail = rawJobKeyword.includes("email");
    const intentFacebook = rawJobKeyword.includes("facebook");

    const jobKeywordsFromCV: string[] = Array.isArray(body.jobKeywords)
      ? body.jobKeywords.map(normalize)
      : [];

    const cityN = normalize(body.city);
    const districtN = normalizeDistrict(body.district);

    const jobKeywords =
      jobKeywordsFromCV.length > 0
        ? jobKeywordsFromCV
        : extractJobKeywords(jobKeyword);

    const cvHasLeader = jobKeywords.some((k) =>
      LEADER_KEYWORDS.includes(k)
    );

    const token = await getTenantToken();
    const records = await getAllRecords(token);

    const results = records.filter((r) => {
      const f = r.fields || {};

      const cCompany = normalize(f["Công ty"]);
      const cJob = normalize(f["Công việc"]);
      const cCity = normalize(f["Thành phố"]);
      const cDistrict = normalizeDistrict(f["Quận"]);
      const cAddress = normalize(f["Địa chỉ"]);

      /* ===== COMPANY ===== */
      if (companyKeyword && !cCompany.includes(companyKeyword)) return false;

      /* ===== JOB KEYWORD ===== */
      if (!matchJob(cJob, jobKeywords)) return false;

      /* ===== GOOGLE RULE ===== */
      if (intentGoogle && !cJob.includes("google")) return false;

      /* ===== EMAIL RULE ===== */
      if (intentEmail && !cJob.includes("email")) return false;

      /* ===== FACEBOOK RULE ===== */
      if (intentFacebook) {
        const hasFacebook = cJob.includes("facebook");
        const hasGoogle = cJob.includes("google");
        const hasEmail = cJob.includes("email");

        if (!hasFacebook && (hasGoogle || hasEmail)) return false;
      }

      /* ===== LEADER FILTER ===== */
      const jobHasLeader = hasLeader(cJob);
      if (!cvHasLeader && jobHasLeader) return false;

      /* ===== LOCATION ===== */
      if (
        !matchLocation(
          cityN,
          districtN,
          cCity,
          cDistrict,
          cAddress
        )
      )
        return false;

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
