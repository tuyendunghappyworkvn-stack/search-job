import { NextResponse } from "next/server";

export const runtime = "nodejs";

const APP_ID = process.env.LARK_APP_ID!;
const APP_SECRET = process.env.LARK_APP_SECRET!;
const BASE_ID = process.env.LARK_BASE_ID!;
const TABLE_ID = process.env.LARK_TABLE_ID!;

async function getTenantToken(): Promise<string> {
  console.log("▶️ GET TENANT TOKEN");

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
  console.log("🟢 TOKEN RESPONSE:", data);

  if (!data.tenant_access_token) {
    throw new Error("NO TENANT TOKEN");
  }

  return data.tenant_access_token;
}

export async function POST(req: Request) {
  try {
    console.log("▶️ API CALLED");

    const body = await req.json();
    console.log("🟡 REQUEST BODY:", body);

    const { city, district } = body;

    const token = await getTenantToken();
    console.log("🟢 TENANT TOKEN OK");

    const filter = {
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
          value: [`Quận ${district}`],
        },
        {
          conjunction: "or",
          conditions: [
            { field_name: "Nhóm việc", operator: "is", value: ["POD"] },
            { field_name: "Nhóm việc", operator: "is", value: ["Dropship"] },
            { field_name: "Nhóm việc", operator: "is", value: ["POD/Dropship"] },
          ],
        },
      ],
    };

    console.log("🟡 FILTER SENT TO LARK:", JSON.stringify(filter, null, 2));

    const response = await fetch(
      `https://open.larksuite.com/open-apis/bitable/v1/apps/${BASE_ID}/tables/${TABLE_ID}/records/search`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page_size: 10,
          filter,
        }),
      }
    );

    const data = await response.json();
    console.log("🔵 LARK RESPONSE:", JSON.stringify(data, null, 2));

    return NextResponse.json({
      debug: true,
      larkData: data,
    });
  } catch (err) {
    console.error("🔴 API ERROR:", err);
    return NextResponse.json(
      { error: "DEBUG ERROR" },
      { status: 500 }
    );
  }
}
