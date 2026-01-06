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
   SEARCH WITH PAGINATION
========================= */
async function searchAllRecords(
  token: string,
  filter: any
) {
  let allItems: any[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const res = await fetch(
      `https://open.larksuite.com/open-apis/bitable/v1/apps/${BASE_ID}/tables/${TABLE_ID}/records/search`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page_size: 100, // max của Lark
          page_token: pageToken,
          filter,
        }),
      }
    );

    const data = await res.json();

    const items = data?.data?.items || [];
    allItems = allItems.concat(items);

    pageToken = data?.data?.page_token;
  } while (pageToken);

  return allItems;
}

/* =========================
   POST: SEARCH COMPANY
========================= */
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

    /* =========================
       FILTER (OPTION - Y CHANG N8N)
    ========================= */
    const filter = {
      conjunction: "and",
      conditions: [
        {
          field_name: "Thành phố",
          operator: "is",
          value: [city], // VD: "Hà Nội"
        },
        {
          field_name: "Quận",
          operator: "is",
          value: [`Quận ${district}`], // VD: "Quận Nam Từ Liêm"
        },
        {
          conjunction: "or",
          conditions: [
            {
              field_name: "Nhóm việc",
              operator: "is",
              value: ["POD"],
            },
            {
              field_name: "Nhóm việc",
              operator: "is",
              value: ["Dropship"],
            },
            {
              field_name: "Nhóm việc",
              operator: "is",
              value: ["POD/Dropship"],
            },
          ],
        },
      ],
    };

    /* =========================
       SEARCH ALL MATCHED RECORDS
    ========================= */
    const items = await searchAllRecords(token, filter);

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
