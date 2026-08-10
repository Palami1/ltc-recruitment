import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Clock,
  Loader2,
  Search,
  Sparkles,
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
                      className={`job-card ${
                        expired ? 'cursor-not-allowed opacity-55' : 'job-card-active group'
                      }`}
                      style={{ animationDelay: `${0.08 + Math.min(index, 11) * 0.05}s` }}
                    >
                      <div className="relative z-[1]">
                        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-wide text-corporate-primary">
                            {pos.code}
                          </span>
                          {expired ? (
                            <span className="rounded-md border border-red-500/25 bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-400">
                              ໝົດເຂດແລ້ວ
                            </span>
                          ) : pos.deadline ? (
                            <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-yellow-500/25 bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-400">
                              <Clock className="h-3 w-3 shrink-0" />
                              <span className="truncate">
                                {new Date(pos.deadline).toLocaleDateString('lo-LA')}
                              </span>
                            </span>
                          ) : (
                            <span className="rounded-md border border-green-500/25 bg-green-500/10 px-2 py-0.5 text-xs font-semibold text-green-400">
                              ເປີດຮັບ
                            </span>
                          )}
                        </div>
                        <p
                          className={`pr-8 text-base font-bold leading-snug sm:text-lg ${
                            expired ? 'text-corporate-muted' : 'text-corporate-ltc group-hover:text-corporate-accent'
                          }`}
                        >
                          {pos.department}
                        </p>
                        {pos.sections && pos.sections.length > 0 ? (
                          <p className="mt-1 text-sm font-medium text-slate-500 line-clamp-2">
                            ພາກສ່ວນ: {pos.sections.join(', ')}
                          </p>
                        ) : pos.section ? (
                          <p className="mt-1 text-sm font-medium text-slate-500 line-clamp-1">
                            ພາກສ່ວນ: {pos.section}
                          </p>
                        ) : null}
                        {pos.slots && (
                          <p className="mt-2 text-xs font-medium text-corporate-muted">
                            ຮັບ{' '}
                            <span className="text-corporate-accent">{pos.slots}</span> {String(pos.slots).trim() && !isNaN(Number(pos.slots)) ? 'ຄົນ' : ''}
                          </p>
                        )}
                      </div>
                      {!expired && (
                        <div className="mt-5 flex w-full items-center justify-between rounded-lg bg-corporate-primary/10 px-4 py-2.5 transition-colors group-hover:bg-corporate-primary/20">
                          <span className="text-sm font-bold text-corporate-primary">
                            ເບິ່ງລາຍລະອຽດ & ສະໝັກ
                          </span>
                          <ArrowRight className="h-4 w-4 text-corporate-primary transition-transform group-hover:translate-x-1" aria-hidden />
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
