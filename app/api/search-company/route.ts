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
   NORMALIZE DISTRICT
========================= */
function normalizeDistrict(district: string) {
  if (!district) return "";

  const d = district.trim();

  const lower = d.toLowerCase();
  if (
    lower.startsWith("quận") ||
    lower.startsWith("huyện") ||
    lower.startsWith("thị xã")
  ) {
    return d;
  }

  return `Quận ${d}`;
}

/* =========================
   POST: SEARCH COMPANY
========================= */
export async function POST(req: Request) {
  try {
    const { city, district } = await req.json();

    if (!city) {
      return NextResponse.json(
        { error: "Thiếu thông tin thành phố" },
        { status: 400 }
      );
    }

    const normalizedDistrict = district
      ? normalizeDistrict(district)
      : "";

    const token = await getTenantToken();

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
                operator: "contains",
                value: [city],
              },
              ...(normalizedDistrict
                ? [
                    {
                      field_name: "Quận",
                      operator: "contains",
                      value: [normalizedDistrict],
                    },
                  ]
                : []),
            ],
          },
        }),
      }
    );

    const data = await res.json();

    const companies =
      data?.data?.items?.map((item: any) => ({
        company: item.fields["Công ty"],
        job: item.fields["Công việc"],
        address: item.fields["Địa chỉ"],
        city: item.fields["Thành phố"],
        district: item.fields["Quận"],
      })) || [];

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
