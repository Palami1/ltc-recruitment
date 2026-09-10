import { MousePointerClick, HeartHandshake, PhoneCall } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LtcLogoBrand from '../components/LtcLogoBrand';
const IMG_HR = '/hr_logo.svg';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-wrapper font-lao min-h-[100dvh] w-full relative flex flex-col justify-between overflow-x-hidden selection:bg-red-500 selection:text-white bg-white">
      {/* Background Decorative Gradient Orbs */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 bg-red-100/40 rounded-full blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl" aria-hidden />

      {/* HEADER */}
      <header className="w-full z-20 shrink-0 px-4 pt-5 pb-3 sm:px-8 md:px-12 lg:px-16 flex items-center justify-between">
        <LtcLogoBrand />
      </header>

      {/* HERO MAIN */}
      <main className="landing-hero w-full flex-1 flex items-center justify-center px-4 py-6 sm:px-8 md:px-12 lg:px-16">
        <div className="landing-hero-inner w-full max-w-6xl flex flex-col-reverse md:flex-row items-center justify-center gap-8 md:gap-12 lg:gap-16">
          
          {/* Left Text & CTA */}
          <section className="landing-hero-left flex flex-col items-center md:items-start text-center md:text-left gap-5 sm:gap-6 max-w-lg">
            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-red-50 text-red-600 border border-red-200/60 shadow-sm">
                LAO TELECOM RECRUITMENT
              </span>
              <h1 className="landing-title font-lao text-4xl sm:text-5xl md:text-5xl lg:text-6xl font-black leading-[1.2] tracking-tight">
                ພະແນກຈັດຕັ້ງ
              </h1>
              <p className="text-[#303681]/80 text-sm sm:text-base md:text-lg font-medium max-w-md">
                ຍິນດີຕ້ອນຮັບສູ່ລະບົບຮັບສະໝັກບຸກຄະລາກອນ ບໍລິສັດ ລາວ ໂທລະຄົມມະນາຄົມ ມະຫາຊົນ
              </p>
            </div>

            <div className="landing-cta-wrap relative inline-flex max-w-full pt-2">
              <span className="landing-cta-pulse" aria-hidden />
              <span className="landing-cta-pulse landing-cta-pulse-2" aria-hidden />
              <button
                type="button"
                onClick={() => navigate('/select')}
                className="landing-cta font-lao px-8 py-3.5 sm:px-10 sm:py-4 text-base sm:text-lg md:text-xl lg:text-2xl font-bold transition-all shadow-xl"
              >
                <span className="landing-cta-label">ຟອມສະໝັກວຽກ</span>
              </button>
              <MousePointerClick
                className="landing-cta-pointer h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11"
                strokeWidth={2.25}
                aria-hidden
              />
            </div>
          </section>

          {/* Right Animated HR Badge */}
          <section className="landing-hero-right flex items-center justify-center shrink-0">
            <div className="hr-logo-stage relative flex items-center justify-center">
              <div className="hr-logo-glow" aria-hidden />
              <div className="hr-ring hr-ring-outer" aria-hidden />
              <div className="hr-ring hr-ring-mid" aria-hidden />
              <div className="hr-ring hr-ring-inner" aria-hidden />
              <div className="hr-orbit-dot" aria-hidden />
              <div className="hr-orbit-dot hr-orbit-dot-2" aria-hidden />
              <img src={IMG_HR} alt="HR Human Resources Department" className="hr-logo-img select-none pointer-events-none" />
            </div>
          </section>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full z-20 shrink-0 px-4 pb-5 pt-3 sm:px-8 md:px-12 lg:px-16 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 text-xs sm:text-sm text-[#303681]">
        <div className="w-full md:w-auto bg-slate-50/90 backdrop-blur-md border border-slate-200/80 px-4 py-2.5 rounded-2xl md:rounded-full shadow-sm flex items-center gap-2.5">
          <HeartHandshake className="w-4 h-4 text-red-600 shrink-0" />
          <p className="font-lao font-bold text-center md:text-left">
            ບໍລິການດ້ວຍຄວາມຈິງໃຈ ໃສ່ໃຈພະນັກງານ ບໍລິຫານບຸກຄະລາກອນສູ່ລະບົບດີຈິຕອນ
          </p>
        </div>
        
        <div className="w-full md:w-auto bg-slate-50/90 backdrop-blur-md border border-slate-200/80 px-4 py-2.5 rounded-2xl md:rounded-full shadow-sm flex flex-wrap items-center justify-center md:justify-end gap-2 sm:gap-4">
          <span className="font-bold text-red-600 flex items-center gap-1">
            <PhoneCall className="w-3.5 h-3.5 inline" /> ສອບຖາມເພີ່ມຕື່ມ:
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <span>ທ່ານນາງ ດາວັນ: <b className="font-mono text-corporate-primary">020 54325999</b></span>
            <span>ທ່ານນາງ ສຸພັດຕາ: <b className="font-mono text-corporate-primary">020 55383707</b></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
