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
   GET ALL RECORDS (PAGINATION)
========================= */
async function getAllRecords(token: string) {
  let records: any[] = [];
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

    const data = await res.json();
    records = records.concat(data?.data?.items || []);
    pageToken = data?.data?.page_token;
  } while (pageToken);

  return records;
}

/* =========================
   OPTION → TEXT (CỰC QUAN TRỌNG)
========================= */
function getOptionText(value: any): string {
  if (!value) return "";

  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    return value.map((v) => v.text).join(" ");
  }

  if (typeof value === "object" && value.text) {
    return value.text;
  }

  return "";
}

/* =========================
   POST: SEARCH COMPANY
========================= */
export async function POST(req: Request) {
  try {
    const { city, district } = await req.json();

    if (!city || !district) {
      return NextResponse.json(
        { total: 0, companies: [] },
        { status: 200 }
      );
    }

    const token = await getTenantToken();
    const records = await getAllRecords(token);

    const cityInput = city.trim();
    const districtInput = district.trim();

    const companies = records
      .filter((item) => {
        const fields = item.fields || {};

        const cityText = getOptionText(fields["Thành phố"]);
        const districtText = getOptionText(fields["Quận"]);

        if (!cityText || !districtText) return false;

        const matchCity = cityText === cityInput;

        const matchDistrict =
          districtText === districtInput ||
          districtText.replace("Quận ", "") === districtInput;

        return matchCity && matchDistrict;
      })
      .map((item) => {
        const f = item.fields || {};
        return {
          company: f["Công ty"] || "",
          job: f["Công việc"] || "",
          address: f["Địa chỉ"] || "",
          city: getOptionText(f["Thành phố"]),
          district: getOptionText(f["Quận"]),
        };
      });

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
