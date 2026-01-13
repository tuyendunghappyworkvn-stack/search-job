export const LEADER_KEYWORDS = [
  "lead",
  "leader",
  "trưởng nhóm",
  "team lead",
];

export const PLATFORMS = [
  "etsy",
  "amazon",
  "ebay",
  "tiktok",
  "shopify",
  "facebook",
];

export function normalize(str: any): string {
  if (!str) return "";
  return String(str).toLowerCase().trim();
}

export function normalizeDistrict(str: any): string {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .replace("quận", "")
    .replace("huyện", "")
    .replace("thị xã", "")
    .trim();
}

export function hasAny(text: string, keywords: string[]) {
  return keywords.some((k) => text.includes(k));
}

export function extractPlatform(keyword: string) {
  return PLATFORMS.find((p) => keyword.includes(p)) || null;
}

export function matchLocation(
  cityCV: string,
  districtCV: string,
  jobCity: string,
  jobDistrict: string,
  jobAddress: string
) {
  const isRemote =
    jobAddress.includes("remote") ||
    jobAddress.includes("freelancer");

  if (isRemote) {
    if (cityCV) return jobCity.includes(cityCV);
    return true;
  }

  if (cityCV && districtCV) {
    return jobCity.includes(cityCV) && jobDistrict.includes(districtCV);
  }

  if (districtCV) return jobDistrict.includes(districtCV);
  if (cityCV) return jobCity.includes(cityCV);

  return true;
}
