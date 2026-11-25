import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Icon mở tab mới nét 1.5px
 */
function ArrowUpRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

/**
 * Trang chủ chọn bộ môn thi đấu - Giải đấu FITCUP (Khoa CNTT - NEU)
 */
export default function Home() {
  return (
    <div className="min-h-screen bg-[#0b0d14] text-[#eef0f5] flex flex-col justify-between font-body">
      {/* Thanh đầu trang: Cụm nhận diện Khoa CNTT - ĐH Kinh tế Quốc dân */}
      <header className="w-full max-w-6xl mx-auto px-6 md:px-10 pt-6 pb-4 flex items-center justify-between gap-4 border-b border-[rgba(238,240,245,0.08)]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden shrink-0">
            <img
              src="/logo-neu.png"
              alt="Đại học Kinh tế Quốc dân"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <div className="leading-tight">
            <div
              className="text-base md:text-lg font-normal tracking-wide uppercase text-[#2d8cff]"
              style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
            >
              KHOA CÔNG NGHỆ THÔNG TIN
            </div>
            <div
              className="text-xs font-normal text-[#a3a9b8] mt-0.5"
              style={{ fontFamily: "'Roboto', sans-serif" }}
            >
              Faculty of Information Technology
            </div>
          </div>
        </div>

        <Link
          to="/matches"
          className="h-9 px-3.5 rounded-lg bg-[#11141c] hover:bg-[#1a1e28] border border-[rgba(238,240,245,0.1)] text-xs text-[#a3a9b8] hover:text-[#eef0f5] inline-flex items-center transition-colors duration-150 shrink-0"
        >
          Lịch sử trận đấu
        </Link>
      </header>

      {/* Nội dung chính */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 md:px-10 py-10 md:py-14 flex flex-col justify-center gap-10">
        {/* Khối tiêu đề căn trái */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
          className="max-w-2xl space-y-3"
        >
          <p className="text-xs font-medium text-[#7a8296]">
            Giải đấu FITCUP · Khoa Công nghệ Thông tin
          </p>
          <h1 className="text-3xl md:text-5xl font-semibold tracking-[-0.02em] leading-[1.1] text-[#eef0f5]">
            Điều khiển Ban/Pick và Quay Map
          </h1>
          <p className="text-base md:text-lg text-[#a3a9b8] leading-relaxed">
            Hệ thống điều khiển Ban/Pick và Quay Map phục vụ điều hành các trận đấu trong khuôn khổ FITCUP
          </p>
        </motion.div>

        {/* Hai bộ môn thi đấu */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06, ease: EASE_OUT }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Bộ môn 1: Liên Quân Mobile */}
          <section className="rounded-xl bg-[#11141c] border border-[rgba(238,240,245,0.08)] overflow-hidden flex flex-col justify-between">
            <div>
              {/* Vạch nhận diện bộ môn mảnh 2px */}
              <div className="h-[2px] w-full bg-[#3185FF]" />

              <div className="p-6 space-y-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-lg bg-[#1a1e28] border border-[rgba(238,240,245,0.08)] flex items-center justify-center p-1.5 shrink-0">
                    <img
                      src="/icon-lq.png"
                      alt="Liên Quân Mobile"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h2 className="text-xl font-medium text-[#eef0f5] leading-snug">
                      Liên Quân Mobile
                    </h2>
                    <p className="text-xs text-[#7a8296] tabular-nums mt-0.5">
                      5v5 · Cấm &amp; Chọn tướng
                    </p>
                  </div>
                </div>

                <p className="text-sm text-[#a3a9b8] leading-relaxed">
                  Vận hành lượt cấm chọn 5v5 theo thứ tự chuẩn giải đấu, hỗ trợ đồng hồ đếm ngược và nhập tên tuyển thủ
                </p>

                {/* Bảng thông số gọn */}
                <dl className="divide-y divide-[rgba(238,240,245,0.06)] border-y border-[rgba(238,240,245,0.06)] text-xs">
                  <div className="py-2.5 flex items-center justify-between gap-4">
                    <dt className="text-[#7a8296]">Luồng mặc định</dt>
                    <dd className="text-[#eef0f5] tabular-nums">5 Ban / 5 Pick (tuỳ chỉnh 3–4 Ban)</dd>
                  </div>
                  <div className="py-2.5 flex items-center justify-between gap-4">
                    <dt className="text-[#7a8296]">Kho tướng</dt>
                    <dd className="text-[#eef0f5] tabular-nums">130 tướng · Lọc vai trò &amp; tìm không dấu</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Thanh thao tác */}
            <div className="px-6 pb-6 pt-1 flex flex-wrap items-center gap-2.5">
              <Link
                to="/lq/control"
                className="h-10 px-4 rounded-lg bg-[#eef0f5] hover:bg-white text-[#0b0d14] text-sm font-medium inline-flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] transition-colors duration-150 active:scale-[0.98]"
              >
                Mở bảng điều khiển
              </Link>
              <Link
                to="/lq/overlay"
                target="_blank"
                className="h-10 px-3.5 rounded-lg bg-[#1a1e28] hover:bg-[#232836] border border-[rgba(238,240,245,0.1)] text-[#eef0f5] text-sm font-normal inline-flex items-center gap-1.5 transition-colors duration-150 active:scale-[0.98]"
              >
                <span>Màn hình chiếu</span>
                <ArrowUpRightIcon />
              </Link>
              <Link
                to="/lq/admin"
                className="h-10 px-3 rounded-lg text-sm text-[#a3a9b8] hover:text-[#eef0f5] inline-flex items-center transition-colors duration-150 ml-auto"
              >
                Quản trị tướng
              </Link>
            </div>
          </section>

          {/* Bộ môn 2: Valorant */}
          <section className="rounded-xl bg-[#11141c] border border-[rgba(238,240,245,0.08)] overflow-hidden flex flex-col justify-between">
            <div>
              {/* Vạch nhận diện bộ môn mảnh 2px */}
              <div className="h-[2px] w-full bg-[#FF4057]" />

              <div className="p-6 space-y-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-lg bg-[#1a1e28] border border-[rgba(238,240,245,0.08)] flex items-center justify-center p-2 shrink-0">
                    <img
                      src="/icon-valorant.svg"
                      alt="Valorant"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h2 className="text-xl font-medium text-[#eef0f5] leading-snug">
                      Valorant
                    </h2>
                    <p className="text-xs text-[#7a8296] tabular-nums mt-0.5">
                      5v5 · Veto &amp; Quay Map
                    </p>
                  </div>
                </div>

                <p className="text-sm text-[#a3a9b8] leading-relaxed">
                  Ban/Pick bản đồ theo thể thức Bo1, Bo3, Bo5 hoặc quay ngẫu nhiên bản đồ thi đấu cho từng cặp trận
                </p>

                {/* Bảng thông số gọn */}
                <dl className="divide-y divide-[rgba(238,240,245,0.06)] border-y border-[rgba(238,240,245,0.06)] text-xs">
                  <div className="py-2.5 flex items-center justify-between gap-4">
                    <dt className="text-[#7a8296]">Thể thức</dt>
                    <dd className="text-[#eef0f5] tabular-nums">Bo1 · Bo3 · Bo5 · Ban trước khi quay</dd>
                  </div>
                  <div className="py-2.5 flex items-center justify-between gap-4">
                    <dt className="text-[#7a8296]">Chế độ vận hành</dt>
                    <dd className="text-[#eef0f5] tabular-nums">Veto chọn bên &amp; 3 kiểu quay map</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Thanh thao tác */}
            <div className="px-6 pb-6 pt-1 flex flex-wrap items-center gap-2.5">
              <Link
                to="/valorant/control"
                className="h-10 px-4 rounded-lg bg-[#eef0f5] hover:bg-white text-[#0b0d14] text-sm font-medium inline-flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] transition-colors duration-150 active:scale-[0.98]"
              >
                Mở bảng điều khiển
              </Link>
              <Link
                to="/valorant/overlay"
                target="_blank"
                className="h-10 px-3.5 rounded-lg bg-[#1a1e28] hover:bg-[#232836] border border-[rgba(238,240,245,0.1)] text-[#eef0f5] text-sm font-normal inline-flex items-center gap-1.5 transition-colors duration-150 active:scale-[0.98]"
              >
                <span>Màn hình chiếu</span>
                <ArrowUpRightIcon />
              </Link>
            </div>
          </section>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-6 md:px-10 py-5 border-t border-[rgba(238,240,245,0.08)] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#7a8296]">
        <span>Author: Ngô Tiến Dũng - Trưởng Ban Tổ chức</span>
        <span>Khoa Công nghệ Thông tin · Đại học Kinh tế Quốc dân</span>
      </footer>
    </div>
  );
}
