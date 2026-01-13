import {
  normalize,
  normalizeDistrict,
  hasAny,
  extractPlatform,
  matchLocation,
  LEADER_KEYWORDS,
} from "../utils";

export function matchJobForm(
  r: any,
  companyKeyword: string,
  jobKeyword: string,
  cityN: string,
  districtN: string
) {
  const f = r.fields || {};

  const cCompany = normalize(f["Công ty"]);
  const cJob = normalize(f["Công việc"]);
  const cCity = normalize(f["Thành phố"]);
  const cDistrict = normalizeDistrict(f["Quận"]);
  const cAddress = normalize(f["Địa chỉ"]);

  // COMPANY
  if (companyKeyword && !cCompany.includes(companyKeyword)) {
    return false;
  }

  // LOCATION
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

  // JOB
  if (jobKeyword) {
    const k = jobKeyword;

    const isSeller = k.includes("seller");
    const isLeader = hasAny(k, LEADER_KEYWORDS);
    const platform = extractPlatform(k);

    if (isLeader && !hasAny(cJob, LEADER_KEYWORDS)) return false;
    if (isSeller && platform) return cJob.includes(platform);
    if (isSeller) return cJob.includes("seller");

    return k.split(" ").some((w) => cJob.includes(w));
  }

  return true;
}
