import { NextResponse } from "next/server";

export const runtime = "nodejs";

const APP_ID = process.env.LARK_APP_ID!;
const APP_SECRET = process.env.LARK_APP_SECRET!;
const BASE_ID = process.env.LARK_BASE_ID!;
const TABLE_ID = process.env.LARK_TABLE_ID!;

/* =========================
   CHUẨN HÓA QUẬN
========================= */
function normalizeDistrict(district: string) {
  const d = district.trim();

  if (d.toLowerCase().startsWith("quận")) {
    return d;
  }

  return `Quận ${d}`;
}

/* =========================
   GET TENANT TOKEN
========================= */
async function getTenantToken(): Promise<string> {
  const response = await fetch(
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

  const data = await response.json();
  if (!data?.tenant_access_token) {
    throw new Error("Cannot get tenant token");
  }
  return data.tenant_access_token;
}

export async function POST(req: Request) {
  try {
    const { city, district } = await req.json();

    if (!city || !district) {
      return NextResponse.json(
        { error: "Thiếu thành phố hoặc quận" },
        { status: 400 }
      );
    }

    const token = await getTenantToken();

    const districtOption = normalizeDistrict(district);

    const filter = {
      conjunction: "or",
      conditions: ["POD", "Dropship", "POD/Dropship"].map(
        (jobGroup) => ({
          conjunction: "and",
          conditions: [
            {
              field_name: "Thành phố",
              operator: "is",
              value: [city],
            },
            {
              field_name: "Quận",
              operator: "is",
              value: [districtOption], // 🔴 QUAN TRỌNG
            },
            {
              field_name: "Nhóm việc",
              operator: "is",
              value: [jobGroup],
            },
          ],
        })
      ),
    };

    const response = await fetch(
      `https://open.larksuite.com/open-apis/bitable/v1/apps/${BASE_ID}/tables/${TABLE_ID}/records/search`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page_size: 100,
          filter,
        }),
      }
    );

    const data = await response.json();

    return NextResponse.json({
      total: data?.data?.items?.length || 0,
      companies:
        data?.data?.items?.map((item: any) => ({
          company: item.fields?.["Công ty"],
          job: item.fields?.["Công việc"],
          address: item.fields?.["Địa chỉ"],
          city: item.fields?.["Thành phố"],
          district: item.fields?.["Quận"],
          jobGroup: item.fields?.["Nhóm việc"],
          linkJD: item.fields?.["Link JD"],
        })) || [],
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
