import { NextResponse } from "next/server";

export const runtime = "nodejs";

const APP_ID = process.env.LARK_APP_ID!;
const APP_SECRET = process.env.LARK_APP_SECRET!;
const BASE_ID = process.env.LARK_BASE_ID!;
const TABLE_ID = process.env.LARK_TABLE_ID!;

/* =========================
   TOKEN
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

  const data: any = await res.json();
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
    url.searchParams.set("page_size", "500");
    if (pageToken) url.searchParams.set("page_token", pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data: any = await res.json();
    all = all.concat(data?.data?.items || []);
    pageToken = data?.data?.page_token;
  } while (pageToken);

  return all;
}

/* =========================
   HELPER: LOOKUP TEXT
========================= */
function lookupText(field: any): string {
  if (!Array.isArray(field)) return "";
  return field.map((v) => v.text).join(" ").toLowerCase();
}

/* =========================
   POST
========================= */
export async function POST(req: Request) {
  try {
    const { city, district } = await req.json();

    const token = await getTenantToken();
    const records = await getAllRecords(token);

    const cityNeedle = city?.toLowerCase();
    const districtNeedle = district?.toLowerCase();

    const companies = records
      .filter((r) => {
        const fields = r.fields || {};

        const cityText = lookupText(fields["Thành phố"]);
        const districtText = lookupText(fields["Quận"]);

        return (
          cityText.includes(cityNeedle) &&
          districtText.includes(districtNeedle)
        );
      })
      .map((r) => ({
        company: r.fields["Công ty"],
        job: r.fields["Công việc"],
        address: r.fields["Địa chỉ"],
        city: lookupText(r.fields["Thành phố"]),
        district: lookupText(r.fields["Quận"]),
      }));

    return NextResponse.json({
      total: companies.length,
      companies,
    });
  } catch (err: any) {
    console.error("SEARCH ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
