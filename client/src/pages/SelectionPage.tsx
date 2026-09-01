import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BarChart3,
  Briefcase,
  BriefcaseMedical,
  Building2,
  CalendarDays,
  Clock,
  FileEdit,
  Fuel,
  Gift,
  GraduationCap,
  Heart,
  HeartHandshake,
  Home,
  Loader2,
  Palmtree,
  PhoneCall,
  Search,
  ShieldCheck,
  Shirt,
  Sparkles,
  Stethoscope,
  UserCheck,
  UtensilsCrossed,
  Users,
  X,
  MapPin,
  ChevronRight,
  Trophy,
} from 'lucide-react';
import PageLayout from '../components/PageLayout';
import StatusCheckModal from '../components/StatusCheckModal';
import {
  isExpired,
  isPositionConfigured,
  isPositionOpen,
  sumSlots,
  type JobPosition,
} from '../lib/jobPositions';
import { getBranchPriority, DEFAULT_BRANCH } from '../lib/hiringConfig';

import { fetchJobConfig } from '../lib/fetchJobConfig';


type JobConfig = {
  positions: JobPosition[];
  requiredDocs: string[];
  applicantRequirements: string[];
};


const BENEFITS_LIST = [
  { id: 1, title: 'ເງິນກິນເຊົ້າ', icon: UtensilsCrossed, color: 'text-amber-600 bg-amber-50 ring-amber-400/30' },
  { id: 2, title: 'ເງິນນ້ຳມັນ', icon: Fuel, color: 'text-red-600 bg-red-50 ring-red-400/30' },
  { id: 3, title: 'ເງິນໂອທີ (OT)', icon: Clock, color: 'text-blue-600 bg-blue-50 ring-blue-400/30' },
  { id: 4, title: 'ເງິນໂບນັດ (Bonus)', icon: Gift, color: 'text-rose-600 bg-rose-50 ring-rose-400/30' },
  { id: 5, title: 'ເງິນຊຸກຍູ້ພິເສດ (KPI)', icon: BarChart3, color: 'text-emerald-600 bg-emerald-50 ring-emerald-400/30' },
  { id: 6, title: 'ເງິນອຸດໜູນຄ່າຄອງຊີບ', icon: HeartHandshake, color: 'text-indigo-600 bg-indigo-50 ring-indigo-400/30' },
  { id: 7, title: 'ມີປະກັນສັງຄົມ', icon: ShieldCheck, color: 'text-red-600 bg-red-50 ring-red-400/30' },
  { id: 8, title: 'ວັນພັກປະຈຳປີ 15 ວັນ', icon: CalendarDays, color: 'text-amber-600 bg-amber-50 ring-amber-400/30' },
  { id: 9, title: 'ກວດສຸຂະພາບປະຈຳປີ', icon: Stethoscope, color: 'text-teal-600 bg-teal-50 ring-teal-400/30' },
  { id: 10, title: 'ນະໂຍບາຍຍາມເຈັບເປັນ', icon: BriefcaseMedical, color: 'text-cyan-600 bg-cyan-50 ring-cyan-400/30' },
  { id: 11, title: 'ນະໂຍບາຍວັນພັກທີ່ສໍາຄັນ', icon: Palmtree, color: 'text-orange-600 bg-orange-50 ring-orange-400/30' },
  { id: 12, title: 'ນະໂຍບາຍຕໍ່ຄອບຄົວ', icon: Heart, color: 'text-pink-600 bg-pink-50 ring-pink-400/30' },
  { id: 13, title: 'ນະໂຍບາຍມູນຄ່າໂທ ພ້ອມດາຕ້າ', icon: PhoneCall, color: 'text-violet-600 bg-violet-50 ring-violet-400/30' },
  { id: 14, title: 'ນະໂຍບາຍເຄື່ອງແບບພະນັກງານ', icon: Shirt, color: 'text-red-600 bg-red-50 ring-red-400/30' },
  { id: 15, title: 'ນະໂຍບາຍອຸດໜູນຕຳແໜ່ງ, ອຸດໜູນວິຊາການ', icon: Award, color: 'text-yellow-600 bg-yellow-50 ring-yellow-400/30' },
  { id: 16, title: 'ນະໂຍບາຍສົ່ງເສີມການສຶກສາ', icon: GraduationCap, color: 'text-blue-600 bg-blue-50 ring-blue-400/30' },
  { id: 17, title: 'ສະຫວັດດີການອື່ນໆອີກຫຼາຍຢ່າງ', icon: Sparkles, color: 'text-purple-600 bg-purple-50 ring-purple-400/30' },
];

function normalizeLaoText(value: string): string {
  if (!value) return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/ຫຼ/g, 'ຫລ')
    .replace(/ໜ/g, 'ຫນ')
    .replace(/ໝ/g, 'ຫມ')
    .replace(/ຼ/g, 'ລ');
}

function requirementList(pos: JobPosition): string[] {
  if (Array.isArray(pos.requirements)) return pos.requirements;
  if (typeof pos.requirements === 'string' && pos.requirements) return [pos.requirements];
  return [];
}

const COMMON_LAO_PREFIXES = [
  'ສາຂາ',
  'ແຂວງ',
  'ນະຄອນຫຼວງ',
  'ນະຄອນຫລວງ',
  'ເມືອງ',
  'ພະແນກ',
  'ຝ່າຍ',
  'ກຸ່ມ',
  'ປະຈໍາ',
  'ປະຈຳ',
  'ສຳນັກງານ',
  'ຫ້ອງການ',
];

function matchesPosition(pos: JobPosition, query: string) {
  if (!query) return true;
  const rawNormalizedQ = normalizeLaoText(query);
  if (!rawNormalizedQ) return true;

  const sectionNames = Array.isArray(pos.sections)
    ? pos.sections.map(s => typeof s === 'object' && s !== null ? s.name : String(s))
    : [];

  const branchText = pos.branch?.trim() || DEFAULT_BRANCH;

  const parts = [
    pos.department ?? '',
    pos.code ?? '',
    branchText,
    'ສຳນັກງານໃຫຍ່',
    pos.section ?? '',
    ...sectionNames,
    String(pos.slots ?? ''),
    ...requirementList(pos),
  ];

  const fullSearchableText = normalizeLaoText(parts.join(' '));

  // 1. Direct exact/substring match
  if (fullSearchableText.includes(rawNormalizedQ)) return true;

  // 2. Tokenized match (split by whitespace)
  const tokens = rawNormalizedQ.split(/\s+/).filter(Boolean);
  if (tokens.length > 0 && tokens.every(token => fullSearchableText.includes(token))) {
    return true;
  }

  // 3. Recursive Prefix Stripping (stripping "ສາຂາ", "ແຂວງ", "ນະຄອນຫຼວງ", "ພະແນກ", "ເມືອງ", etc.)
  let strippedQ = rawNormalizedQ;
  let changed = true;
  while (changed && strippedQ.length > 0) {
    changed = false;
    for (const prefix of COMMON_LAO_PREFIXES) {
      const normPrefix = normalizeLaoText(prefix);
      if (strippedQ.startsWith(normPrefix)) {
        strippedQ = strippedQ.slice(normPrefix.length).trim();
        changed = true;
      }
      if (strippedQ.endsWith(normPrefix)) {
        strippedQ = strippedQ.slice(0, strippedQ.length - normPrefix.length).trim();
        changed = true;
      }
    }
  }

  if (strippedQ.length > 0 && fullSearchableText.includes(strippedQ)) {
    return true;
  }

  // 4. Any significant sub-token match
  const subTokens = strippedQ.split(/\s+/).filter(t => t.length >= 2);
  if (subTokens.length > 0 && subTokens.some(st => fullSearchableText.includes(st))) {
    return true;
  }

  return false;
}

export default function SelectionPage() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<JobConfig | null>({ positions: [], requiredDocs: [], applicantRequirements: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const startTime = Date.now();

    fetchJobConfig(controller.signal)
      .then((data) => {
        if (data) setConfig(data);
      })
      .catch((err) => {
        console.warn('SelectionPage fetch error:', err);
      })
      .finally(() => {
        clearTimeout(timeoutId);
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 1300 - elapsed);
        setTimeout(() => {
          setLoading(false);
        }, remaining);
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  const [version] = useState<'v1' | 'v2'>('v1');
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'HQ_VTE' | 'PROVINCES'>('ALL');
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  const normalizedQuery = normalizeLaoText(searchQuery);

  const configuredPositions = useMemo(
    () => (config?.positions ?? []).filter(isPositionConfigured),
    [config?.positions],
  );

  const activePositions = useMemo(
    () => configuredPositions.filter((pos) => !isExpired(pos)),
    [configuredPositions],
  );

  const openPositions = useMemo(
    () => activePositions.filter(isPositionOpen),
    [activePositions],
  );

  const filteredPositions = useMemo(() => {
    return openPositions.filter((pos) => matchesPosition(pos, searchQuery));
  }, [openPositions, searchQuery]);

  const groupedPositions = useMemo(() => {
    return filteredPositions.reduce((acc, pos) => {
      let b = pos.branch?.trim() || 'ສຳນັກງານໃຫຍ່';
      if (
        !b ||
        b.includes('ສຳນັກງານ') ||
        b.includes('ໃຫຍ່') ||
        b.includes('ນະຄອນຫຼວງ') ||
        b.includes('ນະຄອນຫລວງ')
      ) {
        b = 'ສຳນັກງານໃຫຍ່';
      }
      if (!acc[b]) acc[b] = [];
      acc[b].push(pos);
      return acc;
    }, {} as Record<string, JobPosition[]>);
  }, [filteredPositions]);

  const sortedGroupedPositions = useMemo(() => {
    const sorted = Object.entries(groupedPositions).sort(([branchA], [branchB]) => {
      return getBranchPriority(branchA) - getBranchPriority(branchB);
    });

    if (selectedCategory === 'HQ_VTE') {
      return sorted.filter(([b]) => b.includes('ສຳນັກງານ') || b.includes('ໃຫຍ່') || b.includes('ນະຄອນຫຼວງ') || b.includes('ນະຄອນຫລວງ'));
    }
    if (selectedCategory === 'PROVINCES') {
      return sorted.filter(
        ([b]) => !b.includes('ສຳນັກງານ') && !b.includes('ໃຫຍ່') && !b.includes('ນະຄອນຫຼວງ') && !b.includes('ນະຄອນຫລວງ')
      );
    }
    return sorted;
  }, [groupedPositions, selectedCategory]);

  const categoryCounts = useMemo(() => {
    let hqVte = 0;
    let prov = 0;
    openPositions.forEach((pos) => {
      const b = pos.branch || '';
      if (!b || b.includes('ສຳນັກງານ') || b.includes('ໃຫຍ່') || b.includes('ນະຄອນຫຼວງ') || b.includes('ນະຄອນຫລວງ')) {
        hqVte++;
      } else {
        prov++;
      }
    });
    return { all: openPositions.length, hqVte, prov };
  }, [openPositions]);

  const openPostingCount = openPositions.length;
  const totalPostingCount = activePositions.length;
  const openSlotsSum = sumSlots(openPositions);

  return (
    <PageLayout maxWidth="full" showHome={false} showStatusCheck={false}>
      {/* VERSION 1: CLASSIC FULL-WIDTH BANNER & STYLED GRID */}
      {version === 'v1' && (
        <div className="selection-page font-lao w-full">
          {/* Header with 17 Employee Benefits Banner (Full Width Edge-to-Edge) */}
          <header className="relative w-full overflow-hidden mb-4 sm:mb-8 bg-[#cc0000] shadow-2xl opacity-0 animate-fade-in-up border-b-4 border-red-700">
            {/* Top Bar Navigation (Full-width edge-to-edge layout) */}
            <div className="w-full bg-[#a30000] border-b border-red-800/80 py-2 sm:py-2.5 px-4 sm:px-6 lg:px-8">
              <nav className="w-full flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full px-3.5 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm font-bold text-white bg-white/15 hover:bg-white/30 border border-white/25 shadow-sm transition-all cursor-pointer shrink-0 active:scale-95"
                >
                  <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-amber-300" aria-hidden />
                  <span>ໜ້າຫຼັກ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(true)}
                  className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 py-1.5 sm:px-5 sm:py-2 rounded-full text-xs sm:text-sm font-bold text-white bg-white/15 hover:bg-white/30 border border-white/25 shadow-sm transition-all cursor-pointer shrink-0 active:scale-95"
                >
                  <Search className="w-3.5 h-3.5 sm:h-4 sm:w-4 text-amber-300 shrink-0" />
                  <span>ກວດເຊັກສະຖານະໃບສະໝັກ</span>
                </button>
              </nav>
            </div>

            {/* RESPONSIVE BANNER IMAGE (Aspect Ratio locked to shrink dynamically with screen width) */}
            <div className="relative overflow-hidden w-full bg-[#cc0000] aspect-[16/5.2] sm:aspect-[16/4.5] md:aspect-[16/4] lg:aspect-[16/3.6]">
              <img
                src="/benefits/99.png"
                alt="LTC ສະຫວັດດີການ 30th Anniversary"
                className="w-full h-full object-cover object-top block mx-auto"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/benefits/99.png';
                }}
              />
            </div>

            {/* 3. Middle Section: 4 Recruitment Process Steps with Animated Golden Wave */}
            <div className="relative bg-[#cc0000] pt-0 pb-2 sm:pb-5 px-3 sm:px-4 overflow-hidden select-none">
              <div className="absolute inset-0 opacity-30 pointer-events-none flex items-center justify-center">
                <svg className="w-full h-full" viewBox="0 0 1200 200" fill="none" preserveAspectRatio="none">
                  <path d="M0 100 Q 300 20, 600 100 T 1200 100" stroke="#fde047" strokeWidth="3" fill="none" className="animate-pulse" />
                  <path d="M0 120 Q 300 40, 600 120 T 1200 120" stroke="#fef08a" strokeWidth="1.5" strokeDasharray="8 8" fill="none" />
                </svg>
              </div>

              <div className="max-w-7xl mx-auto">
                <h3 className="relative text-center font-black text-amber-200 text-xs sm:text-base md:text-lg mb-2 sm:mb-6 tracking-wide drop-shadow-md font-lao">
                  ✨ ຄົ້ນຫາສະຫວັດດີການ ແລະ ສະໝັກຮ່ວມທີມກັບພວກເຮົາ
                </h3>

                <div className="relative grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-6 max-w-5xl mx-auto">
                  {/* Step 1 */}
                  <div
                    onMouseEnter={() => setHoveredStep(1)}
                    onMouseLeave={() => setHoveredStep(null)}
                    className="flex flex-col items-center text-center group cursor-pointer transition-all duration-300"
                  >
                    <div className={`relative flex items-center justify-center w-11 h-11 sm:w-16 sm:h-16 rounded-full bg-white transition-all duration-300 ${
                      hoveredStep === 1
                        ? 'ring-4 ring-amber-400 scale-110 -translate-y-1 shadow-2xl bg-amber-50'
                        : 'ring-4 ring-rose-300/80 shadow-lg'
                    }`}>
                      <FileEdit className={`h-5 w-5 sm:h-7 sm:w-7 transition-colors ${hoveredStep === 1 ? 'text-amber-600 scale-110' : 'text-red-600'}`} />
                      <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-amber-400 text-red-950 font-black text-[9px] sm:text-[10px] flex items-center justify-center border border-white shadow-xs">1</span>
                    </div>
                    <h4 className={`mt-1.5 sm:mt-3 text-[11px] sm:text-sm font-black transition-colors leading-tight font-lao ${hoveredStep === 1 ? 'text-amber-200' : 'text-white'}`}>
                      1. ສົ່ງໃບສະໝັກ
                    </h4>
                    <p className="text-[9px] sm:text-xs text-amber-100/90 leading-tight mt-0.5 sm:mt-1 font-lao">
                      ນະໂຍບາຍສະຫວັດດີການ<br />1. ສົ່ງໃບສະໝັກ
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div
                    onMouseEnter={() => setHoveredStep(2)}
                    onMouseLeave={() => setHoveredStep(null)}
                    className="flex flex-col items-center text-center group cursor-pointer transition-all duration-300"
                  >
                    <div className={`relative flex items-center justify-center w-11 h-11 sm:w-16 sm:h-16 rounded-full bg-white transition-all duration-300 ${
                      hoveredStep === 2
                        ? 'ring-4 ring-amber-400 scale-110 -translate-y-1 shadow-2xl bg-amber-50'
                        : 'ring-4 ring-rose-300/80 shadow-lg'
                    }`}>
                      <UserCheck className={`h-5 w-5 sm:h-7 sm:w-7 transition-colors ${hoveredStep === 2 ? 'text-amber-600 scale-110' : 'text-red-600'}`} />
                      <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-amber-400 text-red-950 font-black text-[9px] sm:text-[10px] flex items-center justify-center border border-white shadow-xs">2</span>
                    </div>
                    <h4 className={`mt-1.5 sm:mt-3 text-[11px] sm:text-sm font-black transition-colors leading-tight font-lao ${hoveredStep === 2 ? 'text-amber-200' : 'text-white'}`}>
                      2. ສໍາພາດ
                    </h4>
                    <p className="text-[9px] sm:text-xs text-amber-100/90 leading-tight mt-0.5 sm:mt-1 font-lao">
                      ສໍາພາດສະໝັກກັບພະນັກງານ<br />ຮ່ວມທີມກັບພວກເຮົາ
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div
                    onMouseEnter={() => setHoveredStep(3)}
                    onMouseLeave={() => setHoveredStep(null)}
                    className="flex flex-col items-center text-center group cursor-pointer transition-all duration-300"
                  >
                    <div className={`relative flex items-center justify-center w-11 h-11 sm:w-16 sm:h-16 rounded-full bg-white transition-all duration-300 ${
                      hoveredStep === 3
                        ? 'ring-4 ring-amber-400 scale-110 -translate-y-1 shadow-2xl bg-amber-50'
                        : 'ring-4 ring-rose-300/80 shadow-lg'
                    }`}>
                      <HeartHandshake className={`h-5 w-5 sm:h-7 sm:w-7 transition-colors ${hoveredStep === 3 ? 'text-amber-600 scale-110' : 'text-red-600'}`} />
                      <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-amber-400 text-red-950 font-black text-[9px] sm:text-[10px] flex items-center justify-center border border-white shadow-xs">3</span>
                    </div>
                    <h4 className={`mt-1.5 sm:mt-3 text-[11px] sm:text-sm font-black transition-colors leading-tight font-lao ${hoveredStep === 3 ? 'text-amber-200' : 'text-white'}`}>
                      3. ສະເໜີຮັບເຂົ້າ
                    </h4>
                    <p className="text-[9px] sm:text-xs text-amber-100/90 leading-tight mt-0.5 sm:mt-1 font-lao">
                      ສະເໜີຮັບເຂົ້າ ແລະ ສອບທາດ<br />ເມື່ອກັບພວກເຮົາ
                    </p>
                  </div>

                  {/* Step 4 */}
                  <div
                    onMouseEnter={() => setHoveredStep(4)}
                    onMouseLeave={() => setHoveredStep(null)}
                    className="flex flex-col items-center text-center group cursor-pointer transition-all duration-300"
                  >
                    <div className={`relative flex items-center justify-center w-11 h-11 sm:w-16 sm:h-16 rounded-full bg-white transition-all duration-300 ${
                      hoveredStep === 4
                        ? 'ring-4 ring-amber-400 scale-110 -translate-y-1 shadow-2xl bg-amber-50'
                        : 'ring-4 ring-rose-300/80 shadow-lg'
                    }`}>
                      <Briefcase className={`h-5 w-5 sm:h-7 sm:w-7 transition-colors ${hoveredStep === 4 ? 'text-amber-600 scale-110' : 'text-red-600'}`} />
                      <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-amber-400 text-red-950 font-black text-[9px] sm:text-[10px] flex items-center justify-center border border-white shadow-xs">4</span>
                    </div>
                    <h4 className={`mt-1.5 sm:mt-3 text-[11px] sm:text-sm font-black transition-colors leading-tight font-lao ${hoveredStep === 4 ? 'text-amber-200' : 'text-white'}`}>
                      4. ເຂົ້າເຮັດວຽກ
                    </h4>
                    <p className="text-[9px] sm:text-xs text-amber-100/90 leading-tight mt-0.5 sm:mt-1 font-lao">
                      ຄົ້ນຫາສະຫວັດດີການ ແລະ<br />ສະໝັກຮ່ວມທີມກັບພວກເຮົາ
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Full-Width Edge-to-Edge 17 Employee Benefits Cards Section (Large 3D Cards) */}
            <div className="bg-[#cc0000] pt-1 pb-6 sm:py-8 md:py-10 px-4 sm:px-6 md:px-8 lg:px-12 w-full">
              <div className="w-full">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-4 sm:gap-5 md:gap-6">
                  {BENEFITS_LIST.map((benefit) => {
                    const IconComponent = benefit.icon;
                    return (
                      <div
                        key={benefit.id}
                        className="relative p-4 sm:p-5 md:p-6 rounded-3xl bg-gradient-to-b from-white via-slate-50/95 to-slate-100/90 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.28),0_4px_10px_-2px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,0.9)] hover:shadow-[0_22px_40px_-6px_rgba(227,28,37,0.38),0_10px_20px_-4px_rgba(0,0,0,0.2)] hover:-translate-y-2.5 hover:scale-[1.03] transition-all duration-300 transform-gpu border border-slate-200/90 hover:border-red-400 flex flex-col items-center justify-between text-center group min-h-[145px] sm:min-h-[160px] md:min-h-[175px] overflow-hidden cursor-pointer"
                      >
                        {/* 3D Glassy Top Reflective Layer */}
                        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/80 via-white/20 to-transparent pointer-events-none rounded-t-3xl" />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-100/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

                        {/* 3D Floating Number Pill */}
                        <span className="absolute top-2.5 left-2.5 w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-red-500 via-red-600 to-rose-800 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md shadow-red-950/40 border border-white/80 group-hover:scale-115 group-hover:rotate-6 transition-all duration-300">
                          {benefit.id}
                        </span>

                        {/* 3D Large Icon Box */}
                        <div className={`mt-3 flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 rounded-full ring-4 ring-white shadow-md shadow-slate-300/80 group-hover:scale-115 group-hover:rotate-6 group-hover:shadow-xl transition-all duration-300 ${benefit.color}`}>
                          <IconComponent className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />
                        </div>

                        <p className="text-xs sm:text-sm md:text-base font-black text-slate-800 leading-snug mt-3 font-lao group-hover:text-red-600 transition-colors line-clamp-2 drop-shadow-xs">
                          {benefit.title}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 5. Single-Row Layout: Left (Search Bar) & Right (Category Selectors) */}
            {!loading && totalPostingCount > 0 && (
              <div className="bg-[#cc0000] pb-8 pt-2 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                  <div className="w-full flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 transition-all">
                    {/* Left Side: Search Bar (Wider/Longer) */}
                    <div className="relative w-full md:flex-1 md:max-w-xl lg:max-w-2xl group">
                      <Search className="pointer-events-none absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-red-600 transition-colors" />
                      <input
                        id="position-search"
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="ພິມຊື່ຕຳແໜ່ງ, ພະແນກ ຫຼື ແຂວງ/ສາຂາ..."
                        className="w-full rounded-full border-2 border-white bg-white py-3 sm:py-3.5 pl-12 sm:pl-14 pr-11 text-sm sm:text-base text-slate-900 shadow-xl shadow-red-950/20 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-white/40 font-lao placeholder:text-slate-400 font-medium"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-700 transition-colors cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Right Side: Category Selectors & Counter Badges */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0 justify-start md:justify-end w-full md:w-auto">
                      <button
                        type="button"
                        onClick={() => setSelectedCategory('ALL')}
                        className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs sm:text-sm font-black whitespace-nowrap transition-all duration-200 cursor-pointer border-2 ${
                          selectedCategory === 'ALL'
                            ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white border-white shadow-xl shadow-red-950/30 ring-2 ring-white/50 scale-[1.02]'
                            : 'bg-white/95 text-slate-800 hover:bg-white hover:text-red-600 border-white shadow-md'
                        }`}
                      >
                        <span>✨ ທັງໝົດ</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-black ${selectedCategory === 'ALL' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'}`}>
                          {categoryCounts.all}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedCategory('HQ_VTE')}
                        className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs sm:text-sm font-black whitespace-nowrap transition-all duration-200 cursor-pointer border-2 ${
                          selectedCategory === 'HQ_VTE'
                            ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white border-white shadow-xl shadow-red-950/30 ring-2 ring-white/50 scale-[1.02]'
                            : 'bg-white/95 text-slate-800 hover:bg-white hover:text-red-600 border-white shadow-md'
                        }`}
                      >
                        <span>🏛️ ສຳນັກງານໃຫຍ່</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-black ${selectedCategory === 'HQ_VTE' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'}`}>
                          {categoryCounts.hqVte}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedCategory('PROVINCES')}
                        className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs sm:text-sm font-black whitespace-nowrap transition-all duration-200 cursor-pointer border-2 ${
                          selectedCategory === 'PROVINCES'
                            ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white border-white shadow-xl shadow-red-950/30 ring-2 ring-white/50 scale-[1.02]'
                            : 'bg-white/95 text-slate-800 hover:bg-white hover:text-red-600 border-white shadow-md'
                        }`}
                      >
                        <span>🏞️ ສາຂາແຂວງ</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-black ${selectedCategory === 'PROVINCES' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'}`}>
                          {categoryCounts.prov}
                        </span>
                      </button>

                      {/* Status Badge */}
                      {normalizedQuery ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white border-2 border-white px-3.5 py-2 text-xs font-bold text-red-700 shadow-md">
                          🔍 ພົບ <span className="font-black text-red-900">{filteredPositions.length}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white border-2 border-white px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-md">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                          </span>
                          ເປີດຮັບ <span className="font-black text-emerald-950">{openPostingCount}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </header>

          {/* Section 2: Positions List (Standard max-w-7xl Container) */}
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-16">
            {loading && (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-[#303681]">
                <Loader2 className="h-9 w-9 animate-spin text-red-600" />
                <p className="animate-pulse text-sm font-semibold">ກຳລັງໂຫລດຕຳແໜ່ງ...</p>
              </div>
            )}

            {!loading && totalPostingCount === 0 && (
              <div className="card-panel py-16 text-center opacity-0 animate-fade-in-up">
                <Building2 className="mx-auto mb-4 h-12 w-12 text-slate-400" />
                <p className="text-lg font-semibold text-slate-600">ຍັງບໍ່ມີຕຳແໜ່ງເປີດຮັບໃນຂະນະນີ້</p>
              </div>
            )}

            {!loading && totalPostingCount > 0 && (
              <section>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 sm:mb-6">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-corporate-primary/15">
                      <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-corporate-primary" />
                    </span>
                    <h2 className="text-lg font-bold text-corporate-ltc sm:text-2xl">ຕຳແໜ່ງທີເປີດຮັບ</h2>
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
                  <div className="space-y-6 sm:space-y-12">
                    {sortedGroupedPositions.map(([branch, positionsInBranch]) => (
                      <div key={branch}>
                        <h3 className="text-base sm:text-lg font-bold text-corporate-ltc mb-2.5 sm:mb-4 flex items-center gap-2 border-b border-slate-200 pb-1.5 sm:pb-2">
                          📍 {branch}
                          <span className="bg-corporate-primary/10 text-corporate-primary px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-bold">{positionsInBranch.length} ຕຳແໜ່ງ</span>
                        </h3>
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
                          {positionsInBranch.map((pos, index) => {
                            const expired = isExpired(pos.deadline);
                            const posKey = String(pos.id || pos.code || pos.department || 'pos') + '-' + String(pos.branch || '') + '-' + index;
                            return (
                              <button
                                key={posKey}
                                type="button"
                                disabled={expired}
                                onClick={() => navigate(`/job/${pos.code}`)}
                                className={`relative overflow-hidden flex min-h-[120px] sm:min-h-[170px] flex-col justify-between rounded-[20px] sm:rounded-[28px] p-3.5 sm:p-6 text-left transition-all duration-700 ease-out ${expired
                                    ? 'cursor-not-allowed bg-slate-50 opacity-60 grayscale-[50%]'
                                    : 'bg-white shadow-[0_2px_12px_rgb(0,0,0,0.03)] sm:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(227,28,37,0.12)] hover:-translate-y-1 sm:hover:-translate-y-2 group border border-slate-100/80 hover:border-corporate-accent/30'
                                  }`}
                              >
                                {!expired && (
                                  <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[24px] sm:rounded-[28px]">
                                    <div className="absolute -top-[30%] -right-[10%] w-[90%] h-[90%] sm:-top-[40%] sm:-right-[20%] sm:w-[80%] sm:h-[80%] rounded-full bg-gradient-to-br from-corporate-primary/10 to-corporate-accent/5 blur-[40px] sm:blur-3xl transition-transform duration-[1.5s] group-hover:scale-150 group-hover:rotate-12 group-hover:opacity-80 opacity-50 sm:opacity-40" />
                                    <div className="absolute -bottom-[20%] -left-[10%] w-[80%] h-[80%] sm:-bottom-[30%] sm:-left-[20%] sm:w-[70%] sm:h-[70%] rounded-full bg-gradient-to-tr from-blue-500/5 to-transparent blur-[40px] sm:blur-3xl transition-transform duration-[2s] group-hover:scale-125 group-hover:opacity-60 opacity-40 sm:opacity-30" />
                                    <div className="absolute top-0 left-0 h-[3px] w-0 bg-gradient-to-r from-corporate-primary via-corporate-accent to-orange-500 transition-all duration-700 ease-out group-hover:w-full" />
                                  </div>
                                )}

                                <div className="relative z-10">
                                  <div className="mb-2 sm:mb-4 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                                    <div className="flex items-center gap-1.5 sm:gap-2.5">
                                      <span className={`flex h-5 w-5 sm:h-7 sm:w-7 items-center justify-center rounded-full transition-all duration-500 ${expired ? 'bg-slate-200 text-slate-400' : 'bg-corporate-primary/10 text-corporate-primary shadow-sm ring-1 ring-corporate-primary/20 group-hover:bg-corporate-primary group-hover:text-white group-hover:rotate-[360deg]'
                                        }`}>
                                        <Sparkles className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
                                      </span>
                                      <span className={`font-mono text-[11px] sm:text-[13px] font-black tracking-widest transition-colors duration-500 ${expired ? 'text-slate-400' : 'text-slate-400 group-hover:text-corporate-primary'
                                        }`}>
                                        {pos.code}
                                      </span>
                                    </div>

                                    {expired ? (
                                      <span className="rounded-lg sm:rounded-xl border border-red-500/20 bg-red-50 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold tracking-wide text-red-400">
                                        ໝົດເຂດແລ້ວ
                                      </span>
                                    ) : pos.deadline ? (
                                      <span className="inline-flex items-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl border border-yellow-500/20 bg-yellow-50/80 backdrop-blur-sm px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-yellow-600 transition-all duration-300 group-hover:bg-yellow-100/80 group-hover:border-yellow-500/40 shadow-sm">
                                        <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                                        <span className="truncate">
                                          {(() => {
                                            const d = new Date(pos.deadline);
                                            return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
                                          })()}
                                        </span>
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1.5 rounded-lg sm:rounded-xl border border-green-500/20 bg-green-50/80 backdrop-blur-sm px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-[11px] font-bold text-green-600 shadow-sm">
                                        <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-green-500"></span>
                                        </span>
                                        ເປີດຮັບ
                                      </span>
                                    )}
                                  </div>

                                  <h3
                                    className={`pr-2 sm:pr-4 text-base sm:text-[22px] font-extrabold leading-snug sm:leading-tight tracking-tight transition-all duration-500 ${expired
                                        ? 'text-slate-500'
                                        : 'text-slate-800 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-br group-hover:from-corporate-ltc group-hover:to-corporate-accent sm:group-hover:translate-x-1.5'
                                      }`}
                                  >
                                    {pos.department}
                                  </h3>

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
                                      <div className={`mt-2 sm:mt-5 flex transition-all duration-500 ${!expired ? 'sm:group-hover:translate-x-2' : ''}`}>
                                        <div className={`relative flex items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl p-1 pr-2.5 sm:p-1.5 sm:pr-4 shadow-[0_2px_10px_rgb(0,0,0,0.03)] ring-1 backdrop-blur-md transition-all duration-300 ${expired
                                            ? 'bg-slate-50 ring-slate-200/80'
                                            : 'bg-white/70 ring-slate-200/50 group-hover:ring-corporate-accent/30 group-hover:bg-white'
                                          }`}>
                                          <div className={`flex h-5 w-5 sm:h-7 sm:w-7 items-center justify-center rounded-lg sm:rounded-xl shadow-inner transition-transform duration-500 ${expired ? 'bg-slate-200 text-slate-400' : 'bg-gradient-to-br from-corporate-primary to-corporate-accent text-white group-hover:rotate-12 group-hover:scale-110'
                                            }`}>
                                            <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                          </div>
                                          <span className={`text-[10px] sm:text-xs font-bold ${expired ? 'text-slate-500' : 'text-slate-700'}`}>
                                            ຮັບ <span className={expired ? '' : 'text-corporate-accent text-xs sm:text-[14px] font-black'}>{displaySlots}</span> {isNum ? 'ຄົນ' : ''}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {pos.sections && pos.sections.length > 0 ? (
                                    <div className={`mt-2 sm:mt-5 flex flex-wrap gap-1 sm:gap-2 transition-all duration-500 ${!expired ? 'sm:group-hover:translate-y-[-2px]' : ''}`}>
                                      {pos.sections.slice(0, 3).map((sec, si) => {
                                        const secName = typeof sec === 'object' && sec !== null ? sec.name : String(sec);
                                        return (
                                          <span key={si} className={`inline-flex items-center rounded-lg sm:rounded-xl px-2 sm:px-3 py-0.5 sm:py-1.5 text-[9px] sm:text-[11px] font-semibold tracking-wide transition-all duration-300 ${expired
                                              ? 'bg-slate-100 text-slate-400'
                                              : 'bg-slate-50/80 text-slate-600 shadow-sm ring-1 ring-slate-200/60 backdrop-blur-sm group-hover:bg-white group-hover:text-corporate-primary group-hover:ring-corporate-primary/20 hover:!scale-105 hover:!bg-corporate-primary/10 hover:!shadow-md'
                                            }`}>
                                            {secName}
                                          </span>
                                        );
                                      })}
                                      {pos.sections.length > 3 && (
                                        <span className={`inline-flex items-center rounded-lg sm:rounded-xl px-2 sm:px-3 py-0.5 sm:py-1.5 text-[9px] sm:text-[11px] font-semibold tracking-wide border border-dashed transition-all duration-300 ${expired ? 'bg-transparent text-slate-400 border-slate-300' : 'bg-transparent text-slate-500 border-slate-300 group-hover:border-corporate-primary/30 group-hover:text-corporate-primary'
                                          }`}>
                                          +{pos.sections.length - 3} ອື່ນໆ
                                        </span>
                                      )}
                                    </div>
                                  ) : pos.section ? (
                                    <div className={`mt-2 sm:mt-5 flex flex-wrap gap-1 sm:gap-2 transition-all duration-500 ${!expired ? 'sm:group-hover:translate-y-[-2px]' : ''}`}>
                                      <span className={`inline-flex items-center rounded-lg sm:rounded-xl px-2 sm:px-3 py-0.5 sm:py-1.5 text-[9px] sm:text-[11px] font-semibold tracking-wide transition-all duration-300 ${expired ? 'bg-slate-100 text-slate-400' : 'bg-slate-50/80 text-slate-600 shadow-sm ring-1 ring-slate-200/60 backdrop-blur-sm group-hover:bg-white group-hover:text-corporate-primary group-hover:ring-corporate-primary/20'
                                        }`}>
                                        {pos.section}
                                      </span>
                                    </div>
                                  ) : null}
                                </div>

                                {!expired && (
                                  <div className="relative z-10 mt-3 sm:mt-7 overflow-hidden rounded-xl sm:rounded-2xl bg-slate-50/80 backdrop-blur-sm ring-1 ring-slate-100 transition-all duration-500 group-hover:bg-corporate-accent group-hover:ring-corporate-accent group-hover:shadow-[0_8px_20px_rgba(227,28,37,0.25)]">
                                    <div className="flex w-full items-center justify-between px-3 sm:px-5 py-2 sm:py-3.5">
                                      <span className="text-[11px] sm:text-[13px] font-extrabold uppercase tracking-wider text-slate-500 transition-colors duration-500 group-hover:text-white">
                                        ເບິ່ງລາຍລະອຽດແຄມເປນ
                                      </span>
                                      <div className="relative flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-white shadow-sm transition-all duration-500 group-hover:translate-x-1 group-hover:scale-110 group-hover:shadow-lg">
                                        <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-corporate-accent transition-transform duration-500 group-hover:rotate-[-45deg]" aria-hidden />
                                      </div>
                                    </div>
                                    <div className="absolute inset-0 -translate-x-[150%] bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-[1s] ease-in-out group-hover:translate-x-[150%]" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      )}

      {/* VERSION 2: MODERN VIP ULTRA LAYOUT */}
      {version === 'v2' && (
        <div className="selection-page-v2 font-lao w-full bg-slate-950 text-slate-100 min-h-screen">
          {/* V2 Hero Header Section */}
          <header className="relative w-full overflow-hidden bg-gradient-to-b from-[#180003] via-[#800000] to-[#b30000] pt-10 pb-16 px-4 shadow-2xl border-b border-red-500/30">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-rose-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-amber-300 text-xs sm:text-sm font-black mb-6 shadow-xl">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span>LTC CAREERS VIP • ລະບົບຮັບສະໝັກພະນັກງານແບບດິຈິທັອບ</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>

              <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight mb-4 drop-shadow-lg">
                ກ້າວສູ່ອະນາຄົດ <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent">ເຕີບໂຕໄປພ້ອມກັບ</span> ລາວ ໂທລະຄົມ
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-rose-100/90 max-w-3xl mx-auto mb-10 font-normal leading-relaxed">
                ຮ່ວມເປັນສ່ວນໜຶ່ງຂອງຜູ້ໃຫ້ບໍລິການໂທລະຄົມມະນາຄົມອັນດັບ 1 ຂອງລາວ ພ້ອມໂອກາດຄວາມກ້າວໜ້າ ແລະ ສະຫວັດດີການທີ່ດີທີ່ສຸດ
              </p>

              {/* 4 Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto mb-12">
                <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center shadow-lg hover:bg-white/15 transition-all">
                  <span className="text-2xl sm:text-3xl font-black text-amber-300 block">{openPostingCount}</span>
                  <span className="text-xs text-rose-100/80 font-bold">ຕຳແໜ່ງເປີດຮັບສະໝັກ</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center shadow-lg hover:bg-white/15 transition-all">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-300 block">{openSlotsSum}</span>
                  <span className="text-xs text-rose-100/80 font-bold">ອັດຕາຮັບຮວມ (ຄົນ)</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center shadow-lg hover:bg-white/15 transition-all">
                  <span className="text-2xl sm:text-3xl font-black text-cyan-300 block">18</span>
                  <span className="text-xs text-rose-100/80 font-bold">ສາຂາທົ່ວປະເທດ</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center shadow-lg hover:bg-white/15 transition-all">
                  <span className="text-2xl sm:text-3xl font-black text-rose-200 block">17+</span>
                  <span className="text-xs text-rose-100/80 font-bold">ສະຫວັດດີການພະນັກງານ</span>
                </div>
              </div>

              {/* 4 Steps Modern Horizontal Bar */}
              <div className="max-w-5xl mx-auto p-4 sm:p-6 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl">
                <h3 className="text-sm font-black text-amber-300 uppercase tracking-widest mb-6">✨ 4 ຂັ້ນຕອນງ່າຍໆ ໃນການສະໝັກຮ່ວມງານ</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-400/50 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white font-black mb-2 shadow-md">1</div>
                    <span className="text-xs font-bold text-white">1. ເລືອກຕຳແໜ່ງງານ</span>
                    <span className="text-[10px] text-slate-400 mt-1">ເລືອກຕຳແໜ່ງທີ່ກົງກັບຄວາມສາມາດ</span>
                  </div>
                  <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-400/50 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-black mb-2 shadow-md">2</div>
                    <span className="text-xs font-bold text-white">2. ຕື່ມຂໍ້ມູນອອນໄລນ໌</span>
                    <span className="text-[10px] text-slate-400 mt-1">ຕື່ມປະວັດ ແລະ ອັບໂຫລດເອກະສານ</span>
                  </div>
                  <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-400/50 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black mb-2 shadow-md">3</div>
                    <span className="text-xs font-bold text-white">3. ສຳພາດ ແລະ ທົດສອບ</span>
                    <span className="text-[10px] text-slate-400 mt-1">ເຂົ້າຮ່ວມການສຳພາດກັບທີມງານ</span>
                  </div>
                  <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-400/50 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black mb-2 shadow-md">4</div>
                    <span className="text-xs font-bold text-white">4. ເຂົ້າຮ່ວມທີມ LTC</span>
                    <span className="text-[10px] text-slate-400 mt-1">ເລີ່ມຕົ້ນການເຮັດວຽກຢ່າງເປັນທາງການ</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* V2 Main Content Container */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* 17 Employee Benefits Grid */}
            <section className="mb-16">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="inline-flex items-center gap-2 text-red-500 text-xs font-black uppercase tracking-widest mb-1">
                    <Trophy className="h-4 w-4" />
                    <span>EMPLOYEE ADVANTAGES</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white">
                    ສະຫວັດດີການສຸດພິເສດ 17 ຢ່າງ ສຳລັບພະນັກງານ LTC
                  </h2>
                </div>
                <p className="text-xs text-slate-400 max-w-md">
                  ພວກເຮົາເບິ່ງແຍງພະນັກງານທຸກຄົນຄືກັບຄອບຄົວ ດ້ວຍສະຫວັດດີການທີ່ຄອບຄຸມທຸກມິຕິຂອງຊີວິດ
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {BENEFITS_LIST.map((benefit) => {
                  const IconComp = benefit.icon;
                  return (
                    <div
                      key={benefit.id}
                      className="group relative p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-red-500/60 hover:bg-slate-800/90 transition-all duration-300 flex flex-col items-center text-center shadow-lg hover:shadow-red-950/40 hover:-translate-y-1 cursor-pointer overflow-hidden"
                    >
                      <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-red-600/30 text-red-400 font-mono text-[10px] font-bold flex items-center justify-center border border-red-500/40">
                        {benefit.id}
                      </div>
                      <div className={`mt-3 mb-2 p-3 rounded-xl ${benefit.color} group-hover:scale-110 transition-transform duration-300 shadow-md`}>
                        <IconComp className="h-5 w-5" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-200 group-hover:text-white leading-tight font-lao">
                        {benefit.title}
                      </h4>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* V2 Live Search & Filter Bar */}
            <div className="sticky top-4 z-40 mb-10 p-4 rounded-3xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 shadow-2xl">
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="relative w-full md:flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ຄົ້ນຫາຕຳແໜ່ງ, ພະແນກ ຫຼື ແຂວງ..."
                    className="w-full pl-12 pr-10 py-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 font-lao"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('ALL')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === 'ALL'
                        ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/30'
                        : 'bg-slate-950/70 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    ທັງໝົດ ({categoryCounts.all})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('HQ_VTE')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === 'HQ_VTE'
                        ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/30'
                        : 'bg-slate-950/70 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    🏛️ ສຳນັກງານໃຫຍ່ ({categoryCounts.hqVte})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('PROVINCES')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === 'PROVINCES'
                        ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/30'
                        : 'bg-slate-950/70 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    🏞️ ສາຂາ 17 ແຂວງ ({categoryCounts.prov})
                  </button>
                </div>
              </div>
            </div>

            {/* V2 Job Cards List */}
            <section>
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
                  <Loader2 className="h-9 w-9 animate-spin text-red-500" />
                  <p className="animate-pulse text-sm font-semibold">ກຳລັງໂຫລດຕຳແໜ່ງ...</p>
                </div>
              ) : filteredPositions.length === 0 ? (
                <div className="text-center py-16 p-8 rounded-3xl bg-slate-900/50 border border-slate-800">
                  <Search className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">ບໍ່ພົບຕຳແໜ່ງທີ່ຄົ້ນຫາ</h3>
                  <p className="text-xs text-slate-400 mb-6">ລອງປ່ຽນຄຳຄົ້ນຫາ ຫຼື ເລືອກໝວດອື່ນ</p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-500 transition-colors cursor-pointer"
                  >
                    ສະແດງທຸກຕຳແໜ່ງ
                  </button>
                </div>
              ) : (
                <div className="space-y-12">
                  {sortedGroupedPositions.map(([branch, positionsInBranch]) => (
                    <div key={branch}>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400">
                          <MapPin className="h-5 w-5" />
                        </div>
                        <h3 className="text-xl font-extrabold text-white">
                          {branch}
                        </h3>
                        <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700">
                          {positionsInBranch.length} ຕຳແໜ່ງ
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {positionsInBranch.map((pos, idx) => {
                          const expired = isExpired(pos.deadline);
                          return (
                            <div
                              key={String(pos.id || pos.code || pos.department || 'pos') + '-' + String(pos.branch || '') + '-' + idx}
                              onClick={() => !expired && navigate(`/job/${pos.code}`)}
                              className={`group relative p-6 rounded-3xl transition-all duration-300 flex flex-col justify-between border ${
                                expired
                                  ? 'bg-slate-900/40 border-slate-800 opacity-50 cursor-not-allowed'
                                  : 'bg-gradient-to-b from-slate-900/90 to-slate-900/60 border-slate-800 hover:border-red-500/50 hover:shadow-2xl hover:shadow-red-950/30 hover:-translate-y-1.5 cursor-pointer'
                              }`}
                            >
                              {!expired && (
                                <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent group-hover:via-amber-400 transition-colors" />
                              )}

                              <div>
                                <div className="flex items-center justify-between gap-2 mb-4">
                                  <span className="px-3 py-1 rounded-xl bg-slate-800/80 text-amber-300 font-mono text-xs font-black border border-slate-700">
                                    {pos.code}
                                  </span>
                                  {expired ? (
                                    <span className="px-2.5 py-1 rounded-xl bg-red-950/60 text-red-400 text-xs font-bold border border-red-800/40">
                                      ໝົດເຂດ
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-950/60 text-emerald-400 text-xs font-bold border border-emerald-800/40">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                      ເປີດຮັບສະໝັກ
                                    </span>
                                  )}
                                </div>

                                <h4 className="text-xl font-black text-white group-hover:text-amber-300 transition-colors mb-3 leading-snug">
                                  {pos.department}
                                </h4>

                                {pos.sections && pos.sections.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mb-6">
                                    {pos.sections.slice(0, 3).map((sec, sIdx) => {
                                      const secName = typeof sec === 'object' && sec !== null ? sec.name : String(sec);
                                      return (
                                        <span key={sIdx} className="px-2.5 py-1 rounded-lg bg-slate-800/60 text-slate-300 text-[11px] font-bold border border-slate-700/60">
                                          {secName}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-white transition-colors">
                                <span className="inline-flex items-center gap-1 text-red-400 font-extrabold">
                                  <Users className="h-3.5 w-3.5" />
                                  ຮັບ {pos.slots || 1} ອັດຕາ
                                </span>
                                <span className="inline-flex items-center gap-1 text-amber-400 group-hover:translate-x-1 transition-transform">
                                  ສະໝັກວຽກ <ChevronRight className="h-4 w-4" />
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      <StatusCheckModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
      />
    </PageLayout>
  );
}
