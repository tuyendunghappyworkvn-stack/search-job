"use client";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#FFF7ED] flex items-center justify-center px-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-md p-8">
        {/* HEADER */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            TRA CỨU CÔNG TY
          </h1>
          <p className="text-gray-500 mt-2">
            Nhập địa chỉ để tra cứu công ty theo khu vực
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
              placeholder="VD: S202 Vinhomes Smart City, Nam Từ Liêm, Hà Nội"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* THÀNH PHỐ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thành phố
            </label>
            <input
              type="text"
              placeholder="Tự động nhận diện"
              disabled
              className="w-full rounded-lg border border-gray-200 bg-gray-100 px-4 py-3 text-gray-500"
            />
          </div>

          {/* QUẬN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quận / Huyện
            </label>
            <input
              type="text"
              placeholder="Tự động nhận diện"
              disabled
              className="w-full rounded-lg border border-gray-200 bg-gray-100 px-4 py-3 text-gray-500"
            />
          </div>

          {/* KẾT QUẢ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kết quả công ty
            </label>

            <div className="rounded-lg border border-dashed border-gray-300 p-4 text-gray-500 text-sm">
              Chưa có dữ liệu. Vui lòng nhập địa chỉ để tra cứu.
            </div>
          </div>

          {/* BUTTON */}
          <div className="pt-4 flex justify-center">
            <button
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-lg transition"
            >
              Tra cứu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
