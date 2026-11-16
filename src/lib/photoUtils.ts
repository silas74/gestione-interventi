import { DefectPhoto } from '../types';

/**
 * Draws a clean timestamp + project/zone watermark ribbon at the bottom of a canvas
 */
function drawWatermarkRibbon(ctx: CanvasRenderingContext2D, width: number, height: number, text: string) {
  if (!text.trim()) return;
  const fontSize = Math.max(14, Math.round(Math.min(width, height) * 0.028));
  const paddingX = Math.round(fontSize * 0.8);
  const ribbonHeight = Math.round(fontSize * 2.1);

  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
  ctx.fillRect(0, height - ribbonHeight, width, ribbonHeight);

  // Subtle top border line on the ribbon
  ctx.fillStyle = 'rgba(250, 204, 21, 0.85)';
  ctx.fillRect(0, height - ribbonHeight, width, 2);

  ctx.font = `bold ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
  ctx.fillStyle = '#fef08a'; // yellow-200
  ctx.textBaseline = 'middle';
  ctx.fillText(text, paddingX, height - ribbonHeight / 2 + 1, width - paddingX * 2);
  ctx.restore();
}

/**
 * Compresses an image file/blob to a max dimension (default 1280px) and JPEG quality (0.82)
 * while preserving 100% of the original aspect ratio, and optionally stamps a watermark.
 */
export async function compressAndProcessImage(
  file: File | Blob,
  customName?: string,
  maxDimension: number = 1280,
  quality: number = 0.82,
  watermarkText?: string
): Promise<DefectPhoto> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        reject(new Error('Empty image data'));
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image data'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            id: 'photo_' + Math.random().toString(36).substring(2, 9),
            url: dataUrl,
            name: customName || (file instanceof File ? file.name : `report_photo_${Date.now()}.jpg`),
            uploadedAt: new Date().toISOString()
          });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        if (watermarkText && watermarkText.trim()) {
          drawWatermarkRibbon(ctx, width, height, watermarkText.trim());
        }

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

        resolve({
          id: 'photo_' + Math.random().toString(36).substring(2, 9),
          url: compressedDataUrl,
          name: customName || (file instanceof File ? file.name : `report_photo_${Date.now()}.jpg`),
          uploadedAt: new Date().toISOString()
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Applies a timestamp + project/zone watermark ribbon onto an existing photo dataUrl
 */
export async function applyWatermarkToDataUrl(dataUrl: string, watermarkText: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error('Cannot load image for watermark'));
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, img.width, img.height);
      drawWatermarkRibbon(ctx, img.width, img.height, watermarkText);
      resolve(canvas.toDataURL('image/jpeg', 0.88));
    };
    img.src = dataUrl;
  });
}

/**
 * Extracts all image files from clipboard data (for Ctrl+V / Paste events)
 */
export function extractImagesFromClipboard(clipboardData: DataTransfer | null): File[] {
  if (!clipboardData || !clipboardData.items) return [];

  const imageFiles: File[] = [];
  const items = clipboardData.items;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.indexOf('image') !== -1) {
      const file = item.getAsFile();
      if (file) {
        imageFiles.push(file);
      }
    }
  }

  return imageFiles;
}

/**
 * Attempts to read clipboard images via Async Clipboard API (for "Incolla da Appunti" button)
 */
export async function readClipboardImagesAsync(): Promise<File[]> {
  if (!navigator.clipboard || !navigator.clipboard.read) {
    throw new Error('Clipboard API not supported in this browser context.');
  }

  const items = await navigator.clipboard.read();
  const imageFiles: File[] = [];

  for (const item of items) {
    const imageType = item.types.find(t => t.startsWith('image/'));
    if (imageType) {
      const blob = await item.getType(imageType);
      const file = new File([blob], `pasted_photo_${Date.now()}.${imageType.split('/')[1] || 'jpg'}`, { type: imageType });
      imageFiles.push(file);
    }
  }

  return imageFiles;
}
