import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, BookOpen, CreditCard, Download, FileUp, Mail, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { api, dataOf } from '../api/client';
import { Badge, Button, ConfirmDialog, DataTable, FormField, Modal, Pagination, SelectField, Toast } from '../components/shared';

const errorText = (error) => error.response?.data?.message || 'Unable to complete this request.';
const statusTone = (status) => status === 'ACTIVE' || status === 'APPROVED' || status === 'SUCCEEDED' ? 'success' : status === 'INACTIVE' || status === 'REJECTED' || status === 'BLOCKED' ? 'danger' : 'warning';
const inviteTone = (status) => ['ACTIVE', 'active'].includes(status) ? 'success' : ['INVITED', 'invited'].includes(status) ? 'brand' : ['INVITE_FAILED'].includes(status) ? 'danger' : 'warning';
const inviteLabel = (status) => ({ INVITED: 'Invited', invited: 'Invited', ACTIVE: 'Active', active: 'Active', INVITE_FAILED: 'Invite failed', EXPIRED: 'Expired', not_invited: 'Not invited' }[status] || 'Not invited');
const date = (value) => value ? new Date(value).toLocaleDateString() : '—';

export default function StudentsPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [tab, setTab] = useState('students');
  const [filters, setFilters] = useState({ search: '', status: '', registrationStatus: '' });
  const [draft, setDraft] = useState({ search: '', status: '', registrationStatus: '' });
  const [plans, setPlans] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState({ message: '', type: 'success' });
  const [modal, setModal] = useState('');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [reason, setReason] = useState('');
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [deleting, setDeleting] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [bulkResults, setBulkResults] = useState([]);
  const uploadRef = useRef(null);
  const show = (message, type = 'success') => setNotice({ message, type });
  const toast = <Toast message={notice.message} type={notice.type} onClose={() => setNotice({ message: '', type: 'success' })} />;

  const load = useCallback(async (nextPage = page) => {
    setLoading(true); setError('');
    try {
      const path = tab === 'registrations' ? '/owner/students/registrations' : '/owner/students';
      const params = { page: nextPage, size: 10, ...(filters.search ? { search: filters.search } : {}), ...(filters.status ? { status: filters.status } : {}), ...(filters.registrationStatus && tab !== 'registrations' ? { registrationStatus: filters.registrationStatus } : {}) };
      const response = await api.get(path, { params });
      setRows(dataOf(response) || []); setTotal(Number(response.headers['x-total-count'] || 0)); setPage(nextPage);
    } catch (failure) { setError(errorText(failure)); }
    finally { setLoading(false); }
  }, [filters, page, tab]);
  useEffect(() => { load(0); }, [filters, tab]);
  useEffect(() => {
    Promise.all([api.get('/owner/subscriptions', { params: { page: 0, size: 100 } }), api.get('/owner/courses', { params: { page: 0, size: 100 } })])
      .then(([planResponse, courseResponse]) => { setPlans(dataOf(planResponse) || []); setCourses((dataOf(courseResponse) || []).filter((course) => course.status === 'PUBLISHED')); })
      .catch((failure) => setError(errorText(failure)));
  }, []);

  function applyFilters(event) { event.preventDefault(); setPage(0); setFilters({ ...draft, search: draft.search.trim() }); }
  function openCreate() { setSelected(null); setForm({ fullName: '', email: '', phone: '', subscriptionId: '', sendInvite: true }); setSelectedCourses([]); setFieldErrors({}); setError(''); setModal('edit'); }
  function openEdit(row) { setSelected(row); setForm({ fullName: row.fullName, email: row.email, phone: row.phone || '', subscriptionId: row.subscriptionId || '', status: ['ACTIVE', 'TRIALING', 'SUSPENDED', 'INACTIVE'].includes(row.status) ? row.status : '' }); setFieldErrors({}); setError(''); setModal('edit'); }
  async function saveStudent(event) {
    event.preventDefault(); setBusy(true); setError(''); setFieldErrors({});
    const body = selected
      ? { ...form, subscriptionId: form.subscriptionId || null }
      : { name: form.fullName, email: form.email, phone: form.phone, subscriptionId: form.subscriptionId || null, courseIds: selectedCourses, sendInvite: form.sendInvite };
    if (!selected) delete body.status;
    if (!body.status) delete body.status;
    try {
      if (selected) {
        await api.put(`/owner/students/${selected.id}`, body);
        show('Student details updated.');
      } else {
        await api.post('/owner/students', body);
        show(form.sendInvite ? 'Student created and invitation sent.' : 'Student created without an invitation.');
      }
      setModal(''); await load(selected ? page : 0);
    } catch (failure) {
      setError(errorText(failure)); setFieldErrors(failure.response?.data?.fieldErrors || {});
      if (!selected && failure.response?.status === 502 && failure.response?.data?.data?.id) {
        setModal('');
        await load(0);
        show(errorText(failure), 'error');
      }
    }
    finally { setBusy(false); }
  }
  async function toggleStatus(row) {
    if (row.accessBlocked) {
      show('This account is blocked by an administrator. Only an administrator can restore access.', 'error');
      return;
    }
    setBusy(true);
    try { await api.patch(`/owner/students/${row.id}/status`, { status: row.status === 'INACTIVE' || row.status === 'BLOCKED' ? 'ACTIVE' : 'INACTIVE' }); show(row.status === 'INACTIVE' || row.status === 'BLOCKED' ? 'Student activated.' : 'Student deactivated.'); await load(page); }
    catch (failure) { show(errorText(failure), 'error'); }
    finally { setBusy(false); }
  }
  async function invite(row) {
    setBusy(true);
    try { await api.post(`/owner/students/${row.id}/resend-invite`, {}); show('Invitation resent.'); await load(page); }
    catch (failure) { if (failure.response?.status === 502) await load(page); show(errorText(failure), 'error'); }
    finally { setBusy(false); }
  }
  async function resetPassword(row) {
    setBusy(true);
    try { await api.post(`/owner/students/${row.id}/reset-password`, {}); show('Password reset invitation sent.'); await load(page); }
    catch (failure) { if (failure.response?.status === 502) await load(page); show(errorText(failure), 'error'); }
    finally { setBusy(false); }
  }
  async function runPendingAction() {
    const action = pendingAction;
    setPendingAction(null);
    if (!action) return;
    if (action.type === 'resend') await invite(action.row);
    if (action.type === 'reset') await resetPassword(action.row);
    if (action.type === 'deactivate') await toggleStatus(action.row);
  }
  async function importCsv(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true); setError('');
    try {
      const response = await api.post('/owner/students/bulk', await file.text(), { headers: { 'Content-Type': 'text/csv' } });
      setBulkResults(dataOf(response)?.results || []);
      setModal('bulk');
      await load(0);
    } catch (failure) { show(errorText(failure), 'error'); }
    finally { setBusy(false); }
  }
  async function approve(row) {
    setBusy(true);
    try { await api.patch(`/owner/students/${row.id}/approve`, {}); show('Registration approved and invitation sent.'); await load(page); }
    catch (failure) { show(errorText(failure), 'error'); }
    finally { setBusy(false); }
  }
  async function reject() {
    if (!selected) return;
    setBusy(true);
    try { await api.patch(`/owner/students/${selected.id}/reject`, { reason: reason.trim() }); setModal(''); setReason(''); show('Registration rejected.'); await load(page); }
    catch (failure) { setError(errorText(failure)); }
    finally { setBusy(false); }
  }
  async function openCourses(row) {
    setSelected(row); setError(''); setModal('courses');
    try { const response = await api.get(`/owner/students/${row.id}/courses`); setSelectedCourses((dataOf(response) || []).map((course) => course.id)); }
    catch (failure) { setError(errorText(failure)); }
  }
  async function saveCourses() {
    if (!selected) return;
    setBusy(true);
    try { await api.put(`/owner/students/${selected.id}/courses`, { courseIds: selectedCourses }); setModal(''); show('Course assignment saved. Published courses remain unlocked for students.'); }
    catch (failure) { setError(errorText(failure)); }
    finally { setBusy(false); }
  }
  async function openPayments(row) {
    setSelected(row); setModal('payments'); setPayments([]); setError('');
    try { const response = await api.get(`/owner/students/${row.id}/payments`); setPayments(dataOf(response) || []); }
    catch (failure) { setError(errorText(failure)); }
  }
  async function sendNotification(event) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    try { await api.post(`/owner/students/${selected.id}/notifications`, { subject: form.subject, message: form.message }); setModal(''); show('Notification queued for the student.'); }
    catch (failure) { setError(errorText(failure)); }
    finally { setBusy(false); }
  }
  async function deleteStudent() {
    if (!deleting) return;
    setBusy(true);
    try { await api.delete(`/owner/students/${deleting.id}`); setDeleting(null); show('Student account deleted. Billing and payment records are retained.'); await load(page); }
    catch (failure) { show(errorText(failure), 'error'); }
    finally { setBusy(false); }
  }
  function openNotification(row) { setSelected(row); setForm({ subject: '', message: '' }); setError(''); setModal('notify'); }
  function exportCsv() {
    const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, value]) => value)));
    window.location.assign(`${api.defaults.baseURL}/owner/students/export.csv${params.size ? `?${params}` : ''}`);
  }
  const paymentColumns = [
    { key: 'reference', label: 'Reference' },
    { key: 'amount', label: 'Amount', render: (item) => `${item.currency} ${Number(item.amount).toFixed(2)}` },
    { key: 'provider', label: 'Provider' },
    { key: 'paidAt', label: 'Paid date', render: (item) => date(item.paidAt) },
    { key: 'status', label: 'Status', render: (item) => <Badge tone={statusTone(item.status)}>{item.status}</Badge> },
  ];
  const studentColumns = [
    { key: 'fullName', label: 'Student', render: (row) => <span><b className="block">{row.fullName}</b><small className="text-[9px] text-muted">{row.email}</small></span> },
    { key: 'planName', label: 'Plan' },
    { key: 'status', label: 'Account', render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge> },
    { key: 'registrationStatus', label: 'Registration', render: (row) => <Badge tone={statusTone(row.registrationStatus)}>{row.registrationStatus}</Badge> },
    { key: 'inviteStatus', label: 'Invitation', render: (row) => <Badge tone={inviteTone(row.inviteStatus)}>{inviteLabel(row.inviteStatus)}</Badge> },
    { key: 'createdAt', label: 'Added', render: (row) => date(row.createdAt) },
  ];
  const actionsFor = (row) => <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
    <button className="min-h-8 text-[10px] font-semibold text-brand-700" onClick={() => openEdit(row)}>Edit</button>
    {row.registrationStatus === 'APPROVED' && row.status !== 'INACTIVE' && !row.accessBlocked && (row.mustChangePassword || row.inviteStatus === 'invited') && <button className="inline-flex min-h-8 items-center gap-1 text-[10px] font-semibold text-brand-700" onClick={() => setPendingAction({ type: 'resend', row })}><Mail size={12} />Resend invite</button>}
    {row.registrationStatus === 'APPROVED' && row.status === 'ACTIVE' && !row.mustChangePassword && <button className="min-h-8 text-[10px] font-semibold text-brand-700" onClick={() => setPendingAction({ type: 'reset', row })}>Reset password</button>}
    <button className="inline-flex min-h-8 items-center gap-1 text-[10px] font-semibold text-brand-700" onClick={() => openCourses(row)}><BookOpen size={12} />Courses</button>
    <button className="inline-flex min-h-8 items-center gap-1 text-[10px] font-semibold text-brand-700" onClick={() => openPayments(row)}><CreditCard size={12} />Payments</button>
    <button className="inline-flex min-h-8 items-center gap-1 text-[10px] font-semibold text-brand-700" onClick={() => openNotification(row)}><Bell size={12} />Notify</button>
    {row.registrationStatus === 'PENDING' && <><button disabled={busy} className="min-h-8 text-[10px] font-bold text-emerald-700" onClick={() => approve(row)}>Approve</button><button className="min-h-8 text-[10px] font-semibold text-red-600" onClick={() => { setSelected(row); setReason(''); setError(''); setModal('reject'); }}>Reject</button></>}
    {!row.accessBlocked && row.registrationStatus === 'APPROVED' && (row.status === 'INACTIVE' ? <button className="min-h-8 text-[10px] font-semibold text-muted" onClick={() => toggleStatus(row)}>Activate</button> : <button className="min-h-8 text-[10px] font-semibold text-muted" onClick={() => setPendingAction({ type: 'deactivate', row })}>Deactivate</button>)}
    {row.accessBlocked && <span className="text-[10px] font-semibold text-red-600">Blocked by admin</span>}
    <button aria-label={`Delete ${row.fullName}`} className="grid min-h-8 min-w-8 place-items-center text-red-600" onClick={() => setDeleting(row)}><Trash2 size={13} /></button>
  </div>;

  return <div className="space-y-4">{toast}
    <header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="font-display text-2xl font-extrabold">Students</h1><p className="mt-1 text-xs text-muted">Manage student accounts, registration reviews, plans, courses, and communication.</p></div><div className="flex gap-2"><input ref={uploadRef} type="file" accept=".csv,text/csv" className="hidden" onChange={importCsv} /><Button variant="secondary" disabled={busy} onClick={() => uploadRef.current?.click()}><FileUp size={13} />Import CSV</Button><Button variant="secondary" onClick={exportCsv}><Download size={13} />Export CSV</Button><Button onClick={openCreate}><Plus size={14} />Invite student</Button></div></header>
    {error && !modal && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}
    <div className="flex gap-2">{[['students', 'All students'], ['registrations', `Student registrations${tab === 'registrations' ? ` (${total})` : ''}`]].map(([key, label]) => <button key={key} onClick={() => { setPage(0); setTab(key); }} className={`rounded-lg px-3 py-2 text-[10px] font-bold ${tab === key ? 'bg-brand-600 text-white' : 'border border-line bg-white text-muted'}`}>{label}</button>)}</div>
    <form onSubmit={applyFilters} className="grid gap-2 rounded-xl border border-line bg-white p-3 shadow-soft sm:grid-cols-2 xl:grid-cols-4"><label className="relative xl:col-span-2"><span className="mb-1.5 block text-[10px] font-semibold">Search students</span><Search size={13} className="absolute left-3 top-[33px] text-muted" /><input value={draft.search} onChange={(event) => setDraft({ ...draft, search: event.target.value })} placeholder="Name, email, or phone" className="h-10 w-full rounded-lg border border-line pl-9 pr-3 text-xs" /></label><SelectField label="Account status" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option value="">All statuses</option>{['ACTIVE', 'TRIALING', 'SUSPENDED', 'INACTIVE', 'BLOCKED', 'PENDING'].map((status) => <option key={status}>{status}</option>)}</SelectField><div className="flex items-end gap-2"><SelectField label="Registration" value={draft.registrationStatus} onChange={(event) => setDraft({ ...draft, registrationStatus: event.target.value })}><option value="">All registrations</option>{['PENDING', 'APPROVED', 'REJECTED'].map((status) => <option key={status}>{status}</option>)}</SelectField><Button>Filter</Button></div></form>
    <section className="overflow-hidden rounded-xl border border-line bg-white shadow-soft"><div className="flex items-center justify-between border-b border-line px-4 py-3"><span className="text-[10px] font-semibold text-muted">{total} students in this organization</span><button aria-label="Refresh students" onClick={() => load(0)} className="rounded-md p-2 text-muted hover:bg-slate-50"><RefreshCw size={14} /></button></div>
      {loading ? <div className="p-10 text-center text-xs text-muted">Loading…</div> : rows.length ? <>
        <div className="hidden sm:block"><DataTable rows={rows} columns={studentColumns} actions={actionsFor} /></div>
        <div className="divide-y divide-line sm:hidden">{rows.map((row) => <article key={row.id} className="space-y-3 p-4"><div className="min-w-0"><h2 className="truncate text-sm font-bold">{row.fullName}</h2><p className="truncate text-xs text-muted">{row.email}</p></div><div className="flex flex-wrap gap-2"><Badge tone={statusTone(row.status)}>{row.status}</Badge><Badge tone={statusTone(row.registrationStatus)}>{row.registrationStatus}</Badge><Badge tone={inviteTone(row.inviteStatus)}>{inviteLabel(row.inviteStatus)}</Badge></div><div className="flex items-center justify-between text-[10px] text-muted"><span>{row.planName || 'No plan'}</span><span>{date(row.createdAt)}</span></div>{actionsFor(row)}</article>)}</div>
      </> : <div className="p-10 text-center text-xs text-muted">{tab === 'registrations' ? 'No pending registrations.' : 'No students match these filters.'}</div>}
      <Pagination page={page} total={total} size={10} onPage={load} />
    </section>
    {modal === 'edit' && <Modal title={selected ? 'Edit student' : 'Create a student'} onClose={() => setModal('')}><form className="grid gap-3" onSubmit={saveStudent}><FormField label="Full name" required value={form.fullName || ''} error={fieldErrors.fullName || fieldErrors.name} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /><FormField label="Email address" type="email" required value={form.email || ''} error={fieldErrors.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /><FormField label="Phone number" value={form.phone || ''} onChange={(event) => setForm({ ...form, phone: event.target.value })} /><SelectField label="Subscription plan" value={form.subscriptionId || ''} onChange={(event) => setForm({ ...form, subscriptionId: event.target.value })}><option value="">No plan assigned</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.planName}</option>)}</SelectField>{!selected && courses.length > 0 && <fieldset className="grid gap-2"><legend className="mb-1 text-xs font-semibold">Course assignments (optional)</legend>{courses.map((course) => <label key={course.id} className="flex min-h-10 items-center gap-2 rounded-lg border border-line px-3 text-xs"><input type="checkbox" checked={selectedCourses.includes(course.id)} onChange={(event) => setSelectedCourses(event.target.checked ? [...selectedCourses, course.id] : selectedCourses.filter((id) => id !== course.id))} /><span>{course.courseName}</span></label>)}</fieldset>}{selected?.registrationStatus === 'APPROVED' && <SelectField label="Account status" value={form.status || 'ACTIVE'} onChange={(event) => setForm({ ...form, status: event.target.value })}>{['ACTIVE', 'TRIALING', 'SUSPENDED', 'INACTIVE'].map((status) => <option key={status}>{status}</option>)}</SelectField>}{!selected && <label className="flex min-h-11 items-center gap-3 rounded-lg border border-line px-3 text-xs font-semibold"><input type="checkbox" checked={form.sendInvite !== false} onChange={(event) => setForm({ ...form, sendInvite: event.target.checked })} /><span>Send invitation email</span></label>}{error && <div role="alert" className="text-xs text-red-600">{error}</div>}<p className="text-[10px] leading-4 text-muted">{selected ? 'Changes apply to the existing student record.' : form.sendInvite ? 'The temporary password expires in 72 hours and must be changed on first sign-in.' : 'The student will be created without an invitation; you can send it later.'}</p><div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setModal('')}>Cancel</Button><Button disabled={busy}>{busy ? 'Saving…' : selected ? 'Save changes' : form.sendInvite ? 'Create and invite' : 'Create student'}</Button></div></form></Modal>}
    {modal === 'reject' && selected && <Modal title="Reject registration" onClose={() => setModal('')}><form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); reject(); }}><p className="text-xs text-muted">A reason is required and will be recorded for {selected.fullName}.</p><label className="grid gap-1.5 text-xs font-semibold">Reason<textarea required minLength="1" maxLength="1000" value={reason} onChange={(event) => setReason(event.target.value)} className="min-h-24 rounded-lg border border-line p-3 text-xs" /></label>{error && <p role="alert" className="text-[10px] text-red-600">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setModal('')}>Cancel</Button><Button variant="danger" disabled={busy || !reason.trim()}>{busy ? 'Rejecting…' : 'Reject registration'}</Button></div></form></Modal>}
    {modal === 'courses' && selected && <Modal title={`Assign courses · ${selected.fullName}`} onClose={() => setModal('')}><p className="mb-3 text-[10px] leading-4 text-muted">Assignment tracks the student's progress. All published organization courses remain unlocked in the student portal.</p><div className="max-h-72 space-y-2 overflow-y-auto">{courses.length ? courses.map((course) => <label key={course.id} className="flex items-center gap-2 rounded-lg border border-line p-3 text-xs"><input type="checkbox" checked={selectedCourses.includes(course.id)} onChange={(event) => setSelectedCourses(event.target.checked ? [...selectedCourses, course.id] : selectedCourses.filter((id) => id !== course.id))} /><span><b className="block">{course.courseName}</b><small className="text-[9px] text-muted">{course.courseCode}</small></span></label>) : <div className="p-5 text-center text-xs text-muted">No published courses available.</div>}</div>{error && <p role="alert" className="mt-3 text-[10px] text-red-600">{error}</p>}<div className="mt-4 flex justify-end gap-2"><Button variant="secondary" onClick={() => setModal('')}>Cancel</Button><Button disabled={busy} onClick={saveCourses}>{busy ? 'Saving…' : 'Save assignments'}</Button></div></Modal>}
    {modal === 'payments' && selected && <Modal title={`Payment history · ${selected.fullName}`} onClose={() => setModal('')}><DataTable rows={payments} empty="No payments have been recorded for this student." columns={paymentColumns} /></Modal>}
    {modal === 'notify' && selected && <Modal title={`Notify ${selected.fullName}`} onClose={() => setModal('')}><form className="grid gap-3" onSubmit={sendNotification}><FormField label="Subject" required maxLength="200" value={form.subject || ''} onChange={(event) => setForm({ ...form, subject: event.target.value })} /><label className="grid gap-1.5 text-xs font-semibold">Message<textarea required maxLength="5000" value={form.message || ''} onChange={(event) => setForm({ ...form, message: event.target.value })} className="min-h-28 rounded-lg border border-line p-3 text-xs" /></label>{error && <p role="alert" className="text-[10px] text-red-600">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setModal('')}>Cancel</Button><Button disabled={busy}>{busy ? 'Sending…' : 'Send notification'}</Button></div></form></Modal>}
    {modal === 'bulk' && <Modal title="CSV import results" onClose={() => setModal('')}><div className="mb-3 text-xs text-muted">{bulkResults.filter((item) => item.status === 'created').length} created · {bulkResults.filter((item) => item.status === 'duplicate').length} duplicates · {bulkResults.filter((item) => item.status === 'invalid').length} invalid · {bulkResults.filter((item) => item.status === 'email_failed').length} email failed</div><div className="max-h-[55vh] overflow-auto"><DataTable rows={bulkResults} getRowKey={(row) => `${row.row}-${row.email}`} columns={[{ key: 'row', label: 'CSV row' }, { key: 'email', label: 'Email' }, { key: 'status', label: 'Result', render: (row) => <Badge tone={row.status === 'created' ? 'success' : row.status === 'email_failed' ? 'danger' : 'warning'}>{row.status.replace('_', ' ')}</Badge> }, { key: 'fieldErrors', label: 'Details', render: (row) => row.message || Object.values(row.fieldErrors || {}).join(', ') || '—' }]} /></div><div className="mt-4 flex justify-end"><Button onClick={() => setModal('')}>Done</Button></div></Modal>}
    {pendingAction && <ConfirmDialog title={pendingAction.type === 'resend' ? 'Resend invitation?' : pendingAction.type === 'reset' ? 'Reset student password?' : 'Deactivate student?'} description={pendingAction.type === 'resend' ? `A new temporary password will be emailed to ${pendingAction.row.email}; the previous one will stop working.` : pendingAction.type === 'reset' ? `${pendingAction.row.fullName} will receive a new temporary password and must change it at next sign-in.` : `${pendingAction.row.fullName} will lose access and all active student sessions will be removed.`} confirmLabel={pendingAction.type === 'resend' ? 'Resend invitation' : pendingAction.type === 'reset' ? 'Reset password' : 'Deactivate'} busy={busy} onCancel={() => setPendingAction(null)} onConfirm={runPendingAction} />}
    {deleting && <ConfirmDialog title="Delete student account?" description={`This removes ${deleting.fullName}'s account and access. Invoices and payment history will be retained.`} confirmLabel="Delete student" busy={busy} onCancel={() => setDeleting(null)} onConfirm={deleteStudent} />}
  </div>;
}
