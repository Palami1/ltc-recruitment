import { useState, useEffect, useMemo } from 'react';
import {
  Settings, FileText, Trash2, ShieldCheck, RefreshCw,
  CheckCircle, Clock, Users, X, Download, Paperclip,
  Save, PlusCircle, MinusCircle, Search, ChevronDown, ChevronUp
} from 'lucide-react';

import { sanitizePositions, type JobPosition } from '../lib/jobPositions';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';


type Attachment = { name: string; url: string };
type Submission = {
  id: string;
  submittedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  name: string;
  position: string;
  phone: string;
  pdfUrl?: string;
  attachments?: Attachment[];
  formData?: Record<string, any>;
};
type JobConfig = { positions: JobPosition[]; requiredDocs: string[] };

const STATUS_COLORS: Record<string, string> = {
  APPROVED: 'bg-green-500/10 text-green-400 border-green-500/20',
  REJECTED: 'bg-red-500/10 text-red-400 border-red-500/20',
  PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="card-panel flex items-center gap-4 p-5">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      <div>
        <div className="text-xs text-corporate-muted uppercase tracking-widest font-bold">{label}</div>
        <div className="text-3xl font-black text-corporate-ltc mt-0.5">{value}</div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [authToken, setAuthToken] = useState(sessionStorage.getItem('adminToken') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');

  const [tab, setTab] = useState<'applications' | 'jobconfig'>('applications');
  const [applications, setApplications] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedApp, setSelectedApp] = useState<Submission | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [jobConfig, setJobConfig] = useState<JobConfig>({ positions: [], requiredDocs: [] });
  const [jobSaving, setJobSaving] = useState(false);
  const [newDoc, setNewDoc] = useState('');
  const [expandedPos, setExpandedPos] = useState<number | null>(null);

  // ── Fetch applications ──────────────────────────────
  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/applications`, {
        headers: { 'x-admin-token': authToken }
      });
      const json = await res.json();
      setApplications(json.data || []);
    } catch (e: any) {
      alert(`ດຶງຂໍ້ມູນບໍ່ສຳເລັດ: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch job config ────────────────────────────────
  const fetchJobConfig = async () => {
    try {
      const res = await fetch(`${API}/api/job-config`);
      setJobConfig(await res.json());
    } catch {}
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchApplications();
      fetchJobConfig();
    }
  }, [isAuthenticated]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      const res = await fetch(`${API}/api/applications`, {
        headers: { 'x-admin-token': loginPassword || authToken }
      });
      if (res.ok) {
        const validToken = loginPassword || authToken;
        sessionStorage.setItem('adminToken', validToken);
        setAuthToken(validToken);
        setIsAuthenticated(true);
      } else {
        if (e) alert('ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ!');
        else sessionStorage.removeItem('adminToken');
      }
    } catch {
      if (e) alert('ຂໍ້ຜິດພາດໃນການເຊື່ອມຕໍ່!');
    }
  };

  useEffect(() => {
    if (authToken && !isAuthenticated) {
      handleLogin();
    }
  }, []);

  // ── Delete ──────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!window.confirm('ທ່ານຕ້ອງການລຶບລາຍການນີ້ແທ້ບໍ?')) return;
    await fetch(`${API}/api/applications/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-token': authToken }
    });
    setApplications(prev => prev.filter(a => a.id !== id));
    if (selectedApp?.id === id) { setIsModalOpen(false); setSelectedApp(null); }
  };

  // ── Status update ───────────────────────────────────
  const handleStatus = async (id: string, status: string) => {
    await fetch(`${API}/api/applications/${id}/status`, {
      method: 'PATCH',
      headers: { 
        'x-admin-token': authToken,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ status }),
    });
    setApplications(prev => prev.map(a => a.id === id ? { ...a, status: status as 'PENDING' | 'APPROVED' | 'REJECTED' } : a));
    if (selectedApp?.id === id) setSelectedApp(prev => prev ? { ...prev, status: status as 'PENDING' | 'APPROVED' | 'REJECTED' } : prev);
  };

  // ── Job config save ─────────────────────────────────
  const handleSaveJobConfig = async () => {
    setJobSaving(true);
    const payload = {
      ...jobConfig,
      positions: sanitizePositions(jobConfig.positions),
    };
    try {
      await fetch(`${API}/api/job-config`, {
        method: 'PUT',
        headers: { 
          'x-admin-token': authToken,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(payload),
      });
      setJobConfig(payload);
      alert('ບັນທຶກການຕັ້ງຄ່າສຳເລັດ!');
    } catch {
      alert('ບໍ່ສາມາດບັນທຶກໄດ້');
    } finally {
      setJobSaving(false);
    }
  };

  // ── Filtering ───────────────────────────────────────
  const filtered = useMemo(() => applications.filter(a => {
    const nameMatch = a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.position.toLowerCase().includes(search.toLowerCase());
    const dateMatch = !dateFilter || (a.submittedAt || '').startsWith(dateFilter);
    return nameMatch && dateMatch;
  }), [applications, search, dateFilter]);

  const pending = applications.filter(a => a.status === 'PENDING').length;
  const approved = applications.filter(a => a.status === 'APPROVED').length;

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-corporate-bg p-4 font-lao">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm rounded-2xl border border-corporate-border bg-white p-6 sm:p-8"
        >
          <h2 className="mb-6 text-center text-xl font-bold text-corporate-ltc">Admin Login</h2>
          <input
            type="password"
            placeholder="ໃສ່ລະຫັດລັບ..."
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            className="mb-4 min-h-[48px] w-full rounded-xl border border-corporate-border bg-slate-50 p-3 text-base text-corporate-ltc outline-none focus:border-corporate-primary"
          />
          <button type="submit" className="btn-primary w-full hover:bg-corporate-primary/80">
            ເຂົ້າສູ່ລະບົບ
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="page-container flex min-h-[100dvh] w-full max-w-7xl flex-1 flex-col font-lao">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-center md:justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold text-corporate-ltc sm:gap-3 sm:text-2xl md:text-3xl">
          <ShieldCheck className="shrink-0 text-corporate-primary" />
          <span className="leading-tight">Admin Control Center</span>
        </h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('applications')}
            className={`min-h-[44px] flex-1 rounded-xl px-3 py-2 text-sm font-bold transition-all sm:flex-none sm:px-4 ${
              tab === 'applications'
                ? 'bg-corporate-primary text-white'
                : 'border border-corporate-border bg-white text-corporate-muted hover:text-corporate-ltc'
            }`}
          >
            <FileText className="mr-1 inline h-4 w-4" /> ລາຍການ
          </button>
          <button
            type="button"
            onClick={() => setTab('jobconfig')}
            className={`min-h-[44px] flex-1 rounded-xl px-3 py-2 text-sm font-bold transition-all sm:flex-none sm:px-4 ${
              tab === 'jobconfig'
                ? 'bg-corporate-primary text-white'
                : 'border border-corporate-border bg-white text-corporate-muted hover:text-corporate-ltc'
            }`}
          >
            <Settings className="mr-1 inline h-4 w-4" /> ຕັ້ງຄ່າ
          </button>
        </div>
      </div>

      {/* ══════════════════ APPLICATIONS TAB ══════════════════ */}
      {tab === 'applications' && (
        <>
          {/* StatCards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard icon={<Users className="w-6 h-6" />} label="ທັງໝົດ" value={applications.length} color="bg-blue-500/10 text-blue-400" />
            <StatCard icon={<Clock className="w-6 h-6" />} label="ລໍຖ້າ" value={pending} color="bg-yellow-500/10 text-yellow-400" />
            <StatCard icon={<CheckCircle className="w-6 h-6" />} label="ຜ່ານການອະນຸມັດ" value={approved} color="bg-green-500/10 text-green-400" />
          </div>

          {/* Search */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="ຄົ້ນຫາຊື່ ຫຼື ຕຳແໜ່ງ..."
                className="w-full bg-white border border-corporate-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-corporate-ltc outline-none focus:border-corporate-primary placeholder:text-slate-500"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <input
              type="date"
              className="bg-white border border-corporate-border rounded-xl px-4 py-2.5 text-sm text-corporate-ltc outline-none focus:border-corporate-primary"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
            />
            <button onClick={fetchApplications} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-corporate-border rounded-xl text-corporate-muted hover:text-corporate-ltc text-sm font-bold transition-all">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> ໂຫລດໃໝ່
            </button>
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden md:block bg-white border border-corporate-border rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-corporate-muted text-xs uppercase tracking-wider">
                  <th className="p-4">ຊື່ຜູ້ສະໝັກ</th>
                  <th className="p-4">ຕຳແໜ່ງ</th>
                  <th className="p-4">ເບີໂທ</th>
                  <th className="p-4">ສະຖານະ</th>
                  <th className="p-4">ວັນທີ</th>
                  <th className="p-4 text-right">ການດຳເນີນການ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-corporate-border">
                {loading && (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-500">ກຳລັງໂຫລດ...</td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-500">ຍັງບໍ່ມີຂໍ້ມູນ</td></tr>
                )}
                {filtered.map(app => (
                  <tr key={app.id} className="hover:bg-slate-50 transition-colors text-slate-600">
                    <td className="p-4 font-semibold text-corporate-ltc">{app.name || '—'}</td>
                    <td className="p-4">
                      <span className="bg-slate-100 px-2 py-1 rounded text-xs text-corporate-accent uppercase font-mono">{app.position || '—'}</span>
                    </td>
                    <td className="p-4 text-sm">{app.phone || '—'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded border text-xs font-bold ${STATUS_COLORS[app.status] || STATUS_COLORS.PENDING}`}>{app.status}</span>
                    </td>
                    <td className="p-4 text-sm text-corporate-muted">{app.submittedAt ? new Date(app.submittedAt).toLocaleDateString('lo-LA') : '—'}</td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => { setSelectedApp(app); setIsModalOpen(true); }} className="text-blue-400 hover:text-blue-300 p-2 hover:bg-blue-500/10 rounded transition-colors" title="ເບິ່ງລາຍລະອຽດ">
                          <FileText className="w-4 h-4" />
                        </button>
                        {app.pdfUrl && (
                          <a href={`${API}${app.pdfUrl}?token=${authToken}`} target="_blank" rel="noreferrer" className="text-green-400 hover:text-green-300 p-2 hover:bg-green-500/10 rounded transition-colors" title="ດາວໂຫລດ PDF">
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                        <button onClick={() => handleDelete(app.id)} className="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/10 rounded transition-colors" title="ລຶບ">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS */}
          <div className="md:hidden space-y-3">
            {loading && <div className="text-center text-slate-500 py-8">ກຳລັງໂຫລດ...</div>}
            {!loading && filtered.length === 0 && <div className="text-center text-slate-500 py-8">ຍັງບໍ່ມີຂໍ້ມູນ</div>}
            {filtered.map(app => (
              <div key={app.id} className="bg-white border border-corporate-border rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-corporate-ltc">{app.name || '—'}</div>
                    <div className="text-xs text-corporate-accent font-mono uppercase mt-1">{app.position || '—'}</div>
                  </div>
                  <span className={`px-2 py-1 rounded border text-xs font-bold ${STATUS_COLORS[app.status] || STATUS_COLORS.PENDING}`}>{app.status}</span>
                </div>
                <div className="text-xs text-corporate-muted">{app.submittedAt ? new Date(app.submittedAt).toLocaleDateString('lo-LA') : '—'}</div>
                <div className="flex gap-2 pt-2 border-t border-corporate-border">
                  <button onClick={() => { setSelectedApp(app); setIsModalOpen(true); }} className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-500/10 text-blue-400 rounded-xl text-sm font-bold">
                    <FileText className="w-4 h-4" /> ລາຍລະອຽດ
                  </button>
                  {app.pdfUrl && (
                    <a href={`${API}${app.pdfUrl}?token=${authToken}`} target="_blank" rel="noreferrer" className="p-2 bg-green-500/10 text-green-400 rounded-xl">
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                  <button onClick={() => handleDelete(app.id)} className="p-2 bg-red-500/10 text-red-400 rounded-xl">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ══════════════════ JOB CONFIG TAB ══════════════════ */}
      {tab === 'jobconfig' && (
        <div className="w-full max-w-3xl space-y-6">
          <div className="card-panel space-y-5">
            <h2 className="text-lg font-bold text-corporate-ltc flex items-center gap-2"><Settings className="w-5 h-5 text-corporate-primary" /> ຕັ້ງຄ່າການຮັບສະໝັກ</h2>

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
                    onKeyDown={e => { if (e.key === 'Enter' && newDoc.trim()) { setJobConfig(p => ({ ...p, requiredDocs: [...p.requiredDocs, newDoc.trim()] })); setNewDoc(''); }}}
                  />
                  <button onClick={() => { if (newDoc.trim()) { setJobConfig(p => ({ ...p, requiredDocs: [...p.requiredDocs, newDoc.trim()] })); setNewDoc(''); }}} className="px-3 py-2 bg-corporate-primary/10 text-corporate-primary hover:bg-corporate-primary/20 rounded-xl transition-colors">
                    <PlusCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Positions */}
            <div>
              <label className="text-xs text-corporate-muted uppercase font-bold mb-2 block">ຕຳແໜ່ງທີ່ເປີດຮັບ</label>
              <div className="space-y-3">
                {jobConfig.positions.map((pos, i) => {
                  const isExpanded = expandedPos === i;
                  return (
                  <div key={i} className={`bg-slate-50 border border-corporate-border rounded-xl transition-all ${isExpanded ? 'p-4' : 'p-3'}`}>
                    <div className="flex justify-between items-center cursor-pointer select-none" onClick={() => setExpandedPos(isExpanded ? null : i)}>
                      <div className="flex items-center gap-3">
                        <span className="bg-white border border-corporate-border text-corporate-accent px-2 py-0.5 rounded text-xs font-mono font-bold uppercase">{pos.code || 'ລະຫັດ'}</span>
                        <span className="text-corporate-ltc font-bold text-sm">{pos.department || 'ຍັງບໍ່ມີຊື່ຕຳແໜ່ງ'}</span>
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
                          <input type="number" placeholder="ຈຳນວນ" min={1} className="w-full sm:w-24 bg-white border border-corporate-border rounded-lg px-3 py-2 text-xs text-corporate-ltc outline-none focus:border-corporate-primary"
                            value={pos.slots}
                            onChange={e => { const val = Number(e.target.value); setJobConfig(p => ({ ...p, positions: p.positions.map((pp, j) => j === i ? { ...pp, slots: val } : pp) })) }}
                          />
                        </div>

                        <div className="flex flex-col mb-1.5">
                          <label className="text-xs text-slate-500 mb-1">ວັນໝົດອາຍຸການສະໝັກ</label>
                          <input type="date" className="bg-white border border-corporate-border rounded-lg px-3 py-2 text-xs text-corporate-ltc outline-none focus:border-corporate-primary w-fit"
                            value={pos.deadline || ''}
                            onChange={e => { const val = e.target.value; setJobConfig(p => ({ ...p, positions: p.positions.map((pp, j) => j === i ? { ...pp, deadline: val } : pp) })) }}
                          />
                        </div>

                        {/* Requirements list per position */}
                        <div>
                          <div className="text-xs text-slate-500 mb-1.5">ເງື່ອນໄຂ / ຄຸນສົມບັດ</div>
                          <div className="space-y-1.5">
                            {(Array.isArray(pos.requirements) ? pos.requirements : []).map((req, ri) => (
                              <div key={ri} className="flex gap-2 items-center">
                                <input type="text" className="flex-1 bg-slate-50 border border-corporate-border rounded-lg px-2 py-1.5 text-xs text-corporate-ltc outline-none focus:border-corporate-primary"
                                  value={req || ''}
                                  onChange={e => { const val = e.target.value; setJobConfig(p => ({ ...p, positions: p.positions.map((pp, j) => j === i ? { ...pp, requirements: (Array.isArray(pp.requirements)?pp.requirements:[]).map((r,k)=>k===ri?val:r) as string[] } : pp) })) }}
                                />
                                <button onClick={() => setJobConfig(p => ({ ...p, positions: p.positions.map((pp, j) => j === i ? { ...pp, requirements: (Array.isArray(pp.requirements)?pp.requirements:[]).filter((_,k)=>k!==ri) as string[] } : pp) }))} className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded transition-colors">
                                  <MinusCircle className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                            <button onClick={() => setJobConfig(p => ({ ...p, positions: p.positions.map((pp, j) => j === i ? { ...pp, requirements: [...(Array.isArray(pp.requirements)?pp.requirements:[]), ''] as string[] } : pp) }))} className="text-xs text-corporate-primary hover:text-corporate-primary/80 flex items-center gap-1 mt-1">
                              <PlusCircle className="w-3 h-3" /> ເພີ່ມເງື່ອນໄຂ
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )})}
                <button onClick={() => setJobConfig(p => ({ ...p, positions: [...p.positions, { department: '', code: '', slots: 1, requirements: [], deadline: '' }] }))}
                  className="w-full py-3 border border-dashed border-corporate-border rounded-xl text-slate-500 hover:text-corporate-ltc hover:border-corporate-primary text-sm transition-all flex items-center justify-center gap-2">
                  <PlusCircle className="w-4 h-4" /> ເພີ່ມຕຳແໜ່ງ
                </button>
              </div>
            </div>

            <button onClick={handleSaveJobConfig} disabled={jobSaving} className="flex items-center gap-2 px-6 py-3 bg-corporate-primary hover:bg-corporate-primary/80 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50">
              <Save className="w-4 h-4" /> {jobSaving ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກການຕັ້ງຄ່າ'}
            </button>
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
            className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-corporate-border bg-white sm:max-h-[90vh] sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-corporate-border bg-white p-4 sm:p-6">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-bold text-corporate-ltc sm:text-xl">{selectedApp.name}</h2>
                <div className="mt-0.5 text-xs text-corporate-muted">
                  {selectedApp.position} ·{' '}
                  {selectedApp.submittedAt
                    ? new Date(selectedApp.submittedAt).toLocaleDateString('lo-LA')
                    : ''}
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-corporate-ltc p-2 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
              {/* Status control */}
              <div>
                <div className="text-xs text-corporate-muted uppercase font-bold mb-3">ສະຖານະ</div>
                <div className="flex gap-2 flex-wrap">
                  {(['PENDING', 'APPROVED', 'REJECTED'] as const).map(s => (
                    <button key={s} onClick={() => handleStatus(selectedApp.id, s)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${selectedApp.status === s ? STATUS_COLORS[s] + ' border-current' : 'bg-slate-50 text-slate-500 border-corporate-border hover:text-corporate-ltc'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* PDF download */}
              {selectedApp.pdfUrl && (
                <div>
                  <div className="text-xs text-corporate-muted uppercase font-bold mb-2">ຟາຍ PDF ຟອມ</div>
                  <a href={`${API}${selectedApp.pdfUrl}?token=${authToken}`} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-xl text-sm font-bold transition-all border border-blue-500/20">
                    <Download className="w-4 h-4" /> ດາວໂຫລດ PDF ເຕັ່ມໃສ Code
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

              {/* Form data preview */}
              {selectedApp.formData && Object.keys(selectedApp.formData).length > 0 && (
                <div>
                  <div className="text-xs text-corporate-muted uppercase font-bold mb-3">ຂໍ້ມູນຟອມ</div>
                  <div className="bg-slate-50 rounded-xl border border-corporate-border divide-y divide-corporate-border max-h-64 overflow-y-auto">
                    {Object.entries(selectedApp.formData).map(([k, v]) => v ? (
                      <div key={k} className="flex gap-4 px-4 py-2.5 text-xs">
                        <span className="w-24 shrink-0 font-mono text-slate-500 sm:w-32">{k}</span>
                        <span className="text-slate-700 break-all">{String(v)}</span>
                      </div>
                    ) : null)}
                  </div>
                </div>
              )}

              {/* Danger zone */}
              <div className="border-t border-corporate-border pt-4">
                <button onClick={() => handleDelete(selectedApp.id)} className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl text-sm font-bold transition-all border border-red-500/20">
                  <Trash2 className="w-4 h-4" /> ລຶບລາຍການນີ້
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
