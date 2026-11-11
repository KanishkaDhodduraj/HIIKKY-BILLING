import { useCallback, useEffect, useState } from 'react';
import { Download, Eye, Printer, Search } from 'lucide-react';
import { api, dataOf } from '../api/client';
import { Badge, Button, DataTable, FormField, Modal, Pagination, SelectField, Toast } from '../components/shared';

const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0);
const date = (value) => value ? new Date(value).toLocaleDateString() : '—';
const errText = (error) => error.response?.data?.message || 'Unable to complete this request.';

export function InvoicesPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({ status: '', search: '', fromDate: '', toDate: '' });
  const [draft, setDraft] = useState({ status: '', search: '', fromDate: '', toDate: '' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [selected, setSelected] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [notice, setNotice] = useState({ message: '', type: 'success' });
  const [error, setError] = useState('');
  const show = (message, type = 'success') => setNotice({ message, type });
  const toast = <Toast message={notice.message} type={notice.type} onClose={() => setNotice({ message: '', type: 'success' })} />;

  const load = useCallback(async (nextPage = page) => {
    setLoading(true);
    try {
      const params = { page: nextPage, size: 10 };
      for (const [key, value] of Object.entries(filters)) if (value) params[key] = value;
      const response = await api.get('/invoices', { params });
      setRows(dataOf(response) || []); setTotal(Number(response.headers['x-total-count'] || 0)); setPage(nextPage); setError('');
    } catch (failure) { setError(errText(failure)); }
    finally { setLoading(false); }
  }, [filters, page]);
  useEffect(() => { load(0); }, [filters]);
  useEffect(() => { api.get('/payment-methods').then((response) => setPaymentMethods(dataOf(response) || [])).catch((failure) => show(errText(failure), 'error')); }, []);
  async function viewInvoice(row) {
    setBusy(row.id);
    try { setSelected(dataOf(await api.get(`/invoices/${row.id}`))); }
    catch (failure) { show(errText(failure), 'error'); }
    finally { setBusy(''); }
  }
  async function payInvoice(invoice) {
    setBusy(invoice.id); setError('');
    try {
      await api.post(`/invoices/${invoice.id}/pay`, { paymentMethodId: paymentMethodId || undefined }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      setSelected(null); show('Sandbox payment completed. Your invoice and payment history have been updated.'); await load(page);
    } catch (failure) { setError(errText(failure)); show(errText(failure), 'error'); }
    finally { setBusy(''); }
  }
  function apply(event) { event.preventDefault(); setPage(0); setFilters({ ...draft }); }
  function exportCsv() {
    const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, value]) => value)));
    window.location.assign(`${api.defaults.baseURL}/invoices/export.csv${params.size ? `?${params}` : ''}`);
  }
  function printInvoice(invoice) { window.open(`${api.defaults.baseURL}/invoices/${invoice.id}/print`, '_blank', 'noopener,noreferrer'); }

  return <div className="space-y-4">{toast}
    <header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="font-display text-2xl font-extrabold">Invoices</h1><p className="mt-1 text-xs text-muted">Review your billing history, download an invoice, or pay an open balance.</p></div><Button variant="secondary" onClick={exportCsv}><Download size={14} />Export CSV</Button></header>
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
    <form onSubmit={apply} className="grid gap-2 rounded-xl border border-line bg-white p-3 shadow-soft sm:grid-cols-2 xl:grid-cols-5"><label className="relative xl:col-span-2"><span className="mb-1.5 block text-[10px] font-semibold">Search invoices</span><Search size={13} className="absolute left-3 top-[33px] text-muted" /><input value={draft.search} onChange={(event) => setDraft({ ...draft, search: event.target.value })} placeholder="Invoice number or description" className="h-10 w-full rounded-lg border border-line pl-9 pr-3 text-xs" /></label><SelectField label="Payment status" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option value="">All statuses</option><option value="UNPAID">Unpaid</option><option value="OVERDUE">Overdue</option><option value="PAID">Paid</option></SelectField><FormField label="Due from" type="date" value={draft.fromDate} onChange={(event) => setDraft({ ...draft, fromDate: event.target.value })} /><div className="flex items-end gap-2"><FormField label="Due to" type="date" value={draft.toDate} onChange={(event) => setDraft({ ...draft, toDate: event.target.value })} /><Button className="mb-0.5">Filter</Button></div></form>
    <section className="overflow-hidden rounded-xl border border-line bg-white shadow-soft"><DataTable loading={loading} rows={rows} empty="No invoices match these filters." columns={[{ key: 'invoiceNumber', label: 'Invoice ID' }, { key: 'paymentName', label: 'Description', render: (row) => <span><b className="block">{row.paymentName}</b><small className="text-[9px] text-muted">{row.planName || 'Organization billing'}</small></span> }, { key: 'amount', label: 'Amount', render: (row) => <b>{money(row.amount)}</b> }, { key: 'dueDate', label: 'Due date', render: (row) => date(row.dueDate) }, { key: 'paymentStatus', label: 'Status', render: (row) => <Badge tone={row.paymentStatus === 'PAID' ? 'success' : row.paymentStatus === 'OVERDUE' ? 'danger' : 'warning'}>{row.paymentStatus}</Badge> }]} actions={(row) => <div className="flex justify-end gap-3"><button aria-label={`View ${row.invoiceNumber}`} onClick={() => viewInvoice(row)} disabled={busy === row.id} className="text-brand-700"><Eye size={14} /></button>{row.paymentStatus !== 'PAID' && <button onClick={() => viewInvoice(row)} disabled={busy === row.id} className="text-[10px] font-bold text-emerald-700">Pay now</button>}<button aria-label={`Download ${row.invoiceNumber}`} onClick={() => printInvoice(row)} className="text-brand-700"><Printer size={14} /></button></div>} /><Pagination page={page} total={total} size={10} onPage={load} /></section>
    {selected && <Modal title={`Invoice ${selected.invoiceNumber}`} onClose={() => setSelected(null)}>
      <div className="space-y-4 text-xs"><div className="flex items-start justify-between gap-3"><div><b>{selected.paymentName}</b><p className="mt-1 text-[10px] text-muted">{selected.planName || 'Organization billing'}</p></div><Badge tone={selected.paymentStatus === 'PAID' ? 'success' : 'warning'}>{selected.paymentStatus}</Badge></div><div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-[10px]"><div><span className="text-muted">Invoice date</span><b className="mt-1 block">{date(selected.createdAt)}</b></div><div><span className="text-muted">Due date</span><b className="mt-1 block">{date(selected.dueDate)}</b></div><div><span className="text-muted">Paid date</span><b className="mt-1 block">{date(selected.paidDate)}</b></div><div><span className="text-muted">Invoice total</span><b className="mt-1 block text-base">{money(selected.amount)}</b></div></div>
        {selected.paymentStatus !== 'PAID' && <SelectField label="Sandbox payment method" value={paymentMethodId} onChange={(event) => setPaymentMethodId(event.target.value)}><option value="">Default sandbox method</option>{paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.label}{method.lastFour ? ` ···· ${method.lastFour}` : ''}{method.isDefault ? ' (default)' : ''}</option>)}</SelectField>}
        <div className="flex flex-wrap justify-end gap-2"><Button variant="secondary" onClick={() => printInvoice(selected)}><Printer size={13} />Print / PDF</Button>{selected.paymentStatus !== 'PAID' && <Button disabled={busy === selected.id} onClick={() => payInvoice(selected)}>{busy === selected.id ? 'Processing…' : `Pay ${money(selected.amount)} (sandbox)`}</Button>}</div><p className="text-[9px] leading-4 text-muted">Payments use the sandbox provider. No real card details are requested or stored.</p></div>
    </Modal>}
  </div>;
}

export function PaymentsPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async (nextPage = page) => {
    setLoading(true);
    try { const response = await api.get('/payments', { params: { page: nextPage, size: 10 } }); setRows(dataOf(response) || []); setTotal(Number(response.headers['x-total-count'] || 0)); setPage(nextPage); setError(''); }
    catch (failure) { setError(errText(failure)); }
    finally { setLoading(false); }
  }, [page]);
  useEffect(() => { load(0); }, []);
  return <div className="space-y-4"><header><h1 className="font-display text-2xl font-extrabold">Payment History</h1><p className="mt-1 text-xs text-muted">Payments processed for your account.</p></header>{error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</div>}<section className="overflow-hidden rounded-xl border border-line bg-white shadow-soft"><DataTable loading={loading} rows={rows} empty="No payments have been recorded." columns={[{ key: 'reference', label: 'Payment reference' }, { key: 'invoiceId', label: 'Invoice' }, { key: 'amount', label: 'Amount', render: (row) => money(row.amount) }, { key: 'method', label: 'Method', render: (row) => `Sandbox ${row.method || 'card'}` }, { key: 'paidAt', label: 'Date', render: (row) => date(row.paidAt) }, { key: 'status', label: 'Status', render: (row) => <Badge tone={row.status === 'SUCCEEDED' ? 'success' : 'warning'}>{row.status}</Badge> }]} actions={(row) => <button className="text-[10px] font-bold text-brand-700" onClick={() => window.location.assign(`${api.defaults.baseURL}/invoices/${row.invoiceId}/print`)}>Invoice</button>} /><Pagination page={page} total={total} size={10} onPage={load} /></section></div>;
}
