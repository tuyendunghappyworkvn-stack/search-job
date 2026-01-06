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
   GET TENANT TOKEN
========================= */
async function getTenantToken() {
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
   NORMALIZE TEXT
========================= */
function normalize(str: string) {
  return str
    .toLowerCase()
    .replace(/^quận\s+/i, "")
    .replace(/^huyện\s+/i, "")
    .trim();
}

/* =========================
   ALLOWED JOB GROUPS
========================= */
const ALLOWED_JOB_GROUPS = [
  "pod",
  "dropship",
  "pod/dropship",
];

/* =========================
   POST: SEARCH COMPANY
========================= */
export async function POST(req: Request) {
  try {
    const { city, district } = await req.json();

    if (!city || !district) {
      return NextResponse.json(
        { error: "Thiếu thông tin thành phố hoặc quận" },
        { status: 400 }
      );
    }

    const token = await getTenantToken();

    /* ===== 1. SEARCH THEO THÀNH PHỐ ===== */
    const res = await fetch(
      `https://open.larksuite.com/open-apis/bitable/v1/apps/${BASE_ID}/tables/${TABLE_ID}/records/search`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filter: {
            conjunction: "AND",
            conditions: [
              {
                field_name: "Thành phố",
                operator: "equals",
                value: [city], // VD: "Hà Nội"
              },
            ],
          },
        }),
      }
    );

    const data = await res.json();
    let items = data?.data?.items || [];

    const normalizedDistrict = normalize(district);

    /* ===== 2. FILTER QUẬN + NHÓM VIỆC ===== */
    items = items.filter((item: any) => {
      const fields = item.fields || {};

      const recordDistrict = fields["Quận"];
      const jobGroup = fields["Nhóm việc"];

      if (!recordDistrict || !jobGroup) return false;

      // ✔ check cùng quận
      const sameDistrict = normalize(recordDistrict).includes(
        normalizedDistrict
      );

      // ✔ check nhóm việc hợp lệ
      const validJobGroup = ALLOWED_JOB_GROUPS.includes(
        jobGroup.toLowerCase()
      );

      return sameDistrict && validJobGroup;
    });

    const companies = items.map((item: any) => ({
      company: item.fields["Công ty"],
      job: item.fields["Công việc"],
      address: item.fields["Địa chỉ"],
      city: item.fields["Thành phố"],
      district: item.fields["Quận"],
      jobGroup: item.fields["Nhóm việc"],
      linkJD: item.fields["Link JD"],
    }));

    return NextResponse.json({
      total: companies.length,
      companies,
    });
  } catch (err: any) {
    console.error("SEARCH ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Search failed" },
      { status: 500 }
    );
  }
}
