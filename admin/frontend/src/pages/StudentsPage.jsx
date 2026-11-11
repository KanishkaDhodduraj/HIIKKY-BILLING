import { useCallback, useEffect, useState } from 'react';
import { Download, Search, Shield, Users } from 'lucide-react';
import { api, dataOf } from '../api/client';
import { Badge, Button, DataTable, FormField, Modal, Pagination } from '../components/shared';

const errorText = (error) => error.response?.data?.message || 'Unable to complete this request.';
const date = (value) => value ? new Date(value).toLocaleDateString() : '—';
const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0);

export default function StudentsPage() {
  const [tab, setTab] = useState('students');
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [organizations, setOrganizations] = useState([]);
  const [draft, setDraft] = useState({ search: '', status: '', registrationStatus: '', organizationId: '', fromDate: '', toDate: '' });
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState(null);
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api.get('/admin/organizations', { params: { page: 0, size: 100 } })
      .then((response) => setOrganizations(dataOf(response) || []))
      .catch(() => setOrganizations([]));
  }, []);

  const load = useCallback(async (nextPage = page) => {
    setLoading(true); setError('');
    try {
      const path = tab === 'students' ? '/admin/students' : '/admin/students/payments';
      const params = { page: nextPage, size: 10, ...(filters.search ? { search: filters.search } : {}) };
      if (filters.organizationId) params.organizationId = filters.organizationId;
      if (tab === 'students') {
        if (filters.status) params.status = filters.status;
        if (filters.registrationStatus) params.registrationStatus = filters.registrationStatus;
      } else {
        if (filters.fromDate) params.fromDate = filters.fromDate;
        if (filters.toDate) params.toDate = filters.toDate;
      }
      const response = await api.get(path, { params });
      setRows(dataOf(response) || []); setTotal(Number(response.headers['x-total-count'] || 0)); setPage(nextPage);
    } catch (failure) { setError(errorText(failure)); }
    finally { setLoading(false); }
  }, [filters, page, tab]);
  useEffect(() => { load(0); }, [filters, tab]);

  function apply(event) { event.preventDefault(); setPage(0); setFilters({ ...draft, search: draft.search.trim() }); }
  function exportCsv() {
    const path = tab === 'students' ? '/admin/students/export.csv' : '/admin/students/payments/export.csv';
    const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, value]) => value)));
    window.location.assign(`${api.defaults.baseURL}${path}${params.size ? `?${params}` : ''}`);
  }
  async function toggleBlock() {
    if (!target) return;
    setBusy(true); setError('');
    try {
      await api.patch(`/admin/students/${target.id}/${target.accessBlocked ? 'unblock' : 'block'}`, target.accessBlocked ? {} : { reason: reason.trim() });
      setTarget(null); setReason(''); setNotice(target.accessBlocked ? 'Student access restored.' : 'Student access blocked and active sessions removed.');
      await load(page);
    } catch (failure) { setError(errorText(failure)); }
    finally { setBusy(false); }
  }

  return <div className="space-y-4">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="font-display text-[18px] font-extrabold">Students</h1><p className="mt-1 text-[10px] text-muted">Read-only student and payment reports across organizations.</p></div><Button onClick={exportCsv}><Download size={13} />Export CSV</Button></header>
    <div className="flex gap-2">{[['students', 'Student report'], ['payments', 'Student payments']].map(([key, label]) => <button key={key} onClick={() => { setTab(key); setPage(0); setFilters({}); setDraft({ search: '', status: '', registrationStatus: '', organizationId: '', fromDate: '', toDate: '' }); }} className={`rounded-md px-3 py-2 text-[9px] font-semibold ${tab === key ? 'bg-brand-600 text-white' : 'border border-line bg-white text-muted'}`}>{label}</button>)}</div>
    <form onSubmit={apply} className="grid gap-2 rounded-lg border border-line bg-white p-3 shadow-soft sm:grid-cols-2 xl:grid-cols-5">
      <label className="relative xl:col-span-2"><span className="mb-1.5 block text-[9px] font-semibold">Search</span><Search size={12} className="absolute left-2 top-[31px] text-muted" /><input value={draft.search} onChange={(event) => setDraft({ ...draft, search: event.target.value })} placeholder={tab === 'students' ? 'Name, email, phone' : 'Invoice or payment description'} className="h-9 w-full rounded-md border border-line pl-7 pr-2 text-[10px]" /></label>
      <label className="grid gap-1.5 text-[9px] font-semibold">Organization<select value={draft.organizationId} onChange={(event) => setDraft({ ...draft, organizationId: event.target.value })} className="h-9 rounded-md border border-line bg-white px-2 text-[10px]"><option value="">All organizations</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></label>
      {tab === 'students' ? <><label className="grid gap-1.5 text-[9px] font-semibold">Account status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })} className="h-9 rounded-md border border-line bg-white px-2 text-[10px]"><option value="">All statuses</option>{['ACTIVE', 'TRIALING', 'SUSPENDED', 'INACTIVE', 'BLOCKED', 'PENDING'].map((value) => <option key={value}>{value}</option>)}</select></label><div className="flex items-end gap-2"><label className="grid flex-1 gap-1.5 text-[9px] font-semibold">Registration<select value={draft.registrationStatus} onChange={(event) => setDraft({ ...draft, registrationStatus: event.target.value })} className="h-9 rounded-md border border-line bg-white px-2 text-[10px]"><option value="">All</option>{['PENDING', 'APPROVED', 'REJECTED'].map((value) => <option key={value}>{value}</option>)}</select></label><Button>Filter</Button></div></> : <><FormField label="Paid from" type="date" value={draft.fromDate} onChange={(event) => setDraft({ ...draft, fromDate: event.target.value })} /><div className="flex items-end gap-2"><FormField label="Paid to" type="date" value={draft.toDate} onChange={(event) => setDraft({ ...draft, toDate: event.target.value })} /><Button>Filter</Button></div></>}
    </form>
    {notice && <div role="status" className="rounded-md bg-emerald-50 p-2 text-[10px] text-emerald-700">{notice}<button className="float-right font-bold" onClick={() => setNotice('')}>Dismiss</button></div>}
    {error && <div role="alert" className="rounded-md bg-red-50 p-2 text-[10px] text-red-700">{error}</div>}
    <section className="overflow-hidden rounded-lg border border-line bg-white shadow-soft"><div className="flex items-center justify-between border-b border-line px-3 py-2.5 text-[9px] text-muted"><span>{total} {tab === 'students' ? 'students' : 'payments'} found</span><span className="inline-flex items-center gap-1"><Users size={12} />Cross-organization report</span></div>
      {tab === 'students' ? <DataTable loading={loading} rows={rows} columns={[{ key: 'fullName', label: 'Student', render: (row) => <span><b className="block">{row.fullName}</b><small className="text-muted">{row.email}</small></span> }, { key: 'organizationName', label: 'Organization' }, { key: 'status', label: 'Status', render: (row) => <Badge tone={row.status === 'ACTIVE' || row.status === 'TRIALING' ? 'success' : row.status === 'BLOCKED' || row.status === 'INACTIVE' ? 'danger' : 'warning'}>{row.status}</Badge> }, { key: 'registrationStatus', label: 'Registration' }, { key: 'planName', label: 'Plan' }, { key: 'totalPaid', label: 'Paid', render: (row) => money(row.totalPaid) }, { key: 'pendingAmount', label: 'Unpaid', render: (row) => money(row.pendingAmount) }]} actions={(row) => <button className={`inline-flex items-center gap-1 text-[9px] font-bold ${row.accessBlocked ? 'text-emerald-700' : 'text-red-600'}`} onClick={() => { setTarget(row); setReason(''); }}><Shield size={12} />{row.accessBlocked ? 'Unblock' : 'Block'}</button>} /> : <DataTable loading={loading} rows={rows} empty="No paid student invoices match these filters." columns={[{ key: 'invoiceNumber', label: 'Invoice' }, { key: 'organizationName', label: 'Organization' }, { key: 'studentName', label: 'Student', render: (row) => <span><b className="block">{row.studentName}</b><small className="text-muted">{row.studentEmail}</small></span> }, { key: 'amount', label: 'Amount', render: (row) => money(row.amount) }, { key: 'paymentMethod', label: 'Method' }, { key: 'providerReference', label: 'Provider reference' }, { key: 'paidDate', label: 'Paid date', render: (row) => date(row.paidDate) }]} />}
      <Pagination page={page} total={total} size={10} onPage={load} />
    </section>
    {target && <Modal title={target.accessBlocked ? 'Unblock student access?' : 'Block student access?'} onClose={() => setTarget(null)}><div className="space-y-3"><p className="text-xs leading-5 text-muted">{target.accessBlocked ? `Restore login access for ${target.fullName}?` : `Block ${target.fullName} from signing in and remove their active sessions?`}</p>{!target.accessBlocked && <FormField label="Reason (optional)" maxLength="500" value={reason} onChange={(event) => setReason(event.target.value)} />}{error && <p role="alert" className="text-[10px] text-red-600">{error}</p>}<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setTarget(null)}>Cancel</Button><Button variant={target.accessBlocked ? 'primary' : 'danger'} disabled={busy} onClick={toggleBlock}>{busy ? 'Saving…' : target.accessBlocked ? 'Unblock student' : 'Block student'}</Button></div></div></Modal>}
  </div>;
}
