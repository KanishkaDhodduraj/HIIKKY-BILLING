import { useEffect, useState } from 'react';
import { Check, CreditCard, RefreshCcw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api, dataOf } from '../api/client';
import { Badge, Button, ConfirmDialog, FormField, Modal, Toast } from '../components/shared';

const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0);
const date = (value) => value ? new Date(value).toLocaleDateString() : '—';
const errorText = (error) => error.response?.data?.message || 'Unable to complete this request.';

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [discountCode, setDiscountCode] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState({ message: '', type: 'success' });
  const [error, setError] = useState('');
  const show = (message, type = 'success') => setNotice({ message, type });
  const toast = <Toast message={notice.message} type={notice.type} onClose={() => setNotice({ message: '', type: 'success' })} />;
  async function load() {
    setLoading(true);
    try { setSubscription(dataOf(await api.get('/subscription'))); setError(''); }
    catch (failure) { setError(errorText(failure)); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  async function changePlan(event) {
    event.preventDefault();
    if (!selectedPlan) return;
    setBusy(true); setError('');
    try {
      const response = await api.post('/subscription/change', { subscriptionId: selectedPlan.id, ...(discountCode.trim() ? { discountCode: discountCode.trim() } : {}) });
      const invoice = dataOf(response);
      setSelectedPlan(null); setDiscountCode('');
      show(`Invoice ${invoice.invoiceNumber} created. Your plan changes after payment.`);
      navigate(`/student/invoices?search=${encodeURIComponent(invoice.invoiceNumber)}`);
    } catch (failure) { setError(errorText(failure)); show(errorText(failure), 'error'); }
    finally { setBusy(false); }
  }
  async function renew() {
    setBusy(true);
    try { const invoice = dataOf(await api.post('/subscription/renew', {})); show(`Renewal invoice ${invoice.invoiceNumber} created.`); navigate(`/student/invoices?search=${encodeURIComponent(invoice.invoiceNumber)}`); }
    catch (failure) { setError(errorText(failure)); show(errorText(failure), 'error'); }
    finally { setBusy(false); }
  }
  async function cancel() {
    setBusy(true);
    try { await api.post('/subscription/cancel', {}); setConfirmCancel(false); show('Your subscription has been cancelled.'); await load(); }
    catch (failure) { setError(errorText(failure)); show(errorText(failure), 'error'); }
    finally { setBusy(false); }
  }
  if (loading) return <div className="p-10 text-center text-xs text-muted">Loading subscription…</div>;
  const current = subscription?.plans?.find((plan) => plan.isCurrent);
  return <div className="space-y-5">{toast}<header><h1 className="font-display text-2xl font-extrabold">Subscription</h1><p className="mt-1 text-xs text-muted">Review your current plan and available options.</p></header>
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}
    {current ? <section className="rounded-2xl border border-brand-100 bg-gradient-to-br from-white to-brand-50 p-5 shadow-soft"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-wider text-brand-700">Current plan</p><h2 className="mt-1 font-display text-2xl font-extrabold">{current.planName}</h2><p className="mt-1 max-w-xl text-xs text-muted">{current.description || 'Your active learning subscription.'}</p></div><Badge tone={['ACTIVE', 'TRIALING'].includes(current.status) ? 'success' : 'warning'}>{current.status}</Badge></div><div className="mt-5 grid gap-3 border-t border-brand-100 pt-4 sm:grid-cols-4"><div><span className="text-[9px] text-muted">Price</span><b className="mt-1 block text-sm">{money(current.price)} <small className="font-normal text-muted">/ {current.billingCycle?.toLowerCase().replace('_', ' ')}</small></b></div><div><span className="text-[9px] text-muted">Started</span><b className="mt-1 block text-xs">{date(subscription.activatedAt)}</b></div><div><span className="text-[9px] text-muted">Plan end date</span><b className="mt-1 block text-xs">{date(subscription.expiresAt)}</b></div><div><span className="text-[9px] text-muted">Auto Pay preference</span><b className="mt-1 block text-xs">{subscription.autoPayEnabled ? 'Enabled' : 'Disabled'}</b></div></div><div className="mt-4 flex flex-wrap gap-2"><Button variant="secondary" disabled={busy} onClick={renew}><RefreshCcw size={13} />Create renewal invoice</Button><Button variant="danger" disabled={busy} onClick={() => setConfirmCancel(true)}>Cancel subscription</Button></div></section> : <section className="rounded-xl border border-line bg-white p-5 text-xs text-muted shadow-soft">There is no active plan linked to your account. Choose an available plan below or contact your organization owner.</section>}
    <header className="pt-2"><h2 className="font-display text-lg font-extrabold">Available plans</h2><p className="mt-1 text-[10px] text-muted">Plan changes take effect after the generated invoice is paid.</p></header>
    {subscription?.plans?.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{subscription.plans.map((plan) => <article key={plan.id} className={`flex flex-col rounded-xl border bg-white p-5 shadow-soft ${plan.isCurrent ? 'border-brand-300 ring-1 ring-brand-100' : 'border-line'}`}><div className="flex items-start justify-between gap-3"><div><h3 className="font-display text-lg font-extrabold">{plan.planName}</h3><p className="mt-1 text-[10px] text-muted">{plan.billingCycle?.replace('_', ' ')}</p></div>{plan.isCurrent && <Badge tone="brand">Current</Badge>}</div><p className="mt-4 font-display text-2xl font-extrabold">{money(plan.price)}<small className="ml-1 text-[10px] font-medium text-muted">/ {plan.billingCycle?.toLowerCase().replace('_', ' ')}</small></p><p className="mt-3 min-h-10 text-[10px] leading-5 text-muted">{plan.description || 'Access the published learning resources in your organization.'}</p><div className="mt-4 flex-1 border-t border-line pt-3"><p className="flex items-center gap-2 text-[10px] text-muted"><Check size={13} className="text-success" />Organization courses unlocked</p>{plan.maxUsers && <p className="mt-2 text-[10px] text-muted">Plan limit: {plan.maxUsers} users</p>}</div><Button variant={plan.isCurrent ? 'secondary' : 'primary'} className="mt-4 w-full" disabled={plan.isCurrent || busy} onClick={() => setSelectedPlan(plan)}>{plan.isCurrent ? 'Current plan' : 'Change to this plan'}</Button></article>)}</div> : <div className="rounded-xl border border-line bg-white p-8 text-center text-xs text-muted">No active plans are available for this organization.</div>}
    <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-3 text-[10px] text-muted"><CreditCard size={14} />Plan payment is sandbox-only. Your subscription updates after a successful invoice payment.</div>
    {selectedPlan && <Modal title={`Change to ${selectedPlan.planName}`} onClose={() => setSelectedPlan(null)}><form className="grid gap-4" onSubmit={changePlan}><p className="text-xs leading-5 text-muted">We’ll create an invoice for {money(selectedPlan.price)}. Your current plan remains active until the new invoice is paid.</p><FormField label="Discount code (optional)" value={discountCode} onChange={(event) => setDiscountCode(event.target.value)} /><div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setSelectedPlan(null)}>Keep current plan</Button><Button disabled={busy}>{busy ? 'Creating invoice…' : 'Create invoice'}</Button></div></form></Modal>}
    {confirmCancel && <ConfirmDialog title="Cancel subscription?" description="Cancellation takes effect immediately and disables Auto Pay preference. You can contact your organization owner if you need to restore access." confirmLabel="Cancel subscription" busy={busy} onCancel={() => setConfirmCancel(false)} onConfirm={cancel} />}
  </div>;
}
