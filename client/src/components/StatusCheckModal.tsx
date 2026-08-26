import React, { useState } from 'react';
import { Search, X, CheckCircle2, Clock, XCircle, FileText, Building2, User, Loader2 } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

type ApplicationResult = {
  id: string;
  refCode?: string;
  name: string;
  position: string;
  branch: string;
  submittedAt: string;
  status: 'PENDING' | 'REVIEWING' | 'APPROVED' | 'REJECTED' | string;
  notes?: string;
  pdfUrl?: string;
};

export default function StatusCheckModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ApplicationResult[] | null>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || query.trim().length < 3) {
      setError('ກະລຸນາປ້ອນ Ref Code, ເບີໂທລະສັບ ຫຼື ອີເມວ ຢ່າງໜ້ອຍ 3 ຕົວອັກສອນ');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const res = await fetch(`${API}/api/applications/status-check?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (res.ok && data.results) {
        setResults(data.results);
      } else {
        setError(data.error || 'ບໍ່ພົບຂໍ້ມູນໃບສະໝັກ');
      }
    } catch (err) {
      setError('ເກີດຂໍ້ຜິດພາດໃນການເຊື່ອມຕໍ່ລະບົບ');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> ຜ່ານການຄັດເລືອກ (Approved)
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
            <XCircle className="w-3.5 h-3.5 text-red-600" /> ບໍ່ຜ່ານການຄັດເລືອກ (Not Accepted)
          </span>
        );
      case 'REVIEWING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <Clock className="w-3.5 h-3.5 text-blue-600 animate-spin" /> ກຳລັງກວດກາເອກະສານ (Under Review)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> ສົ່ງໃບສະໝັກແລ້ວ (Submitted)
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-5 sm:p-7 shadow-2xl border border-slate-100 font-lao">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 mb-4 pr-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-corporate-primary/10 text-corporate-primary shrink-0">
            <Search className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">ກວດເຊັກສະຖານະໃບສະໝັກ</h3>
            <p className="text-xs text-slate-500 mt-0.5">ປ້ອນ ລະຫັດອ້າງອີງ (Ref Code), ເບີໂທ ຫຼື ອີເມວ ເພື່ອກວດເຊັກ</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="mb-5">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ປ້ອນ Ref Code (ເຊັ່ນ LTC-2026-...), ເບີໂທ ຫຼື ອີເມວ..."
              className="w-full rounded-2xl border border-slate-200 py-3 pl-4 pr-28 text-sm focus:border-corporate-primary focus:ring-2 focus:ring-corporate-primary/20 outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-xl bg-corporate-primary text-white text-xs font-bold hover:bg-corporate-primary/90 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ຄົ້ນຫາ'}
            </button>
          </div>
        </form>

        {error && (
          <div className="p-3 mb-4 rounded-2xl bg-red-50 text-red-600 text-xs font-semibold text-center border border-red-100">
            {error}
          </div>
        )}

        {results && (
          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {results.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                ❌ ບໍ່ພົບຂໍ້ມູນໃບສະໝັກທີ່ກົງກັບ Ref Code, ເບີໂທ ຫຼື ອີເມວນີ້
              </div>
            ) : (
              results.map((item) => (
                <div key={item.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-corporate-primary/40 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[10px] font-bold text-corporate-primary bg-corporate-primary/10 px-2 py-0.5 rounded-md tracking-wider">
                        #{item.refCode || item.id}
                      </span>
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mt-1">
                        <User className="w-4 h-4 text-corporate-primary shrink-0" />
                        {item.name}
                      </h4>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100 mt-2">
                    <div className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{item.position}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{item.branch}</span>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                    <span>ວັນທີສົ່ງ: {(() => {
                      if (!item.submittedAt) return '—';
                      const str = String(item.submittedAt).trim();
                      if (/^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/.test(str)) {
                        const p = str.split(/[-\/]/);
                        return `${p[2].substring(0, 2).padStart(2, '0')}/${p[1].padStart(2, '0')}/${p[0]}`;
                      }
                      const d = new Date(item.submittedAt);
                      if (isNaN(d.getTime())) return str;
                      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                    })()}</span>
                    <a
                      href={item.pdfUrl ? `${API}${item.pdfUrl}` : `${API}/api/applications/${item.id}/pdf`}
                      rel="noopener noreferrer"
                      className="text-corporate-primary font-bold hover:underline"
                    >
                    📄 ດາວໂຫຼດ PDF ໃບສະໝັກ
                  </a>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
