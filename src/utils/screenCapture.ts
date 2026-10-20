/**
 * Standalone Screen Capture, Cropping & Preprocessing Pipeline
 * Targeted directly at DeltaMath's UI layout for 100% offline accuracy.
 */

export interface CropDimensions {
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
}

/**
 * Calculates targeted crop coordinates for DeltaMath's question container.
 * Bypasses left sidebar, top header (Score, Penalty, Watch Video), and bottom toolbar.
 */
export function getDeltaMathCropDimensions(srcW: number, srcH: number): CropDimensions {
  return {
    cropX: Math.floor(srcW * 0.20), // bypass left sidebar
    cropY: Math.floor(srcH * 0.22), // bypass "Score", "Penalty", "Watch Video"
    cropW: Math.floor(srcW * 0.65), // main problem width
    cropH: Math.floor(srcH * 0.38), // question text + KaTeX equation
  };
}

/**
 * Captures and crops the active question area from a live video element.
 * Applies high-contrast binarization to make thin KaTeX fonts crisp for OCR.
 */
export function captureAndPreprocessFrame(
  video: HTMLVideoElement,
  customCrop?: Partial<CropDimensions>
): { canvas: HTMLCanvasElement; dataUrl: string } | null {
  const srcW = video.videoWidth;
  const srcH = video.videoHeight;

  if (!srcW || !srcH || video.readyState < 2) {
    return null;
  }

  const defaultCrop = getDeltaMathCropDimensions(srcW, srcH);
  const cropX = customCrop?.cropX ?? defaultCrop.cropX;
  const cropY = customCrop?.cropY ?? defaultCrop.cropY;
  const cropW = customCrop?.cropW ?? defaultCrop.cropW;
  const cropH = customCrop?.cropH ?? defaultCrop.cropH;

  // Offscreen canvas matching the cropped dimensions
  const canvas = document.createElement('canvas');
  canvas.width = cropW;
  canvas.height = cropH;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  // 1. Draw cropped region
  ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  // 2. High-Contrast Binarization Filter (Pre-OCR)
  // KaTeX math characters have thin lines and faint anti-aliasing that cause OCR misreads.
  try {
    const imgData = ctx.getImageData(0, 0, cropW, cropH);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      // Grayscale luminance formula:
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

      // High-contrast binarization threshold (black text on white background)
      const val = gray > 175 ? 255 : 0;
      data[i] = val;     // R
      data[i + 1] = val; // G
      data[i + 2] = val; // B
      // Alpha remains 255
    }

    ctx.putImageData(imgData, 0, 0);
  } catch (err) {
    console.warn('Preprocessing canvas warning:', err);
  }

  return {
    canvas,
    dataUrl: canvas.toDataURL('image/png'),
  };
}

/**
 * Computes a fast 32-bit FNV-1a hash over a 32x32 downsampled thumbnail.
 * Used by the background auto-watcher to detect screen changes with negligible CPU overhead.
 */
export function computeFrameHash32(sourceCanvas: HTMLCanvasElement): number {
  try {
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 32;
    thumbCanvas.height = 32;
    const ctx = thumbCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 0;

    // Downsample
    ctx.drawImage(sourceCanvas, 0, 0, 32, 32);
    const imgData = ctx.getImageData(0, 0, 32, 32).data;

    // 32-bit FNV-1a Hash
    let hash = 0x811c9dc5; // 2166136261
    for (let i = 0; i < imgData.length; i += 4) {
      // Luminance byte
      const lum = (0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2]) | 0;
      hash ^= lum;
      // 32-bit FNV prime multiply: hash * 16777619
      hash = Math.imul(hash, 0x01000193);
    }

    return hash >>> 0; // Unsigned 32-bit integer
  } catch {
    return 0;
  }
}

/**
 * Evaluates whether two frame hashes differ significantly (> 5% threshold).
 */
export function hasFrameChanged(currentHash: number, lastHash: number, thresholdPercent = 5): boolean {
  if (lastHash === 0 && currentHash !== 0) return true;
  if (currentHash === 0) return false;

  const diff = Math.abs(currentHash - lastHash);
  // Compare normalized change against 2^32 space or ratio
  const maxUint32 = 4294967295;
  const ratio = (diff / maxUint32) * 100;

  return ratio > (thresholdPercent / 10);
}
