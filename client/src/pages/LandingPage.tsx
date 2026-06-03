import { MousePointerClick } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminStaffLink from '../components/AdminStaffLink';
import LtcLogoBrand from '../components/LtcLogoBrand';

const IMG_HR = '/1.png';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page font-lao relative flex min-h-screen min-h-[100dvh] w-full flex-col overflow-x-hidden text-[#303681]">
      <header className="z-20 shrink-0 px-4 pb-2 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-6 md:absolute md:top-10 md:left-12 md:px-0 md:pb-0 md:pt-0 lg:left-16">
        <LtcLogoBrand />
      </header>

      <main className="landing-hero">
        <div className="landing-hero-inner">
        <section className="landing-hero-left">
          <h1 className="font-lao w-full text-center text-3xl font-bold leading-[1.15] sm:text-4xl md:text-left md:text-5xl lg:text-6xl">
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

      <footer className="z-20 flex shrink-0 flex-col gap-3 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 sm:gap-4 sm:px-6 md:absolute md:bottom-10 md:left-12 md:right-12 md:max-w-none md:flex-row md:items-end md:justify-between md:gap-6 md:p-0 lg:left-16 lg:right-16">
        <p className="font-lao max-w-3xl text-left text-xs font-medium leading-relaxed text-[#303681] sm:text-sm md:text-base">
          ບໍລິການດ້ວຍຄວາມຈິງໃຈ ໃສ່ໃຈພະນັກງານ ບໍລິຫານບຸກຄະລາກອນສູ່ລະບົບດີຈິຕອນ
        </p>
        <AdminStaffLink className="self-start md:shrink-0 md:self-end" />
      </footer>
    </div>
  );
}
