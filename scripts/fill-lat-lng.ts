import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fetch from "node-fetch";

/* =========================
   ENV
========================= */
const APP_ID = process.env.LARK_APP_ID!;
const APP_SECRET = process.env.LARK_APP_SECRET!;
const BASE_ID = process.env.LARK_BASE_ID!;
const TABLE_ID = process.env.LARK_TABLE_ID!;
const GOOGLE_API_KEY = process.env.GOOGLE_MAP_API_KEY!;

/* =========================
   FIELD ID
========================= */
const FIELD_LAT = "flddti6PGb";
const FIELD_LNG = "fldHSRts5i";

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
   NORMALIZE ADDRESS
========================= */
function normalize(str: string) {
  return str
    .replace(/\(.*?\)/g, "")
    .replace(/remote|hybrid/gi, "")
    .replace(/\bP\.\s*(\d+)/gi, "Phường $1")
    .replace(/\bQ\.\s*(\d+)/gi, "Quận $1")
    .replace(/\s+/g, " ")
    .trim();
}

/* =========================
   BUILD GEOCODE CANDIDATES
========================= */
function buildCandidates(
  address?: string,
  district?: string,
  city?: string
) {
  const list: string[] = [];

  if (address) {
    list.push(`${normalize(address)}, ${district ?? ""}, ${city ?? ""}, Việt Nam`);
  }

  if (district && city) {
    list.push(`${district}, ${city}, Việt Nam`);
  }

  return [...new Set(list.filter(Boolean))];
}

/* =========================
   GEOCODE
========================= */
async function geocode(address: string) {
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address
    )}&key=${GOOGLE_API_KEY}`
  );

  const data = await res.json();
  if (!data.results || data.results.length === 0) return null;
  return data.results[0].geometry.location;
}

/* =========================
   UPDATE RECORD
========================= */
async function updateRecord(
  token: string,
  recordId: string,
  lat: number,
  lng: number
) {
  await fetch(
    `https://open.larksuite.com/open-apis/bitable/v1/apps/${BASE_ID}/tables/${TABLE_ID}/records/${recordId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          [FIELD_LAT]: lat,
          [FIELD_LNG]: lng,
        },
      }),
    }
  );
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
    url.searchParams.set("page_size", "100");
    if (pageToken) url.searchParams.set("page_token", pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    all = all.concat(data?.data?.items || []);
    pageToken = data?.data?.page_token;
  } while (pageToken);

  return all;
}

/* =========================
   MAIN
========================= */
async function main() {
  console.log("🚀 Start filling lat/lng");

  const token = await getTenantToken();
  const records = await getAllRecords(token);

  let success = 0;
  let failed = 0;

  for (const r of records) {
    const recordId = r.record_id;
    const lat = r.fields[FIELD_LAT];
    const lng = r.fields[FIELD_LNG];

    if (lat && lng) continue;

    const address = r.fields["Địa chỉ"];
    const district = r.fields["Quận"];
    const city = r.fields["Thành phố"];

    const candidates = buildCandidates(address, district, city);

    let found = false;

    for (const c of candidates) {
      console.log("📍 Try:", c);
      const loc = await geocode(c);
      if (loc) {
        await updateRecord(token, recordId, loc.lat, loc.lng);
        console.log("✅ OK:", loc.lat, loc.lng);
        success++;
        found = true;
        break;
      }
    }

    if (!found) {
      console.log("❌ FAIL:", address);
      failed++;
    }
  }

  console.log("🎉 DONE", { success, failed });
}

main().catch(console.error);
