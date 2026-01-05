import { NextResponse } from "next/server";

/* =========================
   ENV
========================= */
const APP_ID = process.env.LARK_APP_ID!;
const APP_SECRET = process.env.LARK_APP_SECRET!;
const BASE_ID = process.env.LARK_BASE_ID!;
const TABLE_ID = process.env.LARK_TABLE_ID!;
const GOOGLE_API_KEY = process.env.GOOGLE_MAP_API_KEY!;

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
  if (!data.tenant_access_token) {
    throw new Error("Cannot get tenant access token");
  }

  return data.tenant_access_token;
}

/* =========================
   GEOCODE USER ADDRESS
========================= */
async function geocode(address: string) {
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address
    )}&key=${GOOGLE_API_KEY}&language=vi&region=VN`
  );

  const data = await res.json();
  if (!data.results || data.results.length === 0) return null;

  return data.results[0].geometry.location; // { lat, lng }
}

/* =========================
   DISTANCE (HAVERSINE)
========================= */
function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
    url.searchParams.set("page_size", "100");
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
   POST: SEARCH COMPANY
========================= */
export async function POST(req: Request) {
  try {
    const { address, city, district } = await req.json();

    const token = await getTenantToken();
    const records = await getAllRecords(token);

    let userLocation = null;

    /* ========= CASE 1: CÓ ĐỊA CHỈ → TÍNH KM ========= */
    if (address) {
      userLocation = await geocode(address);
    }

    const distanceResults: { name: string; km: number }[] = [];
    const sameDistrictResults: { name: string }[] = [];

    for (const item of records) {
      const fields = item.fields || {};

      const name = fields["Công ty"];
      const cCity = fields["Thành phố"];
      const cDistrict = fields["Quận"];
      const lat = fields["lat"];
      const lng = fields["lng"];

      if (!name) continue;

      /* ===== CASE 1: KHOẢNG CÁCH ===== */
      if (userLocation && lat && lng) {
        const km = haversine(
          userLocation.lat,
          userLocation.lng,
          lat,
          lng
        );

        if (km <= 15) {
          distanceResults.push({
            name,
            km: Number(km.toFixed(1)),
          });
        }

        continue; // ⚠️ không cho rơi xuống case 2
      }

      /* ===== CASE 2: CÙNG QUẬN ===== */
      if (
        city &&
        district &&
        cCity === city &&
        cDistrict === district
      ) {
        sameDistrictResults.push({ name });
      }
    }

    distanceResults.sort((a, b) => a.km - b.km);

    return NextResponse.json({
      distance: distanceResults,
      sameDistrict: sameDistrictResults,
    });
  } catch (err: any) {
    console.error("SEARCH ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Search failed" },
      { status: 500 }
    );
  }
}
