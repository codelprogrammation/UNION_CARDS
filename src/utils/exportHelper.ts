import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';

export interface CaptureOptions {
  pixelRatio?: number;
  backgroundColor?: string | null;
  filter?: (domNode: HTMLElement) => boolean;
}

// 1x1 transparent PNG fallback placeholder
const TRANSPARENT_FALLBACK_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

/**
 * Pre-processes images in an element to inline Base64 data URLs
 * to ensure zero CORS or external fetch errors during rendering.
 */
async function inlineImagesInElement(element: HTMLElement): Promise<void> {
  const images = element.querySelectorAll('img');
  const promises: Promise<void>[] = [];

  images.forEach((img) => {
    if (!img.src || img.src.startsWith('data:')) return;

    promises.push(
      new Promise<void>((resolve) => {
        try {
          const tempImg = new Image();
          tempImg.crossOrigin = 'anonymous';
          tempImg.referrerPolicy = 'no-referrer';
          tempImg.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = tempImg.naturalWidth || 100;
              canvas.height = tempImg.naturalHeight || 100;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(tempImg, 0, 0);
                img.src = canvas.toDataURL('image/png');
              }
            } catch {
              // Ignore tainted canvas; htmlToImage imagePlaceholder will handle
            }
            resolve();
          };
          tempImg.onerror = () => {
            resolve();
          };
          tempImg.src = img.src;
        } catch {
          resolve();
        }
      })
    );
  });

  try {
    await Promise.race([
      Promise.all(promises),
      new Promise((resolve) => setTimeout(resolve, 800)), // timeout safety
    ]);
  } catch {
    // Ignore timeout
  }
}

/**
 * ForeignObject SVG fallback rasterizer when standard htmlToImage encounters sandboxing issues
 */
async function captureViaForeignObjectSvg(
  element: HTMLElement,
  pixelRatio: number = 3
): Promise<string> {
  const rect = element.getBoundingClientRect();
  const width = Math.max(10, rect.width || element.offsetWidth || 428);
  const height = Math.max(10, rect.height || element.offsetHeight || 270);

  // Clone element to serialize
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.transform = 'none';
  clone.style.margin = '0';

  // Inline computed styles
  const allOriginal = element.querySelectorAll('*');
  const allClones = clone.querySelectorAll('*');
  for (let i = 0; i < allOriginal.length; i++) {
    const orig = allOriginal[i] as HTMLElement;
    const cln = allClones[i] as HTMLElement;
    if (orig && cln && orig.nodeType === 1) {
      const computed = window.getComputedStyle(orig);
      cln.style.cssText = computed.cssText;
    }
  }

  const serialized = new XMLSerializer().serializeToString(clone);
  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width * pixelRatio}" height="${height * pixelRatio}" viewBox="0 0 ${width} ${height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;">
          ${serialized}
        </div>
      </foreignObject>
    </svg>
  `;

  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const blobUrl = URL.createObjectURL(svgBlob);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * pixelRatio;
      canvas.height = height * pixelRatio;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(blobUrl);
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(blobUrl);
      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(blobUrl);
      reject(err);
    };

    img.src = blobUrl;
  });
}

/**
 * Captures an HTML DOM element to a high-resolution PNG data URL.
 * Robust multi-tier pipeline:
 * 1. htmlToImage with skipFonts & imagePlaceholder
 * 2. htmlToImage toCanvas
 * 3. Native SVG ForeignObject rasterizer
 */
export async function captureElementToPng(
  element: HTMLElement,
  options: CaptureOptions = {}
): Promise<string> {
  const pixelRatio = options.pixelRatio || 3;

  // Pre-inline images if possible
  await inlineImagesInElement(element);

  const htmlToImageOptions = {
    pixelRatio,
    skipFonts: true, // Crucial: prevents CORS/sandbox fails on external font stylesheets
    cacheBust: false,
    imagePlaceholder: TRANSPARENT_FALLBACK_PNG,
    backgroundColor:
      options.backgroundColor !== undefined
        ? options.backgroundColor || undefined
        : undefined,
    filter: options.filter,
    style: {
      transform: 'none',
      transformOrigin: 'top left',
    },
  };

  try {
    const dataUrl = await htmlToImage.toPng(element, htmlToImageOptions);
    return dataUrl;
  } catch (err1) {
    console.warn('htmlToImage.toPng encountered issue, attempting toCanvas fallback...', err1);
    try {
      const canvas = await htmlToImage.toCanvas(element, htmlToImageOptions);
      return canvas.toDataURL('image/png');
    } catch (err2) {
      console.warn('htmlToImage.toCanvas fallback failed, attempting SVG foreignObject fallback...', err2);
      try {
        return await captureViaForeignObjectSvg(element, pixelRatio);
      } catch (err3) {
        console.error('All capture strategies failed:', err3);
        throw new Error('Impossible de générer l’image de la carte. Veuillez vérifier les images importées.');
      }
    }
  }
}

/**
 * Downloads a single card side or image as high-res PNG
 */
export async function downloadElementAsPng(
  elementId: string,
  filename: string,
  pixelRatio: number = 3
): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element #${elementId} not found for export.`);
    return false;
  }

  const dataUrl = await captureElementToPng(element, { pixelRatio });
  const link = document.createElement('a');
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}

/**
 * Exports single employee PVC ID card (ISO CR-80 format: 85.6mm x 53.98mm) to PDF at 300 DPI or custom resolution
 */
export async function exportSingleCardPdf(params: {
  frontElementId: string;
  backElementId?: string;
  filename: string;
  includeBack?: boolean;
  dpi?: number;
}): Promise<boolean> {
  const { frontElementId, backElementId, filename, includeBack = true, dpi = 300 } = params;
  const frontElement = document.getElementById(frontElementId);
  if (!frontElement) {
    console.error(`Front element #${frontElementId} not found.`);
    return false;
  }

  const pixelRatio = Math.max(2, dpi / 96);

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [85.6, 53.98], // Exact CR-80 standard card dimensions
    compress: true,
  });

  // Capture Recto at chosen DPI
  const frontDataUrl = await captureElementToPng(frontElement, {
    pixelRatio,
    backgroundColor: '#ffffff',
  });
  pdf.addImage(frontDataUrl, 'PNG', 0, 0, 85.6, 53.98, undefined, 'NONE');

  // Capture Verso if available & requested
  if (includeBack && backElementId) {
    const backElement = document.getElementById(backElementId);
    if (backElement) {
      pdf.addPage([85.6, 53.98], 'landscape');
      const backDataUrl = await captureElementToPng(backElement, {
        pixelRatio,
        backgroundColor: '#ffffff',
      });
      pdf.addImage(backDataUrl, 'PNG', 0, 0, 85.6, 53.98, undefined, 'NONE');
    }
  }

  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  return true;
}

export interface ExportA4PrintSheetPdfParams {
  frontSheetElementId: string;
  backSheetElementId?: string;
  companyName: string;
  printLayout: 'both_pages' | 'front_only' | 'back_only';
  dpi?: number;
  filename?: string;
  onProgress?: (status: string) => void;
}

/**
 * Exports A4 print imposition sheet (Recto + Verso) to PDF at high resolution (default 300 DPI)
 * Produces crisp, professional print-ready files (2480 × 3508 px at 300 DPI for A4)
 */
export async function exportA4PrintSheetPdf(params: ExportA4PrintSheetPdfParams): Promise<boolean> {
  const {
    frontSheetElementId,
    backSheetElementId,
    companyName,
    printLayout,
    dpi = 300,
    filename,
    onProgress,
  } = params;

  onProgress?.('Initialisation du document PDF haute résolution...');

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4', // 210 x 297 mm
    compress: true,
  });

  // Calculate pixel ratio based on standard 96 DPI CSS baseline (300 DPI = 3.125x)
  const pixelRatio = Math.max(1.5, Number((dpi / 96).toFixed(3)));
  let hasPage = false;

  // Render front sheet if needed
  if (printLayout === 'both_pages' || printLayout === 'front_only') {
    const frontElement = document.getElementById(frontSheetElementId);
    if (frontElement) {
      onProgress?.(`Rastérisation Recto à ${dpi} DPI (${Math.round(794 * pixelRatio)} × ${Math.round(1123 * pixelRatio)} px)...`);
      const frontData = await captureElementToPng(frontElement, {
        pixelRatio,
        backgroundColor: '#ffffff',
      });
      pdf.addImage(frontData, 'PNG', 0, 0, 210, 297, undefined, 'NONE');
      hasPage = true;
    }
  }

  // Render back sheet if needed
  if (printLayout === 'both_pages' || printLayout === 'back_only') {
    if (backSheetElementId) {
      const backElement = document.getElementById(backSheetElementId);
      if (backElement) {
        if (hasPage) {
          pdf.addPage('a4', 'portrait');
        }
        onProgress?.(`Rastérisation Verso à ${dpi} DPI (Duplex aligné)...`);
        const backData = await captureElementToPng(backElement, {
          pixelRatio,
          backgroundColor: '#ffffff',
        });
        pdf.addImage(backData, 'PNG', 0, 0, 210, 297, undefined, 'NONE');
      }
    }
  }

  onProgress?.('Finalisation et téléchargement du PDF 300 DPI...');
  const cleanName = companyName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const finalFilename = filename || `PLANCHE_IMPRESSION_A4_${dpi}DPI_${cleanName}.pdf`;
  pdf.save(finalFilename.endsWith('.pdf') ? finalFilename : `${finalFilename}.pdf`);

  return true;
}
