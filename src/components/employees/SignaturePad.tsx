import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Eraser,
  Check,
  RotateCcw,
  Upload,
  PenTool,
  Palette,
  Sparkles,
  X,
  Download
} from 'lucide-react';

interface SignaturePadProps {
  initialSignature?: string;
  onSave: (signatureDataUrl: string) => void;
  onClose?: () => void;
  employeeName?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  initialSignature,
  onSave,
  onClose,
  employeeName = 'Collaborateur',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [strokeColor, setStrokeColor] = useState<string>('#0f172a'); // Ink black
  const [strokeWidth, setStrokeWidth] = useState<number>(2.5);
  const [strokeHistory, setStrokeHistory] = useState<ImageData[]>([]);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // Setup canvas with high DPI scaling
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 2;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;

    // If there is an initial signature, draw it
    if (initialSignature && !hasDrawn) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.clearRect(0, 0, rect.width, rect.height);
        // Draw centered and nicely scaled
        const scale = Math.min((rect.width - 40) / img.width, (rect.height - 20) / img.height, 1);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (rect.width - w) / 2;
        const y = (rect.height - h) / 2;
        ctx.drawImage(img, x, y, w, h);
        setHasDrawn(true);
      };
      img.src = initialSignature;
    }
  }, [initialSignature, strokeColor, strokeWidth, hasDrawn]);

  useEffect(() => {
    setupCanvas();
  }, [setupCanvas]);

  // Update stroke styling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
  }, [strokeColor, strokeWidth]);

  // Coordinates helper
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  // Save current canvas state to history for Undo
  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setStrokeHistory((prev) => [...prev.slice(-10), imageData]);
  };

  // Start Drawing
  const handleStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if ('touches' in e && e.touches.length > 1) return; // Ignore multi-touch
    e.preventDefault();

    saveState();
    setIsDrawing(true);
    setHasDrawn(true);

    const pos = getCoordinates(e);
    lastPos.current = pos;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, strokeWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = strokeColor;
    ctx.fill();
  };

  // Move / Draw stroke
  const handleMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPos.current) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentPos = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();

    lastPos.current = currentPos;
  };

  // End Drawing
  const handleEnd = () => {
    setIsDrawing(false);
    lastPos.current = null;
  };

  // Clear Canvas
  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setStrokeHistory([]);
  };

  // Undo last stroke
  const handleUndo = () => {
    if (strokeHistory.length === 0) {
      handleClear();
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const previousState = strokeHistory[strokeHistory.length - 1];
    setStrokeHistory((prev) => prev.slice(0, -1));
    ctx.putImageData(previousState, 0, 0);
  };

  // Upload image of signature from file
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Process image to make white background transparent if desired
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(img, 0, 0);
          const imgData = tempCtx.getImageData(0, 0, img.width, img.height);
          const data = imgData.data;
          // Threshold to make bright white pixels transparent
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // Bright/white pixel removal
            if (r > 215 && g > 215 && b > 215) {
              data[i + 3] = 0; // alpha = 0
            }
          }
          tempCtx.putImageData(imgData, 0, 0);

          const scale = Math.min((rect.width - 20) / img.width, (rect.height - 20) / img.height, 1);
          const w = img.width * scale;
          const h = img.height * scale;
          const x = (rect.width - w) / 2;
          const y = (rect.height - h) / 2;

          ctx.drawImage(tempCanvas, x, y, w, h);
          setHasDrawn(true);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Generate stylized cursive signature from employee name
  const handleGenerateStylizedSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    saveState();
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.font = 'italic 38px "Brush Script MT", "Caveat", "Dancing Script", cursive';
    ctx.fillStyle = strokeColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(employeeName, rect.width / 2, rect.height / 2 - 8);

    // Decorative underline loop
    ctx.beginPath();
    ctx.moveTo(rect.width / 2 - 90, rect.height / 2 + 16);
    ctx.bezierCurveTo(
      rect.width / 2 - 20,
      rect.height / 2 + 28,
      rect.width / 2 + 30,
      rect.height / 2 + 8,
      rect.width / 2 + 95,
      rect.height / 2 + 20
    );
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    setHasDrawn(true);
  };

  // Trim empty transparent edges to output clean cropped signature
  const handleSaveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) {
      alert('Veuillez tracer votre signature avant de valider.');
      return;
    }

    // Direct data URL with transparent background
    const finalDataUrl = canvas.toDataURL('image/png');
    onSave(finalDataUrl);
    if (onClose) onClose();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-w-xl w-full">
      {/* Header */}
      <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <PenTool className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Capture de Signature Manuscrite</h3>
            <p className="text-[11px] text-slate-400">
              Signez avec votre souris, pavé tactile ou écran tactile pour personnaliser la carte
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Toolbar Options: Ink Color, Stroke Width, Actions */}
      <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Ink Colors */}
        <div className="flex items-center space-x-2">
          <span className="text-slate-500 font-medium text-[11px]">Encre :</span>
          <div className="flex items-center space-x-1.5">
            {[
              { label: 'Noir officiel', value: '#0f172a' },
              { label: 'Bleu royal', value: '#1e40af' },
              { label: 'Indigo institutionnel', value: '#4338ca' },
            ].map((col) => (
              <button
                key={col.value}
                type="button"
                title={col.label}
                onClick={() => setStrokeColor(col.value)}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${
                  strokeColor === col.value ? 'scale-110 border-indigo-500 ring-2 ring-indigo-200' : 'border-white'
                }`}
                style={{ backgroundColor: col.value }}
              />
            ))}
          </div>
        </div>

        {/* Thickness */}
        <div className="flex items-center space-x-2">
          <span className="text-slate-500 font-medium text-[11px]">Épaisseur :</span>
          <div className="flex items-center space-x-1 bg-white p-0.5 rounded-lg border border-slate-200">
            {[
              { label: 'Fine', value: 1.8 },
              { label: 'Moyenne', value: 2.8 },
              { label: 'Grasse', value: 4.2 },
            ].map((thick) => (
              <button
                key={thick.value}
                type="button"
                onClick={() => setStrokeWidth(thick.value)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  strokeWidth === thick.value
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {thick.label}
              </button>
            ))}
          </div>
        </div>

        {/* Helpers: Stylized cursive or image upload */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleGenerateStylizedSignature}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] text-slate-700 font-semibold flex items-center space-x-1 transition-colors"
            title="Générer une signature manuscrite cursive automatique"
          >
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Générer Style</span>
          </button>

          <label className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] text-slate-700 font-semibold flex items-center space-x-1 transition-colors cursor-pointer">
            <Upload className="w-3 h-3 text-slate-500" />
            <span>Importer</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Signature Canvas Area */}
      <div className="p-5 bg-slate-100/70">
        <div className="relative w-full h-44 bg-white rounded-xl border-2 border-dashed border-slate-300 shadow-inner overflow-hidden cursor-crosshair">
          {/* Baseline guide line */}
          <div className="absolute inset-x-6 bottom-10 border-b border-slate-200 pointer-events-none flex items-center justify-between">
            <span className="text-[10px] text-slate-400 select-none font-mono">
              Ligne de signature — {employeeName}
            </span>
            <span className="text-[9px] text-slate-300 select-none uppercase font-mono">
              Fond transparent garanti
            </span>
          </div>

          <canvas
            ref={canvasRef}
            className="w-full h-full touch-none select-none relative z-10"
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
            onTouchCancel={handleEnd}
          />

          {!hasDrawn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 z-0 space-y-1">
              <PenTool className="w-6 h-6 opacity-30" />
              <span className="text-xs font-medium">Tracez votre signature ici</span>
              <span className="text-[10px] opacity-70">Supporte stylet, doigt sur écran tactile ou souris</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center space-x-1.5 font-medium transition-colors"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Effacer</span>
          </button>

          <button
            type="button"
            onClick={handleUndo}
            disabled={strokeHistory.length === 0}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center space-x-1.5 font-medium disabled:opacity-40 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Annuler trait</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
            >
              Annuler
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveSignature}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-sm flex items-center space-x-1.5 transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>Valider la Signature</span>
          </button>
        </div>
      </div>
    </div>
  );
};
