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

  /* ===== AUTOCOMPLETE ===== */
  const [companyOptions, setCompanyOptions] = useState<string[]>([]);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  /* ===== TAB 2: CV ===== */
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvLink, setCvLink] = useState("");

  /* ===== RESULT TAB 1 ===== */
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [loading, setLoading] = useState(false);

  /* ===== RESULT TAB 2 ===== */
  const [resultsCV, setResultsCV] = useState<CompanyResult[]>([]);
  const [loadingCV, setLoadingCV] = useState(false);

  const [openCompany, setOpenCompany] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  /* =========================
     LOAD COMPANY OPTIONS
  ========================= */
  useEffect(() => {
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
    setLoading(true);
    setResults([]);

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
      setResults(data.companies || []);
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     SEARCH TAB 2 (CV)
  ========================= */
  async function handleSearchCV() {
    if (!cvFile && !cvLink) {
      alert("Vui lòng upload CV hoặc dán link CV");
      return;
    }

    setLoadingCV(true);
    setResultsCV([]);

    try {
      const formData = new FormData();
      if (cvFile) formData.append("file", cvFile);
      if (cvLink) formData.append("cvLink", cvLink);

      const resCV = await fetch("/api/read-cv", {
        method: "POST",
        body: formData,
      });

      const cvData = await resCV.json();
      const text = (cvData.text || "").toLowerCase();

      let job = "";
      let cityCV = "";
      let districtCV = "";

      if (text.includes("amazon")) job = "seller amazon";
      else if (text.includes("etsy")) job = "seller etsy";
      else if (text.includes("designer")) job = "designer";
      else if (text.includes("design")) job = "design";

      if (text.includes("hà nội")) cityCV = "Hà Nội";
      if (text.includes("thanh xuân")) districtCV = "Thanh Xuân";
      if (text.includes("hồ chí minh")) cityCV = "Hồ Chí Minh";

      const res = await fetch("/api/search-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobKeyword: job,
          city: cityCV,
          district: districtCV,
        }),
      });

      const data = await res.json();
      setResultsCV(data.companies || []);
    } finally {
      setLoadingCV(false);
    }
  }

  /* =========================
     COMMON HELPERS
  ========================= */
  function renderResultBlock(list: CompanyResult[]) {
    const grouped = list.reduce((acc: any, item) => {
      if (!acc[item.company]) acc[item.company] = [];
      acc[item.company].push(item);
      return acc;
    }, {});

    const textSummary = list
      .map(
        (item, idx) =>
          `${idx + 1}) ${item.company} - ${item.job} - ${item.jd_link}`
      )
      .join("\n");

    return (
      <>
        <div className="relative mt-6">
          <button
            onClick={() => {
              navigator.clipboard.writeText(textSummary);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="absolute top-2 right-2"
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
            rows={Math.min(10, list.length + 1)}
            value={textSummary}
            className="w-full rounded-lg border bg-gray-50 p-3 text-sm"
          />
        </div>

        <div className="pt-6 border rounded-lg overflow-hidden">
          {Object.entries(grouped).map(([company, jobs]: any) => (
            <div key={company}>
              <button
                onClick={() =>
                  setOpenCompany(openCompany === company ? null : company)
                }
                className="w-full flex justify-between px-4 py-2 text-left bg-white hover:bg-orange-50 border-b"
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
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF7ED] flex items-center justify-center px-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-md p-8">
        <h1 className="text-3xl font-bold text-center mb-6">TRA CỨU JOB</h1>

        <div className="flex rounded-lg overflow-hidden border mb-6">
          <button
            onClick={() => setActiveTab("form")}
            className={`flex-1 py-2 ${
              activeTab === "form"
                ? "bg-orange-500 text-white"
                : "bg-white"
            }`}
          >
            Nhập thông tin
          </button>
          <button
            onClick={() => setActiveTab("cv")}
            className={`flex-1 py-2 ${
              activeTab === "cv"
                ? "bg-orange-500 text-white"
                : "bg-white"
            }`}
          >
            Search job theo CV
          </button>
        </div>

        {activeTab === "form" && (
          <>
            <input
              className="w-full border rounded px-3 py-2 mb-3"
              placeholder="Công ty"
              value={companyKeyword}
              onChange={(e) => setCompanyKeyword(e.target.value)}
            />
            <input
              className="w-full border rounded px-3 py-2 mb-3"
              placeholder="Công việc"
              value={jobKeyword}
              onChange={(e) => setJobKeyword(e.target.value)}
            />
            <input
              className="w-full border rounded px-3 py-2 mb-3"
              placeholder="Thành phố"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <input
              className="w-full border rounded px-3 py-2 mb-4"
              placeholder="Quận / Huyện"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
            />

            <button
              onClick={handleSearchForm}
              disabled={loading}
              className="bg-orange-500 text-white px-6 py-2 rounded"
            >
              {loading ? "Đang tra cứu..." : "Tra cứu"}
            </button>

            {results.length > 0 && renderResultBlock(results)}
          </>
        )}

        {activeTab === "cv" && (
          <>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setCvFile(e.target.files?.[0] || null)}
            />

            <input
              className="w-full border rounded px-3 py-2 mt-3"
              placeholder="Dán link CV PDF"
              value={cvLink}
              onChange={(e) => setCvLink(e.target.value)}
            />

            <button
              onClick={handleSearchCV}
              disabled={loadingCV}
              className="bg-orange-500 text-white px-6 py-2 rounded mt-4"
            >
              {loadingCV ? "Đang tra cứu..." : "Tra cứu theo CV"}
            </button>

            {loadingCV && (
              <p className="text-sm text-gray-500 mt-2">
                Đang đọc CV và lọc job phù hợp...
              </p>
            )}

            {resultsCV.length > 0 && renderResultBlock(resultsCV)}
          </>
        )}
      </div>
    </div>
  );
}
