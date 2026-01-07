"use client";

import { useEffect, useState } from "react";

/* =========================
   FORMAT ĐỊA DANH VIỆT NAM
========================= */
function formatVietnameseLocation(str: string) {
  if (!str) return "";
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/* =========================
   PARSE ĐỊA CHỈ VIỆT NAM
========================= */
function parseAddressVN(address: string) {
  if (!address) return { city: "", district: "" };

  const parts = address.split(",").map((p) => p.trim().toLowerCase());
  let city = "";
  let district = "";

  for (const part of parts) {
    if (
      part.includes("hà nội") ||
      part.includes("hồ chí minh") ||
      part.includes("tp.") ||
      part.includes("đà nẵng") ||
      part.includes("cần thơ")
    ) {
      city = part;
    }

    if (
      part.includes("quận") ||
      part.includes("huyện") ||
      part.includes("thị xã") ||
      part.includes("nam từ liêm") ||
      part.includes("bắc từ liêm") ||
      part.includes("thanh xuân")
    ) {
      district = part;
    }
  }

  return { city, district };
}

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
  /* ===== INPUT ===== */
  const [companyKeyword, setCompanyKeyword] = useState("");
  const [jobKeyword, setJobKeyword] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");

  const [cityTouched, setCityTouched] = useState(false);
  const [districtTouched, setDistrictTouched] = useState(false);

  /* ===== AUTOCOMPLETE ===== */
  const [companyOptions, setCompanyOptions] = useState<string[]>([]);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  /* ===== RESULT ===== */
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [openCompany, setOpenCompany] = useState<string | null>(null);

  /* =========================
     LOAD COMPANY OPTIONS
  ========================= */
  useEffect(() => {
    fetch("/api/companies")
      .then((res) => res.json())
      .then((data) => setCompanyOptions(data.companies || []));
  }, []);

  const filteredCompanies = companyOptions.filter((c) =>
    c.toLowerCase().includes(companyKeyword.toLowerCase())
  );

  function handleAddressChange(value: string) {
    setAddress(value);

    if (!value.trim()) {
      if (!cityTouched) setCity("");
      if (!districtTouched) setDistrict("");
      return;
    }

    const parsed = parseAddressVN(value);
    if (!cityTouched && parsed.city)
      setCity(formatVietnameseLocation(parsed.city));
    if (!districtTouched && parsed.district)
      setDistrict(formatVietnameseLocation(parsed.district));
  }

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
          companyKeyword, // ✅ gửi thêm công ty
        }),
      });

      const data = await res.json();
      setResults(data.companies || []);
    } finally {
      setLoading(false);
    }
  }

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

  return (
    <div className="min-h-screen bg-[#FFF7ED] flex items-center justify-center px-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-md p-8">
        {/* HEADER */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            TRA CỨU JOB
          </h1>
          <p className="text-gray-500 mt-2">
            Nhập thông tin để tra job
          </p>
        </div>

        {/* FORM */}
        <div className="space-y-5">
          {/* ===== CÔNG TY (AUTOCOMPLETE) ===== */}
          <div className="relative">
            <input
              className="w-full rounded-lg border px-4 py-3"
              placeholder="Công ty (gõ để tìm)"
              value={companyKeyword}
              onChange={(e) => {
                setCompanyKeyword(e.target.value);
                setShowCompanyDropdown(true);
              }}
              onBlur={() =>
                setTimeout(() => setShowCompanyDropdown(false), 150)
              }
            />

            {showCompanyDropdown &&
              companyKeyword &&
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

          {/* ===== CÔNG VIỆC (TRÊN ĐỊA CHỈ) ===== */}
          <input
            className="w-full rounded-lg border px-4 py-3"
            placeholder="Công việc (VD: Designer POD)"
            value={jobKeyword}
            onChange={(e) => setJobKeyword(e.target.value)}
          />

          {/* ===== ĐỊA CHỈ ===== */}
          <input
            className="w-full rounded-lg border px-4 py-3"
            placeholder="Địa chỉ"
            value={address}
            onChange={(e) => handleAddressChange(e.target.value)}
          />

          <input
            className="w-full rounded-lg border px-4 py-3"
            placeholder="Thành phố"
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setCityTouched(true);
            }}
          />

          <input
            className="w-full rounded-lg border px-4 py-3"
            placeholder="Quận / Huyện"
            value={district}
            onChange={(e) => {
              setDistrict(e.target.value);
              setDistrictTouched(true);
            }}
          />

          <div className="flex justify-center">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600
              text-white font-semibold px-8 py-3 rounded-lg"
            >
              {loading ? "Đang tra cứu..." : "Tra cứu"}
            </button>
          </div>

          {/* ===== TEXT COPY ===== */}
          {jobKeyword.trim() && results.length > 0 && (
            <div className="relative mt-6">
              <button
                onClick={() =>
                  navigator.clipboard.writeText(jobTextSummary)
                }
                className="absolute top-2 right-2 text-gray-500 hover:text-orange-600"
              >
                📋
              </button>

              <textarea
                readOnly
                rows={Math.min(10, results.length + 1)}
                value={jobTextSummary}
                className="w-full rounded-lg border bg-gray-50 p-3 text-sm"
              />
            </div>
          )}

          {/* ===== KẾT QUẢ ===== */}
          {results.length > 0 && (
            <div className="pt-6 border rounded-lg overflow-hidden">
              {Object.entries(groupedByCompany).map(
                ([company, jobs]: any) => {
                  const isOpen = openCompany === company;

                  return (
                    <div key={company}>
                      <button
                        onClick={() =>
                          setOpenCompany(isOpen ? null : company)
                        }
                        className="w-full flex justify-between items-center
                          px-4 py-2 text-left bg-white
                          hover:bg-orange-50 border-b"
                      >
                        <span className="font-medium">
                          {company}
                        </span>
                        <span className="text-xs text-gray-500">
                          {jobs.length} vị trí
                        </span>
                      </button>

                      {isOpen && (
                        <div className="bg-orange-50 px-4 py-3 space-y-2">
                          {jobs.map(
                            (job: CompanyResult, idx: number) => (
                              <div
                                key={idx}
                                className="bg-white rounded-md p-3 text-sm"
                              >
                                <p className="font-medium">
                                  {job.job}
                                </p>

                                {job.salary_min &&
                                  job.salary_max && (
                                    <p>
                                      - Mức lương:{" "}
                                      {Number(
                                        job.salary_min
                                      ).toLocaleString()}{" "}
                                      –{" "}
                                      {Number(
                                        job.salary_max
                                      ).toLocaleString()}{" "}
                                      + thưởng
                                    </p>
                                  )}

                                {job.working_time && (
                                  <p>
                                    - Thời gian làm việc:{" "}
                                    {job.working_time}
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
                            )
                          )}
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
    </div>
  );
}
