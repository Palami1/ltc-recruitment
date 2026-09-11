import { MousePointerClick, HeartHandshake } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LtcLogoBrand from '../components/LtcLogoBrand';
const IMG_HR = '/hr_logo.svg';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-wrapper font-lao min-h-screen relative overflow-hidden selection:bg-red-500 selection:text-white">
      {/* VERSION 1: CLASSIC MINIMAL */}
      <div className="landing-page relative flex h-screen h-[100dvh] max-h-screen w-full flex-col overflow-hidden text-[#303681] bg-white pt-12">
        <header className="z-20 shrink-0 px-4 pb-2 pt-6 sm:px-6 md:absolute md:top-14 md:left-12 md:right-12 md:px-0 md:pb-0 md:pt-0 lg:left-16 lg:right-16 flex justify-between items-center">
          <LtcLogoBrand />
        </header>

        <main className="landing-hero">
          <div className="landing-hero-inner">
            <section className="landing-hero-left">
              <h1 className="landing-title font-lao w-full text-center text-4xl font-black leading-[1.15] sm:text-4xl md:text-left md:text-5xl lg:text-6xl">
                ພະແນກຈັດຕັ້ງ
              </h1>

              <div className="landing-cta-wrap max-w-full">
                <span className="landing-cta-pulse" aria-hidden />
                <span className="landing-cta-pulse landing-cta-pulse-2" aria-hidden />
                <button
                  type="button"
                  onClick={() => navigate('/select')}
                  className="landing-cta font-lao px-8 py-3 text-base sm:px-12 sm:py-3.5 sm:text-lg md:px-14 md:py-4 md:text-xl lg:text-2xl"
                >
                  <span className="landing-cta-label">ຟອມສະໝັກວຽກ</span>
                </button>
                <MousePointerClick
                  className="landing-cta-pointer h-9 w-9 sm:h-11 sm:w-11 md:h-12 md:w-12"
                  strokeWidth={2.25}
                  aria-hidden
                />
              </div>
            </section>

            <section className="landing-hero-right">
              <div className="hr-logo-stage">
                <div className="hr-logo-glow" aria-hidden />
                <div className="hr-ring hr-ring-outer" aria-hidden />
                <div className="hr-ring hr-ring-mid" aria-hidden />
                <div className="hr-ring hr-ring-inner" aria-hidden />
                <div className="hr-orbit-dot" aria-hidden />
                <div className="hr-orbit-dot hr-orbit-dot-2" aria-hidden />
                <img src={IMG_HR} alt="HR Human Resources Department" className="hr-logo-img" />
              </div>
            </section>
          </div>
        </main>

        <footer className="z-20 flex shrink-0 flex-col gap-4 px-4 pb-6 pt-6 sm:px-6 md:absolute md:bottom-10 md:left-12 md:right-12 md:max-w-none md:flex-row md:items-end md:justify-between md:gap-8 md:p-0 lg:left-16 lg:right-16">
          <div className="flex-1 w-full md:w-auto bg-slate-50/80 md:bg-white/40 backdrop-blur-md border border-slate-200/60 p-4 sm:p-5 md:px-5 md:py-2.5 rounded-2xl md:rounded-full shadow-sm">
            <div className="flex items-center gap-3">
              <HeartHandshake className="w-5 h-5 md:w-4 md:h-4 text-red-600 shrink-0" />
              <p className="font-lao text-xs sm:text-sm text-[#303681] font-bold">
                ບໍລິການດ້ວຍຄວາມຈິງໃຈ ໃສ່ໃຈພະນັກງານ ບໍລິຫານບຸກຄະລາກອນສູ່ລະບົບດີຈິຕອນ
              </p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:items-center gap-2.5 md:gap-4 text-[#303681] text-xs sm:text-sm font-medium shrink-0 bg-slate-50/80 md:bg-white/40 backdrop-blur-md border border-slate-200/60 p-4 sm:p-5 md:px-5 md:py-2.5 rounded-2xl md:rounded-full shadow-sm">
            <p className="font-bold text-red-600 shrink-0">ສອບຖາມເພີ່ມຕື່ມ:</p>
            <div className="flex items-center gap-4">
              <span>ທ່ານນາງ ດາວັນ: <b>020 54325999</b></span>
              <span>ທ່ານນາງ ສຸພັດຕາ: <b>020 55383707</b></span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
