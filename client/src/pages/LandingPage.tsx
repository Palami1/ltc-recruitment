import { MousePointerClick, Phone, HeartHandshake } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminStaffLink from '../components/AdminStaffLink';
import LtcLogoBrand from '../components/LtcLogoBrand';

const IMG_HR = '/1.png';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page font-lao relative flex min-h-screen min-h-[100dvh] w-full flex-col overflow-x-hidden text-[#303681]">
      <header className="z-20 shrink-0 px-4 pb-2 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-6 md:absolute md:top-10 md:left-12 md:right-12 md:px-0 md:pb-0 md:pt-0 lg:left-16 lg:right-16 flex justify-between items-start">
        <LtcLogoBrand />
        <AdminStaffLink className="mt-2 md:mt-0 opacity-70 hover:opacity-100 transition-opacity" />
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

      <footer className="z-20 flex shrink-0 flex-col gap-4 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 sm:px-6 md:absolute md:bottom-10 md:left-12 md:right-12 md:max-w-none md:flex-row md:items-end md:justify-between md:gap-8 md:p-0 lg:left-16 lg:right-16">
        
        {/* Motto Section */}
        <div className="flex-1 w-full md:w-auto bg-slate-50/80 md:bg-white/40 backdrop-blur-md border border-slate-200/60 p-4 sm:p-5 md:px-5 md:py-2.5 rounded-2xl md:rounded-full shadow-sm md:shadow-none hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <HeartHandshake className="w-5 h-5 md:w-4 md:h-4 text-corporate-primary shrink-0" />
            <p className="font-lao text-xs sm:text-sm text-[#303681] font-bold md:font-medium">
              ບໍລິການດ້ວຍຄວາມຈິງໃຈ ໃສ່ໃຈພະນັກງານ ບໍລິຫານບຸກຄະລາກອນສູ່ລະບົບດີຈິຕອນ
            </p>
          </div>
        </div>

        {/* Contact Section */}
        <div className="flex flex-col md:flex-row md:items-center gap-2.5 md:gap-4 text-[#303681] text-xs sm:text-sm font-medium shrink-0 bg-slate-50/80 md:bg-white/40 backdrop-blur-md border border-slate-200/60 p-4 sm:p-5 md:px-5 md:py-2.5 rounded-2xl md:rounded-full shadow-sm md:shadow-none hover:shadow-md transition-shadow">
          <p className="font-bold text-corporate-primary md:text-[#303681] md:font-semibold border-b border-corporate-primary/10 md:border-none pb-1.5 md:pb-0 shrink-0">ສອບຖາມເພີ່ມຕື່ມ:</p>
          
          <div className="flex items-center justify-between md:justify-start gap-4 mt-1 md:mt-0">
            <span className="shrink-0 text-slate-600 md:text-[#303681]">ທ່ານນາງ ດາວັນ ອິນທິວົງ</span>
            <div className="h-[1px] w-full bg-slate-200 md:hidden flex-1"></div>
            <a href="tel:02054325999" className="flex items-center gap-1.5 hover:text-corporate-primary transition-colors font-bold whitespace-nowrap bg-white md:bg-transparent px-2 py-1 md:p-0 rounded-lg border border-slate-100 md:border-none shadow-sm md:shadow-none">
              <Phone className="w-3.5 h-3.5 md:w-3.5 md:h-3.5 md:text-slate-400" /> 020 54325999
            </a>
          </div>

          <div className="hidden md:block w-[1px] h-3.5 bg-slate-300 mx-1"></div>

          <div className="flex items-center justify-between md:justify-start gap-4">
            <span className="shrink-0 text-slate-600 md:text-[#303681]">ທ່ານນາງ ສຸພັດຕາ ສີມາລາວົງ</span>
            <div className="h-[1px] w-full bg-slate-200 md:hidden flex-1"></div>
            <a href="tel:02055383707" className="flex items-center gap-1.5 hover:text-corporate-primary transition-colors font-bold whitespace-nowrap bg-white md:bg-transparent px-2 py-1 md:p-0 rounded-lg border border-slate-100 md:border-none shadow-sm md:shadow-none">
              <Phone className="w-3.5 h-3.5 md:w-3.5 md:h-3.5 md:text-slate-400" /> 020 55383707
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
