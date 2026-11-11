import { useCallback, useEffect, useState } from 'react';
import { Check, Download, Eye, Filter, Search, X } from 'lucide-react';
import { api, dataOf } from '../api/client';
import { Button, ConfirmDialog, Modal, Pagination, StatCard, Toast } from '../components/shared';

export default function BusinessRequestsPage() {
  const [rows, setRows] = useState([]), [page, setPage] = useState(0), [total, setTotal] = useState(0);
  const [filter, setFilter] = useState({ status: 'PENDING' }), [search, setSearch] = useState(''), [status, setStatus] = useState('PENDING');
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [toast, setToast] = useState(null);
  const [detail, setDetail] = useState(null), [confirm, setConfirm] = useState(null), [rejecting, setRejecting] = useState(null), [reason, setReason] = useState(''), [inviteUrl, setInviteUrl] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.get('/admin/business-requests', { params: { page, size: 10, sortBy: 'createdAt', sortDirection: 'DESC', ...filter } });
      setRows(dataOf(result) || []);
      setTotal(Number(result.headers['x-total-count'] || 0));
      window.dispatchEvent(new Event('business-requests-updated'));
    } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to load business requests.'); }
    finally { setLoading(false); }
  }, [page, filter]);
  useEffect(() => { load(); }, [load]);

  function apply(event) {
    event.preventDefault();
    setPage(0);
    setFilter({ ...(search.trim() ? { search: search.trim() } : {}), ...(status ? { status } : {}) });
  }
  async function view(row) {
    try { setDetail(dataOf(await api.get(`/admin/business-requests/${row.id}`))); }
    catch (requestError) { setToast({ type: 'error', message: requestError.response?.data?.message || 'Unable to load request details.' }); }
  }
  async function approve() {
    if (!confirm) return;
    setBusy(true);
    try {
      const result = await api.patch(`/admin/business-requests/${confirm.id}/approve`);
      const data = dataOf(result);
      setConfirm(null);
      setInviteUrl(data?.setPasswordUrl || '');
      setToast({ message: `${confirm.organizationName} approved` });
      await load();
    } catch (requestError) { setToast({ type: 'error', message: requestError.response?.data?.message || 'Approval failed.' }); }
    finally { setBusy(false); }
  }
  async function reject(event) {
    event.preventDefault();
    if (!rejecting || !reason.trim()) return;
    setBusy(true);
    try {
      await api.patch(`/admin/business-requests/${rejecting.id}/reject`, { reason: reason.trim() });
      setToast({ message: `${rejecting.organizationName} rejected` });
      setRejecting(null);
      setReason('');
      await load();
    } catch (requestError) { setToast({ type: 'error', message: requestError.response?.data?.message || 'Rejection failed.' }); }
    finally { setBusy(false); }
  }
  function exportCsv() {
    const params = new URLSearchParams(filter);
    window.location.assign(`${api.defaults.baseURL}/admin/business-requests/export.csv${params.size ? `?${params}` : ''}`);
  }
  function downloadUrl(document) {
    if (!document.downloadUrl) return document.url || '';
    return `${api.defaults.baseURL}${document.downloadUrl}`;
  }

  return <div className="space-y-3.5">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="font-display text-[18px] font-extrabold">Business Requests</h1><p className="mt-0.5 text-[10px] text-muted">Review organization registration submissions and record each decision.</p></div><div className="flex gap-2"><Button variant="secondary" type="button" onClick={() => document.getElementById('business-request-filters')?.scrollIntoView({ behavior: 'smooth' })}><Filter size={12}/>Filter</Button><Button variant="secondary" type="button" onClick={exportCsv}><Download size={12}/>Export CSV</Button></div></header>
    {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[10px] text-red-700">{error}</div>}
    <StatCard title={filter.status === 'PENDING' ? 'Pending requests' : 'Matching requests'} value={total} caption="Applications in this view"/>
    <section id="business-request-filters" className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
      <form onSubmit={apply} className="flex flex-wrap items-end gap-2 border-b border-line p-2.5"><label className="relative min-w-[180px] flex-1"><span className="mb-1 block text-[9px] font-semibold text-muted">Search requests</span><Search size={12} className="absolute left-2.5 top-[26px] text-muted"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Owner or business name..." className="h-8 w-full rounded-md border border-line pl-8 pr-2 text-[10px]"/></label><label className="grid gap-1 text-[9px] font-semibold text-muted">Status<select value={status} onChange={(event) => setStatus(event.target.value)} className="h-8 min-w-28 rounded-md border border-line px-2 text-[10px] text-ink"><option value="">All statuses</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select></label><Button type="submit">Apply</Button><button type="button" onClick={() => { setSearch(''); setStatus(''); setPage(0); setFilter({}); }} className="h-8 px-1 text-[9px] font-semibold text-brand-600">Reset</button></form>
      {loading ? <div className="p-12 text-center text-[10px] text-muted">Loading requests…</div> : rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-[#f0f3fc] text-[8px] uppercase tracking-wide text-[#526080]"><tr>{['Business & Owner', 'Business type', 'Contact', 'Submitted', 'Status', 'Actions'].map((heading) => <th key={heading} className="px-3 py-2.5 font-bold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id} className="hover:bg-[#fbfbff]"><td className="px-3 py-3"><b className="block text-[10px]">{row.organizationName}</b><span className="text-[9px] text-muted">{[row.firstName, row.lastName].filter(Boolean).join(' ')}</span></td><td className="px-3 py-3 text-[9px]">{row.businessType || row.industry || '—'}</td><td className="px-3 py-3 text-[9px]"><div>{row.organizationEmail}</div><div className="text-muted">{row.ownerEmail}</div></td><td className="px-3 py-3 text-[9px] text-muted">{new Date(row.createdAt).toLocaleDateString()}</td><td className="px-3 py-3"><span className="rounded-full bg-amber-50 px-2 py-1 text-[8px] font-semibold text-amber-700">{row.status}</span></td><td className="px-3 py-3"><div className="flex items-center gap-1"><button type="button" title="View request" aria-label={`View ${row.organizationName}`} onClick={() => view(row)} className="rounded p-1 text-muted hover:bg-slate-100"><Eye size={13}/></button>{row.status === 'PENDING' && <><button type="button" title="Approve" aria-label={`Approve ${row.organizationName}`} onClick={() => setConfirm(row)} className="rounded p-1 text-emerald-600 hover:bg-emerald-50"><Check size={14}/></button><button type="button" title="Reject" aria-label={`Reject ${row.organizationName}`} onClick={() => { setRejecting(row); setReason(''); }} className="rounded p-1 text-red-500 hover:bg-red-50"><X size={14}/></button></>}</div></td></tr>)}</tbody></table><Pagination page={page} total={total} size={10} onPage={setPage}/></div> : <div className="p-12 text-center text-[10px] text-muted">No business requests match these filters.</div>}
    </section>
    {detail && <Modal title="Business Request Details" onClose={() => setDetail(null)}><div className="grid gap-3 text-[10px] sm:grid-cols-2">{[['Status', detail.status], ['Owner', `${detail.firstName} ${detail.lastName || ''}`], ['Owner email', detail.ownerEmail], ['Owner phone', detail.ownerPhone || 'Not supplied'], ['Legal company name', detail.organizationName], ['Business type', detail.businessType || detail.industry || '—'], ['Organization email', detail.organizationEmail], ['Organization phone', detail.organizationPhone || 'Not supplied'], ['Projected student count', detail.projectedStudentCount ?? '—'], ['Primary operating region', detail.region || detail.operatingRegion || '—'], ['Subscription tier', detail.subscriptionTier || '—'], ['Address', detail.organizationAddress || 'Not supplied'], ['Submitted', new Date(detail.createdAt).toLocaleString()], ['Decision reason', detail.decisionReason || '—']].map(([label, value]) => <div key={label}><span className="block text-muted">{label}</span><span className="mt-0.5 block font-semibold">{value}</span></div>)}</div><div className="mt-4 border-t border-line pt-3"><h3 className="mb-2 text-[10px] font-bold">Documents</h3>{detail.documents?.length ? detail.documents.map((document) => <a key={document.id || document.name} href={downloadUrl(document)} className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold text-brand-700" target="_blank" rel="noreferrer"><Download size={12}/>{document.name}{document.size ? ` (${(document.size / 1024 / 1024).toFixed(2)} MB)` : ''}</a>) : <p className="text-[9px] text-muted">No document attached.</p>}</div><div className="mt-4 border-t border-line pt-3"><h3 className="mb-2 text-[10px] font-bold">Decision history</h3>{detail.history?.length ? detail.history.map((item, index) => <p key={index} className="py-1 text-[9px] text-muted">{item.eventType} · {new Date(item.createdAt).toLocaleString()} {item.reason && `· ${item.reason}`}</p>) : <p className="text-[9px] text-muted">No decisions recorded.</p>}</div></Modal>}
    {confirm && <ConfirmDialog title="Approve business request?" description={`Approving ${confirm.organizationName} creates an active owner and organization.`} confirmLabel="Approve" danger={false} busy={busy} onCancel={() => setConfirm(null)} onConfirm={approve}/>}
    {rejecting && <Modal title="Reject Business Request" onClose={() => setRejecting(null)}><form onSubmit={reject} className="grid gap-3"><label className="grid gap-1 text-[10px] font-semibold">Rejection reason<textarea required maxLength={1000} rows={4} value={reason} onChange={(event) => setReason(event.target.value)} className="rounded-md border border-line p-2 text-xs"/></label><div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setRejecting(null)}>Cancel</Button><Button type="submit" variant="danger" disabled={busy}>Reject Request</Button></div></form></Modal>}
    {inviteUrl && <Modal title="Owner invitation link" onClose={() => setInviteUrl('')}><p className="text-xs text-muted">Development-only one-time link. It expires in 48 hours.</p><a className="mt-3 block break-all text-xs font-semibold text-brand-700" href={inviteUrl}>{inviteUrl}</a><div className="mt-4 flex justify-end"><Button type="button" onClick={() => setInviteUrl('')}>Close</Button></div></Modal>}
    <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)}/>
  </div>;
}