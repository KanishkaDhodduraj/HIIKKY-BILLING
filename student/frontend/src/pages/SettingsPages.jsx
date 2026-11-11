import { useCallback, useEffect, useState } from 'react';
import { Bell, CreditCard, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, dataOf } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Badge, Button, ConfirmDialog, DataTable, FormField, Modal, SelectField, Toast } from '../components/shared';

const errorText = (error) => error.response?.data?.message || 'Unable to complete this request.';

function useNotice() {
  const [notice, setNotice] = useState({ message: '', type: 'success' });
  const show = (message, type = 'success') => setNotice({ message, type });
  const toast = <Toast message={notice.message} type={notice.type} onClose={() => setNotice({ message: '', type: 'success' })} />;
  return { show, toast };
}

export function ProfilePage() {
  const { setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', currentPassword: '', newPassword: '', emailNotificationsEnabled: true });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { show, toast } = useNotice();
  useEffect(() => {
    api.get('/profile').then((response) => {
      const data = dataOf(response); setProfile(data);
      setForm((current) => ({ ...current, fullName: data.fullName || '', email: data.email || '', phone: data.phone || '', emailNotificationsEnabled: data.emailNotificationsEnabled !== false }));
    }).catch((failure) => setError(errorText(failure)));
  }, []);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setFieldErrors({});
    const body = Object.fromEntries(Object.entries(form).filter(([key, value]) => key !== 'newPassword' || value).filter(([key, value]) => key === 'emailNotificationsEnabled' || value !== ''));
    try {
      const response = await api.patch('/profile', body);
      setProfile(dataOf(response)); setUser(dataOf(response)); setForm((current) => ({ ...current, currentPassword: '', newPassword: '' })); show('Your profile has been updated.');
    } catch (failure) { setError(errorText(failure)); setFieldErrors(failure.response?.data?.fieldErrors || {}); }
    finally { setBusy(false); }
  }
  return <div className="space-y-4">{toast}<header><h1 className="font-display text-2xl font-extrabold">My Profile</h1><p className="mt-1 text-xs text-muted">Update your contact details and account security.</p></header>
    {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</div>}
    {profile && <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(260px,.7fr)]">
      <section className="space-y-4 rounded-xl border border-line bg-white p-5 shadow-soft"><div className="flex items-center gap-2"><ShieldCheck size={17} className="text-brand-600" /><h2 className="text-xs font-bold">Account details</h2></div><div className="grid gap-3 sm:grid-cols-2"><FormField label="Full name" required value={form.fullName} error={fieldErrors.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /><FormField label="Email address" type="email" required value={form.email} error={fieldErrors.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /><FormField label="Phone number" value={form.phone} error={fieldErrors.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /><label className="flex items-center gap-2 self-end pb-2 text-[10px]"><input type="checkbox" checked={form.emailNotificationsEnabled} onChange={(event) => setForm({ ...form, emailNotificationsEnabled: event.target.checked })} />Email notifications enabled</label></div><div className="border-t border-line pt-4"><h3 className="mb-3 text-[11px] font-bold">Change password (optional)</h3><div className="grid gap-3 sm:grid-cols-2"><FormField label="New password" type="password" autoComplete="new-password" minLength="12" value={form.newPassword} error={fieldErrors.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} /><p className="self-center text-[9px] leading-4 text-muted">Use at least 12 characters. Leave blank to keep your current password.</p></div></div><div className="border-t border-line pt-4"><FormField label="Current password (required to save)" type="password" autoComplete="current-password" required value={form.currentPassword} error={fieldErrors.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} /><Button disabled={busy} className="mt-4">{busy ? 'Saving…' : 'Save changes'}</Button></div></section>
      <aside className="space-y-3"><section className="rounded-xl border border-line bg-white p-4 shadow-soft"><h2 className="text-xs font-bold">Organization</h2><p className="mt-2 text-sm font-semibold">{profile.organizationName}</p><p className="mt-1 text-[10px] text-muted">Your student account and billing are managed by this organization.</p></section><section className="rounded-xl border border-line bg-white p-4 shadow-soft"><h2 className="text-xs font-bold">Account status</h2><div className="mt-2"><Badge tone={['ACTIVE', 'TRIALING'].includes(profile.status) ? 'success' : 'warning'}>{profile.status}</Badge></div><p className="mt-2 text-[10px] leading-4 text-muted">Contact your organization owner for account or enrollment changes.</p></section></aside>
    </form>}
  </div>;
}

export function AutoPayPage() {
  const [settings, setSettings] = useState(null);
  const [methods, setMethods] = useState([]);
  const [enabled, setEnabled] = useState(false);
  const [methodId, setMethodId] = useState('');
  const [methodForm, setMethodForm] = useState({ type: 'CARD', label: '', brand: '', lastFour: '', expiryMonth: '', expiryYear: '' });
  const [dialog, setDialog] = useState('');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const { show, toast } = useNotice();
  const load = useCallback(async () => {
    try {
      const [settingsResponse, methodsResponse] = await Promise.all([api.get('/auto-pay'), api.get('/payment-methods')]);
      const data = dataOf(settingsResponse); const items = dataOf(methodsResponse) || [];
      setSettings(data); setEnabled(Boolean(data.enabled)); setMethods(items); setMethodId(data.paymentMethod?.id || items.find((item) => item.isDefault)?.id || '');
    } catch (failure) { show(errorText(failure), 'error'); }
  }, []);
  useEffect(() => { load(); }, [load]);
  async function savePreference() {
    setBusy(true);
    try { const response = await api.patch('/auto-pay', { enabled, ...(methodId ? { paymentMethodId: methodId } : {}) }); setSettings((current) => ({ ...current, ...dataOf(response), paymentMethod: methods.find((item) => item.id === methodId) || current?.paymentMethod })); show(enabled ? 'Auto Pay preference saved.' : 'Auto Pay preference disabled.'); }
    catch (failure) { show(errorText(failure), 'error'); }
    finally { setBusy(false); }
  }
  async function addMethod(event) {
    event.preventDefault(); setBusy(true);
    try {
      const input = { ...methodForm, ...(methodForm.lastFour ? {} : { lastFour: undefined }), ...(methodForm.expiryMonth ? { expiryMonth: Number(methodForm.expiryMonth) } : {}), ...(methodForm.expiryYear ? { expiryYear: Number(methodForm.expiryYear) } : {}) };
      const response = await api.post('/payment-methods', input);
      setDialog(''); setMethodForm({ type: 'CARD', label: '', brand: '', lastFour: '', expiryMonth: '', expiryYear: '' }); show('Sandbox payment method added.'); await load(); setMethodId(dataOf(response).id);
    } catch (failure) { show(errorText(failure), 'error'); }
    finally { setBusy(false); }
  }
  async function setDefault(method) {
    try { await api.patch(`/payment-methods/${method.id}/default`, {}); setMethodId(method.id); show(`${method.label} is now your default method.`); await load(); }
    catch (failure) { show(errorText(failure), 'error'); }
  }
  async function rename(event) {
    event.preventDefault(); if (!selected) return;
    try { await api.patch(`/payment-methods/${selected.id}`, { label: selected.label }); setSelected(null); show('Payment method updated.'); await load(); }
    catch (failure) { show(errorText(failure), 'error'); }
  }
  async function remove() {
    if (!selected) return;
    setBusy(true);
    try { await api.delete(`/payment-methods/${selected.id}`); setSelected(null); setDialog(''); show('Payment method removed.'); await load(); }
    catch (failure) { show(errorText(failure), 'error'); }
    finally { setBusy(false); }
  }
  return <div className="space-y-4">{toast}<header><h1 className="font-display text-2xl font-extrabold">Auto Pay</h1><p className="mt-1 text-xs text-muted">Manage saved sandbox payment methods and your billing preference.</p></header>
    <div role="note" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[11px] leading-5 text-amber-900"><b>Sandbox limitation:</b> the current payment provider does not schedule automatic recurring charges. This preference is saved to your account, but open invoices must be paid from the Invoices page.</div>
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(270px,.7fr)]">
      <div className="space-y-4 rounded-xl border border-line bg-white p-5 shadow-soft"><div className="flex items-center gap-2"><CreditCard size={16} className="text-brand-600" /><h2 className="text-xs font-bold">Saved payment methods</h2></div><DataTable rows={methods} columns={[{ key: 'label', label: 'Method', render: (item) => <span><b className="block">{item.label}</b><small className="text-[9px] text-muted">{item.type}{item.lastFour ? ` ···· ${item.lastFour}` : ''}</small></span> }, { key: 'isDefault', label: 'Status', render: (item) => item.isDefault ? <Badge tone="success">Default</Badge> : <button className="text-[9px] font-bold text-brand-700" onClick={() => setDefault(item)}>Set default</button> }]} actions={(item) => <div className="flex justify-end gap-3"><button className="text-[10px] font-semibold text-brand-700" onClick={() => setSelected({ ...item })}>Rename</button><button aria-label={`Remove ${item.label}`} className="text-red-600" onClick={() => { setSelected(item); setDialog('remove'); }}><Trash2 size={13} /></button></div>} empty="No saved payment methods." /><Button variant="secondary" onClick={() => setDialog('add')}><Plus size={13} />Add sandbox method</Button></div>
      <div className="rounded-xl border border-line bg-white p-5 shadow-soft"><h2 className="text-xs font-bold">Auto Pay preference</h2><p className="mt-1 text-[10px] leading-4 text-muted">Choose whether Auto Pay should be marked as preferred for your account.</p><label className="mt-5 flex items-center justify-between rounded-lg bg-slate-50 p-3 text-xs font-semibold"><span>{enabled ? 'Preference enabled' : 'Preference disabled'}</span><input aria-label="Enable Auto Pay preference" type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} /></label><SelectField className="mt-4" label="Preferred payment method" value={methodId} onChange={(event) => setMethodId(event.target.value)}><option value="">Select a saved method</option>{methods.map((method) => <option key={method.id} value={method.id}>{method.label}</option>)}</SelectField><Button className="mt-4 w-full" disabled={busy} onClick={savePreference}>{busy ? 'Saving…' : 'Save preference'}</Button><div className="mt-5 border-t border-line pt-4"><h3 className="text-[10px] font-bold">Upcoming unpaid invoices</h3>{settings?.schedule?.length ? <div className="mt-2 divide-y divide-slate-100">{settings.schedule.map((item) => <div key={item.invoiceNumber} className="flex justify-between gap-2 py-2 text-[9px]"><span>{item.invoiceNumber} · {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '—'}</span><b>${Number(item.amount).toFixed(2)}</b></div>)}</div> : <p className="mt-2 text-[10px] text-muted">No upcoming unpaid invoices.</p>}<Link className="mt-3 inline-block text-[10px] font-bold text-brand-700" to="/student/invoices">Go to invoices →</Link></div></div>
    </section>
    {dialog === 'add' && <Modal title="Add sandbox payment method" onClose={() => setDialog('')}><form className="grid gap-3" onSubmit={addMethod}><SelectField label="Type" value={methodForm.type} onChange={(event) => setMethodForm({ ...methodForm, type: event.target.value })}><option value="CARD">Card</option><option value="UPI">UPI</option><option value="BANK">Bank account</option></SelectField><FormField label="Display name" required maxLength="80" value={methodForm.label} onChange={(event) => setMethodForm({ ...methodForm, label: event.target.value })} /><FormField label="Brand (optional)" maxLength="30" value={methodForm.brand} onChange={(event) => setMethodForm({ ...methodForm, brand: event.target.value })} /><FormField label="Last four digits (optional)" inputMode="numeric" pattern="[0-9]{4}" value={methodForm.lastFour} onChange={(event) => setMethodForm({ ...methodForm, lastFour: event.target.value })} /><p className="text-[9px] leading-4 text-muted">Only a sandbox token and display details are stored. Never enter a full card number or security code.</p><Button disabled={busy}>{busy ? 'Adding…' : 'Add payment method'}</Button></form></Modal>}
    {selected && !dialog && <Modal title="Rename payment method" onClose={() => setSelected(null)}><form className="grid gap-3" onSubmit={rename}><FormField label="Display name" required value={selected.label} onChange={(event) => setSelected({ ...selected, label: event.target.value })} /><Button>Save name</Button></form></Modal>}
    {dialog === 'remove' && selected && <ConfirmDialog title="Remove payment method?" description={`This will remove ${selected.label} from your saved sandbox methods.`} confirmLabel="Remove method" busy={busy} onCancel={() => { setDialog(''); setSelected(null); }} onConfirm={remove} />}
  </div>;
}

export function AutoRenewPage() {
  const [analytics, setAnalytics] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const { show, toast } = useNotice();
  useEffect(() => {
    Promise.all([api.get('/auto-renew/analytics'), api.get('/auto-renew/reports'), api.get('/subscription')])
      .then(([a, r, p]) => { setAnalytics(dataOf(a) || []); setInvoices(dataOf(r) || []); const data = dataOf(p); setPlan(data?.plans?.find((item) => item.isCurrent) || null); })
      .catch((failure) => show(errorText(failure), 'error'))
      .finally(() => setLoading(false));
  }, []);
  async function renew() {
    setBusy(true);
    try { const response = await api.post('/subscription/renew', {}); const invoice = dataOf(response); show(`Renewal invoice ${invoice.invoiceNumber} created.`); }
    catch (failure) { show(errorText(failure), 'error'); }
    finally { setBusy(false); }
  }
  if (loading) return <div className="p-10 text-center text-xs text-muted">Loading renewal history…</div>;
  return <div className="space-y-4">{toast}<header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="font-display text-2xl font-extrabold">Auto Renew</h1><p className="mt-1 text-xs text-muted">Review renewal activity and create a renewal invoice for your current plan.</p></div><Button disabled={busy || !plan} onClick={renew}>{busy ? 'Creating…' : 'Create renewal invoice'}</Button></header>
    <div role="note" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[11px] leading-5 text-amber-900"><b>Renewal timing:</b> renewal is not charged automatically. Use the action above to create an invoice, then complete payment from the Invoices page.</div>
    {!plan && <div className="rounded-lg border border-line bg-white p-4 text-xs text-muted">There is no current plan to renew. <Link className="font-bold text-brand-700" to="/student/subscription">View available plans</Link></div>}
    {plan && <section className="rounded-xl border border-line bg-white p-4 shadow-soft"><h2 className="text-xs font-bold">Current renewal plan</h2><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><div><p className="font-display text-lg font-extrabold">{plan.planName}</p><p className="text-[10px] text-muted">{plan.billingCycle?.replace('_', ' ')} · ${Number(plan.price).toFixed(2)}</p></div><Badge tone="brand">{plan.status}</Badge></div></section>}
    <div className="grid gap-4 lg:grid-cols-2"><section className="rounded-xl border border-line bg-white p-4 shadow-soft"><h2 className="text-xs font-bold">Payment activity by month</h2>{analytics.length ? <div className="mt-4 space-y-3">{analytics.map((point) => <div key={point.month} className="flex items-center gap-3 text-[10px]"><span className="w-16 text-muted">{point.month}</span><span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, Math.max(4, point.amount / Math.max(...analytics.map((item) => item.amount), 1) * 100))}%` }} /></span><b>${Number(point.amount).toFixed(2)}</b><span className="text-muted">{point.count} paid</span></div>)}</div> : <p className="mt-4 text-[10px] text-muted">No renewal payments recorded yet.</p>}</section><section className="overflow-hidden rounded-xl border border-line bg-white shadow-soft"><div className="border-b border-line px-4 py-3"><h2 className="text-xs font-bold">Renewal and invoice records</h2></div><DataTable rows={invoices} empty="No renewal invoices found." columns={[{ key: 'invoiceNumber', label: 'Invoice' }, { key: 'paymentName', label: 'Description' }, { key: 'amount', label: 'Amount', render: (item) => `$${Number(item.amount).toFixed(2)}` }, { key: 'paymentStatus', label: 'Status', render: (item) => <Badge tone={item.paymentStatus === 'PAID' ? 'success' : 'warning'}>{item.paymentStatus}</Badge> }]} actions={(item) => <Link className="text-[10px] font-bold text-brand-700" to={`/student/invoices?search=${encodeURIComponent(item.invoiceNumber)}`}>View invoice</Link>} /></section></div>
  </div>;
}

export function NotificationsPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({ category: 'ALL', unreadOnly: false });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [busy, setBusy] = useState(false);
  const { show, toast } = useNotice();
  const load = useCallback(async (nextPage = page) => {
    setLoading(true);
    try { const response = await api.get('/notifications', { params: { page: nextPage, size: 10, category: filters.category, unreadOnly: filters.unreadOnly || undefined } }); setRows(dataOf(response) || []); setTotal(Number(response.headers['x-total-count'] || 0)); setPage(nextPage); }
    catch (failure) { show(errorText(failure), 'error'); }
    finally { setLoading(false); }
  }, [filters, page]);
  useEffect(() => { load(0); }, [filters]);
  async function markRead(row) {
    try { await api.patch(`/notifications/${row.id}/read`, {}); show('Notification marked as read.'); await load(page); }
    catch (failure) { show(errorText(failure), 'error'); }
  }
  async function markAll() {
    setBusy(true);
    try { await api.post('/notifications/read-all', {}); show('All notifications marked as read.'); await load(0); }
    catch (failure) { show(errorText(failure), 'error'); }
    finally { setBusy(false); }
  }
  async function clearAll() {
    setBusy(true);
    try { await api.delete('/notifications'); setConfirmClear(false); show('Notifications cleared from your inbox.'); await load(0); }
    catch (failure) { show(errorText(failure), 'error'); }
    finally { setBusy(false); }
  }
  return <div className="space-y-4">{toast}<header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="font-display text-2xl font-extrabold">Notifications</h1><p className="mt-1 text-xs text-muted">Messages and billing updates from your organization.</p></div><div className="flex gap-2"><Button variant="secondary" disabled={busy || !total} onClick={markAll}><Bell size={13} />Mark all read</Button><Button variant="danger" disabled={busy || !total} onClick={() => setConfirmClear(true)}>Clear inbox</Button></div></header>
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white p-3 shadow-soft"><SelectField label="Category" value={filters.category} onChange={(event) => { setPage(0); setFilters({ ...filters, category: event.target.value }); }}><option value="ALL">All messages</option><option value="BILLING">Billing</option><option value="COURSES">Courses</option></SelectField><label className="flex items-center gap-2 self-end pb-2 text-[10px]"><input type="checkbox" checked={filters.unreadOnly} onChange={(event) => { setPage(0); setFilters({ ...filters, unreadOnly: event.target.checked }); }} />Unread only</label></div>
    <section className="overflow-hidden rounded-xl border border-line bg-white shadow-soft">{loading ? <div className="p-10 text-center text-xs text-muted">Loading notifications…</div> : rows.length ? <div className="divide-y divide-slate-100">{rows.map((row) => <article key={row.id} className={`flex gap-3 px-4 py-4 ${row.read ? '' : 'bg-brand-50/40'}`}><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${row.read ? 'bg-slate-300' : 'bg-brand-600'}`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-xs font-bold">{row.subject}</h2><Badge tone={row.type === 'BILLING' ? 'warning' : 'brand'}>{row.type}</Badge>{!row.read && <Badge tone="brand">New</Badge>}</div><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-muted">{row.message}</p><time className="mt-2 block text-[9px] text-muted">{new Date(row.createdAt).toLocaleString()}</time></div><div className="flex shrink-0 flex-col items-end gap-2"><button className="text-[10px] font-bold text-brand-700" onClick={() => setSelected(row)}>View</button>{!row.read && <button className="text-[10px] font-semibold text-muted" onClick={() => markRead(row)}>Mark read</button>}</div></article>)}</div> : <div className="p-10 text-center text-xs text-muted">You’re all caught up.</div>}<div className="flex items-center justify-between border-t border-line px-4 py-3 text-[10px] text-muted"><span>{total} notifications</span><div className="flex gap-2"><Button variant="secondary" disabled={!page} onClick={() => load(page - 1)}>Previous</Button><span className="self-center">{page + 1} / {Math.max(1, Math.ceil(total / 10))}</span><Button variant="secondary" disabled={page + 1 >= Math.ceil(total / 10)} onClick={() => load(page + 1)}>Next</Button></div></div></section>
    {selected && <Modal title={selected.subject} onClose={() => setSelected(null)}><div className="space-y-3 text-xs"><div className="flex items-center gap-2"><Badge tone={selected.type === 'BILLING' ? 'warning' : 'brand'}>{selected.type}</Badge><time className="text-[10px] text-muted">{new Date(selected.createdAt).toLocaleString()}</time></div><p className="whitespace-pre-wrap leading-5 text-ink">{selected.message}</p><div className="flex justify-end">{!selected.read && <Button onClick={async () => { await markRead(selected); setSelected(null); }}>Mark as read</Button>}</div></div></Modal>}
    {confirmClear && <ConfirmDialog title="Clear notifications?" description="This removes the notifications from your inbox. This action cannot be undone." confirmLabel="Clear inbox" busy={busy} onCancel={() => setConfirmClear(false)} onConfirm={clearAll} />}
  </div>;
}
