import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Clock,
  Loader2,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import LtcLogoBrand from '../components/LtcLogoBrand';
import PageLayout from '../components/PageLayout';
import {
  isExpired,
  isPositionConfigured,
  isPositionOpen,
  sumSlots,
  type JobPosition,
} from '../lib/jobPositions';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

type JobConfig = {
  positions: JobPosition[];
  requiredDocs: string[];
  applicantRequirements: string[];
};

const DEFAULT_FALLBACK_CONFIG: JobConfig = {
  positions: [
    { department: 'ພະແນກ ໄອທີ', code: 'IT', slots: 2, requirements: ['ຈົບປະລິນຍາຕີ ສາຂາ IT ຫຼື ທຽບເທົ່າ'], deadline: '' },
    { department: 'ພະແນກ ການຕະຫຼາດ', code: 'MARKETING', slots: 1, requirements: ['ຈົບປະລິນຍາຕີ ສາຂາ ການຕະຫຼາດ'], deadline: '' }
  ],
  requiredDocs: ['ໃບສະໝັກ Form 20', 'ສຳເນົາໃບຜ່ານຊັ້ນ', 'ຮູບ 3x4 (2 ໃບ)', 'ສຳເນົາ ບັດ ປທ.'],
  applicantRequirements: []
};

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

function requirementList(pos: JobPosition): string[] {
  if (Array.isArray(pos.requirements)) return pos.requirements;
  if (typeof pos.requirements === 'string' && pos.requirements) return [pos.requirements];
  return [];
}

function matchesPosition(pos: JobPosition, query: string) {
  if (!query) return true;
  const parts = [
    pos.department ?? '',
    pos.code ?? '',
    String(pos.slots ?? ''),
    ...requirementList(pos),
  ];
  return parts.join(' ').toLowerCase().includes(query);
}

export default function SelectionPage() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<JobConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    fetch(`${API}/api/job-config`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data && Array.isArray(data.positions) && data.positions.length > 0) {
          setConfig(data);
        } else {
          setConfig(DEFAULT_FALLBACK_CONFIG);
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch job config, using local fallback:', err);
        setConfig(DEFAULT_FALLBACK_CONFIG);
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setLoading(false);
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  const normalizedQuery = normalizeQuery(searchQuery);

  const configuredPositions = useMemo(
    () => (config?.positions ?? []).filter(isPositionConfigured),
    [config?.positions],
  );

  const openPositions = useMemo(
    () => configuredPositions.filter(isPositionOpen),
    [configuredPositions],
  );

  const filteredPositions = useMemo(() => {
    const pool = normalizedQuery ? configuredPositions : openPositions;
    return pool.filter((pos) => matchesPosition(pos, normalizedQuery));
  }, [configuredPositions, openPositions, normalizedQuery]);

  const openPostingCount = openPositions.length;
  const totalPostingCount = configuredPositions.length;
  const openSlotsSum = sumSlots(openPositions);
  const expiredPostingCount = configuredPositions.filter((p) => isExpired(p.deadline)).length;

  return (
    <PageLayout maxWidth="7xl" showBack backTo="/" backLabel="ກັບໜ້າຫຼັກ" showHome showAdminEntry>
      <div className="selection-page">
        {/* Header */}
        <header className="selection-header mb-8 opacity-0 animate-fade-in-up sm:mb-10">
          <div className="selection-header-accent" aria-hidden />
          <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:justify-between lg:gap-10">
            <LtcLogoBrand className="shrink-0 self-start" />

            <div className="flex min-w-0 flex-1 flex-col gap-5 lg:items-end">
              <div className="w-full lg:max-w-2xl lg:text-right">
                <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-corporate-accent lg:justify-end">
                  <Sparkles className="h-4 w-4" aria-hidden />
                  ລະບົບຮັບສະໝັກວຽກ
                </p>
                <h1 className="mb-2 text-2xl font-bold leading-tight text-corporate-ltc sm:text-3xl lg:text-4xl">
                  ເລືອກຕຳແໜ່ງທີ່ຕ້ອງການສະໝັກ
                </h1>
                <p className="text-sm text-corporate-muted sm:text-base">
                  Select the position you want to apply for.
                </p>
              </div>

              {!loading && totalPostingCount > 0 && (
                <div
                  className="w-full opacity-0 animate-fade-in-up lg:max-w-md"
                  style={{ animationDelay: '0.12s' }}
                >
                  <label
                    htmlFor="position-search"
                    className="mb-2 block text-sm font-semibold text-slate-600 lg:text-right"
                  >
                    ຄົ້ນຫາຕຳແໜ່ງ
                  </label>
                  <div className="selection-search-wrap">
                    <Search
                      className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-corporate-muted"
                      aria-hidden
                    />
                    <input
                      id="position-search"
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ພິມຊື່ຕຳແໜ່ງທີ່ທ່ານຕ້ອງການຄົ້ນຫາ..."
                      autoComplete="off"
                      className="selection-search-input"
                    />
                    {searchQuery.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-corporate-muted transition-colors hover:bg-slate-100 hover:text-corporate-ltc"
                        aria-label="ລຶບຄຳຄົ້ນຫາ"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-corporate-muted lg:text-right">
                    {normalizedQuery ? (
                      <>
                        ພົບ{' '}
                        <span className="font-bold text-corporate-accent">
                          {filteredPositions.length}
                        </span>{' '}
                        ຈາກ {totalPostingCount} ຕຳແໜ່ງ
                      </>
                    ) : (
                      <>
                        ເປີດຮັບ{' '}
                        <span className="font-bold text-corporate-accent">{openPostingCount}</span>{' '}
                        ຕຳແໜ່ງ · ຮັບຮວມ{' '}
                        <span className="font-bold text-corporate-accent">{openSlotsSum}</span> ຄົນ
                        {expiredPostingCount > 0 && (
                          <>
                            {' '}
                            · ໝົດອາຍຸ {expiredPostingCount} ຕຳແໜ່ງ
                          </>
                        )}
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        </header>

        {loading && (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-corporate-muted">
            <Loader2 className="h-10 w-10 animate-spin text-corporate-primary" />
            <p className="animate-pulse text-sm">ກຳລັງໂຫລດຕຳແໜ່ງ...</p>
          </div>
        )}

        {!loading && totalPostingCount === 0 && (
          <div
            className="card-panel py-16 text-center opacity-0 animate-fade-in-up"
            style={{ animationDelay: '0.1s' }}
          >
            <Building2 className="mx-auto mb-4 h-12 w-12 text-slate-400" />
            <p className="text-lg font-semibold text-slate-600">ຍັງບໍ່ມີຕຳແໜ່ງເປີດຮັບໃນຂະນະນີ້</p>
          </div>
        )}

        {!loading && totalPostingCount > 0 && (
          <section
            className="opacity-0 animate-fade-in-up"
            style={{ animationDelay: '0.2s' }}
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-corporate-primary/15">
                  <Building2 className="h-5 w-5 text-corporate-primary" />
                </span>
                <h2 className="text-xl font-bold text-corporate-ltc sm:text-2xl">ຕຳແໜ່ງທີ່ເປີດຮັບ</h2>
              </div>
            </div>

            {filteredPositions.length === 0 ? (
              <div className="card-panel animate-scale-in py-14 text-center">
                <Search className="mx-auto mb-4 h-10 w-10 text-slate-400" />
                <p className="text-lg font-semibold text-slate-600">ບໍ່ພົບຕຳແໜ່ງທີ່ຄົ້ນຫາ</p>
                <p className="mt-2 text-sm text-corporate-muted">ລອງຄຳອື່ນ ຫຼື ລຶບຄຳຄົ້ນຫາ</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-5 rounded-xl bg-corporate-primary/15 px-5 py-2.5 text-sm font-bold text-corporate-primary transition-all hover:bg-corporate-primary/25"
                >
                  ສະແດງທຸກຕຳແໜ່ງ
                </button>
              </div>
            ) : (
              <div
                key={normalizedQuery || 'all'}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {filteredPositions.map((pos, index) => {
                  const expired = isExpired(pos.deadline);
                  return (
                    <button
                      key={pos.code || `${pos.department}-${index}`}
                      type="button"
                      disabled={expired}
                      onClick={() => navigate(`/job/${pos.code}`)}
                      className={`relative overflow-hidden flex min-h-[150px] sm:min-h-[170px] flex-col justify-between rounded-[24px] sm:rounded-[28px] p-5 sm:p-6 text-left transition-all duration-700 ease-out ${
                        expired 
                          ? 'cursor-not-allowed bg-slate-50 opacity-60 grayscale-[50%]' 
                          : 'bg-white shadow-[0_4px_20px_rgb(0,0,0,0.03)] sm:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(227,28,37,0.12)] hover:-translate-y-1 sm:hover:-translate-y-2 group border border-slate-100/80 hover:border-corporate-accent/30'
                      }`}
                      style={{ animation: `fade-in-up 0.55s cubic-bezier(0.22, 1, 0.36, 1) ${0.08 + Math.min(index, 11) * 0.05}s forwards`, opacity: 0 }}
                    >
                      {/* V3: Ethereal Gradient Glows & Watermark */}
                      {!expired && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[24px] sm:rounded-[28px]">
                          {/* Abstract blurred shapes */}
                          <div className="absolute -top-[30%] -right-[10%] w-[90%] h-[90%] sm:-top-[40%] sm:-right-[20%] sm:w-[80%] sm:h-[80%] rounded-full bg-gradient-to-br from-corporate-primary/10 to-corporate-accent/5 blur-[40px] sm:blur-3xl transition-transform duration-[1.5s] group-hover:scale-150 group-hover:rotate-12 group-hover:opacity-80 opacity-50 sm:opacity-40" />
                          <div className="absolute -bottom-[20%] -left-[10%] w-[80%] h-[80%] sm:-bottom-[30%] sm:-left-[20%] sm:w-[70%] sm:h-[70%] rounded-full bg-gradient-to-tr from-blue-500/5 to-transparent blur-[40px] sm:blur-3xl transition-transform duration-[2s] group-hover:scale-125 group-hover:opacity-60 opacity-40 sm:opacity-30" />
                          {/* Animated top border glow */}
                          <div className="absolute top-0 left-0 h-[3px] w-0 bg-gradient-to-r from-corporate-primary via-corporate-accent to-orange-500 transition-all duration-700 ease-out group-hover:w-full" />
                        </div>
                      )}

                      <div className="relative z-10">
                        <div className="mb-3.5 sm:mb-4 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
                          <div className="flex items-center gap-2 sm:gap-2.5">
                            <span className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full transition-all duration-500 ${
                              expired ? 'bg-slate-200 text-slate-400' : 'bg-corporate-primary/10 text-corporate-primary shadow-sm ring-1 ring-corporate-primary/20 group-hover:bg-corporate-primary group-hover:text-white group-hover:rotate-[360deg]'
                            }`}>
                              <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            </span>
                            <span className={`font-mono text-[12px] sm:text-[13px] font-black tracking-widest transition-colors duration-500 ${
                              expired ? 'text-slate-400' : 'text-slate-400 group-hover:text-corporate-primary'
                            }`}>
                              {pos.code}
                            </span>
                          </div>
                          
                          {expired ? (
                            <span className="rounded-xl border border-red-500/20 bg-red-50 px-2.5 py-1 text-[11px] font-bold tracking-wide text-red-400">
                              ໝົດເຂດແລ້ວ
                            </span>
                          ) : pos.deadline ? (
                            <span className="inline-flex items-center gap-1.5 rounded-xl border border-yellow-500/20 bg-yellow-50/80 backdrop-blur-sm px-2.5 py-1 text-[11px] font-bold text-yellow-600 transition-all duration-300 group-hover:bg-yellow-100/80 group-hover:border-yellow-500/40 shadow-sm">
                              <Clock className="h-3 w-3 shrink-0" />
                              <span className="truncate">
                                {(() => {
                                  const d = new Date(pos.deadline);
                                  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
                                })()}
                              </span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-50/80 backdrop-blur-sm px-3 py-1 text-[11px] font-bold text-green-600 shadow-sm">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                              </span>
                              ເປີດຮັບ
                            </span>
                          )}
                        </div>

                        <h3
                          className={`pr-2 sm:pr-4 text-[19px] sm:text-[22px] font-extrabold leading-snug sm:leading-tight tracking-tight transition-all duration-500 ${
                            expired 
                              ? 'text-slate-500' 
                              : 'text-slate-800 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-br group-hover:from-corporate-ltc group-hover:to-corporate-accent sm:group-hover:translate-x-1.5'
                          }`}
                        >
                          {pos.department}
                        </h3>

                        {/* V3: Premium Slots Badge */}
                        {(() => {
                          let displaySlots = pos.slots;
                          if (pos.sections && pos.sections.length > 0) {
                            const calculated = pos.sections.reduce((t, s) => {
                              const num = typeof s === 'object' && !isNaN(Number(s.slots)) ? Number(s.slots) : 0;
                              return t + num;
                            }, 0);
                            if (calculated > 0) displaySlots = calculated;
                          }
                          if (!displaySlots || String(displaySlots).trim() === '' || String(displaySlots) === '0') return null;
                          const isNum = !isNaN(Number(displaySlots));
                          return (
                            <div className={`mt-4 sm:mt-5 flex transition-all duration-500 ${!expired ? 'sm:group-hover:translate-x-2' : ''}`}>
                              <div className={`relative flex items-center gap-2 rounded-[14px] sm:rounded-2xl p-1.5 pr-3.5 sm:pr-4 shadow-[0_2px_10px_rgb(0,0,0,0.03)] ring-1 backdrop-blur-md transition-all duration-300 ${
                                expired 
                                ? 'bg-slate-50 ring-slate-200/80' 
                                : 'bg-white/70 ring-slate-200/50 group-hover:ring-corporate-accent/30 group-hover:bg-white'
                              }`}>
                                <div className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-[10px] sm:rounded-xl shadow-inner transition-transform duration-500 ${
                                  expired ? 'bg-slate-200 text-slate-400' : 'bg-gradient-to-br from-corporate-primary to-corporate-accent text-white group-hover:rotate-12 group-hover:scale-110'
                                }`}>
                                  <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                </div>
                                <span className={`text-[11px] sm:text-xs font-bold ${expired ? 'text-slate-500' : 'text-slate-700'}`}>
                                  ຮັບ <span className={expired ? '' : 'text-corporate-accent text-[13px] sm:text-[14px] font-black'}>{displaySlots}</span> {isNum ? 'ຄົນ' : ''}
                                </span>
                              </div>
                            </div>
                          );
                        })()}

                        {/* ພາກສ່ວນເປັນ Tags (V3 Interactive Tags) */}
                        {pos.sections && pos.sections.length > 0 ? (
                          <div className={`mt-3.5 sm:mt-5 flex flex-wrap gap-1.5 sm:gap-2 transition-all duration-500 ${!expired ? 'sm:group-hover:translate-y-[-2px]' : ''}`}>
                            {pos.sections.slice(0, 3).map((sec, si) => {
                               const secName = typeof sec === 'object' && sec !== null ? sec.name : String(sec);
                               return (
                                 <span key={si} className={`inline-flex items-center rounded-[10px] sm:rounded-xl px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-semibold tracking-wide transition-all duration-300 ${
                                   expired 
                                     ? 'bg-slate-100 text-slate-400' 
                                     : 'bg-slate-50/80 text-slate-600 shadow-sm ring-1 ring-slate-200/60 backdrop-blur-sm group-hover:bg-white group-hover:text-corporate-primary group-hover:ring-corporate-primary/20 hover:!scale-105 hover:!bg-corporate-primary/10 hover:!shadow-md'
                                 }`}>
                                   {secName}
                                 </span>
                               );
                            })}
                            {pos.sections.length > 3 && (
                               <span className={`inline-flex items-center rounded-[10px] sm:rounded-xl px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-semibold tracking-wide border border-dashed transition-all duration-300 ${
                                 expired ? 'bg-transparent text-slate-400 border-slate-300' : 'bg-transparent text-slate-500 border-slate-300 group-hover:border-corporate-primary/30 group-hover:text-corporate-primary'
                               }`}>
                                 +{pos.sections.length - 3} ອື່ນໆ
                               </span>
                            )}
                          </div>
                        ) : pos.section ? (
                          <div className={`mt-3.5 sm:mt-5 flex flex-wrap gap-1.5 sm:gap-2 transition-all duration-500 ${!expired ? 'sm:group-hover:translate-y-[-2px]' : ''}`}>
                            <span className={`inline-flex items-center rounded-[10px] sm:rounded-xl px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-semibold tracking-wide transition-all duration-300 ${
                               expired ? 'bg-slate-100 text-slate-400' : 'bg-slate-50/80 text-slate-600 shadow-sm ring-1 ring-slate-200/60 backdrop-blur-sm group-hover:bg-white group-hover:text-corporate-primary group-hover:ring-corporate-primary/20'
                             }`}>
                              {pos.section}
                            </span>
                          </div>
                        ) : null}
                      </div>

                      {/* V3: Animated Call-To-Action Overlay */}
                      {!expired && (
                        <div className="relative z-10 mt-5 sm:mt-7 overflow-hidden rounded-[14px] sm:rounded-2xl bg-slate-50/80 backdrop-blur-sm ring-1 ring-slate-100 transition-all duration-500 group-hover:bg-corporate-accent group-hover:ring-corporate-accent group-hover:shadow-[0_8px_20px_rgba(227,28,37,0.25)]">
                          <div className="flex w-full items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5">
                            <span className="text-[12px] sm:text-[13px] font-extrabold uppercase tracking-wider text-slate-500 transition-colors duration-500 group-hover:text-white">
                              ເບິ່ງລາຍລະອຽດແຄມເປນ
                            </span>
                            <div className="relative flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-white shadow-sm transition-all duration-500 group-hover:translate-x-1 group-hover:scale-110 group-hover:shadow-lg">
                              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-corporate-accent transition-transform duration-500 group-hover:rotate-[-45deg]" aria-hidden />
                            </div>
                          </div>
                          {/* Light sweeping reflection effect */}
                          <div className="absolute inset-0 -translate-x-[150%] bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-[1s] ease-in-out group-hover:translate-x-[150%]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </PageLayout>
  );
}
