import React, { useEffect, useRef, useState } from 'react';

interface CaptainFaceCaptureProps {
  sideLabel: string;
  accentColor: string;
  captainName: string;
  verified: boolean;
  imageDataUrl: string;
  capturedTime: string;
  onChangeName: (name: string) => void;
  onChangeVerified: (verified: boolean) => void;
  onCapturedImage: (dataUrl: string, timeStr: string) => void;
  onClearImage: () => void;
}

/**
 * Resize ảnh bất kỳ về hình vuông gọn (tối đa 360x360 JPEG) để lưu DB nhanh và nhẹ
 */
function compressImageToSquareJpeg(source: HTMLVideoElement | HTMLImageElement): string {
  const targetSize = 360;
  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const srcW =
    source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
  const srcH =
    source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
  if (!srcW || !srcH) return '';

  const side = Math.min(srcW, srcH);
  const sx = (srcW - side) / 2;
  const sy = (srcH - side) / 2;

  ctx.drawImage(source, sx, sy, side, side, 0, 0, targetSize, targetSize);
  return canvas.toDataURL('image/jpeg', 0.8);
}

/**
 * Widget chụp ảnh xác nhận Face ID đội trưởng qua Webcam/Camera điện thoại hoặc tải ảnh lên
 */
export default function CaptainFaceCapture({
  sideLabel,
  accentColor,
  captainName,
  verified,
  imageDataUrl,
  capturedTime,
  onChangeName,
  onChangeVerified,
  onCapturedImage,
  onClearImage,
}: CaptainFaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopCamera = () => {
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setCameraReady(false);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  // Gắn MediaStream sau khi thẻ <video> đã mount thật vào DOM và gọi play() chuẩn
  useEffect(() => {
    if (!cameraActive || !streamRef.current || !videoRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    video.play().catch(() => {});
  }, [cameraActive]);

  const startCamera = async () => {
    setCameraError(null);
    setCameraReady(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Trình duyệt không hỗ trợ mở camera trực tiếp, vui lòng dùng nút Chọn ảnh.');
      return;
    }
    try {
      // Dùng tỷ lệ tự nhiên mặc định của webcam/camera để tránh lỗi sọc xám/vỡ khung trên Windows
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
    } catch {
      setCameraError('Không mở được camera (chưa cấp quyền hoặc camera đang được ứng dụng khác sử dụng).');
    }
  };

  const takeSnapshot = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0) return;
    const dataUrl = compressImageToSquareJpeg(video);
    if (dataUrl) {
      const timeStr = new Date().toLocaleString('vi-VN');
      onCapturedImage(dataUrl, timeStr);
    }
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const compressed = compressImageToSquareJpeg(img);
        if (compressed) {
          const timeStr = new Date().toLocaleString('vi-VN');
          onCapturedImage(compressed, timeStr);
        }
      };
      if (typeof reader.result === 'string') {
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div
      className="rounded-xl bg-[#11141c] border p-4 space-y-3"
      style={{ borderColor: `${accentColor}45` }}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-xs font-display font-bold uppercase tracking-wider"
          style={{ color: accentColor }}
        >
          {sideLabel}
        </span>
        {verified && (
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-semibold">
            ✓ Đã xác nhận Face ID
          </span>
        )}
      </div>

      <div>
        <label className="block text-[11px] text-gray-400 mb-1">Họ tên đội trưởng</label>
        <input
          type="text"
          value={captainName}
          onChange={(e) => onChangeName(e.target.value)}
          placeholder="Nhập họ và tên đội trưởng..."
          className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start">
        {/* Khung ảnh hoặc webcam */}
        <div
          className={`rounded-xl bg-black/60 border border-white/15 overflow-hidden relative shrink-0 flex items-center justify-center ${
            cameraActive ? 'w-48 aspect-[4/3]' : 'w-36 h-36'
          }`}
        >
          {cameraActive ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onLoadedData={() => setCameraReady(true)}
                className="w-full h-full object-contain bg-black"
              />
              {!cameraReady && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-[11px] text-gray-300">
                  Đang mở camera...
                </div>
              )}
              <div className="pointer-events-none absolute inset-y-2 left-1/2 -translate-x-1/2 aspect-square rounded-full border-2 border-dashed border-emerald-400/70" />
            </>
          ) : imageDataUrl ? (
            <img
              src={imageDataUrl}
              alt={sideLabel}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center px-2 text-[11px] text-gray-500">
              Chưa có ảnh Face ID
            </div>
          )}
        </div>

        {/* Nút thao tác & checkbox xác nhận */}
        <div className="flex-1 space-y-2.5 w-full">
          {cameraActive ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!cameraReady}
                onClick={takeSnapshot}
                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-bold text-white"
              >
                📸 Chụp ảnh xác nhận
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-gray-200"
              >
                Hủy
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={startCamera}
                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white"
              >
                📷 Mở Camera chụp mặt
              </button>
              <label className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-gray-200 cursor-pointer">
                🖼️ Chọn ảnh
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {imageDataUrl && (
                <button
                  type="button"
                  onClick={onClearImage}
                  className="px-2.5 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-xs text-red-300"
                >
                  Xóa ảnh
                </button>
              )}
            </div>
          )}

          {cameraError && (
            <p className="text-[11px] text-red-400">{cameraError}</p>
          )}

          <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-200 pt-1">
            <input
              type="checkbox"
              checked={verified}
              onChange={(e) => onChangeVerified(e.target.checked)}
            />
            <span>Đội trưởng đã xác nhận Face ID (ghi vào biên bản)</span>
          </label>

          {capturedTime && (
            <div className="text-[11px] text-gray-400">
              Chụp lúc: {capturedTime}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
