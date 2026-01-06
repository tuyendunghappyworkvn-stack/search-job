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
function normalize(str: string) {
  return str.toLowerCase().trim();
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
   GET FIELD OPTIONS
========================= */
async function getFieldOptions(
  token: string,
  fieldName: string
): Promise<{ id: string; name: string }[]> {
  const res = await fetch(
    `https://open.larksuite.com/open-apis/bitable/v1/apps/${BASE_ID}/tables/${TABLE_ID}/fields`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await res.json();
  const field = data?.data?.items?.find(
    (f: any) => f.field_name === fieldName
  );

  return field?.property?.options || [];
}

/* =========================
   POST: SEARCH COMPANY
========================= */
export async function POST(req: Request) {
  try {
    const { city, district } = await req.json();

    if (!city || !district) {
      return NextResponse.json({
        total: 0,
        companies: [],
        reason: "Missing city or district",
      });
    }

    const token = await getTenantToken();

    /* ===== LẤY OPTIONS ===== */
    const cityOptions = await getFieldOptions(token, "Thành phố");
    const districtOptions = await getFieldOptions(token, "Quận");
    const jobGroupOptions = await getFieldOptions(token, "Nhóm việc");

    /* ===== MAP TEXT → OPTION_ID (PHÙ HỢP DATA CỦA BẠN) ===== */
    const cityOpt = cityOptions.find(
      (o) => normalize(o.name) === normalize(city)
    )?.id;

    const districtOpt = districtOptions.find(
      (o) => normalize(o.name).includes(normalize(district))
    )?.id;

    const jobGroupIds: string[] = jobGroupOptions
      .filter((o) =>
        ["POD", "Dropship", "POD/Dropship"].includes(o.name)
      )
      .map((o) => o.id);

    if (!cityOpt || !districtOpt || jobGroupIds.length === 0) {
      return NextResponse.json({
        total: 0,
        companies: [],
        debug: {
          city,
          district,
          cityOpt,
          districtOpt,
          jobGroupIds,
        },
      });
    }

    /* ===== BUILD FILTER (OR of AND) ===== */
    const filter = {
      conjunction: "or",
      conditions: jobGroupIds.map((jobId: string) => ({
        conjunction: "and",
        conditions: [
          {
            field_name: "Thành phố",
            operator: "is",
            value: [cityOpt],
          },
          {
            field_name: "Quận",
            operator: "is",
            value: [districtOpt],
          },
          {
            field_name: "Nhóm việc",
            operator: "is",
            value: [jobId],
          },
        ],
      })),
    };

    /* ===== SEARCH (PAGE 1 – OK VỚI FILTER) ===== */
    const res = await fetch(
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

    const data = await res.json();
    const items = data?.data?.items || [];

    return NextResponse.json({
      total: items.length,
      companies: items.map((item: any) => ({
        company: item.fields["Công ty"],
        job: item.fields["Công việc"],
        address: item.fields["Địa chỉ"],
        city: item.fields["Thành phố"],
        district: item.fields["Quận"],
        jobGroup: item.fields["Nhóm việc"],
        linkJD: item.fields["Link JD"],
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
