import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, PenTool, Check } from 'lucide-react';

interface SignaturePadProps {
  label?: string;
  initialSignature?: string;
  onChange: (signatureDataUrl: string) => void;
  required?: boolean;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  label = 'Sign on screen (draw with finger or stylus)',
  initialSignature,
  onChange,
  required = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(Boolean(initialSignature));

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high-DPI resolution
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Initial drawing styles
    ctx.strokeStyle = '#0284c7'; // Brand blue
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // If initial signature exists, draw it
    if (initialSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = initialSignature;
    }
  }, [initialSignature]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else if ('clientX' in e) {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // Prevent scrolling while signing on mobile
    if ('touches' in e) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if ('touches' in e) {
      e.preventDefault();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setHasSignature(true);

    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      onChange(dataUrl);
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasSignature(false);
    onChange('');
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <PenTool className="w-3.5 h-3.5 text-blue-400" />
          <span>{label}</span>
          {required && <span className="text-rose-400">*</span>}
        </label>
        
        {hasSignature && (
          <button
            type="button"
            onClick={clearSignature}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-300 transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Signature Canvas Box */}
      <div className="relative w-full h-32 sm:h-36 bg-slate-950 border border-slate-700 hover:border-blue-500/70 rounded-xl overflow-hidden shadow-inner touch-none">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full cursor-crosshair block"
        />

        {/* Baseline guide line */}
        <div className="absolute inset-x-6 bottom-7 border-b border-dashed border-slate-800 pointer-events-none flex items-center justify-between">
          <span className="text-[9px] uppercase tracking-wider font-mono text-slate-600">x Sign Here</span>
        </div>

        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs text-slate-600 flex items-center gap-1.5 select-none">
              <PenTool className="w-3.5 h-3.5 text-slate-600" />
              Use your finger, mouse or stylus to sign here
            </span>
          </div>
        )}

        {hasSignature && (
          <div className="absolute top-2 right-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 pointer-events-none">
            <Check className="w-3 h-3" />
            <span>Signed</span>
          </div>
        )}
      </div>
      <p className="text-[10px] text-slate-500 mt-1">
        This signature will be embedded directly onto the official PDF intervention report.
      </p>
    </div>
  );
};
