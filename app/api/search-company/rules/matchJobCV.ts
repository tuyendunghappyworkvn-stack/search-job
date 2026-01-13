import {
  normalize,
  normalizeDistrict,
  hasAny,
  extractPlatform,
  matchLocation,
  LEADER_KEYWORDS,
} from "../utils";

export function matchJobCV(
  r: any,
  jobKeyword: string,
  cityN: string,
  districtN: string
) {
  const f = r.fields || {};

  const cJob = normalize(f["Công việc"]);
  const cCity = normalize(f["Thành phố"]);
  const cDistrict = normalizeDistrict(f["Quận"]);
  const cAddress = normalize(f["Địa chỉ"]);

  const isSeller = jobKeyword.includes("seller");
  const isLeader = hasAny(jobKeyword, LEADER_KEYWORDS);
  const platform = extractPlatform(jobKeyword);

  if (cityN || districtN) {
    if (
      !matchLocation(
        cityN,
        districtN,
        cCity,
        cDistrict,
        cAddress
      )
    ) {
      return false;
    }
  }

  if (isLeader && !hasAny(cJob, LEADER_KEYWORDS)) return false;
  if (isSeller && platform) return cJob.includes(platform);
  if (isSeller) return cJob.includes("seller");

  return jobKeyword
    .split(" ")
    .some((k) => cJob.includes(k));
}
