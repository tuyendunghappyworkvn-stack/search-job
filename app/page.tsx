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

  /* =========================
     INPUT – TAB 1
  ========================= */
  const [companyKeyword, setCompanyKeyword] = useState("");
  const [jobKeyword, setJobKeyword] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");

  /* =========================
     AUTOCOMPLETE COMPANY
  ========================= */
  const [companyOptions, setCompanyOptions] = useState<string[]>([]);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  /* =========================
     RESULT
  ========================= */
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [openCompany, setOpenCompany] = useState<string | null>(null);

  /* =========================
     COPY
  ========================= */
  const [copied, setCopied] = useState(false);

  /* =========================
     TAB 2 – CV
  ========================= */
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvLink, setCvLink] = useState("");

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
     SEARCH
  ========================= */
  async function handleSearch() {
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
     GROUP
  ========================= */
  const groupedByCompany = results.reduce((acc: any, item) => {
    if (!acc[item.company]) acc[item.company] = [];
    acc[item.company].push(item);
    return acc;
  }, {});

  /* =========================
     TEXT COPY
  ========================= */
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
    <div className="min-h-screen bg-[#FFF7ED] flex justify-center px-4 py-10">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg p-8">
        {/* ================= HEADER ================= */}
        <div className="flex items-center gap-4 mb-6">
          <img src="/logo.png" alt="Happywork" className="h-10" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              TRA CỨU JOB
            </h1>
            <p className="text-gray-500 text-sm">
              Nhập thông tin hoặc dùng CV để lọc job phù hợp
            </p>
          </div>
        </div>

        {/* ================= TABS ================= */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("form")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeTab === "form"
                ? "bg-orange-500 text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            Nhập thông tin
          </button>

          <button
            onClick={() => setActiveTab("cv")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeTab === "cv"
                ? "bg-orange-500 text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            Search job theo CV
          </button>
        </div>

        {/* ================= TAB 1 ================= */}
        {activeTab === "form" && (
          <div className="space-y-4">
            {/* COMPANY */}
            <div className="relative">
              <input
                className={`w-full rounded-lg border px-4 py-3 ${
                  loadingCompanies ? "bg-gray-100" : ""
                }`}
                placeholder={
                  loadingCompanies
                    ? "Đang tải danh sách công ty..."
                    : "Công ty (gõ để tìm)"
                }
                disabled={loadingCompanies}
                value={companyKeyword}
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
                  <div className="absolute z-10 w-full bg-white border rounded-lg shadow max-h-52 overflow-auto mt-1">
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

            <input
              className="w-full rounded-lg border px-4 py-3"
              placeholder="Địa chỉ"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="flex justify-center pt-2">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-10 py-3 rounded-lg"
              >
                {loading ? "Đang tra cứu..." : "Tra cứu"}
              </button>
            </div>
          </div>
        )}

        {/* ================= TAB 2 ================= */}
        {activeTab === "cv" && (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-xl p-6 text-center">
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                id="cvUpload"
                onChange={(e) =>
                  setCvFile(e.target.files?.[0] || null)
                }
              />
              <label
                htmlFor="cvUpload"
                className="cursor-pointer text-sm text-gray-600"
              >
                {cvFile
                  ? `Đã chọn: ${cvFile.name}`
                  : "Click để upload CV PDF"}
              </label>
            </div>

            <input
              className="w-full rounded-lg border px-4 py-3"
              placeholder="Hoặc dán link CV (Google Drive / PDF)"
              value={cvLink}
              onChange={(e) => setCvLink(e.target.value)}
            />

            <div className="text-sm text-gray-500">
              CV chỉ dùng để hỗ trợ lọc job phù hợp, không lưu trữ.
            </div>
          </div>
        )}

        {/* ================= COPY TEXT ================= */}
        {results.length > 0 &&
          (companyKeyword || jobKeyword) && (
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
        )}

        {/* ================= RESULT ================= */}
        {results.length > 0 && (
          <div className="mt-6 border rounded-lg overflow-hidden">
            {Object.entries(groupedByCompany).map(
              ([company, jobs]: any) => {
                const isOpen = openCompany === company;

                return (
                  <div key={company}>
                    <button
                      onClick={() =>
                        setOpenCompany(isOpen ? null : company)
                      }
                      className="w-full flex justify-between items-center px-4 py-2 text-left bg-white hover:bg-orange-50 border-b"
                    >
                      <span className="font-medium">{company}</span>
                      <span className="text-xs text-gray-500">
                        {jobs.length} vị trí
                      </span>
                    </button>

                    {isOpen && (
                      <div className="bg-orange-50 px-4 py-3 space-y-2">
                        {jobs.map((job: CompanyResult, idx: number) => (
                          <div
                            key={idx}
                            className="bg-white rounded-md p-3 text-sm"
                          >
                            <p className="font-medium">{job.job}</p>

                            {job.salary_min &&
                              job.salary_max && (
                                <p>
                                  - Mức lương:{" "}
                                  {job.salary_min.toLocaleString()} –{" "}
                                  {job.salary_max.toLocaleString()} + thưởng
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
                );
              }
            )}
          </div>
        )}
      </div>
    </div>
  );
}
