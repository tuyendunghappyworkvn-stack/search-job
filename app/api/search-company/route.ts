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

/* =========================
   GET TENANT TOKEN
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

/* =========================
   GET ALL RECORDS (PAGINATION)
========================= */
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
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    all = all.concat(data?.data?.items || []);
    pageToken = data?.data?.page_token;
  } while (pageToken);

  return all;
}

/* =========================
   POST: SEARCH COMPANY + JOB
========================= */
export async function POST(req: Request) {
  try {
    // ✅ NHẬN THÊM companyKeyword
    const { city, district, jobKeyword, companyKeyword } =
      await req.json();

    if (!city || !district) {
      return NextResponse.json({
        total: 0,
        companies: [],
      });
    }

    const token = await getTenantToken();
    const records = await getAllRecords(token);

    const cityN = normalize(city);
    const districtN = normalize(district);
    const jobN = normalize(jobKeyword);
    const companyN = normalize(companyKeyword);

    const results = records.filter((r) => {
      const f = r.fields || {};

      const cCity = normalize(f["Thành phố"]);
      const cDistrict = normalize(f["Quận"]);
      const cJob = normalize(f["Công việc"]);
      const cCompany = normalize(f["Công ty"]);

      /* ===== ĐIỀU KIỆN BẮT BUỘC ===== */
      if (cCity !== cityN) return false;
      if (!cDistrict.includes(districtN)) return false;

      /* ===== ĐIỀU KIỆN TÙY CHỌN ===== */
      // 🔹 Có nhập công việc → lọc theo công việc
      if (jobN && !cJob.includes(jobN)) return false;

      // 🔹 Có nhập công ty → lọc theo công ty
      if (companyN && !cCompany.includes(companyN)) return false;

      return true;
    });

    return NextResponse.json({
      total: results.length,
      companies: results.map((r) => {
        const f = r.fields || {};

        return {
          /* ===== GROUP / HEADER ===== */
          company: f["Công ty"] || "",
          job: f["Công việc"] || "",

          /* ===== DETAIL ===== */
          address: f["Địa chỉ"] || "",
          working_time: f["Thời gian làm việc"] || "",

          salary_min: f["Lương tối thiểu"] || 0,
          salary_max: f["Lương tối đa"] || 0,

          jd_link: f["Link JD"] || "",

          /* ===== OPTIONAL ===== */
          experience: f["Kinh nghiệm"] || "",
          status: f["Trạng thái"] || "",
          jobGroup: f["Nhóm việc"] || "",
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
