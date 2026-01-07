"use client";

import { useState } from "react";

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
   TYPES (UPDATED)
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
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");

  const [cityTouched, setCityTouched] = useState(false);
  const [districtTouched, setDistrictTouched] = useState(false);

  const [results, setResults] = useState<CompanyResult[]>([]);
  const [loading, setLoading] = useState(false);

  const [openCompany, setOpenCompany] = useState<string | null>(null);

  /* =========================
     HANDLE ADDRESS CHANGE
  ========================= */
  function handleAddressChange(value: string) {
    setAddress(value);

    if (!value.trim()) {
      if (!cityTouched) setCity("");
      if (!districtTouched) setDistrict("");
      return;
    }

    const parsed = parseAddressVN(value);

    if (!cityTouched && parsed.city) {
      setCity(formatVietnameseLocation(parsed.city));
    }

    if (!districtTouched && parsed.district) {
      setDistrict(formatVietnameseLocation(parsed.district));
    }
  }

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
        body: JSON.stringify({ city, district }),
      });

      const data = await res.json();
      setResults(data.companies || []);
    } catch (err) {
      console.error("SEARCH ERROR:", err);
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     GROUP THEO CÔNG TY
  ========================= */
  const groupedByCompany = results.reduce((acc: any, item) => {
    if (!acc[item.company]) acc[item.company] = [];
    acc[item.company].push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#FFF7ED] flex items-center justify-center px-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-md p-8">
        {/* HEADER */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            TRA CỨU CÔNG TY
          </h1>
          <p className="text-gray-500 mt-2">
            Nhập thông tin để tra cứu công ty
          </p>
        </div>

        {/* FORM */}
        <div className="space-y-5">
          {/* ĐỊA CHỈ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Địa chỉ
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => handleAddressChange(e.target.value)}
              placeholder="VD: C14 Bắc Hà, Trung Văn, Nam Từ Liêm, Hà Nội"
              className="w-full rounded-lg border border-gray-300 px-4 py-3
              focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* THÀNH PHỐ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thành phố
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setCityTouched(true);
              }}
              onBlur={() => setCity(formatVietnameseLocation(city))}
              className="w-full rounded-lg border border-gray-300 px-4 py-3
              focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* QUẬN / HUYỆN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quận / Huyện
            </label>
            <input
              type="text"
              value={district}
              onChange={(e) => {
                setDistrict(e.target.value);
                setDistrictTouched(true);
              }}
              onBlur={() =>
                setDistrict(formatVietnameseLocation(district))
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-3
              focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* BUTTON */}
          <div className="pt-2 flex justify-center">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600
              text-white font-semibold px-8 py-3 rounded-lg transition disabled:opacity-60"
            >
              {loading ? "Đang tra cứu..." : "Tra cứu"}
            </button>
          </div>

          {/* ===== KẾT QUẢ ===== */}
          {results.length > 0 && (
            <div className="pt-6 space-y-3">
              {Object.entries(groupedByCompany).map(
                ([company, jobs]: any, idx: number) => {
                  const isOpen = openCompany === company;

                  return (
                    <div
                      key={company}
                      className="border rounded-lg overflow-hidden"
                    >
                      {/* COMPANY HEADER */}
                      <button
                        onClick={() =>
                          setOpenCompany(isOpen ? null : company)
                        }
                        className={`
                          w-full flex justify-between items-center
                          px-4 py-2.5
                          text-left font-medium
                          transition
                          ${idx % 2 === 0 ? "bg-white" : "bg-orange-50"}
                          hover:bg-orange-100
                        `}
                      >
                        <span>{company}</span>
                        <span className="text-sm text-gray-500">
                          {jobs.length} vị trí
                        </span>
                      </button>

                      {/* JOB DETAIL */}
                      {isOpen && (
                        <div className="border-t px-4 py-3 space-y-2 bg-white">
                          {jobs.map(
                            (job: CompanyResult, jdx: number) => (
                              <div
                                key={jdx}
                                className="rounded-md bg-orange-50 p-2 text-sm"
                              >
                                <p className="font-medium text-gray-900">
                                  {job.job}
                                </p>

                                {job.salary_min &&
                                  job.salary_max && (
                                    <p className="text-gray-600">
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
                                  <p className="text-gray-600">
                                    - Thời gian làm việc:{" "}
                                    {job.working_time}
                                  </p>
                                )}

                                {job.address && (
                                  <p className="text-gray-600">
                                    - Địa chỉ: {job.address}
                                  </p>
                                )}

                                {job.jd_link && (
                                  <p className="text-gray-600">
                                    - Link JD:{" "}
                                    <a
                                      href={job.jd_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-orange-600 underline"
                                    >
                                      Xem chi tiết
                                    </a>
                                  </p>
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
