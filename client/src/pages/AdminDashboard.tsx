import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Settings, FileText, Trash2, ShieldCheck, RefreshCw,
  CheckCircle, Clock, Users, X, Download, Paperclip,
  Save, PlusCircle, MinusCircle, Search, ChevronDown, ChevronUp, ListChecks, GripVertical, Calendar, AlertTriangle, Copy
} from 'lucide-react';
import { sanitizePositions, type JobPosition, isExpired as checkExpired } from '../lib/jobPositions';
import ApplicationFormPage from './ApplicationFormPage';
import { DEFAULT_BRANCH, BRANCH_OPTIONS, LOCATIONS, getBranchPriority } from '../lib/hiringConfig';

function DateInputLao({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const toDisplay = (iso: string) => {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return iso;
  };

  const toISO = (display: string) => {
    if (!display) return '';
    const clean = display.replace(/[^0-9/]/g, '');
    const parts = clean.split('/');
    if (parts.length === 3) {
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2];
      if (y.length === 4) {
        return `${y}-${m}-${d}`;
      }
    }
    return display;
  };

  const [text, setText] = useState(toDisplay(value));

  useEffect(() => {
    setText(toDisplay(value));
  }, [value]);

  const dateInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="relative flex items-center w-full sm:w-auto">
      <input
        type="text"
        placeholder="31/12/2026"
        className="w-full sm:w-44 bg-white border border-corporate-border rounded-lg px-3 py-2 text-xs text-corporate-ltc outline-none focus:border-corporate-primary font-mono pr-8"
        value={text}
        onChange={(e) => {
          const val = e.target.value;
          setText(val);
          const iso = toISO(val);
          if (iso.length === 10 && !isNaN(Date.parse(iso))) {
            onChange(iso);
          } else if (!val) {
            onChange('');
          }
        }}
        onBlur={() => {
          const iso = toISO(text);
          if (iso.length === 10 && !isNaN(Date.parse(iso))) {
            onChange(iso);
            setText(toDisplay(iso));
          }
        }}
      />
      <button
        type="button"
        onClick={() => {
          if (dateInputRef.current) {
            if ('showPicker' in dateInputRef.current) {
              (dateInputRef.current as any).showPicker();
            } else {
              (dateInputRef.current as any).focus();
            }
          }
        }}
        className="absolute right-2 text-slate-400 hover:text-corporate-primary transition-colors p-1"
        title="ເລືອກວັນທີ"
      >
        <Calendar className="w-4 h-4" />
      </button>
      <input
        ref={dateInputRef}
        type="date"
        className="sr-only"
        value={value || ''}
        onChange={(e) => {
          onChange(e.target.value);
        }}
      />
    </div>
  );
}

type SelectOption = string | { value: string; label: string };

function AnimatedSelect({
  value,
  onChange,
  options,
  placeholder = 'ເລືອກ...'
}: {
  value: string;
  onChange: (val: string) => void;
  options: SelectOption[];
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const normalizedOptions = options.map(opt =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const selectedOption = normalizedOptions.find(o => o.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-corporate-border rounded-xl px-3 py-2 text-xs text-corporate-ltc outline-none flex items-center justify-between transition-all duration-200 hover:bg-slate-50/50 hover:border-corporate-primary active:scale-[0.99] font-bold min-h-[36px]"
        style={{
          borderColor: isOpen ? '#E31C25' : undefined,
          boxShadow: isOpen ? '0 0 0 2px rgba(227, 28, 37, 0.15)' : undefined
        }}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-corporate-primary' : ''}`} />
      </button>

      <div
        className={`absolute left-0 right-0 mt-1.5 z-[100] bg-white border border-slate-200/80 rounded-xl shadow-[0_12px_24px_rgba(0,0,0,0.08)] max-h-56 overflow-y-auto overflow-x-hidden transition-all duration-200 ease-out origin-top ${isOpen
          ? 'opacity-100 scale-100 translate-y-0 visible'
          : 'opacity-0 scale-95 -translate-y-2 invisible pointer-events-none'
          }`}
      >
        <div className="p-1 space-y-0.5">
          {normalizedOptions.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-all duration-100 flex items-center justify-between ${isSelected
                  ? 'bg-red-500/10 text-corporate-primary font-bold'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-corporate-primary" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { API } from '../lib/api';


type Attachment = { name: string; url: string };
type Submission = {
  id: string;
  refCode?: string;
  submittedAt: string;
  deletedAt?: string;
  status: 'PENDING' | 'REVIEWING' | 'INTERVIEW' | 'APPROVED' | 'REJECTED' | string;
  name: string;
  position: string;
  phone: string;
  email?: string;
  branch?: string;
  rating?: number;
  hrNotes?: string;
  pdfUrl?: string;
  attachments?: Attachment[];
  formData?: Record<string, any>;
  notes?: string;
  interview?: {
    date: string;
    time: string;
    location: string;
    type: string;
    notes?: string;
    confirmed?: boolean;
  };
};
type JobConfig = { positions: JobPosition[]; requiredDocs: string[] };

const STATUS_COLORS: Record<string, string> = {
  APPROVED: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  REJECTED: 'bg-red-500/10 text-red-700 border-red-500/30',
  PENDING: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  REVIEWING: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  INTERVIEW: 'bg-purple-500/10 text-purple-700 border-purple-500/30',
};

function StatCard({ icon, label, value, color, onClick, active }: { icon: React.ReactNode; label: string; value: number; color: string; onClick?: () => void; active?: boolean }) {
  return (
    <div
      onClick={onClick}
      className={`card-panel flex items-center gap-4 p-5 ${onClick ? 'cursor-pointer hover:bg-slate-50 transition-colors' : ''} ${active ? 'ring-2 ring-corporate-primary bg-slate-50' : ''}`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      <div>
        <div className="text-xs text-corporate-muted uppercase tracking-widest font-bold">{label}</div>
        <div className="text-3xl font-black text-corporate-ltc mt-0.5">{value}</div>
      </div>
    </div>
  );
}

const AUTO_SAVE_DELAY_MS = 2000;
const createAutoSaveStore = () => {
  let status: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  return {
    getStatus: () => status,
    setStatus: (s: typeof status) => { status = s; }
  };
};


function LaoDatePicker({
  value,
  onChange,
  placeholder = "dd/mm/yyyy",
  className = ""
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const displayValue = React.useMemo(() => {
    if (!value) return '';
    const parts = value.split('-');
    if (parts.length === 3) {
      return `${parts[2].substring(0, 2).padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
    }
    return value;
  }, [value]);

  return (
    <div className="relative w-full">
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-slate-50/80 border border-slate-200 rounded-2xl p-3 text-sm font-semibold text-transparent outline-none focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10 cursor-pointer transition-all [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${className}`}
      />
      <div className="absolute inset-0 flex items-center justify-between px-3.5 pointer-events-none">
        <span className={displayValue ? 'text-slate-900 font-bold text-sm font-mono tracking-wide' : 'text-slate-400 text-sm font-medium'}>
          {displayValue || placeholder}
        </span>
        <Calendar className="w-4 h-4 text-red-500/80" />
      </div>
    </div>
  );
}

export const formatDateDDMMYYYY = (isoStr?: string) => {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
  } catch {
    return isoStr;
  }
};

export default function AdminDashboard() {
  const [authToken, setAuthToken] = useState(() => sessionStorage.getItem('adminToken') || localStorage.getItem('adminToken') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!(sessionStorage.getItem('adminToken') || localStorage.getItem('adminToken')));
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const [tab, setTab] = useState<'applications' | 'jobconfig' | 'trash'>('applications');

  const [applications, setApplications] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [positionFilter, setPositionFilter] = useState<string>('ALL');
  const [educationFilter, setEducationFilter] = useState<string>('ALL');

  const [editingHrNote, setEditingHrNote] = useState<string>('');
  const [editingRating, setEditingRating] = useState<number>(0);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Submission | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- CV Preview Modal State ---
  const [previewModal, setPreviewModal] = useState<{
    open: boolean;
    app: Submission | null;
    activeUrl: string;
    activeTitle: string;
  }>({ open: false, app: null, activeUrl: '', activeTitle: '' });

  // --- Interview Modal State ---
  const [interviewModal, setInterviewModal] = useState<{
    open: boolean;
    app: Submission | null;
    date: string;
    time: string;
    location: string;
    type: 'IN_PERSON' | 'ONLINE';
    notes: string;
    scheduling: boolean;
  }>({
    open: false,
    app: null,
    date: '',
    time: '09:00 AM',
    location: 'ຫ້ອງປະຊຸມ 층 3 ສຳນັກງານໃຫຍ່ (LTC HQ)',
    type: 'IN_PERSON',
    notes: '',
    scheduling: false
  });
  const [jobSaving, setJobSaving] = useState(false);
  const [newDoc, setNewDoc] = useState('');
  const [expandedPos, setExpandedPos] = useState<number | null>(null);
  const [draggedSec, setDraggedSec] = useState<{ p: number; i: number } | null>(null);
  const [draggedSecReq, setDraggedSecReq] = useState<{ p: number; s: number; r: number } | null>(null);
  const [draggedSecResp, setDraggedSecResp] = useState<{ p: number; s: number; r: number } | null>(null);
  const [emailModal, setEmailModal] = useState<{ open: boolean; pendingStatus: string | null; subject: string; body: string; sending: boolean; }>({ open: false, pendingStatus: null, subject: '', body: '', sending: false });

  // --- Custom Handsome Confirm Modal State ---
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmText: string;
    cancelText: string;
    variant: 'danger' | 'warning' | 'info' | 'success';
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    description: '',
    confirmText: 'ຢືນຢັນ',
    cancelText: 'ຍົກເລີກ',
    variant: 'danger',
    onConfirm: () => { }
  });

  const showConfirm = ({
    title = 'ຢືນຢັນການດຳເນີນການ',
    description = '',
    confirmText = 'ຢືນຢັນ',
    cancelText = 'ຍົກເລີກ',
    variant = 'danger',
    onConfirm
  }: {
    title?: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info' | 'success';
    onConfirm: () => void;
  }) => {
    setConfirmModal({
      open: true,
      title,
      description,
      confirmText,
      cancelText,
      variant,
      onConfirm
    });
  };

  // --- Sync HR note & rating when selecting an application ---
  useEffect(() => {
    if (selectedApp) {
      const savedNote = localStorage.getItem(`hr_note_${selectedApp.id}`) || selectedApp.hrNotes || '';
      const savedRating = Number(localStorage.getItem(`hr_rating_${selectedApp.id}`)) || selectedApp.rating || 0;
      setEditingHrNote(savedNote);
      setEditingRating(savedRating);
    }
  }, [selectedApp?.id]);

  const handleSaveHrNote = async () => {
    if (!selectedApp) return;
    try {
      // 1. Optimistic UI update
      setApplications(prev => prev.map(a => a.id === selectedApp.id ? { ...a, hrNotes: editingHrNote, rating: editingRating } : a));
      setSelectedApp(prev => prev ? { ...prev, hrNotes: editingHrNote, rating: editingRating } : null);

      // 2. Persist to localStorage as fallback cache
      localStorage.setItem(`hr_note_${selectedApp.id}`, editingHrNote);
      localStorage.setItem(`hr_rating_${selectedApp.id}`, String(editingRating));

      // 3. Sync to DB via correct endpoint
      const res = await fetch(`${API}/api/applications/${selectedApp.id}/hr-notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': authToken },
        body: JSON.stringify({ hrNotes: editingHrNote, rating: editingRating })
      });

      if (!res.ok) {
        // Non-blocking warning — localStorage still has the data
        console.warn('[HR Note] Failed to sync to DB:', res.status);
      }

      showToast('ບັນທຶກ ໂນ້ດ HR ຮຽບຮ້ອຍແລ້ວ ✅', 'success');
    } catch {
      showToast('ເກີດຂໍ້ຜິດພາດໃນການບັນທຶກໂນ້ດ', 'error');
    }
  };

  const availableBranches = useMemo(() => {
    const set = new Set<string>();
    applications.forEach(a => {
      const b = a.branch || a.formData?.province || a.formData?.branch || a.formData?.preferredBranch;
      if (b) set.add(b);
    });
    return Array.from(set);
  }, [applications]);

  const availablePositions = useMemo(() => {
    const set = new Set<string>();
    applications.forEach(a => {
      if (a.position) set.add(a.position);
    });
    return Array.from(set);
  }, [applications]);

  // --- States ແລະ Refs ເພີ່ມເຕີມສຳລັບ Job Config & Auto-save ---
  const [jobConfig, setJobConfig] = useState<JobConfig>({ positions: [], requiredDocs: [] });
  const [jobConfigLoaded, setJobConfigLoaded] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'unsaved' | 'saving' | 'saved' | 'error'>('idle');

  const jobConfigRef = useRef(jobConfig);
  jobConfigRef.current = jobConfig;

  const isDirtyRef = useRef(false);
  const skipAutoSaveRef = useRef(false);
  const autoSaveDebounceRef = useRef<any>(null);

  const autoSaveStore = useRef(createAutoSaveStore()).current;

  // ── Toast Notification state ───────────────────
  const [toasts, setToasts] = useState<{ id: number; type: 'success' | 'error' | 'info'; message: string }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // ── Auto-logout on session expiry ────────────────────
  const handleSessionExpired = () => {
    sessionStorage.removeItem('adminToken');
    localStorage.removeItem('adminToken');
    setAuthToken('');
    setIsAuthenticated(false);
    setOtpRequired(false);
    setOtpCode('');
    setLoginPassword('');
  };

  const handleSaveFormData = async (dataToSave: any) => {
    if (!selectedApp) return;
    try {
      // Correct endpoint: PATCH /api/applications/:id/data
      const res = await fetch(`${API}/api/applications/${selectedApp.id}/data`, {
        method: 'PATCH',
        headers: { 'x-admin-token': authToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData: dataToSave })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${res.status}`);
      }

      // Match field keys exactly as server extracts them
      const name = dataToSave['int_name'] || dataToSave['first_name'] || selectedApp.name;
      const position = dataToSave['pos_applying'] || dataToSave['pos_applied'] || dataToSave['department'] || selectedApp.position;
      const phone = dataToSave['phone'] || dataToSave['mobile'] || selectedApp.phone || '—';

      const updatedApp = { ...selectedApp, formData: dataToSave, name, position, phone };
      setSelectedApp(updatedApp);
      setApplications(prev => prev.map(a => a.id === selectedApp.id ? updatedApp : a));
      showToast('ບັນທຶກຂໍ້ມູນສຳເລັດແລ້ວ ✅', 'success');
    } catch (e: any) {
      showToast(`ເກີດຂໍ້ຜິດພາດ: ${e.message}`, 'error');
    }
  };

  // --- Functions ທີ່ຈຳເປັນ ---
  const fetchApplications = async () => {
    setLoading(true);
    try {
      const isTrash = tab === 'trash';
      const res = await fetch(`${API}/api/applications?trash=${isTrash}`, {
        headers: { 'x-admin-token': authToken }
      }).catch(() => null);

      if (res) {
        if (res.status === 403) {
          handleSessionExpired();
          return;
        }
        if (res.ok) {
          const json = await res.json().catch(() => ({}));
          if (Array.isArray(json.data)) {
            setApplications(json.data);
            setLoading(false);
            return;
          }
        }
      }

      // Fallback: Read locally stored submissions if server is offline or static
      const localDataStr = localStorage.getItem('local_submissions') || '[]';
      const localData = JSON.parse(localDataStr);
      setApplications(Array.isArray(localData) ? localData : []);
    } catch (err: any) {
      console.warn('fetchApplications fallback handled:', err);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobConfig = async () => {
    try {
      const res = await fetch(`${API}/api/job-config`).catch(() => null);
      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.positions) {
          skipAutoSaveRef.current = true;
          setJobConfig({
            positions: data.positions || [],
            requiredDocs: data.requiredDocs || []
          });
          setJobConfigLoaded(true);
          return;
        }
      }
    } catch (err) {
      console.warn('fetchJobConfig fallback handled:', err);
    }
  };

  const buildSavePayload = (cfg: JobConfig) => ({
    positions: sanitizePositions(cfg.positions),
    requiredDocs: cfg.requiredDocs,
  });

  const saveJobConfigSilent = async (cfg: JobConfig) => {
    setAutoSaveStatus('saving');
    autoSaveStore.setStatus('saving');
    try {
      const res = await fetch(`${API}/api/job-config`, {
        method: 'PUT',
        headers: { 'x-admin-token': authToken, 'Content-Type': 'application/json' },
        body: JSON.stringify(buildSavePayload(cfg)),
      });
      if (res.ok) {
        autoSaveStore.setStatus('saved');
        setAutoSaveStatus('saved');
        isDirtyRef.current = false;
      } else {
        autoSaveStore.setStatus('error');
        setAutoSaveStatus('error');
      }
    } catch {
      autoSaveStore.setStatus('error');
      setAutoSaveStatus('error');
    }
  };

  const handleSaveJobConfig = async () => {
    setJobSaving(true);
    setAutoSaveStatus('saving');
    try {
      const res = await fetch(`${API}/api/job-config`, {
        method: 'PUT',
        headers: { 'x-admin-token': authToken, 'Content-Type': 'application/json' },
        body: JSON.stringify(buildSavePayload(jobConfig)),
      });
      if (res.ok) {
        autoSaveStore.setStatus('saved');
        setAutoSaveStatus('saved');
        isDirtyRef.current = false;
        showToast('ບັນທຶກການຕັ້ງຄ່າສຳເລັດແລ້ວ', 'success');
      } else {
        autoSaveStore.setStatus('error');
        setAutoSaveStatus('error');
        showToast('ເກີດຂໍ້ຜິດພາດໃນການບັນທຶກ', 'error');
      }
    } catch (err: any) {
      autoSaveStore.setStatus('error');
      setAutoSaveStatus('error');
      showToast(`ເກີດຂໍ້ຜິດພາດໃນການເຊື່ອມຕໍ່: ${err.message || 'Connection Error'}`, 'error');
    } finally {
      setJobSaving(false);
    }
  };

  const hasPendingJobConfigChanges = () => isDirtyRef.current;

  // --- useEffects ຕ່າງໆ ທີ່ຖືກຈັດລຳດັບຖືກຕ້ອງແລ້ວ ---
  useEffect(() => {
    if (!jobConfigLoaded) return;
    if (skipAutoSaveRef.current) {
      skipAutoSaveRef.current = false;
      return;
    }
    isDirtyRef.current = true;
    setAutoSaveStatus('unsaved');
    clearTimeout(autoSaveDebounceRef.current);
    autoSaveDebounceRef.current = setTimeout(() => {
      saveJobConfigSilent(jobConfigRef.current);
    }, AUTO_SAVE_DELAY_MS);
    return () => clearTimeout(autoSaveDebounceRef.current);
  }, [jobConfig, jobConfigLoaded]);

  useEffect(() => {
    const fn = (e: BeforeUnloadEvent) => {
      if (!jobConfigLoaded || tab !== 'jobconfig' || !hasPendingJobConfigChanges()) return;
      if (authToken) {
        fetch(`${API}/api/job-config`, {
          method: 'PUT',
          headers: { 'x-admin-token': authToken, 'Content-Type': 'application/json' },
          body: JSON.stringify(buildSavePayload(jobConfigRef.current)),
          keepalive: true,
        });
      }
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', fn);
    return () => window.removeEventListener('beforeunload', fn);
  }, [jobConfigLoaded, authToken, tab]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchApplications();
      if (tab === 'jobconfig') fetchJobConfig();
    }
  }, [isAuthenticated, tab]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      if (!e && authToken) {
        setIsAuthenticated(true);
        setLoginLoading(false);
        return;
      }

      // 1. Check direct password match for static deployment fallback
      const validAdminKeys = ['valo58787788'];
      const isDirectMatch = validAdminKeys.includes(loginPassword.trim());

      let apiSuccess = false;
      try {
        const res = await fetch(`${API}/api/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: loginPassword })
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.sessionToken) {
            sessionStorage.setItem('adminToken', data.sessionToken);
            localStorage.setItem('adminToken', data.sessionToken);
            setAuthToken(data.sessionToken);
            setIsAuthenticated(true);
            setOtpRequired(false);
            apiSuccess = true;
          }
        }
      } catch (apiErr) {
        console.warn('API Endpoint unreachable, trying fallback authentication...', apiErr);
      }

      if (apiSuccess) {
        setLoginLoading(false);
        return;
      }

      if (isDirectMatch) {
        const fallbackToken = 'admin-session-' + Date.now();
        sessionStorage.setItem('adminToken', fallbackToken);
        localStorage.setItem('adminToken', fallbackToken);
        setAuthToken(fallbackToken);
        setIsAuthenticated(true);
        setOtpRequired(false);
        showToast('ເຂົ້າສູ່ລະບົບ Admin ສຳເລັດແລ້ວ! ✅', 'success');
      } else {
        const errMsg = 'ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ! ກະລຸນາລອງໃໝ່ອີກຄັ້ງ';
        setLoginError(errMsg);
        showToast(errMsg, 'error');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const errMsg = 'ເກີດຂໍ້ຜິດພາດໃນການລ໋ອກອິນ! ກະລຸນາກວດສອບລະຫັດຜ່ານ';
      setLoginError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/api/admin/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword, otp: otpCode })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.sessionToken) {
        sessionStorage.setItem('adminToken', data.sessionToken);
        setAuthToken(data.sessionToken);
        setIsAuthenticated(true);
        setOtpRequired(false);
      } else {
        showToast(data.error || 'ລະຫັດ OTP ບໍ່ຖືກຕ້ອງ!', 'error');
      }
    } catch (err) {
      console.error('Verify OTP error:', err);
      showToast('ຂໍ້ຜິດພາດໃນການເຊື່ອມຕໍ່ ຫຼື ເຊີບເວີບໍ່ຕອບສະໜອງ!', 'error');
    }
  };

  useEffect(() => {
    if (authToken && !isAuthenticated) {
      handleLogin();
    }
  }, []);
  // ── Delete & Restore Handlers with Handsome Confirm Modal ──────────────────────────
  const handleDelete = (id: string) => {
    showConfirm({
      title: 'ລຶບໃບສະໝັກ (ຍ້າຍໄປຖັງຂີ້ເຫຍື້ອ)',
      description: 'ທ່ານຕ້ອງການລຶບລາຍການນີ້ແທ້ບໍ? (ຍັງສາມາດກູ້ຄືນໄດ້ໃນ 30 ມື້)',
      confirmText: '🗑️ ລຶບລາຍການ',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await fetch(`${API}/api/applications/${id}`, {
            method: 'DELETE',
            headers: { 'x-admin-token': authToken }
          });
          setApplications(prev => prev.filter(a => a.id !== id));
          if (selectedApp?.id === id) { setIsModalOpen(false); setSelectedApp(null); }
          showToast('ຍ້າຍໄປຖັງຂີ້ເຫຍື້ອຮຽບຮ້ອຍແລ້ວ 🗑️', 'success');
        } catch (err: any) {
          showToast(`ບໍ່ສາມາດລຶບໄດ້: ${err.message}`, 'error');
        }
      }
    });
  };

  const handleRestore = (id: string) => {
    showConfirm({
      title: 'ກູ້ຄືນໃບສະໝັກ',
      description: 'ທ່ານຕ້ອງການກູ້ຄືນລາຍການນີ້ແທ້ບໍ?',
      confirmText: '↺ ກູ້ຄືນ',
      variant: 'info',
      onConfirm: async () => {
        try {
          await fetch(`${API}/api/applications/${id}/restore`, {
            method: 'POST',
            headers: { 'x-admin-token': authToken }
          });
          setApplications(prev => prev.filter(a => a.id !== id));
          if (selectedApp?.id === id) { setIsModalOpen(false); setSelectedApp(null); }
          showToast('ກູ້ຄືນໃບສະໝັກຮຽບຮ້ອຍແລ້ວ ✅', 'success');
        } catch (err: any) {
          showToast(`ບໍ່ສາມາດກູ້ຄືນໄດ້: ${err.message}`, 'error');
        }
      }
    });
  };

  const handleForceDelete = (id: string) => {
    showConfirm({
      title: 'ລຶບລາຍການແບບຖາວອນ',
      description: 'ທ່ານຕ້ອງການລຶບລາຍການນີ້ແບບຖາວອນແທ້ບໍ? (ບໍ່ສາມາດກູ້ຄືນໄດ້ອີກ)',
      confirmText: '🔥 ລຶບຖາວອນ',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await fetch(`${API}/api/applications/${id}/force`, {
            method: 'DELETE',
            headers: { 'x-admin-token': authToken }
          });
          setApplications(prev => prev.filter(a => a.id !== id));
          if (selectedApp?.id === id) { setIsModalOpen(false); setSelectedApp(null); }
          showToast('ລຶບແບບຖາວອນຮຽບຮ້ອຍແລ້ວ', 'success');
        } catch (err: any) {
          showToast(`ບໍ່ສາມາດລຶບໄດ້: ${err.message}`, 'error');
        }
      }
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    showConfirm({
      title: `ລຶບ ${selectedIds.size} ລາຍການ`,
      description: `ທ່ານຕ້ອງການລຶບລາຍການທີ່ເລືອກທັງໝົດ ${selectedIds.size} ລາຍການແທ້ບໍ? (ຍັງສາມາດກູ້ຄືນໄດ້ໃນ 30 ມື້)`,
      confirmText: `🗑️ ລຶບ ${selectedIds.size} ລາຍການ`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await fetch(`${API}/api/applications/bulk-delete`, {
            method: 'POST',
            headers: { 'x-admin-token': authToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: Array.from(selectedIds) })
          });
          setApplications(prev => prev.filter(a => !selectedIds.has(a.id)));
          setSelectedIds(new Set());
          setIsSelectMode(false);
          if (selectedApp && selectedIds.has(selectedApp.id)) {
            setIsModalOpen(false);
            setSelectedApp(null);
          }
          showToast('ລຶບລາຍການທີ່ເລືອກຮຽບຮ້ອຍແລ້ວ 🗑️', 'success');
        } catch (e: any) {
          showToast(`ບໍ່ສາມາດລຶບໄດ້: ${e.message}`, 'error');
        }
      }
    });
  };

  const handleBulkRestore = () => {
    if (selectedIds.size === 0) return;
    showConfirm({
      title: `ກູ້ຄືນ ${selectedIds.size} ລາຍການ`,
      description: `ທ່ານຕ້ອງການກູ້ຄືນທັງໝົດ ${selectedIds.size} ລາຍການແທ້ບໍ?`,
      confirmText: `↺ ກູ້ຄືນ ${selectedIds.size} ລາຍການ`,
      variant: 'info',
      onConfirm: async () => {
        try {
          await fetch(`${API}/api/applications/bulk-restore`, {
            method: 'POST',
            headers: { 'x-admin-token': authToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: Array.from(selectedIds) })
          });
          setApplications(prev => prev.filter(a => !selectedIds.has(a.id)));
          setSelectedIds(new Set());
          setIsSelectMode(false);
          showToast('ກູ້ຄືນລາຍການທີ່ເລືອກຮຽບຮ້ອຍແລ້ວ ✅', 'success');
        } catch (e: any) {
          showToast(`ບໍ່ສາມາດກູ້ຄືນໄດ້: ${e.message}`, 'error');
        }
      }
    });
  };

  const handleBulkForceDelete = () => {
    if (selectedIds.size === 0) return;
    showConfirm({
      title: `ລຶບຖາວອນ ${selectedIds.size} ລາຍການ`,
      description: `ທ່ານຕ້ອງການລຶບແບບຖາວອນທັງໝົດ ${selectedIds.size} ລາຍການແທ້ບໍ? (ບໍ່ສາມາດກູ້ຄືນໄດ້ອີກ)`,
      confirmText: `🔥 ລຶບຖາວອນ ${selectedIds.size} ລາຍການ`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await fetch(`${API}/api/applications/bulk-force-delete`, {
            method: 'POST',
            headers: { 'x-admin-token': authToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: Array.from(selectedIds) })
          });
          setApplications(prev => prev.filter(a => !selectedIds.has(a.id)));
          setSelectedIds(new Set());
          setIsSelectMode(false);
          showToast('ລຶບແບບຖາວອນຮຽບຮ້ອຍແລ້ວ', 'success');
        } catch (e: any) {
          showToast(`ບໍ່ສາມາດລຶບໄດ້: ${e.message}`, 'error');
        }
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(a => a.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const formatDateDDMMYYYY = (dateInput?: string | Date | number | null) => {
    if (!dateInput) return '—';
    const str = String(dateInput).trim();
    if (!str) return '—';

    if (/^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/.test(str)) {
      const p = str.split(/[-\/]/);
      return `${p[2].substring(0, 2).padStart(2, '0')}/${p[1].padStart(2, '0')}/${p[0]}`;
    }

    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return str;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // ── Batch PDF Open / Print ─────────────────────────
  const getPdfUrlWithAuth = (pdfUrl?: string) => {
    if (!pdfUrl) return '';
    const delimiter = pdfUrl.includes('?') ? '&' : '?';
    return `${API}${pdfUrl}${delimiter}token=${authToken}`;
  };

  const getPdfDownloadUrl = (pdfUrl?: string) => {
    if (!pdfUrl) return '';
    const delimiter = pdfUrl.includes('?') ? '&' : '?';
    return `${API}${pdfUrl}${delimiter}token=${authToken}&download=true`;
  };

  const handleBatchOpenPDFs = (appsToOpen?: Submission[]) => {
    const list = appsToOpen || applications.filter(a => selectedIds.has(a.id));
    const validPdfs = list.filter(a => a.pdfUrl);
    if (validPdfs.length === 0) {
      alert('ບໍ່ມີໄຟລ໌ PDF ຂອງຜູ້ສະໝັກທີ່ເລືອກ');
      return;
    }
    validPdfs.forEach(app => {
      window.open(getPdfUrlWithAuth(app.pdfUrl), '_blank');
    });
  };



  // ── Interview Scheduling ─────────────────────────────────
  const openInterviewModal = (app: Submission) => {
    setInterviewModal({
      open: true,
      app,
      date: new Date().toISOString().split('T')[0],
      time: '09:00 AM',
      location: 'ຫ້ອງປະຊຸມ 층 3 ສຳນັກງານໃຫຍ່ (LTC HQ)',
      type: 'IN_PERSON',
      notes: '',
      scheduling: false
    });
  };

  const handleScheduleInterview = async () => {
    if (!interviewModal.app) return;
    setInterviewModal(prev => ({ ...prev, scheduling: true }));

    try {
      const res = await fetch(`${API}/api/applications/${interviewModal.app.id}/interview`, {
        method: 'POST',
        headers: { 'x-admin-token': authToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: interviewModal.date,
          time: interviewModal.time,
          location: interviewModal.location,
          type: interviewModal.type,
          notes: interviewModal.notes,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${res.status}`);
      }

      const json = await res.json();
      setApplications(prev => prev.map(a => a.id === interviewModal.app?.id ? {
        ...a,
        status: 'INTERVIEW',
        interview: json.record?.interview || {
          date: interviewModal.date,
          time: interviewModal.time,
          location: interviewModal.location,
          type: interviewModal.type,
          notes: interviewModal.notes
        }
      } : a));

      showToast(`ນັດໝາຍສຳພາດກັບ ${interviewModal.app.name} ຮຽບຮ້ອຍແລ້ວ! 📅`, 'success');
      setInterviewModal(prev => ({ ...prev, open: false }));
    } catch (e: any) {
      showToast(e.message || 'ເກີດຂໍ້ຜິດພາດໃນການນັດໝາຍ', 'error');
    } finally {
      setInterviewModal(prev => ({ ...prev, scheduling: false }));
    }
  };

  // ── Status update ───────────────────────────────────
  const openEmailModal = (app: Submission, newStatus: string) => {
    setSelectedApp(app);
    let subject = 'ອັບເດດສະຖານະການສະໝັກວຽກ - Lao Telecom';
    let body = `ສະບາຍດີ ${app.name},\n\n`;

    if (newStatus === 'APPROVED') {
      subject = 'ຂໍສະແດງຄວາມຍິນດີ! ທ່ານຜ່ານການຄັດເລືອກເບື້ອງຕົ້ນ - Lao Telecom';
      body += `ທາງບໍລິສັດ ລາວໂທລະຄົມ ຂໍແຈ້ງໃຫ້ຊາບວ່າ ການສະໝັກໃນຕຳແໜ່ງ ${app.position} ຂອງທ່ານ ໄດ້ຜ່ານການອະນຸມັດເບື້ອງຕົ້ນແລ້ວ.\n\nກະລຸນາລໍຖ້າການຕິດຕໍ່ກັບຈາກທີມງານ HR ສຳລັບການນັດໝາຍສຳພາດໃນຂັ້ນຕອນຕໍ່ໄປ.\n\nດ້ວຍຄວາມເຄົາລົບ,\nLao Telecom HR Team`;
    } else if (newStatus === 'REJECTED') {
      subject = 'ແຈ້ງຜົນການສະໝັກວຽກ - Lao Telecom';
      body += `ທາງບໍລິສັດ ລາວໂທລະຄົມ ຂໍຂອບໃຈທີ່ທ່ານໃຫ້ຄວາມສົນໃຈສະໝັກໃນຕຳແໜ່ງ ${app.position}.\n\nຫຼັງຈາກການພິຈາລະນາຢ່າງຖີ່ຖ້ວນ, ທາງບໍລິສັດຂໍແຈ້ງໃຫ້ຊາບວ່າ ທ່ານຍັງບໍ່ຜ່ານການຄັດເລືອກໃນຄັ້ງນີ້.\n\nຂໍໃຫ່ທ່ານໂຊກດີໃນການເຮັດວຽກ,\nLao Telecom HR Team`;
    } else {
      body += `ສະຖານະການສະໝັກຂອງທ່ານໃນຕຳແໜ່ງ ${app.position} ໄດ້ຖືກປ່ຽນເປັນ: ລໍຖ້າພິຈາລະນາ.\n\nດ້ວຍຄວາມເຄົາລົບ,\nLao Telecom HR Team`;
    }

    setEmailModal({ open: true, pendingStatus: newStatus, subject, body, sending: false });
  };

  const handleStatusAndEmail = async () => {
    if (!selectedApp || !emailModal.pendingStatus) return;

    setEmailModal(p => ({ ...p, sending: true }));
    try {
      // PATCH status → Server auto-sends notification email (no duplicate needed)
      const res = await fetch(`${API}/api/applications/${selectedApp.id}/status`, {
        method: 'PATCH',
        headers: { 'x-admin-token': authToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: emailModal.pendingStatus,
          notes: emailModal.body  // Pass email body as notes for reference
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${res.status}`);
      }

      // NOTE: Server already auto-sends email on status change.
      // We do NOT call /send-email again to avoid duplicate emails.

      setApplications(prev => prev.map(a =>
        a.id === selectedApp.id ? { ...a, status: emailModal.pendingStatus! } : a
      ));
      showToast(`ປ່ຽນສະຖານະ & ສົ່ງ Email ຮຽບຮ້ອຍ ✅`, 'success');
      setIsModalOpen(false);
      setEmailModal(p => ({ ...p, open: false }));
    } catch (e: any) {
      showToast(`ເກີດຂໍ້ຜິດພາດ: ${e.message}`, 'error');
    } finally {
      setEmailModal(p => ({ ...p, sending: false }));
    }
  };

  // ── Helper to normalize province strings ──────────
  const normalizeProvince = (rawStr?: string): string => {
    if (!rawStr || typeof rawStr !== 'string') return '';
    const clean = rawStr.trim();
    if (!clean) return '';

    for (const loc of LOCATIONS) {
      const locName = loc.name;
      const locCore = locName.replace(/^ແຂວງ\s*/, '').trim();
      const rawCore = clean.replace(/^ແຂວງ\s*/, '').trim();

      if (
        clean === locName ||
        clean === locCore ||
        rawCore === locCore ||
        clean.includes(locCore) ||
        locCore.includes(rawCore)
      ) {
        return locName;
      }
    }
    return clean;
  };

  // ── Helper to resolve application's branch ────────
  const getAppBranch = (app: Submission, positions: JobPosition[]) => {
    // 1. Direct branch property
    if (app.branch && app.branch.trim()) {
      const norm = normalizeProvince(app.branch);
      if (norm) return norm;
    }

    // 2. Match via position code/department in jobConfig.positions (Job Vacancy Location)
    if (app.position) {
      const appPosClean = app.position.trim().toLowerCase();
      const matched = positions.find(p =>
        (p.code && p.code.trim().toLowerCase() === appPosClean) ||
        (p.department && p.department.trim().toLowerCase() === appPosClean) ||
        (p.code && appPosClean.includes(p.code.trim().toLowerCase())) ||
        (p.department && appPosClean.includes(p.department.trim().toLowerCase()))
      );
      if (matched?.branch?.trim()) {
        const norm = normalizeProvince(matched.branch);
        if (norm) return norm;
      }
    }

    // 3. Fallback: Check application formData fields (Applicant's residence/birth province)
    const f = app.formData || {};
    const rawBranch =
      f.curr_province ||
      f.birth_province ||
      f.province ||
      f.branch ||
      f.selectedBranch ||
      f.preferredBranch ||
      f.appliedProvince ||
      f.curr_district ||
      f.birth_district ||
      '';

    if (rawBranch) {
      const norm = normalizeProvince(String(rawBranch));
      if (norm) return norm;
    }

    return DEFAULT_BRANCH;
  };

  // ── Filtering ───────────────────────────────────────
  const filtered = useMemo(() => applications.filter(a => {
    const q = search.toLowerCase().trim();
    const nameMatch = !q ||
      a.name.toLowerCase().includes(q) ||
      a.position.toLowerCase().includes(q) ||
      (a.phone && a.phone.includes(q)) ||
      (a.email && a.email.toLowerCase().includes(q)) ||
      (a.refCode && a.refCode.toLowerCase().includes(q)) ||
      (a.id && a.id.toLowerCase().includes(q));

    const dateMatch = !dateFilter ||
      (a.submittedAt || '').startsWith(dateFilter) ||
      (a.deletedAt || '').startsWith(dateFilter);
    const statusMatch = statusFilter === 'ALL' || a.status === statusFilter;

    const appBranch = getAppBranch(a, jobConfig.positions);
    const branchMatch = branchFilter === 'ALL' || appBranch === branchFilter;
    const posMatch = positionFilter === 'ALL' || a.position === positionFilter;

    const eduVal = (a.formData?.education_level || a.formData?.qualification || '').toString().toLowerCase();
    let eduMatch = true;
    if (educationFilter !== 'ALL') {
      if (educationFilter === 'BACHELOR') eduMatch = eduVal.includes('ປະລິນຍາຕີ') || eduVal.includes('bachelor');
      else if (educationFilter === 'MASTER') eduMatch = eduVal.includes('ປະລິນຍາໂທ') || eduVal.includes('master');
      else if (educationFilter === 'DIPLOMA') eduMatch = eduVal.includes('ຊັ້ນສູງ') || eduVal.includes('diploma');
    }

    return nameMatch && dateMatch && statusMatch && branchMatch && posMatch && eduMatch;
  }), [applications, search, dateFilter, statusFilter, branchFilter, positionFilter, educationFilter, jobConfig.positions]);

  const groupedAdminPositions = useMemo(() => {
    const groups: Record<string, { pos: JobPosition; i: number }[]> = {};
    jobConfig.positions.forEach((pos, i) => {
      const b = pos.branch?.trim() || DEFAULT_BRANCH;
      if (!groups[b]) groups[b] = [];
      groups[b].push({ pos, i });
    });
    return Object.entries(groups).sort(([branchA], [branchB]) => getBranchPriority(branchA) - getBranchPriority(branchB));
  }, [jobConfig.positions]);

  const groupedApplications = useMemo(() => {
    const groups: Record<string, Submission[]> = {};
    filtered.forEach(app => {
      const b = getAppBranch(app, jobConfig.positions);
      if (!groups[b]) groups[b] = [];
      groups[b].push(app);
    });
    return Object.entries(groups);
  }, [filtered, jobConfig.positions]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-corporate-bg p-4 font-lao">
        {otpRequired ? (
          <form
            onSubmit={handleVerifyOtp}
            className="w-full max-w-sm rounded-2xl border border-corporate-border bg-white p-6 sm:p-8 space-y-4"
          >
            <h2 className="text-center text-xl font-bold text-corporate-ltc">ຢືນຢັນລະຫັດ OTP</h2>
            <p className="text-xs text-corporate-muted text-center">
              ລະຫັດ OTP 4 ຫຼັກຖືກສົ່ງໄປຫາ Gmail ຂອງ Admin ແລ້ວ. ກະລຸນາກວດສອບກ່ອງຈົດໝາຍຂອງທ່ານ.
            </p>
            <input
              type="text"
              maxLength={4}
              placeholder="ປ້ອນລະຫັດ OTP 4 ຫຼັກ..."
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              className="min-h-[48px] w-full rounded-xl border border-corporate-border bg-slate-50 p-3 text-center text-xl font-bold tracking-widest text-corporate-ltc outline-none focus:border-corporate-primary"
            />
            <button type="submit" className="btn-primary w-full hover:bg-corporate-primary/80">
              ຢືນຢັນ ແລະ ເຂົ້າສູ່ລະບົບ
            </button>
            <button
              type="button"
              onClick={() => { setOtpRequired(false); setOtpCode(''); }}
              className="w-full text-center text-sm text-corporate-primary hover:underline"
            >
              ກັບຄືນ
            </button>
          </form>
        ) : (
          <form
            onSubmit={handleLogin}
            className="w-full max-w-sm rounded-2xl border border-corporate-border bg-white p-6 sm:p-8 space-y-4 shadow-xl"
          >
            <h2 className="text-center text-xl font-bold text-corporate-ltc">Admin Login</h2>

            {loginError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-bold text-center animate-in fade-in">
                ⚠️ {loginError}
              </div>
            )}

            <input
              type="password"
              placeholder="ໃສ່ລະຫັດລັບ..."
              value={loginPassword}
              onChange={(e) => {
                setLoginPassword(e.target.value);
                if (loginError) setLoginError('');
              }}
              className="min-h-[48px] w-full rounded-xl border border-corporate-border bg-slate-50 p-3 text-base text-corporate-ltc outline-none focus:border-corporate-primary font-mono"
            />

            <button
              type="submit"
              disabled={loginLoading}
              className="btn-primary w-full hover:bg-corporate-primary/80 flex items-center justify-center gap-2 py-3 disabled:opacity-50"
            >
              {loginLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>ກຳລັງກວດສອບ...</span>
                </>
              ) : (
                <span>ເຂົ້າສູ່ລະບົບ</span>
              )}
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="page-container flex min-h-[100dvh] w-full max-w-[1920px] mx-auto flex-1 flex-col font-lao">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-center md:justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold text-corporate-ltc sm:gap-3 sm:text-2xl md:text-3xl">
          <ShieldCheck className="shrink-0 text-corporate-primary" />
          <span className="leading-tight">Admin Control Center</span>
        </h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setTab('applications');
              setIsSelectMode(false);
              setSelectedIds(new Set());
            }}
            className={`min-h-[44px] flex-1 rounded-xl px-3 py-2 text-sm font-bold transition-all sm:flex-none sm:px-4 ${tab === 'applications'
              ? 'bg-corporate-primary text-white'
              : 'border border-corporate-border bg-white text-corporate-muted hover:text-corporate-ltc'
              }`}
          >
            <FileText className="mr-1 inline h-4 w-4" /> ລາຍການ
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('jobconfig');
              setIsSelectMode(false);
              setSelectedIds(new Set());
            }}
            className={`min-h-[44px] flex-1 rounded-xl px-3 py-2 text-sm font-bold transition-all sm:flex-none sm:px-4 ${tab === 'jobconfig'
              ? 'bg-corporate-primary text-white'
              : 'border border-corporate-border bg-white text-corporate-muted hover:text-corporate-ltc'
              }`}
          >
            <Settings className="mr-1 inline h-4 w-4" /> ຕັ້ງຄ່າ
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('trash');
              setIsSelectMode(false);
              setSelectedIds(new Set());
              setStatusFilter('ALL');
              setBranchFilter('ALL');
              setPositionFilter('ALL');
              setEducationFilter('ALL');
            }}
            className={`min-h-[44px] flex-1 rounded-xl px-3 py-2 text-sm font-bold transition-all sm:flex-none sm:px-4 ${tab === 'trash'
              ? 'bg-red-500 text-white'
              : 'border border-corporate-border bg-white text-red-400 hover:text-red-600 hover:bg-red-50'
              }`}
          >
            <Trash2 className="mr-1 inline h-4 w-4" /> ຖັງຂີ້ເຫຍື້ອ
          </button>
        </div>
      </div>

      {/* ══════════════════ APPLICATIONS TAB ══════════════════ */}
      {(tab === 'applications' || tab === 'trash') && (
        <>
          {/* StatCards (Only in main applications tab) */}
          {tab === 'applications' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              <StatCard onClick={() => setStatusFilter('ALL')} active={statusFilter === 'ALL'} icon={<Users className="w-5 h-5" />} label="ທັງໝົດ" value={applications.length} color="bg-blue-500/10 text-blue-600" />
              <StatCard onClick={() => setStatusFilter('PENDING')} active={statusFilter === 'PENDING'} icon={<Clock className="w-5 h-5" />} label="ລໍຖ້າ" value={applications.filter(a => a.status === 'PENDING').length} color="bg-amber-500/10 text-amber-600" />
              <StatCard onClick={() => setStatusFilter('REVIEWING')} active={statusFilter === 'REVIEWING'} icon={<FileText className="w-5 h-5" />} label="ກຳລັງກວດ" value={applications.filter(a => a.status === 'REVIEWING').length} color="bg-blue-500/10 text-blue-600" />
              <StatCard onClick={() => setStatusFilter('INTERVIEW')} active={statusFilter === 'INTERVIEW'} icon={<Clock className="w-5 h-5" />} label="ນັດສຳພາດ" value={applications.filter(a => a.status === 'INTERVIEW').length} color="bg-purple-500/10 text-purple-600" />
              <StatCard onClick={() => setStatusFilter('APPROVED')} active={statusFilter === 'APPROVED'} icon={<CheckCircle className="w-5 h-5" />} label="ຜ່ານ" value={applications.filter(a => a.status === 'APPROVED').length} color="bg-emerald-500/10 text-emerald-600" />
              <StatCard onClick={() => setStatusFilter('REJECTED')} active={statusFilter === 'REJECTED'} icon={<X className="w-5 h-5" />} label="ບໍ່ຜ່ານ" value={applications.filter(a => a.status === 'REJECTED').length} color="bg-red-500/10 text-red-600" />
            </div>
          )}

          {/* Simple Clean Title when in Trash Tab */}
          {tab === 'trash' && (
            <div className="mb-4 flex items-center gap-2 font-lao">
              <h2 className="text-lg font-extrabold text-red-600 flex items-center gap-2">
                <Trash2 className="w-5 h-5" /> ຖັງຂີ້ເຫຍື້ອ
              </h2>
              <span className="text-xs bg-red-100 text-red-700 font-bold px-2.5 py-0.5 rounded-full font-mono">
                {applications.length} ລາຍການ
              </span>
            </div>
          )}

          {/* Search and Actions */}
          <div className="flex flex-col lg:flex-row gap-3 mb-4">
            <div className="flex flex-wrap gap-2.5 flex-1">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ຄົ້ນຫາ ຊື່, ເບີໂທ, ຕຳແໜ່ງ, RefCode..."
                  className="w-full bg-white border border-corporate-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-corporate-ltc outline-none focus:border-corporate-primary placeholder:text-slate-400 font-medium"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-auto min-w-[140px]">
                <LaoDatePicker
                  value={dateFilter}
                  onChange={val => setDateFilter(val)}
                  placeholder="dd/mm/yyyy"
                  className="bg-white py-2.5 px-3 text-xs"
                />
              </div>

              {/* Status Filter Dropdown (Only in main applications tab) */}
              {tab === 'applications' && (
                <div className="w-full sm:w-48">
                  <AnimatedSelect
                    value={statusFilter}
                    onChange={val => setStatusFilter(val)}
                    placeholder="📌 ທຸກສະຖານະ"
                    options={[
                      { value: 'ALL', label: '📌 ທຸກສະຖານະ' },
                      { value: 'PENDING', label: '⏳ ລໍຖ້າກວດສອບ (PENDING)' },
                      { value: 'REVIEWING', label: '🔍 ກຳລັງກວດສອບ (REVIEWING)' },
                      { value: 'INTERVIEW', label: '📅 ນັດໝາຍສຳພາດ (INTERVIEW)' },
                      { value: 'APPROVED', label: '✅ ຜ່ານການຄັດເລືອກ (APPROVED)' },
                      { value: 'REJECTED', label: '❌ ບໍ່ຜ່ານ (REJECTED)' }
                    ]}
                  />
                </div>
              )}

              {/* Education Level Filter (Only in main applications tab) */}
              {tab === 'applications' && (
                <div className="w-full sm:w-48">
                  <AnimatedSelect
                    value={educationFilter}
                    onChange={val => setEducationFilter(val)}
                    placeholder="🎓 ທຸກວຸດທິການສຶກສາ"
                    options={[
                      { value: 'ALL', label: '🎓 ທຸກວຸດທິການສຶກສາ' },
                      { value: 'BACHELOR', label: '🎓 ປະລິນຍາຕີ' },
                      { value: 'MASTER', label: '🎓 ປະລິນຍາໂທ' },
                      { value: 'DIPLOMA', label: '📜 ຊັ້ນສູງ / ອື່ນໆ' }
                    ]}
                  />
                </div>
              )}

              {/* Branch Filter (Only in main applications tab) */}
              {tab === 'applications' && availableBranches.length > 0 && (
                <div className="w-full sm:w-48">
                  <AnimatedSelect
                    value={branchFilter}
                    onChange={val => setBranchFilter(val)}
                    placeholder="📍 ທຸກສາຂາ"
                    options={[
                      { value: 'ALL', label: '📍 ທຸກສາຂາ' },
                      ...availableBranches.map(b => ({ value: b, label: `📍 ${b}` }))
                    ]}
                  />
                </div>
              )}

              {/* Position Filter (Only in main applications tab) */}
              {tab === 'applications' && availablePositions.length > 0 && (
                <div className="w-full sm:w-56">
                  <AnimatedSelect
                    value={positionFilter}
                    onChange={val => setPositionFilter(val)}
                    placeholder="💼 ທຸກຕຳແໜ່ງ"
                    options={[
                      { value: 'ALL', label: '💼 ທຸກຕຳແໜ່ງ' },
                      ...availablePositions.map(p => ({ value: p, label: `💼 ${p}` }))
                    ]}
                  />
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 w-full lg:w-auto">
              <button onClick={fetchApplications} className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2.5 bg-white border border-corporate-border rounded-xl text-corporate-muted hover:text-corporate-ltc text-sm font-bold transition-all shrink-0">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> ໂຫລດໃໝ່
              </button>

              <button
                onClick={() => {
                  setIsSelectMode(!isSelectMode);
                  if (isSelectMode) setSelectedIds(new Set());
                }}
                className={`flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-bold transition-all shrink-0 ${isSelectMode ? 'bg-corporate-primary text-white border-corporate-primary' : 'bg-white border-corporate-border text-corporate-muted hover:text-corporate-ltc'}`}
              >
                <ListChecks className="w-4 h-4" /> {isSelectMode ? 'ຍົກເລີກ' : 'ເລືອກລຶບຫຼາຍອັນ'}
              </button>

              {isSelectMode && (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-3 py-2.5 bg-white border border-corporate-border rounded-xl text-xs font-bold text-corporate-ltc hover:bg-slate-50 transition-all shrink-0 cursor-pointer"
                >
                  {selectedIds.size === filtered.length && filtered.length > 0 ? '✓ ຍົກເລີກເລືອກທັງໝົດ' : '☑ ເລືອກທັງໝົດ'}
                </button>
              )}

              {selectedIds.size > 0 && (
                <button
                  onClick={() => handleBatchOpenPDFs()}
                  className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-100 text-sm font-bold transition-all shrink-0"
                >
                  <Download className="w-4 h-4" /> 🖨️ ພິມ/ເປີດ PDF ({selectedIds.size})
                </button>
              )}

              {isSelectMode && selectedIds.size > 0 && (
                tab === 'trash' ? (
                  <>
                    <button onClick={handleBulkRestore} className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2.5 bg-green-50 text-green-600 border border-green-200 rounded-xl hover:bg-green-100 text-sm font-bold transition-all shrink-0">
                      <RefreshCw className="w-4 h-4" /> ກູ້ຄືນ ({selectedIds.size})
                    </button>
                    <button onClick={handleBulkForceDelete} className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2.5 bg-red-50 text-red-500 border border-red-200 rounded-xl hover:bg-red-100 text-sm font-bold transition-all shrink-0">
                      <Trash2 className="w-4 h-4" /> ລຶບຖາວອນ ({selectedIds.size})
                    </button>
                  </>
                ) : (
                  <button onClick={handleBulkDelete} className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2.5 bg-red-50 text-red-500 border border-red-200 rounded-xl hover:bg-red-100 text-sm font-bold transition-all shrink-0">
                    <Trash2 className="w-4 h-4" /> ລຶບ ({selectedIds.size})
                  </button>
                )
              )}
            </div>
          </div>

          {loading && (
            <div className="bg-white border border-corporate-border rounded-2xl p-8 text-center text-slate-500">
              ກຳລັງໂຫລດ...
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="bg-white border border-corporate-border rounded-2xl p-8 text-center text-slate-500 font-medium">
              {tab === 'trash' ? '🗑️ ບໍ່ມີລາຍການໃນຖັງຂີ້ເຫຍື້ອ' : 'ຍັງບໍ່ມີຂໍ້ມູນ'}
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="space-y-6">
              {groupedApplications.map(([branch, apps]) => {
                const branchDisplayName = branch.startsWith('ແຂວງ') || branch.includes('ນະຄອນຫຼວງ') ? branch : `ແຂວງ ${branch}`;
                const allBranchSelected = apps.every(a => selectedIds.has(a.id));
                const toggleBranchSelectAll = () => {
                  const newSet = new Set(selectedIds);
                  if (allBranchSelected) {
                    apps.forEach(a => newSet.delete(a.id));
                  } else {
                    apps.forEach(a => newSet.add(a.id));
                  }
                  setSelectedIds(newSet);
                };

                return (
                  <div key={branch} className="space-y-3">
                    {/* Branch Group Header */}
                    <div className="flex items-center justify-between border-b border-corporate-border pb-2 pt-2">
                      <h3 className="text-sm sm:text-base font-bold text-corporate-ltc flex items-center gap-2">
                        <span className="text-red-500">📍</span>
                        <span>{branchDisplayName}</span>
                        <span className="bg-red-50 text-red-600 border border-red-200/60 px-2.5 py-0.5 rounded-full text-xs font-extrabold">
                          {apps.length} ຜູ້ສະໝັກ
                        </span>
                      </h3>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleBatchOpenPDFs(apps)}
                          className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                          title="ເປີດໄຟລ໌ PDF ທັງໝົດໃນແຂວງນີ້"
                        >
                          <Download className="w-3.5 h-3.5" /> 🖨️ ພິມ PDF ກຸ່ມນີ້ ({apps.filter(a => a.pdfUrl).length})
                        </button>
                        {isSelectMode && (
                          <button
                            type="button"
                            onClick={toggleBranchSelectAll}
                            className="text-xs text-corporate-primary font-bold hover:underline"
                          >
                            {allBranchSelected ? 'ຍົກເລີກເລືອກກຸ່ມນີ້' : 'ເລືອກກຸ່ມນີ້ທັງໝົດ'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* DESKTOP TABLE FOR THIS BRANCH */}
                    <div className="hidden md:block bg-white border border-corporate-border rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100/80 text-corporate-muted text-xs uppercase tracking-wider">
                            {isSelectMode && (
                              <th className="p-4 w-12 text-center">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 cursor-pointer accent-corporate-primary"
                                  checked={apps.length > 0 && apps.every(a => selectedIds.has(a.id))}
                                  onChange={toggleBranchSelectAll}
                                />
                              </th>
                            )}
                            <th className="p-4">ຊື່ຜູ້ສະໝັກ</th>
                            <th className="p-4">ຕຳແໜ່ງ</th>
                            <th className="p-4">ເບີໂທ</th>
                            <th className="p-4">ສະຖານະ</th>
                            <th className="p-4">{tab === 'trash' ? 'ວັນທີຖືກລຶບ' : 'ວັນທີສະໝັກ'}</th>
                            <th className="p-4 text-right">ການດຳເນີນການ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-corporate-border">
                          {apps.map(app => (
                            <tr key={app.id} className={`hover:bg-slate-50 transition-colors text-slate-600 ${selectedIds.has(app.id) ? 'bg-slate-50' : ''}`}>
                              {isSelectMode && (
                                <td className="p-4 text-center">
                                  <input type="checkbox" className="w-4 h-4 cursor-pointer accent-corporate-primary" checked={selectedIds.has(app.id)} onChange={() => toggleSelect(app.id)} />
                                </td>
                              )}
                              <td className="p-4 font-semibold text-corporate-ltc">
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-1.5">
                                    <span>{app.name || '—'}</span>
                                    {app.refCode && (
                                      <span className="text-[10px] font-mono font-bold bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-600">
                                        {app.refCode}
                                      </span>
                                    )}
                                  </div>
                                  {(app.rating || localStorage.getItem(`hr_rating_${app.id}`)) ? (
                                    <span className="text-[11px] text-amber-500 font-bold flex items-center gap-0.5 mt-0.5">
                                      ★ {app.rating || localStorage.getItem(`hr_rating_${app.id}`)}/5
                                      {(app.hrNotes || localStorage.getItem(`hr_note_${app.id}`)) && (
                                        <span className="text-slate-400 font-normal ml-1 truncate max-w-[130px]" title={app.hrNotes || localStorage.getItem(`hr_note_${app.id}`) || ''}>
                                          ({app.hrNotes || localStorage.getItem(`hr_note_${app.id}`)})
                                        </span>
                                      )}
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex flex-col gap-1 items-start">
                                  <span className="bg-slate-100 px-2 py-1 rounded text-xs text-corporate-accent uppercase font-mono">{app.position || '—'}</span>
                                </div>
                              </td>
                              <td className="p-4 text-sm font-mono">
                                <div className="flex flex-col">
                                  <span>{app.phone || '—'}</span>
                                  {app.email && <span className="text-[11px] text-slate-400 font-normal truncate max-w-[140px]">{app.email}</span>}
                                </div>
                              </td>
                              <td className="p-4">
                                {tab === 'trash' ? (
                                  <span className={`px-2 py-1 rounded border text-xs font-bold opacity-75 ${STATUS_COLORS[app.status] || STATUS_COLORS.PENDING}`}>{app.status}</span>
                                ) : (
                                  <button type="button" onClick={() => openEmailModal(app, app.status)} className="hover:opacity-80 transition-opacity hover:scale-105" title="ກົດເພື່ອປ່ຽນສະຖານະ">
                                    <span className={`px-2 py-1 rounded border text-xs font-bold cursor-pointer ${STATUS_COLORS[app.status] || STATUS_COLORS.PENDING}`}>{app.status}</span>
                                  </button>
                                )}
                              </td>
                              <td className="p-4 text-xs whitespace-nowrap">
                                {tab === 'trash' ? (
                                  <div className="flex items-center gap-2 font-mono">
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200/80 font-bold text-xs">
                                      <Trash2 className="w-3 h-3 text-red-500 shrink-0" />
                                      {formatDateDDMMYYYY(app.deletedAt || app.submittedAt)}
                                    </span>
                                    <span className="text-[11px] text-slate-400 font-normal">
                                      (ສະໝັກ: {formatDateDDMMYYYY(app.submittedAt)})
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-corporate-muted font-mono">{formatDateDDMMYYYY(app.submittedAt)}</span>
                                )}
                              </td>
                              <td className="p-4">
                                <div className="flex justify-end items-center gap-1.5">
                                  {/* Quick CV / Doc Preview Button */}
                                  <button
                                    onClick={() => setPreviewModal({
                                      open: true,
                                      app,
                                      activeUrl: app.pdfUrl ? `${API}${app.pdfUrl}?token=${authToken}` : '',
                                      activeTitle: 'ໃບສະໝັກວຽກ (PDF)'
                                    })}
                                    className="p-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                                    title="ເບິ່ງເອກະສານ/CV"
                                  >
                                    👁️ Preview
                                  </button>

                                  {tab === 'trash' ? (
                                    <>
                                      <button
                                        onClick={() => handleRestore(app.id)}
                                        className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                                        title="ກູ້ຄືນລາຍການນີ້"
                                      >
                                        <RefreshCw className="w-3.5 h-3.5" /> ກູ້ຄືນ
                                      </button>
                                      <button
                                        onClick={() => handleForceDelete(app.id)}
                                        className="px-2.5 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                                        title="ລຶບຖາວອນ"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" /> ລຶບຖາວອນ
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      {/* Schedule Interview Button */}
                                      <button
                                        onClick={() => openInterviewModal(app)}
                                        className="p-1.5 bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200/60 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                                        title="ນັດສຳພາດ"
                                      >
                                        📅 ນັດສຳພາດ
                                      </button>

                                      <button onClick={() => { setSelectedApp(app); setIsModalOpen(true); }} className="text-blue-500 hover:text-blue-600 p-2 hover:bg-blue-50 rounded transition-colors" title="ເບິ່ງລາຍລະອຽດ">
                                        <FileText className="w-4 h-4" />
                                      </button>
                                      {app.pdfUrl && (
                                        <a
                                          href={getPdfDownloadUrl(app.pdfUrl)}
                                          download={`Application_${app.name || app.id}.pdf`}
                                          className="text-emerald-600 hover:text-emerald-700 p-2 hover:bg-emerald-50 rounded transition-colors"
                                          title="ດາວໂຫລດ PDF ລົງເຄື່ອງ"
                                        >
                                          <Download className="w-4 h-4" />
                                        </a>
                                      )}
                                      <button onClick={() => handleDelete(app.id)} className="text-red-500 hover:text-red-600 p-2 hover:bg-red-50 rounded transition-colors" title="ລຶບ">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* MOBILE CARDS FOR THIS BRANCH */}
                    <div className="md:hidden space-y-3">
                      {apps.map(app => (
                        <div key={app.id} className={`bg-white border border-corporate-border rounded-xl p-4 space-y-3 ${selectedIds.has(app.id) ? 'ring-2 ring-corporate-primary' : ''}`}>
                          <div className="flex justify-between items-start gap-3">
                            {isSelectMode && (
                              <input type="checkbox" className="mt-1 w-5 h-5 shrink-0 cursor-pointer accent-corporate-primary" checked={selectedIds.has(app.id)} onChange={() => toggleSelect(app.id)} />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-corporate-ltc text-base">{app.name || '—'}</h4>
                                {app.refCode && (
                                  <span className="text-[10px] font-mono font-bold bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-600">
                                    {app.refCode}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="bg-slate-100 px-2 py-0.5 rounded text-xs text-corporate-accent uppercase font-mono font-bold">{app.position || '—'}</span>
                                <span className="text-xs text-corporate-muted">{app.phone || '—'}</span>
                              </div>
                              {(app.rating || localStorage.getItem(`hr_rating_${app.id}`)) ? (
                                <div className="text-xs text-amber-500 font-bold flex items-center gap-1 mt-1.5">
                                  ★ {app.rating || localStorage.getItem(`hr_rating_${app.id}`)}/5
                                  {(app.hrNotes || localStorage.getItem(`hr_note_${app.id}`)) && (
                                    <span className="text-slate-400 font-normal truncate max-w-[180px]">
                                      ({app.hrNotes || localStorage.getItem(`hr_note_${app.id}`)})
                                    </span>
                                  )}
                                </div>
                              ) : null}
                            </div>
                            {tab === 'trash' ? (
                              <span className={`px-2 py-1 rounded border text-xs font-bold opacity-75 ${STATUS_COLORS[app.status] || STATUS_COLORS.PENDING}`}>{app.status}</span>
                            ) : (
                              <button type="button" onClick={() => openEmailModal(app, app.status)} className="hover:opacity-80 transition-opacity">
                                <span className={`px-2 py-1 rounded border text-xs font-bold cursor-pointer ${STATUS_COLORS[app.status] || STATUS_COLORS.PENDING}`}>{app.status}</span>
                              </button>
                            )}
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-corporate-border text-xs">
                            {tab === 'trash' ? (
                              <div className="flex items-center gap-2 font-mono flex-wrap">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200/80 font-bold text-xs">
                                  <Trash2 className="w-3 h-3 text-red-500 shrink-0" />
                                  {formatDateDDMMYYYY(app.deletedAt || app.submittedAt)}
                                </span>
                                <span className="text-[11px] text-slate-400 font-normal">
                                  (ສະໝັກ: {formatDateDDMMYYYY(app.submittedAt)})
                                </span>
                              </div>
                            ) : (
                              <span className="text-corporate-muted font-mono">{formatDateDDMMYYYY(app.submittedAt)}</span>
                            )}
                            <div className="flex gap-2 items-center">
                              {tab === 'trash' ? (
                                <>
                                  <button
                                    onClick={() => handleRestore(app.id)}
                                    className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                                    title="ກູ້ຄືນ"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" /> ກູ້ຄືນ
                                  </button>
                                  <button
                                    onClick={() => handleForceDelete(app.id)}
                                    className="px-2.5 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                                    title="ລຶບຖາວອນ"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> ລຶບຖາວອນ
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => { setSelectedApp(app); setIsModalOpen(true); }} className="p-2 bg-blue-50 text-blue-600 rounded-xl" title="ເບິ່ງລາຍລະອຽດ">
                                    <FileText className="w-4 h-4" />
                                  </button>
                                  {app.pdfUrl && (
                                    <a
                                      href={getPdfDownloadUrl(app.pdfUrl)}
                                      download={`Application_${app.name || app.id}.pdf`}
                                      className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"
                                      title="ດາວໂຫລດ PDF ລົງເຄື່ອງ"
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                  )}
                                  <button onClick={() => handleDelete(app.id)} className="p-2 bg-red-50 text-red-600 rounded-xl" title="ລຶບ">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ══════════════════ JOB CONFIG TAB ══════════════════ */}
      {tab === 'jobconfig' && (
        <div className="w-full space-y-6 pb-36">
          <div className="card-panel space-y-5">
            <h2 className="text-lg font-bold text-corporate-ltc flex items-center gap-2">
              <Settings className="w-5 h-5 text-corporate-primary" /> ຕັ້ງຄ່າການຮັບສະໝັກ
            </h2>

            {/* Required Documents */}
            <div>
              <label className="text-xs text-corporate-muted uppercase font-bold mb-2 block">ເອກະສານທີ່ຕ້ອງການ</label>
              <div className="space-y-2">
                {jobConfig.requiredDocs.map((doc, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      className="flex-1 bg-slate-50 border border-corporate-border rounded-xl px-3 py-2 text-sm text-corporate-ltc outline-none focus:border-corporate-primary"
                      value={doc || ''}
                      onChange={e => { const val = e.target.value; setJobConfig(p => ({ ...p, requiredDocs: p.requiredDocs.map((d, j) => j === i ? val : d) })) }}
                    />
                    <button onClick={() => setJobConfig(p => ({ ...p, requiredDocs: p.requiredDocs.filter((_, j) => j !== i) }))} className="text-red-400 hover:text-red-300 p-1.5 hover:bg-red-500/10 rounded-lg transition-colors">
                      <MinusCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input type="text" placeholder="ເພີ່ມເອກະສານໃໝ່..." className="flex-1 bg-slate-50 border border-dashed border-corporate-border rounded-xl px-3 py-2 text-sm text-corporate-muted outline-none focus:border-corporate-primary placeholder:text-slate-400"
                    value={newDoc} onChange={e => setNewDoc(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newDoc.trim()) { setJobConfig(p => ({ ...p, requiredDocs: [...p.requiredDocs, newDoc.trim()] })); setNewDoc(''); } }}
                  />
                  <button onClick={() => { if (newDoc.trim()) { setJobConfig(p => ({ ...p, requiredDocs: [...p.requiredDocs, newDoc.trim()] })); setNewDoc(''); } }} className="px-3 py-2 bg-corporate-primary/10 text-corporate-primary hover:bg-corporate-primary/20 rounded-xl transition-colors">
                    <PlusCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Positions */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 bg-slate-50 border border-corporate-border p-3.5 sm:p-4 rounded-2xl">
                <div>
                  <label className="text-sm font-bold text-corporate-ltc block">ຕຳແໜ່ງທີ່ເປີດຮັບ</label>
                  <p className="text-xs text-corporate-muted mt-0.5">ຈັດການຂໍ້ມູນ ແລະ ຂໍ້ກຳນົດຂອງຕຳແໜ່ງງານທັງໝົດ</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setJobConfig(p => ({
                      ...p,
                      positions: [{ department: '', code: '', slots: 1, requirements: [], deadline: '' }, ...p.positions]
                    }));
                    setExpandedPos(0);
                  }}
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3 bg-gradient-to-r from-corporate-primary via-red-600 to-rose-600 hover:opacity-95 text-white rounded-xl font-extrabold text-sm sm:text-base shadow-lg shadow-red-500/30 transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95 cursor-pointer shrink-0"
                >
                  <PlusCircle className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
                  <span>+ ເພີ່ມຕຳແໜ່ງໃໝ່</span>
                </button>
              </div>
              <div className="space-y-6">
                {groupedAdminPositions.map(([branch, items]) => (
                  <div key={branch} className="space-y-3">
                    <h3 className="text-sm font-bold text-corporate-ltc flex items-center gap-2 border-b border-corporate-border pb-2">
                      📍 {branch}
                      <span className="bg-corporate-primary/10 text-corporate-primary px-2 py-0.5 rounded-full text-xs font-bold">{items.length} ຕຳແໜ່ງ</span>
                    </h3>
                    {items.map(({ pos, i }) => {
                      const isExpanded = expandedPos === i;
                      return (
                        <div key={i} className={`border rounded-xl transition-all ${isExpanded ? 'p-4 border-l-4 border-amber-400 border-corporate-border bg-amber-50/20 shadow-md ring-1 ring-amber-400/30' : 'p-3 bg-slate-50 border-corporate-border hover:border-slate-300'}`}>
                          <div className="flex justify-between items-center cursor-pointer select-none" onClick={() => setExpandedPos(isExpanded ? null : i)}>
                            <div className="flex items-center gap-3">
                              <span className="bg-white border border-corporate-border text-corporate-accent px-2 py-0.5 rounded text-xs font-mono font-bold uppercase">{pos.code || 'ລະຫັດ'}</span>
                              <span className="text-corporate-ltc font-bold text-sm">{pos.department || 'ຍັງບໍ່ມີຊື່ຕຳແໜ່ງ'}</span>
                              {checkExpired(pos) && <span className="bg-red-500/10 text-red-600 px-2 py-0.5 rounded text-xs font-bold">ໝົດອາຍຸ</span>}
                              {!isExpanded && <span className="ml-2 text-xs text-slate-500 hidden sm:inline-block">ຮັບ {pos.slots} ຄົນ</span>}
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={(e) => { e.stopPropagation(); setJobConfig(p => ({ ...p, positions: p.positions.filter((_, j) => j !== i) })) }} className="text-red-400 hover:text-red-300 p-1.5 hover:bg-red-500/10 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <div className="text-slate-500 p-1">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </div>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-corporate-border space-y-3">
                              <div className="flex flex-col sm:flex-row gap-2">
                                <input type="text" placeholder="ລະຫັດ (ເຊັ່ນ: IT)" className="bg-white border border-corporate-border rounded-lg px-3 py-2 text-xs text-corporate-accent font-mono font-bold outline-none focus:border-corporate-primary w-full sm:w-32 uppercase"
                                  value={pos.code || ''}
                                  onChange={e => { const val = e.target.value; setJobConfig(p => ({ ...p, positions: p.positions.map((pp, j) => j === i ? { ...pp, code: val } : pp) })) }}
                                />
                                <input type="text" placeholder="ພະແນກ" className="flex-1 bg-white border border-corporate-border rounded-lg px-3 py-2 text-xs text-corporate-ltc outline-none focus:border-corporate-primary"
                                  value={pos.department || ''}
                                  onChange={e => { const val = e.target.value; setJobConfig(p => ({ ...p, positions: p.positions.map((pp, j) => j === i ? { ...pp, department: val } : pp) })) }}
                                />
                              </div>
                              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                                <div className="flex-1 w-full">
                                  <label className="text-[11px] text-slate-500 mb-1 block">ສາຂາ / Branch</label>
                                  <AnimatedSelect
                                    value={pos.branch || DEFAULT_BRANCH}
                                    options={pos.branch && !BRANCH_OPTIONS.includes(pos.branch) ? [pos.branch, ...BRANCH_OPTIONS] : BRANCH_OPTIONS}
                                    onChange={val => setJobConfig(p => ({ ...p, positions: p.positions.map((pp, j) => j === i ? { ...pp, branch: val } : pp) }))}
                                  />
                                </div>
                                <div className="w-full sm:w-auto">
                                  <label className="text-[11px] text-slate-500 mb-1 block">ວັນໝົດອາຍຸການສະໝັກ</label>
                                  <DateInputLao
                                    value={pos.deadline || pos.expirationDate || ''}
                                    onChange={val => {
                                      setJobConfig(p => ({
                                        ...p,
                                        positions: p.positions.map((pp, j) => j === i ? { ...pp, deadline: val, expirationDate: val } : pp)
                                      }));
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="flex flex-col gap-3">
                                <div className="w-full border border-corporate-border rounded-lg p-2.5 bg-white">
                                  <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-slate-700">ພາກສ່ວນ / Sections</label>
                                    <button
                                      type="button"
                                      onClick={() => setJobConfig(p => ({
                                        ...p,
                                        positions: p.positions.map((pp, j) => j === i ? {
                                          ...pp,
                                          sections: [
                                            ...(Array.isArray(pp.sections) ? pp.sections : []),
                                            { name: '', slots: '', requirements: [''], responsibilities: [''] }
                                          ]
                                        } : pp)
                                      }))}
                                      className="inline-flex items-center gap-1 text-xs font-bold text-corporate-primary hover:bg-red-50 px-2.5 py-1 rounded-lg border border-corporate-primary/20 transition-all cursor-pointer"
                                    >
                                      <PlusCircle className="w-3.5 h-3.5" /> ເພີ່ມພາກສ່ວນ
                                    </button>
                                  </div>
                                  <div className="space-y-2">
                                    {pos.section && !pos.sections?.length && (
                                      <div className="flex gap-2 items-center">
                                        <input
                                          type="text"
                                          className="flex-1 bg-slate-50 border border-corporate-border rounded-lg px-2 py-1.5 text-xs text-corporate-ltc outline-none focus:border-corporate-primary"
                                          value={pos.section || ''}
                                          onChange={e => {
                                            const val = e.target.value;
                                            setJobConfig(p => ({
                                              ...p,
                                              positions: p.positions.map((pp, j) => j === i ? { ...pp, section: val } : pp)
                                            }));
                                          }}
                                        />
                                      </div>
                                    )}

                                    {(Array.isArray(pos.sections) ? pos.sections : []).map((sec, si) => {
                                      const secObj = typeof sec === 'object' && sec !== null ? sec : { name: String(sec || ''), slots: '', requirements: [], responsibilities: [] };
                                      const secReqs = Array.isArray(secObj.requirements) ? secObj.requirements : [];
                                      const secResps = Array.isArray(secObj.responsibilities) ? secObj.responsibilities : [];

                                      return (
                                        <div
                                          key={si}
                                          className={`bg-slate-50 border border-corporate-border rounded-xl p-3 transition-all space-y-3 ${draggedSec?.p === i && draggedSec?.i === si ? 'opacity-50' : 'opacity-100'}`}
                                          draggable
                                          onDragStart={() => setDraggedSec({ p: i, i: si })}
                                          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                                          onDrop={(e) => {
                                            e.preventDefault();
                                            if (draggedSec && draggedSec.p === i && draggedSec.i !== si) {
                                              setJobConfig(p => {
                                                const newSecs = [...(Array.isArray(p.positions[i]?.sections) ? p.positions[i].sections : [])];
                                                const [moved] = newSecs.splice(draggedSec.i, 1);
                                                newSecs.splice(si, 0, moved);
                                                return {
                                                  ...p,
                                                  positions: p.positions.map((pp, j) => j === i ? { ...pp, sections: newSecs } : pp)
                                                };
                                              });
                                            }
                                            setDraggedSec(null);
                                          }}
                                          onDragEnd={() => setDraggedSec(null)}
                                        >
                                          {/* ── Section Title & Slots Row ── */}
                                          <div className="flex flex-wrap sm:flex-nowrap gap-1.5 sm:gap-2 items-center">
                                            <div className="cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing p-1 shrink-0" title="ລາກເພື່ອຈັດລຽງ">
                                              <GripVertical className="w-4 h-4" />
                                            </div>

                                            {/* Input ຊື່ພາກສ່ວນ */}
                                            <input
                                              type="text"
                                              placeholder="ຊື່ພາກສ່ວນ..."
                                              className="min-w-0 flex-1 bg-white border border-corporate-border rounded-lg px-3 py-2 text-sm sm:text-xs text-corporate-ltc outline-none focus:border-corporate-primary font-bold"
                                              value={secObj.name || ''}
                                              onChange={e => {
                                                const val = e.target.value;
                                                setJobConfig(p => ({
                                                  ...p,
                                                  positions: p.positions.map((pp, j) => j === i ? {
                                                    ...pp,
                                                    sections: (Array.isArray(pp.sections) ? pp.sections : []).map((s, k) => k === si ? {
                                                      ...(typeof s === 'object' ? s : { name: String(s), slots: '', requirements: [], responsibilities: [] }),
                                                      name: val
                                                    } : s)
                                                  } : pp)
                                                }));
                                              }}
                                            />

                                            <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto pl-7 sm:pl-0 sm:ml-2 sm:border-l sm:border-slate-200">
                                              <span className="text-xs text-slate-400 sm:hidden">ຮັບ</span>

                                              {/* Input ຈຳນວນຄົນ */}
                                              <input
                                                type="text"
                                                placeholder="0"
                                                className="w-16 sm:w-14 bg-white border border-corporate-border rounded-lg px-2 py-2 sm:py-1.5 text-sm sm:text-xs text-center text-corporate-accent font-bold outline-none focus:border-corporate-primary"
                                                value={String(secObj.slots ?? '')}
                                                onChange={e => {
                                                  const val = e.target.value;
                                                  setJobConfig(p => ({
                                                    ...p,
                                                    positions: p.positions.map((pp, j) => j === i ? {
                                                      ...pp,
                                                      sections: (Array.isArray(pp.sections) ? pp.sections : []).map((s, k) => k === si ? {
                                                        ...(typeof s === 'object' ? s : { name: String(s), slots: '', requirements: [], responsibilities: [] }),
                                                        slots: val
                                                      } : s)
                                                    } : pp)
                                                  }));
                                                }}
                                              />
                                              <span className="text-xs text-slate-400 font-medium">ຄົນ</span>

                                              {/* ປຸ່ມກ໋ອບປີ້ພາກສ່ວນ */}
                                              <button
                                                type="button"
                                                onClick={() => setJobConfig(p => {
                                                  const currentSec = p.positions[i]?.sections?.[si];
                                                  const clonedSec = typeof currentSec === 'object' && currentSec !== null
                                                    ? JSON.parse(JSON.stringify(currentSec))
                                                    : { name: String(currentSec || ''), slots: '', requirements: [], responsibilities: [] };
                                                  const newSecs = [...(Array.isArray(p.positions[i]?.sections) ? p.positions[i].sections : [])];
                                                  newSecs.splice(si + 1, 0, clonedSec);
                                                  return {
                                                    ...p,
                                                    positions: p.positions.map((pp, j) => j === i ? { ...pp, sections: newSecs } : pp)
                                                  };
                                                })}
                                                className="text-blue-500 hover:text-blue-600 p-1.5 sm:p-1 hover:bg-blue-50 rounded-lg transition-colors ml-auto sm:ml-0"
                                                title="ກ໋ອບປີ້/ຄັດລອກ ພາກສ່ວນນີ້"
                                              >
                                                <Copy className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                                              </button>

                                              {/* ປຸ່ມລຶບພາກສ່ວນ */}
                                              <button
                                                type="button"
                                                onClick={() => setJobConfig(p => ({
                                                  ...p,
                                                  positions: p.positions.map((pp, j) => j === i ? {
                                                    ...pp,
                                                    sections: (Array.isArray(pp.sections) ? pp.sections : []).filter((_, k) => k !== si)
                                                  } : pp)
                                                }))}
                                                className="text-red-400 hover:text-red-300 p-1.5 sm:p-1 hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="ລຶບ"
                                              >
                                                <MinusCircle className="w-5 h-5 sm:w-4 sm:h-4" />
                                              </button>
                                            </div>
                                          </div>

                                          {/* ── 1. ເງື່ອນໄຂ / ຄຸນສົມບັດ (Requirements) ── */}
                                          <div className="pl-7 pr-2 pt-1 border-t border-slate-200/80">
                                            <div className="text-[11px] font-bold text-slate-600 mb-1.5 flex items-center gap-1">
                                              <span>🎓</span> ເງື່ອນໄຂ / ຄຸນສົມບັດ (Requirements):
                                            </div>
                                            <div className="space-y-1.5">
                                              {secReqs.map((req, ri) => (
                                                <div
                                                  key={ri}
                                                  className={`flex gap-1.5 items-center transition-all ${draggedSecReq?.p === i && draggedSecReq?.s === si && draggedSecReq?.r === ri ? 'opacity-50' : 'opacity-100'}`}
                                                  draggable
                                                  onDragStart={() => setDraggedSecReq({ p: i, s: si, r: ri })}
                                                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                                                  onDrop={(e) => {
                                                    e.preventDefault();
                                                    if (draggedSecReq && draggedSecReq.p === i && draggedSecReq.s === si && draggedSecReq.r !== ri) {
                                                      setJobConfig(p => {
                                                        const currentSec = p.positions[i]?.sections?.[si];
                                                        const newReqs = [...(typeof currentSec === 'object' && Array.isArray(currentSec.requirements) ? currentSec.requirements : [])];
                                                        const [moved] = newReqs.splice(draggedSecReq.r, 1);
                                                        newReqs.splice(ri, 0, moved);
                                                        return {
                                                          ...p,
                                                          positions: p.positions.map((pp, j) => j === i ? {
                                                            ...pp,
                                                            sections: (Array.isArray(pp.sections) ? pp.sections : []).map((ss, k) => k === si ? {
                                                              ...(typeof ss === 'object' ? ss : { name: String(ss), slots: '', requirements: [], responsibilities: [] }),
                                                              requirements: newReqs
                                                            } : ss)
                                                          } : pp)
                                                        };
                                                      });
                                                    }
                                                    setDraggedSecReq(null);
                                                  }}
                                                  onDragEnd={() => setDraggedSecReq(null)}
                                                >
                                                  <div className="cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing p-1 shrink-0" title="ລາກເພື່ອຈັດລຽງ">
                                                    <GripVertical className="w-3.5 h-3.5" />
                                                  </div>
                                                  <input
                                                    type="text"
                                                    placeholder="ເງື່ອນໄຂ / ຄຸນສົມບັດ..."
                                                    className="flex-1 bg-white border border-corporate-border rounded-lg px-2 py-1.5 text-xs text-corporate-ltc outline-none focus:border-corporate-primary"
                                                    value={req || ''}
                                                    onChange={e => {
                                                      const val = e.target.value;
                                                      setJobConfig(p => ({
                                                        ...p,
                                                        positions: p.positions.map((pp, j) => j === i ? {
                                                          ...pp,
                                                          sections: (Array.isArray(pp.sections) ? pp.sections : []).map((s, k) => k === si ? {
                                                            ...(typeof s === 'object' ? s : { name: String(s), slots: '', requirements: [], responsibilities: [] }),
                                                            requirements: (Array.isArray((s as any)?.requirements) ? (s as any).requirements : []).map((r: string, rk: number) => rk === ri ? val : r)
                                                          } : s)
                                                        } : pp)
                                                      }));
                                                    }}
                                                  />
                                                  {/* ປຸ່ມກ໋ອບປີ້ ເງື່ອນໄຂ */}
                                                  <button
                                                    type="button"
                                                    onClick={() => setJobConfig(p => ({
                                                      ...p,
                                                      positions: p.positions.map((pp, j) => j === i ? {
                                                        ...pp,
                                                        sections: (Array.isArray(pp.sections) ? pp.sections : []).map((s, k) => k === si ? {
                                                          ...(typeof s === 'object' ? s : { name: String(s), slots: '', requirements: [], responsibilities: [] }),
                                                          requirements: [
                                                            ...(Array.isArray((s as any)?.requirements) ? (s as any).requirements : []).slice(0, ri + 1),
                                                            req,
                                                            ...(Array.isArray((s as any)?.requirements) ? (s as any).requirements : []).slice(ri + 1)
                                                          ]
                                                        } : s)
                                                      } : pp)
                                                    }))}
                                                    className="text-blue-500 hover:text-blue-600 p-1 hover:bg-blue-50 rounded transition-colors"
                                                    title="ກ໋ອບປີ້/ຄັດລອກ ເງື່ອນໄຂນີ້"
                                                  >
                                                    <Copy className="w-3.5 h-3.5" />
                                                  </button>

                                                  {/* ປຸ່ມລຶບ ເງື່ອນໄຂ */}
                                                  <button
                                                    type="button"
                                                    onClick={() => setJobConfig(p => ({
                                                      ...p,
                                                      positions: p.positions.map((pp, j) => j === i ? {
                                                        ...pp,
                                                        sections: (Array.isArray(pp.sections) ? pp.sections : []).map((s, k) => k === si ? {
                                                          ...(typeof s === 'object' ? s : { name: String(s), slots: '', requirements: [], responsibilities: [] }),
                                                          requirements: (Array.isArray((s as any)?.requirements) ? (s as any).requirements : []).filter((_: any, rk: number) => rk !== ri)
                                                        } : s)
                                                      } : pp)
                                                    }))}
                                                    className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded transition-colors"
                                                    title="ລຶບ"
                                                  >
                                                    <MinusCircle className="w-3.5 h-3.5" />
                                                  </button>
                                                </div>
                                              ))}

                                              <button
                                                type="button"
                                                onClick={() => setJobConfig(p => ({
                                                  ...p,
                                                  positions: p.positions.map((pp, j) => j === i ? {
                                                    ...pp,
                                                    sections: (Array.isArray(pp.sections) ? pp.sections : []).map((s, k) => k === si ? {
                                                      ...(typeof s === 'object' ? s : { name: String(s), slots: '', requirements: [], responsibilities: [] }),
                                                      requirements: [...(Array.isArray((s as any)?.requirements) ? (s as any).requirements : []), '']
                                                    } : s)
                                                  } : pp)
                                                }))}
                                                className="text-[11px] font-bold text-corporate-primary hover:text-corporate-primary/80 flex items-center gap-1 mt-1 cursor-pointer"
                                              >
                                                <PlusCircle className="w-3 h-3" /> ເພີ່ມເງື່ອນໄຂ
                                              </button>
                                            </div>
                                          </div>

                                          {/* ── 2. ໜ້າທີ່ຮັບຜິດຊອບ (Responsibilities) ── */}
                                          <div className="pl-7 pr-2 pt-2 border-t border-slate-200/60">
                                            <div className="text-[11px] font-bold text-slate-600 mb-1.5 flex items-center gap-1">
                                              <span>📋</span> ໜ້າທີ່ຮັບຜິດຊອບ (Responsibilities):
                                            </div>
                                            <div className="space-y-1.5">
                                              {secResps.map((resp, ri) => (
                                                <div
                                                  key={ri}
                                                  className={`flex gap-1.5 items-center transition-all ${draggedSecResp?.p === i && draggedSecResp?.s === si && draggedSecResp?.r === ri ? 'opacity-50' : 'opacity-100'}`}
                                                  draggable
                                                  onDragStart={() => setDraggedSecResp({ p: i, s: si, r: ri })}
                                                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                                                  onDrop={(e) => {
                                                    e.preventDefault();
                                                    if (draggedSecResp && draggedSecResp.p === i && draggedSecResp.s === si && draggedSecResp.r !== ri) {
                                                      setJobConfig(p => {
                                                        const currentSec = p.positions[i]?.sections?.[si];
                                                        const newResps = [...(typeof currentSec === 'object' && Array.isArray(currentSec.responsibilities) ? currentSec.responsibilities : [])];
                                                        const [moved] = newResps.splice(draggedSecResp.r, 1);
                                                        newResps.splice(ri, 0, moved);
                                                        return {
                                                          ...p,
                                                          positions: p.positions.map((pp, j) => j === i ? {
                                                            ...pp,
                                                            sections: (Array.isArray(pp.sections) ? pp.sections : []).map((ss, k) => k === si ? {
                                                              ...(typeof ss === 'object' ? ss : { name: String(ss), slots: '', requirements: [], responsibilities: [] }),
                                                              responsibilities: newResps
                                                            } : ss)
                                                          } : pp)
                                                        };
                                                      });
                                                    }
                                                    setDraggedSecResp(null);
                                                  }}
                                                  onDragEnd={() => setDraggedSecResp(null)}
                                                >
                                                  <div className="cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing p-1 shrink-0" title="ລາກເພື່ອຈັດລຽງ">
                                                    <GripVertical className="w-3.5 h-3.5" />
                                                  </div>
                                                  <input
                                                    type="text"
                                                    placeholder="ໜ້າທີ່ຮັບຜິດຊອບ..."
                                                    className="flex-1 bg-white border border-corporate-border rounded-lg px-2 py-1.5 text-xs text-corporate-ltc outline-none focus:border-corporate-primary"
                                                    value={resp || ''}
                                                    onChange={e => {
                                                      const val = e.target.value;
                                                      setJobConfig(p => ({
                                                        ...p,
                                                        positions: p.positions.map((pp, j) => j === i ? {
                                                          ...pp,
                                                          sections: (Array.isArray(pp.sections) ? pp.sections : []).map((s, k) => k === si ? {
                                                            ...(typeof s === 'object' ? s : { name: String(s), slots: '', requirements: [], responsibilities: [] }),
                                                            responsibilities: (Array.isArray((s as any)?.responsibilities) ? (s as any).responsibilities : []).map((r: string, rk: number) => rk === ri ? val : r)
                                                           } : s)
                                                         } : pp)
                                                       }));
                                                     }}
                                                   />
                                                   {/* ປຸ່ມກ໋ອບປີ້ ໜ້າທີ່ຮັບຜິດຊອບ */}
                                                   <button
                                                     type="button"
                                                     onClick={() => setJobConfig(p => ({
                                                       ...p,
                                                       positions: p.positions.map((pp, j) => j === i ? {
                                                         ...pp,
                                                         sections: (Array.isArray(pp.sections) ? pp.sections : []).map((s, k) => k === si ? {
                                                           ...(typeof s === 'object' ? s : { name: String(s), slots: '', requirements: [], responsibilities: [] }),
                                                           responsibilities: [
                                                             ...(Array.isArray((s as any)?.responsibilities) ? (s as any).responsibilities : []).slice(0, ri + 1),
                                                             resp,
                                                             ...(Array.isArray((s as any)?.responsibilities) ? (s as any).responsibilities : []).slice(ri + 1)
                                                           ]
                                                         } : s)
                                                       } : pp)
                                                     }))}
                                                     className="text-blue-500 hover:text-blue-600 p-1 hover:bg-blue-50 rounded transition-colors"
                                                     title="ກ໋ອບປີ້/ຄັດລອກ ໜ້າທີ່ຮັບຜິດຊອບນີ້"
                                                   >
                                                     <Copy className="w-3.5 h-3.5" />
                                                   </button>

                                                   {/* ປຸ່ມລຶບ ໜ້າທີ່ຮັບຜິດຊອບ */}
                                                   <button
                                                     type="button"
                                                     onClick={() => setJobConfig(p => ({
                                                       ...p,
                                                       positions: p.positions.map((pp, j) => j === i ? {
                                                         ...pp,
                                                         sections: (Array.isArray(pp.sections) ? pp.sections : []).map((s, k) => k === si ? {
                                                           ...(typeof s === 'object' ? s : { name: String(s), slots: '', requirements: [], responsibilities: [] }),
                                                           responsibilities: (Array.isArray((s as any)?.responsibilities) ? (s as any).responsibilities : []).filter((_: any, rk: number) => rk !== ri)
                                                         } : s)
                                                       } : pp)
                                                     }))}
                                                     className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded transition-colors"
                                                     title="ລຶບ"
                                                   >
                                                     <MinusCircle className="w-3.5 h-3.5" />
                                                   </button>
                                                 </div>
                                               ))}

                                               <button
                                                 type="button"
                                                 onClick={() => setJobConfig(p => ({
                                                   ...p,
                                                   positions: p.positions.map((pp, j) => j === i ? {
                                                     ...pp,
                                                     sections: (Array.isArray(pp.sections) ? pp.sections : []).map((s, k) => k === si ? {
                                                       ...(typeof s === 'object' ? s : { name: String(s), slots: '', requirements: [], responsibilities: [] }),
                                                       responsibilities: [...(Array.isArray((s as any)?.responsibilities) ? (s as any).responsibilities : []), '']
                                                     } : s)
                                                   } : pp)
                                                 }))}
                                                 className="text-[11px] font-bold text-corporate-primary hover:text-corporate-primary/80 flex items-center gap-1 mt-1 cursor-pointer"
                                               >
                                                 <PlusCircle className="w-3 h-3" /> ເພີ່ມໜ້າທີ່ຮັບຜິດຊອບ
                                               </button>
                                             </div>
                                           </div>
                                         </div>
                                       );
                                     })}
                                   </div>
                                 </div>
                               </div>
                             </div>
                           )}
                         </div>
                       );
                     })}
                   </div>
                 ))}
               </div>
              </div>
            </div>
          </div>
        )}

      {/* ══════════════════ DETAIL MODAL ══════════════════ */}
      {isModalOpen && selectedApp && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-corporate-border bg-white sm:max-h-[90vh] sm:rounded-2xl max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-corporate-border bg-white p-4 sm:p-6">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-bold text-corporate-ltc sm:text-xl">{selectedApp.name}</h2>
                <div className="mt-0.5 text-xs text-corporate-muted">
                  {selectedApp.position} ·{' '}
                  {selectedApp.submittedAt
                    ? formatDateDDMMYYYY(selectedApp.submittedAt)
                    : ''}
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-corporate-ltc p-2 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
              {/* PDF download */}
              {selectedApp.pdfUrl && (
                <div>
                  <div className="text-xs text-corporate-muted uppercase font-bold mb-2">ຟາຍ PDF ຟອມ</div>
                  <a
                    href={getPdfDownloadUrl(selectedApp.pdfUrl)}
                    download={`Application_${selectedApp.name || selectedApp.id}.pdf`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-xl text-sm font-bold transition-all border border-blue-500/20"
                  >
                    <Download className="w-4 h-4" /> ດາວໂຫລດ PDF ລົງເຄື່ອງ
                  </a>
                </div>
              )}

              {/* Attachments */}
              {selectedApp.attachments && selectedApp.attachments.length > 0 && (
                <div>
                  <div className="text-xs text-corporate-muted uppercase font-bold mb-3">ຟາຍແນບ ({selectedApp.attachments.length} ໄຟລ໌)</div>
                  <div className="space-y-2">
                    {selectedApp.attachments.map((att, i) => (
                      <a key={i} href={`${API}${att.url}?token=${authToken}`} target="_blank" rel="noreferrer"
                        className="flex items-center gap-3 p-3 bg-slate-50 border border-corporate-border rounded-xl hover:border-corporate-primary/50 transition-all group">
                        <Paperclip className="w-4 h-4 text-purple-400 flex-shrink-0" />
                        <span className="text-sm text-slate-600 group-hover:text-corporate-ltc flex-1 truncate">{att.name}</span>
                        <Download className="w-4 h-4 text-slate-500 group-hover:text-corporate-ltc flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* HR Internal Notes & Star Rating Box */}
              <div className="bg-slate-50 border border-amber-200/60 p-4 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-corporate-ltc flex items-center gap-1.5 uppercase tracking-wider">
                    <span>📝 ຄວາມຄິດເຫັນ HR & ຜົນການສຳພາດ</span>
                    <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold">ລັດຖະກອນພາຍໃນ</span>
                  </label>
                  {/* 5-Star Rating */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-slate-500 mr-1">ຄະແນນ:</span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setEditingRating(star)}
                        className={`text-lg transition-transform hover:scale-125 cursor-pointer ${star <= editingRating ? 'text-amber-400 font-bold' : 'text-slate-300'}`}
                      >
                        ★
                      </button>
                    ))}
                    {editingRating > 0 && (
                      <span className="text-xs font-bold text-amber-600 ml-1">({editingRating}/5)</span>
                    )}
                  </div>
                </div>
                <textarea
                  rows={3}
                  placeholder="ຂຽນຄວາມຄິດເຫັນຂອງ HR ຫຼື ຜົນການສຳພາດ... (ເຊັ່ນ: ສຳພາດແລ້ວ ທັດສະນະຄະຕິດີ, ພ້ອມເລີ່ມວຽກ 01/09)"
                  className="w-full bg-white border border-corporate-border rounded-xl p-3 text-xs text-corporate-ltc outline-none focus:border-corporate-primary resize-none placeholder:text-slate-400 font-lao"
                  value={editingHrNote}
                  onChange={e => setEditingHrNote(e.target.value)}
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveHrNote}
                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Save className="w-3.5 h-3.5" /> ບັນທຶກໂນ້ດ HR
                  </button>
                </div>
              </div>

              {/* Form data section */}
              {selectedApp.formData && (
                <div className="mt-6 border-t border-corporate-border pt-6 -mx-4 px-4 sm:-mx-6 sm:px-6">
                  <ApplicationFormPage
                    isAdminEdit={true}
                    initialData={selectedApp.formData}
                    onAdminSave={handleSaveFormData}
                  />
                </div>
              )}

              {/* Danger zone */}
              <div className="border-t border-corporate-border pt-4 flex gap-2">
                {tab === 'trash' ? (
                  <>
                    <button onClick={() => handleRestore(selectedApp.id)} className="flex items-center gap-2 px-4 py-2.5 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-xl text-sm font-bold transition-all border border-green-500/20">
                      <RefreshCw className="w-4 h-4" /> ກູ້ຄືນ
                    </button>
                    <button onClick={() => handleForceDelete(selectedApp.id)} className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl text-sm font-bold transition-all border border-red-500/20">
                      <Trash2 className="w-4 h-4" /> ລຶບຖາວອນ
                    </button>
                  </>
                ) : (
                  <button onClick={() => handleDelete(selectedApp.id)} className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl text-sm font-bold transition-all border border-red-500/20">
                    <Trash2 className="w-4 h-4" /> ລຶບລາຍການນີ້
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ EMAIL COMPOSE MODAL ══════════════════ */}
      {emailModal.open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[95dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-corporate-border bg-white sm:rounded-2xl">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-corporate-border bg-white p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-corporate-primary" />
                <span className="font-bold text-corporate-ltc">ສົ່ງອີເມລແຈ້ງເຕືອນ + ປ່ຽນສະຖານະ</span>
              </div>
              <button onClick={() => setEmailModal(p => ({ ...p, open: false }))} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Status Selector */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase mb-1">ເລືອກສະຖານະໃໝ່:</span>
                <div className="flex flex-wrap gap-2">
                  {(['PENDING', 'APPROVED', 'REJECTED'] as const).map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => openEmailModal(selectedApp!, status)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${emailModal.pendingStatus === status
                        ? STATUS_COLORS[status] + ' shadow-sm ring-2 ring-offset-1 ' + (
                          status === 'APPROVED' ? 'ring-green-400' :
                            status === 'REJECTED' ? 'ring-red-400' : 'ring-yellow-400'
                        )
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      {status === 'PENDING' ? 'ລໍຖ້າ (PENDING)' :
                        status === 'APPROVED' ? 'ຜ່ານ (APPROVED)' :
                          'ບໍ່ຜ່ານ (REJECTED)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">ຫົວຂໍ້ອີເມລ (Subject)</label>
                <input
                  type="text"
                  value={emailModal.subject}
                  onChange={e => setEmailModal(p => ({ ...p, subject: e.target.value }))}
                  className="w-full bg-slate-50 border border-corporate-border rounded-xl px-3 py-2.5 text-sm text-corporate-ltc outline-none focus:border-corporate-primary"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">ເນື້ອຫາ (Body) — ສາມາດແກ້ໄຂໄດ້</label>
                <textarea
                  rows={8}
                  value={emailModal.body}
                  onChange={e => setEmailModal(p => ({ ...p, body: e.target.value }))}
                  className="w-full bg-slate-50 border border-corporate-border rounded-xl px-3 py-2.5 text-sm text-corporate-ltc outline-none focus:border-corporate-primary font-mono leading-relaxed"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-4 border-t border-corporate-border">
              <button
                type="button"
                onClick={() => setEmailModal(p => ({ ...p, open: false }))}
                className="flex-1 py-2.5 rounded-xl border border-corporate-border text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
              >
                ຍົກເລີກ
              </button>

              <button
                type="button"
                onClick={handleStatusAndEmail}
                disabled={emailModal.sending}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-corporate-primary hover:bg-corporate-primary/80 text-white font-bold text-sm transition-all disabled:opacity-60"
              >
                {emailModal.sending ? 'ກຳລັງສົ່ງ...' : 'ປ່ຽນສະຖານະ + ສົ່ງອີເມລ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ CV QUICK PREVIEW MODAL ══════════════════ */}
      {previewModal.open && previewModal.app && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-2 sm:p-6 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 p-4">
              <div>
                <h3 className="font-extrabold text-corporate-ltc text-lg flex items-center gap-2">
                  <span>👁️ {previewModal.app.name}</span>
                  <span className="text-xs bg-slate-200 px-2 py-0.5 rounded font-mono text-slate-700">{previewModal.app.position}</span>
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">Ref: {previewModal.app.refCode || previewModal.app.id} | Email: {previewModal.app.email || '—'}</p>
              </div>

              {/* Tab/Doc selector buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {previewModal.app.pdfUrl && (
                  <button
                    onClick={() => setPreviewModal(prev => ({
                      ...prev,
                      activeUrl: getPdfUrlWithAuth(previewModal.app!.pdfUrl),
                      activeTitle: 'ໃບສະໝັກວຽກ (PDF)'
                    }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${previewModal.activeTitle.includes('ໃບສະໝັກວຽກ')
                      ? 'bg-corporate-primary text-white shadow-md'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                  >
                    📄 ໃບສະໝັກວຽກ PDF
                  </button>
                )}

                {(previewModal.app.attachments || []).map((att, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPreviewModal(prev => ({
                      ...prev,
                      activeUrl: `${API}${att.url}?token=${authToken}`,
                      activeTitle: att.name || `ເອກະສານ ${idx + 1}`
                    }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${previewModal.activeTitle === att.name
                      ? 'bg-corporate-primary text-white shadow-md'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                  >
                    📎 {att.name || `ເອກະສານ ${idx + 1}`}
                  </button>
                ))}

                <a
                  href={previewModal.activeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> ດາວໂຫຼດ
                </a>

                <button
                  onClick={() => setPreviewModal(prev => ({ ...prev, open: false }))}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Frame content */}
            <div className="flex-1 bg-slate-100 p-2 overflow-hidden relative">
              {previewModal.activeUrl ? (
                <iframe
                  src={previewModal.activeUrl}
                  className="w-full h-full rounded-2xl border border-slate-300 shadow-inner bg-white"
                  title={previewModal.activeTitle}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400 font-bold">
                  ບໍ່ມີເອກະສານທີ່ຈະສະແດງ
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ INTERVIEW SCHEDULING MODAL ══════════════════ */}
      {interviewModal.open && interviewModal.app && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100">
            {/* Header (LTC Red Theme) */}
            <div className="flex items-center justify-between border-b border-red-700/20 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 p-5 text-white shadow-md">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md text-white shadow-inner border border-white/20">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight tracking-tight">ນັດໝາຍສຳພາດຜູ້ສະໝັກ</h3>
                  <p className="text-xs text-rose-100/90 font-medium mt-0.5">{interviewModal.app.name} • {interviewModal.app.position}</p>
                </div>
              </div>
              <button
                onClick={() => setInterviewModal(prev => ({ ...prev, open: false }))}
                className="p-2 rounded-2xl text-white/80 hover:text-white hover:bg-white/20 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Form */}
            <div className="p-6 space-y-4 font-lao max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1">
                    <span>📅 ວັນທີນັດໝາຍ</span>
                    <span className="text-[10px] text-red-500 font-mono font-normal">(DD/MM/YYYY)</span>
                  </label>
                  <LaoDatePicker
                    value={interviewModal.date}
                    onChange={val => setInterviewModal(prev => ({ ...prev, date: val }))}
                    placeholder="dd/mm/yyyy"
                  />
                </div>

                {/* Time */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">⏰ ເວລາ (Time)</label>
                  <input
                    type="text"
                    value={interviewModal.time}
                    placeholder="09:00 AM"
                    onChange={e => setInterviewModal(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl p-3 text-sm font-bold text-slate-800 outline-none focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Interview Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">🎯 ຮູບແບບການສຳພາດ (Format)</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setInterviewModal(prev => ({ ...prev, type: 'IN_PERSON' }))}
                    className={`py-3 px-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${interviewModal.type === 'IN_PERSON'
                      ? 'bg-gradient-to-r from-red-50 to-rose-50 border-red-500 text-red-700 shadow-sm ring-1 ring-red-500/30'
                      : 'bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                  >
                    🏢 ເຂົ້າສຳພາດຢູ່ສຳນັກງານ
                  </button>

                  <button
                    type="button"
                    onClick={() => setInterviewModal(prev => ({ ...prev, type: 'ONLINE' }))}
                    className={`py-3 px-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${interviewModal.type === 'ONLINE'
                      ? 'bg-gradient-to-r from-red-50 to-rose-50 border-red-500 text-red-700 shadow-sm ring-1 ring-red-500/30'
                      : 'bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                  >
                    💻 ສຳພາດອອນລາຍ (Teams/Zoom)
                  </button>
                </div>
              </div>

              {/* Location / Meeting Link */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">📍 ສະຖານທີ່ ຫຼື LINK ປະຊຸມ</label>
                <input
                  type="text"
                  value={interviewModal.location}
                  onChange={e => setInterviewModal(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl p-3 text-sm text-slate-800 font-medium outline-none focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10 transition-all"
                />
              </div>

              {/* Notes / Details */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">📝 ໝາຍເຫດ / ສິ່ງທີ່ຕ້ອງກຽມມາ</label>
                <textarea
                  rows={3}
                  value={interviewModal.notes}
                  placeholder="ກະລຸນາກຽມເອກະສານຕົວຈິງ ແລະ ບັດປະຈຳຕົວມາພ້ອມ..."
                  onChange={e => setInterviewModal(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl p-3 text-sm text-slate-800 font-medium outline-none focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10 transition-all resize-none"
                />
              </div>

              <div className="p-3.5 bg-rose-50/70 border border-rose-200/60 rounded-2xl text-xs text-rose-900 leading-relaxed font-medium flex gap-2.5 items-start">
                <span className="text-base leading-none">💡</span>
                <span>ລະບົບຈະບັນທຶກວັນທີນັດໝາຍ, ປ່ຽນສະຖານະເປັນ INTERVIEW, ແລະ ສົ່ງ Email ແຈ້ງເຕືອນລາຍລະອຽດການສຳພາດໃຫ້ຜູ້ສະໝັກໂດຍອັດຕະໂນມັດ.</span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-4 border-t border-slate-100 bg-slate-50/80">
              <button
                type="button"
                onClick={() => setInterviewModal(prev => ({ ...prev, open: false }))}
                className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-100 transition-all active:scale-[0.98]"
              >
                ຍົກເລີກ
              </button>

              <button
                type="button"
                onClick={handleScheduleInterview}
                disabled={interviewModal.scheduling}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-sm shadow-xl shadow-red-500/25 transition-all disabled:opacity-60 active:scale-[0.98]"
              >
                {interviewModal.scheduling ? 'ກຳລັງບັນທຶກ...' : '📅 ຢືນຢັນນັດສຳພາດ & ສົ່ງ Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ HANDSOME CONFIRMATION MODAL ══════════════════ */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 font-lao animate-in zoom-in-95 duration-150">
            <div className="p-6 text-center">
              {/* Glowing Icon Badge */}
              <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border shadow-inner ${confirmModal.variant === 'danger'
                ? 'bg-red-50 text-red-600 border-red-100/80 ring-4 ring-red-500/10'
                : 'bg-emerald-50 text-emerald-600 border-emerald-100/80 ring-4 ring-emerald-500/10'
                }`}>
                {confirmModal.variant === 'danger' ? (
                  <AlertTriangle className="w-8 h-8 text-red-600 animate-pulse" />
                ) : (
                  <RefreshCw className="w-8 h-8 text-emerald-600" />
                )}
              </div>

              {/* Title */}
              <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                {confirmModal.title}
              </h3>

              {/* Description */}
              <p className="mt-2 text-xs text-slate-500 leading-relaxed font-medium">
                {confirmModal.description}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 p-4 border-t border-slate-100 bg-slate-50/80">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}
                className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-all active:scale-[0.98]"
              >
                {confirmModal.cancelText}
              </button>

              <button
                type="button"
                onClick={() => {
                  const action = confirmModal.onConfirm;
                  setConfirmModal(prev => ({ ...prev, open: false }));
                  if (action) action();
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-xs shadow-xl transition-all active:scale-[0.98] ${confirmModal.variant === 'danger'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-red-500/25'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-500/25'
                  }`}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sleek Floating Save Dock for Job Config (Only Save Button) */}
      {tab === 'jobconfig' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-slate-900/90 text-white backdrop-blur-xl border border-slate-700/60 shadow-2xl px-5 py-2.5 rounded-full animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            {autoSaveStatus === 'saving' ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <span className="text-amber-300">ກຳລັງບັນທຶກອັດຕະໂນມັດ...</span>
              </>
            ) : autoSaveStatus === 'saved' ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-400">ບັນທຶກອັດຕະໂນມັດແລ້ວ</span>
              </>
            ) : autoSaveStatus === 'unsaved' ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                <span className="text-blue-300">ມີການປ່ຽນແປງ (ລໍຖ້າບັນທຶກ...)</span>
              </>
            ) : autoSaveStatus === 'error' ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="text-red-400 font-bold">ບັນທຶກອັດຕະໂນມັດຜິດພາດ!</span>
              </>
            ) : (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500"></span>
                </span>
                <span>ໜ້າຕັ້ງຄ່າຂໍ້ມູນ</span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={handleSaveJobConfig}
            disabled={jobSaving}
            className="flex items-center gap-2 px-5 py-1.5 bg-[#ef3838] hover:bg-[#dc2626] text-white rounded-full font-bold text-xs shadow-md shadow-red-950/40 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
          >
            <Save className="w-4 h-4 stroke-[2.2]" />
            <span>{jobSaving ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກຂໍ້ມູນຕັ້ງຄ່າ'}</span>
          </button>
        </div>
      )}

      {/* Modern Professional Floating Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border text-sm font-medium transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${t.type === 'success'
              ? 'bg-slate-900/90 border-emerald-500/40 text-emerald-300 shadow-emerald-950/20'
              : t.type === 'error'
                ? 'bg-slate-900/90 border-red-500/40 text-red-300 shadow-red-950/20'
                : 'bg-slate-900/90 border-blue-500/40 text-blue-300 shadow-blue-950/20'
              }`}
          >
            {t.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />}
            {t.type === 'error' && <X className="w-5 h-5 text-red-400 shrink-0" />}
            {t.type === 'info' && <Clock className="w-5 h-5 text-blue-400 shrink-0" />}
            <span>{t.message}</span>
            <button
              type="button"
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              className="ml-2 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
