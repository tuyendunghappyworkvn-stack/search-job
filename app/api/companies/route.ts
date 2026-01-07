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
   GET: LIST COMPANY (UNIQUE + OPTIONAL FILTER)
========================= */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const keyword = normalize(searchParams.get("q"));

    const token = await getTenantToken();
    const records = await getAllRecords(token);

    const companySet = new Map<string, string>();

    records.forEach((r) => {
      const company = r.fields?.["Công ty"];
      if (!company) return;

      const key = normalize(company);

      // ✅ Nếu có keyword → chỉ lấy company match
      if (keyword && !key.includes(keyword)) return;

      if (!companySet.has(key)) {
        companySet.set(key, company);
      }
    });

    const companies = Array.from(companySet.values()).sort((a, b) =>
      a.localeCompare(b, "vi")
    );

    return NextResponse.json({
      total: companies.length,
      companies,
    });
  } catch (err: any) {
    console.error("GET COMPANIES ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Cannot load companies" },
      { status: 500 }
    );
  }
}
