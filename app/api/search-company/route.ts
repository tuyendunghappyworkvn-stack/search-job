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
   GET ALL RECORDS
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
   HELPER: GET LOOKUP TEXT
========================= */
function getLookupText(val: any): string {
  if (!val) return "";

  // case: [{ text: "Hà Nội" }]
  if (Array.isArray(val)) {
    return val.map((v) => v?.text || v).join(" ");
  }

  // case: { text: "Hà Nội" }
  if (typeof val === "object") {
    return val.text || "";
  }

  // case: "Hà Nội"
  return String(val);
}

/* =========================
   SEARCH
========================= */
export async function POST(req: Request) {
  try {
    const { city, district } = await req.json();

    const token = await getTenantToken();
    const records = await getAllRecords(token);

    const cityLower = city.toLowerCase();
    const districtLower = district.toLowerCase();

    const matched = records.filter((r) => {
      const fields = r.fields || {};

      const cityText = getLookupText(fields["Thành phố"]).toLowerCase();
      const districtText = getLookupText(fields["Quận"]).toLowerCase();

      return (
        cityText.includes(cityLower) &&
        districtText.includes(districtLower)
      );
    });

    const companies = matched.map((r) => ({
      company: r.fields["Công ty"],
      job: r.fields["Công việc"],
      address: r.fields["Địa chỉ"],
      city: getLookupText(r.fields["Thành phố"]),
      district: getLookupText(r.fields["Quận"]),
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
