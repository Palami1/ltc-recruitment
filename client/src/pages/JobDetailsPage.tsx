import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Briefcase, CheckCircle2, Clock, Users, Loader2 } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { isExpired, type JobPosition as SharedJobPosition } from '../lib/jobPositions';

import { fetchJobConfig } from '../lib/fetchJobConfig';




type JobPosition = SharedJobPosition;

type JobConfig = {
  positions: JobPosition[];
  requiredDocs: string[];
  applicantRequirements: string[];
};


export default function JobDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [config, setConfig] = useState<JobConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const startTime = Date.now();

    fetchJobConfig(controller.signal)
      .then((data) => {
        if (data) setConfig(data);
      })
      .catch((err) => {
        console.warn('Failed to fetch job config:', err);
      })
      .finally(() => {
        clearTimeout(timeoutId);
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 1100 - elapsed);
        setTimeout(() => {
          setLoading(false);
        }, remaining);
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  if (loading) {
    return (
      <PageLayout maxWidth="4xl" showBack backTo="/select">
        <div className="flex flex-1 items-center justify-center gap-3 py-20 text-[#303681]">
          <Loader2 className="h-7 w-7 animate-spin text-red-600" />
          <span className="animate-pulse text-sm font-semibold">ກຳລັງໂຫລດ...</span>
        </div>
      </PageLayout>
    );
  }

  const position = config?.positions?.find((p) => p.code === id);

  if (!position) {
    return (
      <PageLayout maxWidth="4xl" showBack backTo="/select">
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center text-corporate-ltc">
          <h2 className="text-lg sm:text-xl">ບໍ່ພົບຂໍ້ມູນຕຳແໜ່ງ</h2>
          <button
            type="button"
            onClick={() => navigate('/select')}
            className="text-corporate-primary hover:underline"
          >
            ← ຍ້ອນກັບ
          </button>
        </div>
      </PageLayout>
    );
  }

  const expiryValue = position.expirationDate || position.deadline;
  const isExpiredPosition = isExpired(position);

  return (
    <PageLayout maxWidth="4xl" showBack backTo="/select" showHome>
      <div className="card-panel space-y-6 sm:space-y-8">
        <div className="flex flex-col gap-4 border-b border-corporate-border pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <span className="mb-2 block font-mono text-xs uppercase tracking-widest text-corporate-primary sm:text-sm">
              {position.code}
            </span>
            <h1 className="mb-3 text-2xl font-bold leading-tight text-corporate-ltc sm:text-3xl">
              {position.department}
              {position.branch && (
                <span className="mt-2 sm:mt-0 sm:ml-3 inline-flex items-center gap-1.5 rounded-full bg-corporate-primary/5 px-3 py-1.5 text-base font-semibold text-corporate-muted border border-corporate-primary/10 sm:align-middle">
                  📍 {position.branch}
                </span>
              )}
            </h1>
            {position.sections && position.sections.length > 0 ? (
              <div className="mb-5">
                <p className="text-sm font-bold text-corporate-muted uppercase tracking-wider mb-2.5">
                  ພາກສ່ວນ / Sections
                </p>
                <ul className="grid grid-cols-1 gap-2 max-w-xl">
                  {position.sections.map((sec, i) => {
                    const secName = typeof sec === 'object' && sec !== null ? sec.name : String(sec);
                    const secSlots = typeof sec === 'object' && sec !== null && sec.slots !== undefined && sec.slots !== null && String(sec.slots).trim() !== '' ? String(sec.slots) : null;
                    const secReqs = typeof sec === 'object' && sec !== null && Array.isArray(sec.requirements) ? sec.requirements : [];
                    const secRes = typeof sec === 'object' && sec !== null && Array.isArray(sec.responsibilities) ? sec.responsibilities : [];
                    return (
                      <li key={i} className="flex flex-col p-3.5 rounded-[16px] bg-slate-50 border border-slate-100 hover:bg-slate-100/60 hover:border-slate-200 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="mt-[3px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-corporate-primary/10">
                              <div className="h-1.5 w-1.5 rounded-full bg-corporate-primary" />
                            </div>
                            <span className="text-[15px] text-slate-700 font-semibold leading-relaxed">
                              {secName}
                            </span>
                          </div>
                          {secSlots && (
                            <div className="shrink-0 flex sm:ml-4 ml-8">
                              <span className="inline-flex items-center gap-1.5 rounded-xl bg-corporate-primary/10 px-3 py-1.5 text-[13px] font-bold text-corporate-accent">
                                <Users className="h-3.5 w-3.5" />
                                ຮັບ {secSlots} {!isNaN(Number(secSlots)) ? 'ຄົນ' : ''}
                              </span>
                            </div>
                          )}
                        </div>
                        {secReqs.length > 0 && (
                          <div className="mt-3 ml-8">
                            <div className="text-[12px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">ເງື່ອນໄຂສະເພາະ:</div>
                            <ul className="space-y-1.5">
                              {secReqs.map((r, ri) => (
                                <li key={ri} className="flex items-start gap-2">
                                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                  <span className="text-[13px] sm:text-sm text-slate-600">{r}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {secRes.length > 0 && (
                          <div className="mt-3 ml-8">
                            <div className="text-[12px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">ໜ້າທີ່ຮັບຜິດຊອບ:</div>
                            <ul className="space-y-1.5">
                              {secRes.map((r, ri) => (
                                <li key={ri} className="flex items-start gap-2">
                                  <div className="mt-[7px] w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                                  <span className="text-[13px] sm:text-sm text-slate-600">{r}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : position.section ? (
              <p className="mb-4 text-lg text-slate-600 font-medium">
                ພາກສ່ວນ: {position.section}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {/* slots ລວມ — ໃຊ້ເມື່ອບໍ່ໄດ້ແຍກ sections */}
              {(!Array.isArray(position.sections) || position.sections.length === 0) && position.slots && (
                <span className="inline-block rounded-md bg-slate-100 px-3 py-1 text-sm text-corporate-primary">
                  ຮັບ {position.slots} {String(position.slots).trim() && !isNaN(Number(position.slots)) ? 'ຄົນ' : ''}
                </span>
              )}
              {expiryValue && (
                <div className="flex items-center gap-1.5 rounded-full bg-yellow-50 px-3 py-1 text-sm font-semibold text-yellow-600">
                  <Clock className="h-4 w-4" />
                  ໝົດອາຍຸ: {(() => {
                    const d = new Date(expiryValue);
                    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
                  })()}
                </div>
              )}
            </div>
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center self-start rounded-full bg-slate-100 sm:h-16 sm:w-16">
            <Briefcase className="h-7 w-7 text-corporate-accent sm:h-8 sm:w-8" />
          </div>
        </div>

        <div className="flex justify-stretch pt-2 sm:justify-end">
          {isExpiredPosition ? (
            <button type="button" disabled className="btn-primary">
              ໝົດເຂດຮັບສະໝັກແລ້ວ
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate(`/apply/${position.code}`)}
              className="btn-primary hover:shadow-[0_0_20px_rgba(227,28,37,0.3)]"
            >
              ສະໝັກດຽວນີ້
            </button>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
