import { ArrowLeft, Home } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminStaffLink from './AdminStaffLink';

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
};

export default function PageLayout({
  children,
  maxWidth = '7xl',
  showBack = false,
  backTo,
  backLabel = 'ຍ້ອນກັບ',
  showHome = false,
  showAdminEntry = false,
}: PageLayoutProps) {
  const navigate = useNavigate();

  return (
    <div
      className={`page-container ${MAX_WIDTH[maxWidth]} mx-auto flex w-full flex-1 flex-col font-lao`}
    >
      {(showBack || showHome || showAdminEntry) && (
        <nav className="mb-4 flex flex-wrap items-center gap-2 sm:mb-6">
          <div className="flex flex-wrap items-center gap-2">
            {showBack && (
              <button
                type="button"
                onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
                className="page-back-btn"
              >
                <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden />
                <span>{backLabel}</span>
              </button>
            )}
            {showHome && (
              <button type="button" onClick={() => navigate('/')} className="page-back-btn">
                <Home className="h-5 w-5 shrink-0" aria-hidden />
                <span>ໜ້າຫຼັກ</span>
              </button>
            )}
          </div>
          {showAdminEntry && <AdminStaffLink className="ml-auto" />}
        </nav>
      )}
      {children}
    </div>
  );
}
