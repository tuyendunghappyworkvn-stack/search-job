"use client";

import { useEffect, useState } from "react";

/* =========================
   TYPES
========================= */
type CompanyResult = {
  company: string;
  job: string;
  address: string;
  working_time?: string;
  salary_min?: number;
  salary_max?: number;
  jd_link?: string;
};

const JOB_KEYWORD_MAP: Record<string, string[]> = {
  idea: ["idea"],

  design: ["design", "designer"],

  customer_support: ["customer support", "supporter"],

  etsy: ["etsy"],
  amazon: ["amazon"],
  ebay: ["ebay"],
  tiktok: ["tiktok", "tiktok shop"],

  shopify: ["shopify", "website"],

  facebook: [
    "facebook",
    "ads",
    "marketing",
    "digital marketing",
    "performance",
  ],

  video: ["video", "video editor"],

  seller: ["seller", "seller pod", "pod"],

  fulfillment: ["fulfill", "fulfillment"],
};

function extractJobKeywords(text: string): string[] {
  const t = text.toLowerCase();
  const result = new Set<string>();

  Object.values(JOB_KEYWORD_MAP).forEach((keywords) => {
    keywords.forEach((k) => {
      if (t.includes(k)) result.add(k);
    });
  });

  return Array.from(result);
}
// ⭐ NEW: parse address → city + district
function parseAddress(address: string) {
  const text = address.toLowerCase();

  const cities = [
    "hà nội",
    "hồ chí minh",
    "tp hcm",
    "tp. hcm",
    "đà nẵng",
    "hải phòng",
    "cần thơ",
  ];

  const districts = [
    "thanh xuân",
    "cầu giấy",
    "đống đa",
    "hai bà trưng",
    "hoàn kiếm",
    "nam từ liêm",
    "bắc từ liêm",
    "tân bình",
    "bình thạnh",
    "gò vấp",
    "thủ đức",
    "quận 1",
    "quận 3",
    "quận 5",
    "quận 7",
    "quận 10",
    "quận 12",
  ];

  let city = "";
  let district = "";

  for (const c of cities) {
    if (text.includes(c)) {
      city = c;
      break;
    }
  }

  for (const d of districts) {
    if (text.includes(d)) {
      district = d;
      break;
    }
  }

  return { city, district };
}

// ⭐ FORMAT TÊN ĐỊA CHỈ VIẾT HOA ĐÚNG CHUẨN
function toTitleCaseVN(text: string) {
  if (!text) return "";
  return text
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map(
      (word) => word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}

export default function HomePage() {
  /* =========================
     TAB
  ========================= */
  const [activeTab, setActiveTab] = useState<"form" | "cv">("form");

  /* ===== INPUT (TAB 1) ===== */
  const [companyKeyword, setCompanyKeyword] = useState("");
  const [jobKeyword, setJobKeyword] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  // ⭐ NEW: address input (auto parse city & district)
  const [addressInput, setAddressInput] = useState("");

  /* ===== AUTOCOMPLETE ===== */
  const [companyOptions, setCompanyOptions] = useState<string[]>([]);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  /* ===== TAB 2: CV ===== */
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvLink, setCvLink] = useState("");

  /* ===== RESULT (TÁCH RIÊNG) ===== */
  const [resultsForm, setResultsForm] = useState<CompanyResult[]>([]);
  const [resultsCV, setResultsCV] = useState<CompanyResult[]>([]);

  const [loadingForm, setLoadingForm] = useState(false);
  const [loadingCV, setLoadingCV] = useState(false);

  const [openCompany, setOpenCompany] = useState<string | null>(null);

  /* ===== COPY ===== */
  const [copied, setCopied] = useState(false);

  /* =========================
     LOAD COMPANY OPTIONS
  ========================= */
  useEffect(() => {
    setLoadingCompanies(true);
    fetch("/api/companies")
      .then((res) => res.json())
      .then((data) => setCompanyOptions(data.companies || []))
      .finally(() => setLoadingCompanies(false));
  }, []);

  const filteredCompanies = companyKeyword
    ? companyOptions.filter((c) =>
        c.toLowerCase().includes(companyKeyword.toLowerCase())
      )
    : companyOptions;

  /* =========================
     SEARCH TAB 1
    ========================= */
    async function handleSearchForm() {
      setLoadingForm(true);
      setResultsForm([]);
      setOpenCompany(null);

      try {
        const res = await fetch("/api/search-company", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            city,
            district,
            jobKeyword,
            companyKeyword,
          }),
        });

        const data = await res.json();
        setResultsForm(data.companies || []);
      } finally {
        setLoadingForm(false);
      }
    }

    /* =========================
      SEARCH TAB 2 (CV)
    ========================= */
    async function handleSearchCV() {
      setLoadingCV(true);
      setResultsCV([]);
      setOpenCompany(null);

      try {
        // =========================
        // STEP 1: SEND CV TO n8n
        // =========================
        let rawData: any = null;

        if (cvFile) {
          const formData = new FormData();
          formData.append("file", cvFile);

          const res = await fetch(
            "https://n8n.happywork.com.vn/webhook/read-cv",
            {
              method: "POST",
              body: formData,
            }
          );

          rawData = await res.json();
        } else if (cvLink) {
          const res = await fetch(
            "https://n8n.happywork.com.vn/webhook/read-cv",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ cvLink }),
            }
          );

          rawData = await res.json();
        }

        if (!rawData) {
          alert("Không nhận được dữ liệu từ CV");
          return;
        }

        // =========================
        // STEP 2: PARSE OUTPUT GEMINI
        // =========================
        const cvData =
          typeof rawData === "string" ? JSON.parse(rawData) : rawData;

        const jobKeywords = Array.from(
          new Set([
            ...(cvData.desiredPosition || []),
            ...(cvData.skills || []),
          ])
        );

        const city = cvData.location?.city || "";
        const district = cvData.location?.district || "";

        if (jobKeywords.length === 0) {
          alert("CV không có thông tin công việc phù hợp");
          return;
        }

        // =========================
        // STEP 3: SEARCH JOB
        // =========================
        const resSearch = await fetch("/api/search-company", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobKeywords,
            city,
            district,
          }),
        });

        const dataSearch = await resSearch.json();
        setResultsCV(dataSearch.companies || []);
      } finally {
        setLoadingCV(false);
      }
    }

  const results = activeTab === "form" ? resultsForm : resultsCV;

  const groupedByCompany = results.reduce((acc: any, item) => {
    if (!acc[item.company]) acc[item.company] = [];
    acc[item.company].push(item);
    return acc;
  }, {});

  const jobTextSummary = results
    .map(
      (item, idx) =>
        `${idx + 1}) ${item.company} - ${item.job} - ${item.jd_link}`
    )
    .join("\n");

  function handleCopy() {
    navigator.clipboard.writeText(jobTextSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="min-h-screen bg-[#FFF7ED] flex items-center justify-center px-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-md p-8">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900">TRA CỨU JOB</h1>
          <p className="text-gray-500 mt-2">Nhập thông tin để tra job</p>
        </div>

        {/* =========================
           TABS
        ========================= */}
        <div className="flex rounded-lg overflow-hidden border mb-6">
          <button
            onClick={() => setActiveTab("form")}
            className={`flex-1 py-2 font-medium ${
              activeTab === "form"
                ? "bg-orange-500 text-white"
                : "bg-white"
            }`}
          >
            Nhập thông tin
          </button>
          <button
            onClick={() => setActiveTab("cv")}
            className={`flex-1 py-2 font-medium ${
              activeTab === "cv"
                ? "bg-orange-500 text-white"
                : "bg-white"
            }`}
          >
            Search job theo CV
          </button>
        </div>

        {/* =========================
           TAB 1
        ========================= */}
        {activeTab === "form" && (
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              handleSearchForm();
            }}
          >
            <div className="relative">
              <input
                className={`w-full rounded-lg border px-4 py-3 ${
                  loadingCompanies ? "bg-gray-100 text-gray-500" : ""
                }`}
                placeholder={
                  loadingCompanies
                    ? "Đang tải danh sách công ty..."
                    : "Công ty (gõ để tìm)"
                }
                value={companyKeyword}
                disabled={loadingCompanies}
                onFocus={() =>
                  !loadingCompanies && setShowCompanyDropdown(true)
                }
                onChange={(e) => setCompanyKeyword(e.target.value)}
                onBlur={() =>
                  setTimeout(() => setShowCompanyDropdown(false), 150)
                }
              />

              {!loadingCompanies &&
                showCompanyDropdown &&
                filteredCompanies.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow max-h-56 overflow-auto">
                    {filteredCompanies.map((c) => (
                      <div
                        key={c}
                        className="px-4 py-2 hover:bg-orange-50 cursor-pointer text-sm"
                        onClick={() => {
                          setCompanyKeyword(c);
                          setShowCompanyDropdown(false);
                        }}
                      >
                        {c}
                      </div>
                    ))}
                  </div>
                )}
            </div>

            <input
              className="w-full rounded-lg border px-4 py-3"
              placeholder="Công việc (VD: Designer POD)"
              value={jobKeyword}
              onChange={(e) => setJobKeyword(e.target.value)}
            />
            {/* ⭐ NEW: Address input (auto fill city & district) */}
            <input
              className="w-full rounded-lg border px-4 py-3"
              placeholder="Địa chỉ (VD: 35 Lê Văn Thiêm, Thanh Xuân, Hà Nội)"
              value={addressInput}
              onChange={(e) => {
                const value = e.target.value;
                setAddressInput(value);

                const parsed = parseAddress(value);

                if (parsed.city) setCity(toTitleCaseVN(parsed.city));
                if (parsed.district) setDistrict(toTitleCaseVN(parsed.district));
              }}
            />

            <input
              className="w-full rounded-lg border px-4 py-3"
              placeholder="Thành phố"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />

            <input
              className="w-full rounded-lg border px-4 py-3"
              placeholder="Quận / Huyện"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
            />

            <div className="flex justify-center">
              <button
                type="submit" 
                disabled={loadingForm}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-lg"
              >
                {loadingForm ? "Đang tra cứu..." : "Tra cứu"}
              </button>
            </div>
          </form>
        )}

        {/* =========================
           TAB 2
        ========================= */}
        {activeTab === "cv" && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleSearchCV();
            }}
          >
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) =>
                  setCvFile(e.target.files?.[0] || null)
                }
              />
              <p className="text-xs text-gray-500 mt-2">
                Upload file CV (PDF)
              </p>
            </div>

            <div className="text-center text-gray-400 text-sm">HOẶC</div>

            <input
              className="w-full rounded-lg border px-4 py-3"
              placeholder="Dán link CV PDF"
              value={cvLink}
              onChange={(e) => setCvLink(e.target.value)}
            />

            <p className="text-xs text-gray-500 italic">
              CV chỉ dùng để hỗ trợ lọc job phù hợp
            </p>

            <div className="flex justify-center">
              <button
                type="submit" 
                disabled={loadingCV}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-lg"
              >
                {loadingCV ? "Đang tra cứu..." : "Tra cứu theo CV"}
              </button>
            </div>
          </form>
        )}

        {/* =========================
           OUTPUT (CẢ 2 TAB)
        ========================= */}
        {results.length > 0 && (
          <>
            <div className="relative mt-6">
              <button
                onClick={handleCopy}
                className="absolute top-2 right-2 text-gray-500 hover:text-orange-600"
              >
                📋
              </button>

              {copied && (
                <div className="absolute top-2 right-10 text-xs bg-black text-white px-2 py-1 rounded">
                  Đã sao chép
                </div>
              )}

              <textarea
                readOnly
                rows={Math.min(10, results.length + 1)}
                value={jobTextSummary}
                className="w-full rounded-lg border bg-gray-50 p-3 text-sm"
              />
            </div>

            <div className="pt-6 border rounded-lg overflow-hidden">
              {Object.entries(groupedByCompany).map(
                ([company, jobs]: any) => (
                  <div key={company}>
                    <button
                      onClick={() =>
                        setOpenCompany(
                          openCompany === company ? null : company
                        )
                      }
                      className="w-full flex justify-between items-center px-4 py-2 text-left bg-white hover:bg-orange-50 border-b"
                    >
                      <span className="font-medium">{company}</span>
                      <span className="text-xs text-gray-500">
                        {jobs.length} vị trí
                      </span>
                    </button>

                    {openCompany === company && (
                      <div className="bg-orange-50 px-4 py-3 space-y-2">
                        {jobs.map((job: CompanyResult, idx: number) => (
                          <div
                            key={idx}
                            className="bg-white rounded-md p-3 text-sm space-y-1"
                          >
                            <p className="font-medium">{job.job}</p>

                            {job.salary_min && job.salary_max && (
                              <p>
                                - Mức lương:{" "}
                                {Number(job.salary_min).toLocaleString()} –{" "}
                                {Number(job.salary_max).toLocaleString()} + thưởng
                              </p>
                            )}

                            {job.working_time && (
                              <p>
                                - Thời gian làm việc: {job.working_time}
                              </p>
                            )}

                            <p>- Địa chỉ: {job.address}</p>

                            {job.jd_link && (
                              <a
                                href={job.jd_link}
                                target="_blank"
                                className="text-orange-600 underline"
                              >
                                Xem JD
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}