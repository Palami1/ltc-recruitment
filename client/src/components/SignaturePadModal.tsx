import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PenTool, RotateCcw, Check, X } from 'lucide-react';

interface SignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (file: File, previewUrl: string) => void;
}

export const SignaturePadModal: React.FC<SignaturePadModalProps> = ({ isOpen, onClose, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [penColor, setPenColor] = useState<'black' | 'blue'>('black');
  const penWidth = 3;
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Resize and initialize canvas
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Set internal size scaled for retina displays
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = penColor === 'black' ? '#0f172a' : '#1d4ed8';
      ctx.lineWidth = penWidth;
    }
    setIsEmpty(true);
  }, [penColor, penWidth]);

  useEffect(() => {
    if (isOpen) {
      // Delay slightly so layout finishes rendering before sizing canvas
      const timer = setTimeout(() => {
        initCanvas();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initCanvas]);

  if (!isOpen) return null;

  const getCanvasCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if ('touches' in e) {
      e.stopPropagation();
    }
    const { x, y } = getCanvasCoordinates(e);
    lastPointRef.current = { x, y };
    setIsDrawing(true);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.arc(x, y, penWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = penColor === 'black' ? '#0f172a' : '#1d4ed8';
        ctx.fill();
        setIsEmpty(false);
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPointRef.current) return;
    if ('touches' in e) {
      e.stopPropagation();
    }

    const { x, y } = getCanvasCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = penColor === 'black' ? '#0f172a' : '#1d4ed8';
    ctx.lineWidth = penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    // Smooth quadratic curve towards midpoint
    const midX = (lastPointRef.current.x + x) / 2;
    const midY = (lastPointRef.current.y + y) / 2;
    ctx.quadraticCurveTo(lastPointRef.current.x, lastPointRef.current.y, midX, midY);
    ctx.lineTo(x, y);
    ctx.stroke();

    lastPointRef.current = { x, y };
    setIsEmpty(false);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPointRef.current = null;
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  const handleSave = () => {
    if (isEmpty) {
      alert("ກະລຸນາເຊັນລາຍເຊັນກ່ອນ!");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a cropped/trimmed canvas or direct high quality PNG
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `signature_${Date.now()}.png`, { type: 'image/png' });
        const previewUrl = URL.createObjectURL(blob);
        onSave(file, previewUrl);
        onClose();
      }
    }, 'image/png');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[95vh] animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-corporate-primary/10 flex items-center justify-center text-corporate-primary">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">ເຊັນລາຍເຊັນເທິງໜ້າຈໍ</h3>
              <p className="text-xs text-slate-500">ໃຊ້ນິ້ວມື ຫຼື ປາກກາ Stylus ເຊັນລົງໃນກອບ</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Canvas Area */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col items-center">
          <div className="relative w-full h-[220px] sm:h-[260px] bg-white border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden shadow-inner touch-none">
            {/* Guide watermark */}
            {isEmpty && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-300 select-none">
                <PenTool className="w-10 h-10 mb-2 opacity-40 animate-pulse" />
                <p className="text-sm font-semibold opacity-70">ຂີດຂຽນເຊັນລາຍເຊັນຢູ່ບ່ອນນີ້</p>
              </div>
            )}
            {/* Baseline guideline */}
            <div className="absolute left-6 right-6 bottom-12 border-b border-dashed border-slate-200 pointer-events-none" />

            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-crosshair touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>

          {/* Tools & Settings */}
          <div className="w-full mt-3 flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 mr-1">ສີປາກກາ:</span>
              <button
                type="button"
                onClick={() => setPenColor('black')}
                className={`w-7 h-7 rounded-full bg-slate-900 border-2 transition-transform ${
                  penColor === 'black' ? 'ring-2 ring-corporate-primary scale-110 border-white' : 'border-transparent opacity-70'
                }`}
                title="ສີດຳ"
              />
              <button
                type="button"
                onClick={() => setPenColor('blue')}
                className={`w-7 h-7 rounded-full bg-blue-700 border-2 transition-transform ${
                  penColor === 'blue' ? 'ring-2 ring-corporate-primary scale-110 border-white' : 'border-transparent opacity-70'
                }`}
                title="ສີນ້ຳເງິນ"
              />
            </div>

            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 rounded-xl transition-all border border-slate-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              ລຶບແຕ້ມໃໝ່
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50/80">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-all"
          >
            ຍົກເລີກ
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isEmpty}
            className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-md transition-all ${
              isEmpty
                ? 'bg-slate-300 cursor-not-allowed shadow-none'
                : 'bg-corporate-accent hover:brightness-95 hover:shadow-[0_0_15px_rgba(227,28,37,0.3)]'
            }`}
          >
            <Check className="w-4 h-4" />
            ຢືນຢັນລາຍເຊັນ
          </button>
        </div>
      </div>
    </div>
  );
};
