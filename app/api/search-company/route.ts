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
function normalizeValue(val: any): string {
  if (!val) return "";

  if (Array.isArray(val)) {
    return String(val[0] || "").toLowerCase().trim();
  }

  return String(val).toLowerCase().trim();
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
   GET ALL RECORDS
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
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    all = all.concat(data?.data?.items || []);
    pageToken = data?.data?.page_token;
  } while (pageToken);

  return all;
}

/* =========================
   POST: SEARCH COMPANY
========================= */
export async function POST(req: Request) {
  try {
    const { city, district } = await req.json();

    if (!city || !district) {
      return NextResponse.json({ total: 0, companies: [] });
    }

    const token = await getTenantToken();
    const records = await getAllRecords(token);

    const cityN = normalizeValue(city);
    const districtN = normalizeValue(district);

    const results = records.filter((r) => {
      const f = r.fields || {};

      const cCity = normalizeValue(f["Thành phố"]);
      const cDistrict = normalizeValue(f["Quận"]);

      return cCity === cityN && cDistrict.includes(districtN);
    });

    return NextResponse.json({
      total: results.length,
      companies: results.map((r) => ({
        company: r.fields["Công ty"],
        job: r.fields["Công việc"],
        address: r.fields["Địa chỉ"],
        city: r.fields["Thành phố"],
        district: r.fields["Quận"],
        linkJD: r.fields["Link JD"],
      })),
    });
  } catch (err: any) {
    console.error("SEARCH ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Search failed" },
      { status: 500 }
    );
  }
}
