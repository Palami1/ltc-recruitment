import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Briefcase, CheckCircle2, FileText, Loader2 } from 'lucide-react';
import PageLayout from '../components/PageLayout';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

type JobPosition = {
  department: string;
  section?: string;
  code: string;
  slots: number;
  requirements: string[] | string;
  deadline?: string;
};

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

export default function JobDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [config, setConfig] = useState<JobConfig | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <PageLayout maxWidth="4xl" showBack backTo="/select">
        <div className="flex flex-1 items-center justify-center gap-3 py-20 text-corporate-muted">
          <Loader2 className="h-6 w-6 animate-spin" /> ກຳລັງໂຫລດ...
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

  const allReqs = Array.isArray(position.requirements)
    ? position.requirements
    : typeof position.requirements === 'string' && position.requirements
    ? [position.requirements]
    : [];
  const isExpired =
    position.deadline &&
    new Date(position.deadline).setHours(23, 59, 59, 999) < Date.now();

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
            </h1>
            {position.sections && position.sections.length > 0 ? (
              <div className="mb-4 text-lg text-slate-600 font-medium">
                ພາກສ່ວນ:
                <ul className="list-inside list-disc ml-2 mt-1 space-y-1 text-base text-slate-500">
                  {position.sections.map((sec, i) => <li key={i}>{sec}</li>)}
                </ul>
              </div>
            ) : position.section ? (
              <p className="mb-4 text-lg text-slate-600 font-medium">
                ພາກສ່ວນ: {position.section}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <span className="inline-block rounded-md bg-slate-100 px-3 py-1 text-sm text-corporate-primary">
                ຮັບ {position.slots} {String(position.slots).trim() && !isNaN(Number(position.slots)) ? 'ຄົນ' : ''}
              </span>
              {position.deadline && (
                <span className="inline-block rounded-md border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-sm text-yellow-400">
                  ໝົດອາຍຸ: {new Date(position.deadline).toLocaleDateString('lo-LA')}
                </span>
              )}
            </div>
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center self-start rounded-full bg-slate-100 sm:h-16 sm:w-16">
            <Briefcase className="h-7 w-7 text-corporate-accent sm:h-8 sm:w-8" />
          </div>
        </div>

        {allReqs.length > 0 && (
          <div>
            <h3 className="mb-3 text-lg font-semibold text-corporate-ltc sm:mb-4 sm:text-xl">
              ເງື່ອນໄຂຜູ້ສະໝັກ
            </h3>
            <ul className="space-y-3">
              {allReqs.map((req, i) => (
                <li key={i} className="flex items-start gap-2 sm:gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-corporate-accent" />
                  <span className="text-sm text-slate-700 sm:text-base">{req}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {config?.requiredDocs && config.requiredDocs.length > 0 && (
          <div>
            <h3 className="mb-3 text-lg font-semibold text-corporate-ltc sm:mb-4 sm:text-xl">
              ເອກະສານທີ່ຕ້ອງການ
            </h3>
            <ul className="space-y-2">
              {config.requiredDocs.map((doc, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700 sm:gap-3 sm:text-base">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-corporate-primary" />
                  <span>{doc}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-stretch pt-2 sm:justify-end">
          {isExpired ? (
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
