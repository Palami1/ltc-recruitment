import { ArrowLeft, Home, Search } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminStaffLink from './AdminStaffLink';
import StatusCheckModal from './StatusCheckModal';

type MaxWidth = '4xl' | '5xl' | '7xl' | 'full';

const MAX_WIDTH: Record<MaxWidth, string> = {
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-[100%]',
};

type PageLayoutProps = {
  children: ReactNode;
  maxWidth?: MaxWidth;
  showBack?: boolean;
  backTo?: string;
  backLabel?: string;
  showHome?: boolean;
  showAdminEntry?: boolean;
  showStatusCheck?: boolean;
};

export default function PageLayout({
  children,
  maxWidth = '7xl',
  showBack = false,
  backTo,
  backLabel = 'ຍ້ອນກັບ',
  showHome = false,
  showAdminEntry = false,
  showStatusCheck = true,
}: PageLayoutProps) {
  const navigate = useNavigate();
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  return (
    <div
      className={`${maxWidth === 'full' ? 'w-full pb-8' : 'page-container'} ${MAX_WIDTH[maxWidth]} mx-auto flex w-full flex-1 flex-col font-lao`}
    >
      {(showBack || showHome || showAdminEntry || showStatusCheck) && (
        <div className={maxWidth === 'full' ? 'w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8' : 'w-full'}>
          <nav className="mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/80 backdrop-blur-md px-4 py-2 border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2">
              {showBack && (
                <button
                  type="button"
                  onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-corporate-primary transition-all cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4 shrink-0 text-corporate-primary" aria-hidden />
                  <span>{backLabel}</span>
                </button>
              )}
              {showHome && !showBack && (
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-corporate-primary transition-all cursor-pointer"
                >
                  <Home className="h-4 w-4 shrink-0 text-corporate-primary" aria-hidden />
                  <span>ໜ້າຫຼັກ</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5 ml-auto">
              {showStatusCheck && (
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-800 bg-red-50/80 border border-red-200/80 shadow-sm hover:bg-red-100 hover:border-corporate-primary/50 transition-all cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5 text-corporate-primary" />
                  <span>ກວດເຊັກສະຖານະໃບສະໝັກ</span>
                </button>
              )}
              {showAdminEntry && <AdminStaffLink />}
            </div>
          </nav>
        </div>
      )}

      {children}

      <StatusCheckModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
      />
    </div>
  );
}
