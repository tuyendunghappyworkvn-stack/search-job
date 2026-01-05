"use client";

import { useState } from "react";

/* =========================
   FORMAT ĐỊA DANH VIỆT NAM
   (viết hoa đúng sau khi user nhập)
========================= */
function formatVietnameseLocation(str: string) {
  if (!str) return "";

  let text = str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

  // Viết hoa từng tiếng
  text = text
    .split(" ")
    .map(
      (word) => word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");

  // Chuẩn hoá các tiền tố hành chính phổ biến
  text = text
    .replace(/^Tp\.?\s?/i, "Thành phố ")
    .replace(/^Tp\s?/i, "Thành phố ")
    .replace(/^Hcm$/i, "Thành phố Hồ Chí Minh")
    .replace(/^Tphcm$/i, "Thành phố Hồ Chí Minh")
    .replace(/^Hà Nội$/i, "Hà Nội")
    .replace(/^Quận\s*/i, "Quận ")
    .replace(/^Huyện\s*/i, "Huyện ")
    .replace(/^Thị Xã\s*/i, "Thị xã ");

  return text;
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
      part.includes("bắc từ liêm")
    ) {
      district = part;
    }
  }

  return { city, district };
}

export default function HomePage() {
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");

  /* =========================
     HANDLE ADDRESS CHANGE
  ========================= */
  function handleAddressChange(value: string) {
    setAddress(value);

    const parsed = parseAddressVN(value);

    // chỉ auto fill nếu user CHƯA nhập tay
    if (!city && parsed.city) {
      setCity(formatVietnameseLocation(parsed.city));
    }

    if (!district && parsed.district) {
      setDistrict(formatVietnameseLocation(parsed.district));
    }
  }

  function handleSearch() {
    console.log("SEARCH WITH:", {
      address,
      city,
      district,
    });
  }

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
              onBlur={() =>
                setAddress(formatVietnameseLocation(address))
              }
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
              onChange={(e) => setCity(e.target.value)}
              onBlur={() =>
                setCity(formatVietnameseLocation(city))
              }
              placeholder="Tự động nhận diện hoặc nhập tay"
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
              onChange={(e) => setDistrict(e.target.value)}
              onBlur={() =>
                setDistrict(formatVietnameseLocation(district))
              }
              placeholder="Tự động nhận diện hoặc nhập tay"
              className="w-full rounded-lg border border-gray-300 px-4 py-3
                focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* KẾT QUẢ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kết quả công ty
            </label>
            <div className="rounded-lg border border-dashed border-gray-300 p-4 text-gray-500 text-sm">
              Chưa có dữ liệu. Vui lòng tra cứu.
            </div>
          </div>

          {/* BUTTON */}
          <div className="pt-4 flex justify-center">
            <button
              onClick={handleSearch}
              className="bg-orange-500 hover:bg-orange-600
                text-white font-semibold px-8 py-3 rounded-lg transition"
            >
              Tra cứu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
