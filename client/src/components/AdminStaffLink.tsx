import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

type AdminStaffLinkProps = {
  className?: string;
};

export default function AdminStaffLink({ className = '' }: AdminStaffLinkProps) {
  return (
    <Link to="/admin" className={`admin-staff-link ${className}`.trim()}>
      <ShieldCheck className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={2.25} aria-hidden />
      <span>ສຳລັບພະນັກງານ (Staff Only)</span>
    </Link>
  );
}
