import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface LaoTelecomLoaderProps {
  text?: string;
  minDurationMs?: number;
  onComplete?: () => void;
  fullScreen?: boolean;
}

export default function LaoTelecomLoader({
  text = 'ກຳລັງໂຫລດຂໍ້ມູນຕຳແໜ່ງ...',
  minDurationMs = 800,
  onComplete,
  fullScreen = false
}: LaoTelecomLoaderProps) {
  const [progress, setProgress] = useState(10);
  const [subText, setSubText] = useState('ກຳລັງເຊື່ອມຕໍ່ລະບົບ ບໍລິຫານຊັບພະຍາກອນມະນຸດ...');

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const calculated = Math.min(95, Math.floor(10 + (elapsed / minDurationMs) * 85));

      setProgress(prev => {
        const next = Math.max(prev, calculated);
        if (next < 35) {
          setSubText('ກຳລັງເຊື່ອມຕໍ່ລະບົບ Lao Telecom Server...');
        } else if (next < 75) {
          setSubText('ກຳລັງດຶງຂໍ້ມູນຕຳແໜ່ງງານ ແລະ ສະຫວັດດີການ...');
        } else if (next < 95) {
          setSubText('ກຳລັງກຽມສະແດງຜົນໜ້າຈໍ...');
        }
        return next;
      });

      if (elapsed >= minDurationMs) {
        clearInterval(interval);
        setProgress(100);
        setSubText('ໂຫຼດຂໍ້ມູນສຳເລັດ!');
        if (onComplete) {
          setTimeout(onComplete, 200);
        }
      }
    }, 40);

    return () => clearInterval(interval);
  }, [minDurationMs, onComplete]);

  const containerClasses = fullScreen
    ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-xl font-lao p-6'
    : 'flex flex-col items-center justify-center py-12 sm:py-16 font-lao px-4 w-full';

  return (
    <div className={containerClasses}>
      <div className="relative flex flex-col items-center max-w-sm w-full mx-auto text-center">
        {/* Animated Lao Telecom Logo Ring Stage */}
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 mb-6 flex items-center justify-center">
          {/* Outer Spinning Red & Gold Gradient Ring */}
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-red-600 border-r-amber-400 border-b-rose-600 border-l-yellow-300 animate-spin transition-all duration-700 shadow-[0_0_25px_rgba(227,28,37,0.4)]" />

          {/* Pulse Inner Glowing Aura */}
          <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-red-600 via-rose-500 to-amber-400 opacity-20 animate-pulse blur-md" />

          {/* Central Lao Telecom Icon Circle */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-b from-red-600 to-rose-800 flex flex-col items-center justify-center shadow-xl border-2 border-white/80 transform hover:scale-105 transition-transform">
            <span className="text-white font-black text-xs sm:text-sm tracking-wider uppercase drop-shadow-md">LAO</span>
            <span className="text-amber-300 font-black text-[10px] sm:text-xs tracking-tighter uppercase -mt-0.5">TELECOM</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-bounce mt-0.5" />
          </div>

          {/* Floating Percentage Badge */}
          <div className="absolute -bottom-2 right-0 bg-gradient-to-r from-red-600 to-rose-700 text-white text-xs sm:text-sm font-black px-2.5 py-0.5 rounded-full border-2 border-white shadow-lg animate-pulse font-mono">
            {progress}%
          </div>
        </div>

        {/* Text Title */}
        <h4 className="text-base sm:text-lg font-black text-slate-800 dark:text-white mb-1 tracking-wide flex items-center gap-1.5">
          <span>{text}</span>
        </h4>

        {/* Dynamic Status Subtitle */}
        <p className="text-xs sm:text-sm text-red-600 font-semibold mb-4 h-5 transition-all duration-300">
          {subText}
        </p>

        {/* Premium Metallic Progress Bar Container */}
        <div className="w-full bg-slate-200/80 rounded-full h-3 sm:h-3.5 p-0.5 shadow-inner border border-slate-300/60 overflow-hidden relative">
          {/* Progress Fill with Smooth Shimmer Animation */}
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 transition-all duration-300 ease-out relative overflow-hidden shadow-md"
            style={{ width: `${progress}%` }}
          >
            {/* Shimmer Wave */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          </div>
        </div>

        {/* Numerical Percentage Large Indicator */}
        <div className="mt-2.5 flex items-center justify-between w-full text-xs font-bold text-slate-500 font-mono">
          <span>0%</span>
          <span className="text-sm font-black text-red-600">{progress}%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}
