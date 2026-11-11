import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ChevronDown, FileText, Mail, Upload, UserRound, X } from 'lucide-react';
import { adminApi, api, dataOf } from '../api/client';
import { Button, FormField, SelectField, TextAreaField, Toast } from '../components/shared';
import { getRegistrationFieldErrors, validateRegistrationDocument } from './registrationValidation';

const draftKey = 'hiikky-owner-registration-saved-draft';
const submissionKey = 'hiikky-owner-registration-submission';
const emptyForm = {
  organizationName: '',
  organizationEmail: '',
  organizationPhone: '',
  organizationAddress: '',
  industry: 'E-Learning',
  projectedStudentCount: '500',
  operatingRegion: 'North America',
};

function readSavedDraft() {
  try {
    return JSON.parse(localStorage.getItem(draftKey) || 'null');
  } catch {
    return null;
  }
}

function readAccountDraft() {
  try {
    const signupDraft = JSON.parse(sessionStorage.getItem('hiikky-owner-registration-draft') || 'null');
    const savedDraft = readSavedDraft();
    const previous = JSON.parse(sessionStorage.getItem(submissionKey) || 'null');
    if (!signupDraft && !savedDraft?.account && !previous?.account) return null;
    return { ...previous?.account, ...savedDraft?.account, ...signupDraft };
  } catch {
    return null;
  }
}

function ActionDialog({ title, onClose }) {
  const isSupport = title === 'Support';
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section role="dialog" aria-modal="true" aria-labelledby="registration-dialog-title" className="w-full max-w-md rounded-xl border border-line bg-white p-5 shadow-card">
      <div className="flex items-center justify-between"><h2 id="registration-dialog-title" className="font-display text-base font-bold">{title}</h2><button type="button" aria-label="Close dialog" onClick={onClose} className="rounded-md p-1 text-muted hover:bg-slate-100"><X size={17}/></button></div>
      <p className="mt-3 text-xs leading-5 text-muted">{isSupport ? <>Our onboarding team can help with your application. Email <a className="font-semibold text-brand-700" href="mailto:support@hiikky.com">support@hiikky.com</a>.</> : `${title} content is not available in this portal yet. Contact Support for a copy.`}</p>
      <div className="mt-5 flex justify-end"><Button type="button" onClick={onClose}>Close</Button></div>
    </section>
  </div>;
}

export function RegistrationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInput = useRef(null);
  const [draft] = useState(readAccountDraft);
  const [savedDraft] = useState(readSavedDraft);
  const [previousSubmission] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(submissionKey) || 'null'); } catch { return null; }
  });
  const [plans, setPlans] = useState([]);
  const [plan, setPlan] = useState(savedDraft?.plan || '');
  const [form, setForm] = useState({ ...emptyForm, ...(searchParams.has('resubmit') ? previousSubmission?.form : null), ...savedDraft?.form });
  const [documentSkipped, setDocumentSkipped] = useState(true);
  const [documentFile, setDocumentFile] = useState(null);
  const [documentError, setDocumentError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [dialog, setDialog] = useState('');
  const requiredErrors = getRegistrationFieldErrors(draft, form);
  const canSubmit = !busy && Object.keys(requiredErrors).length === 0;

  useEffect(() => {
    let active = true;
    api.get('/owner/registrations/plans').then((response) => {
      if (!active) return;
      const availablePlans = dataOf(response) || [];
      setPlans(availablePlans);
      setPlan((current) => current || availablePlans[0]?.planName || '');
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  function change(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setError('');
  }

  function chooseDocument(file) {
    if (!file) return;
    const validationError = validateRegistrationDocument(file);
    setDocumentError(validationError);
    if (validationError) return;
    setDocumentFile(file);
    setDocumentSkipped(false);
  }

  function toggleDocumentSkip() {
    if (!documentSkipped) {
      setDocumentFile(null);
      if (fileInput.current) fileInput.current.value = '';
      setDocumentError('');
      setDocumentSkipped(true);
      return;
    }
    setDocumentSkipped(false);
  }

  function saveForLater() {
    localStorage.setItem(draftKey, JSON.stringify({ account: draft, form, plan, documentsSkipped: true }));
    setToast(documentFile ? 'Draft saved. Reattach the selected document when you return.' : 'Registration draft saved.');
  }

  async function submit(event) {
    event.preventDefault();
    const errors = getRegistrationFieldErrors(draft, form);
    setFieldErrors(errors);
    setError('');
    if (Object.keys(errors).length) {
      setError('Complete the required fields before submitting.');
      return;
    }
    setBusy(true);
    try {
      const csrf = await adminApi.get('/admin/auth/csrf');
      const requestBody = new FormData();
      const values = {
        ...draft, ...form, businessType: form.industry, region: form.operatingRegion,
        projectedStudentCount: form.projectedStudentCount, subscriptionTier: plan || '', documentsSkipped: !documentFile && documentSkipped,
      };
      Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== null) requestBody.append(key, String(value)); });
      if (documentFile) requestBody.append('document', documentFile, documentFile.name);
      const result = await adminApi.post('/organization-registration-applications', requestBody, { headers: { 'X-CSRF-TOKEN': dataOf(csrf).token } });
      const application = dataOf(result);
      sessionStorage.setItem(submissionKey, JSON.stringify({ ...application, status: 'PENDING', organizationName: form.organizationName, account: draft, form }));
      sessionStorage.removeItem('hiikky-owner-registration-draft');
      localStorage.removeItem(draftKey);
      navigate('/owner/registration/verification', { replace: true });
    } catch (requestError) {
      const status = requestError.response?.status;
      const responseData = requestError.response?.data;
      setFieldErrors(responseData?.fieldErrors || {});
      if (status === 409) setError('An application or account with this email or organization already exists.');
      else if (status === 429) setError('Too many attempts. Please try again later.');
      else if (status === 413) setDocumentError(responseData?.fieldErrors?.document || 'The document exceeds the 5 MB upload limit.');
      else if (status === 400) setError(Object.keys(responseData?.fieldErrors || {}).length ? 'Please correct the highlighted fields.' : responseData?.message || 'The registration details or document are invalid.');
      else if (!status) setError('Could not connect to the registration service. Check that the Admin API is running and try again.');
      else if (status >= 500) setError('The registration service encountered an unexpected error. Please try again later.');
      else setError(responseData?.message || `Registration could not be completed (HTTP ${status}).`);
    } finally {
      setBusy(false);
    }
  }

  if (!draft) return <div className="grid min-h-screen place-items-center p-5"><div className="rounded-xl border bg-white p-8 text-center"><p className="text-sm">Start with your business signup details.</p><Button className="mt-4" onClick={() => navigate('/owner/signup')}>Back to signup</Button></div></div>;

  return <div className="min-h-screen bg-[#f3f4f9] p-4 sm:p-8">
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-4 font-display text-xl font-bold">▣ Business Registration Request</h1>
      <div className="overflow-hidden rounded-xl border-4 border-brand-500 bg-white shadow-soft">
        <header className="flex h-12 items-center justify-between border-b border-line px-5 text-[10px]">
          <b>◈ HIIKKY Business</b>
          <nav aria-label="Registration navigation" className="hidden items-center gap-8 sm:flex"><a className="font-bold text-brand-600" href="#business-form">Registration</a><button type="button" className="text-muted hover:text-brand-700" onClick={() => setDialog('Support')}>Support</button></nav>
          <div className="relative">
            <button type="button" aria-label="Account menu" aria-expanded={avatarOpen} onClick={() => setAvatarOpen((open) => !open)} className="grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">{draft.firstName?.[0]?.toUpperCase() || <UserRound size={15}/>}<ChevronDown className="absolute ml-8 text-muted" size={12}/></button>
            {avatarOpen && <div className="absolute right-0 top-10 z-20 w-52 rounded-lg border border-line bg-white p-3 text-xs shadow-card"><b className="block truncate">{draft.ownerEmail}</b><button type="button" onClick={saveForLater} className="mt-3 w-full rounded-md px-2 py-2 text-left text-muted hover:bg-slate-50">Save draft</button><button type="button" onClick={() => navigate('/owner/signup')} className="w-full rounded-md px-2 py-2 text-left text-muted hover:bg-slate-50">Return to signup</button></div>}
          </div>
        </header>
        <div className="flex items-center gap-2 px-5 py-4 text-[9px] font-bold uppercase tracking-wider text-brand-700"><span className="rounded-full bg-brand-600 px-2 py-1 text-white">1 Account Created</span><span className="h-px flex-1 bg-brand-200"/><span className="rounded-full bg-brand-600 px-2 py-1 text-white">2 Business Details</span><span className="h-px flex-1 bg-line"/><span className="text-slate-300">3 Verification</span></div>
        <div className="grid gap-5 px-5 pb-6 lg:grid-cols-[250px_1fr]">
          <aside className="grid content-start gap-4"><div className="rounded-xl bg-gradient-to-br from-brand-700 to-brand-600 p-5 text-white"><CheckCircle2 size={20}/><h2 className="mt-3 text-sm font-bold">Empowering your institution.</h2><p className="mt-2 text-[10px] leading-5 text-violet-100">HIIKKY helps organizations scale their digital learning with centralized business administration.</p><ul className="mt-4 grid gap-2 text-[9px]"><li>✓ Instant deployment of course catalogs</li><li>✓ Centralized student performance tracking</li><li>✓ Custom branding and white-label options</li></ul></div><div className="rounded-lg bg-brand-50 p-4 text-[10px]"><b>Need assistance?</b><p className="mt-1 text-muted">Our onboarding specialists can help you complete your workspace setup.</p><button type="button" className="mt-2 inline-flex items-center gap-1 font-semibold text-brand-700" onClick={() => setDialog('Support')}><Mail size={12}/> Contact Support</button></div></aside>
          <form id="business-form" onSubmit={submit} className="grid gap-4 rounded-xl border border-line p-5 sm:p-6">
            <div><h2 className="font-display text-base font-bold">Business Application</h2><p className="mt-1 text-[10px] text-muted">Provide the details of your organization for Admin review.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Legal Company Name" value={form.organizationName} onChange={(event) => change('organizationName', event.target.value)} error={fieldErrors.organizationName} required/>
              <SelectField label="Business Type" value={form.industry} error={fieldErrors.businessType || fieldErrors.industry} onChange={(event) => change('industry', event.target.value)}><option>E-Learning</option><option>Education</option><option>Professional Training</option><option>Other</option></SelectField>
              <FormField label="Projected Student Count" type="number" min="0" step="1" value={form.projectedStudentCount} onChange={(event) => change('projectedStudentCount', event.target.value)} error={fieldErrors.projectedStudentCount} required/>
              <SelectField label="Primary Operating Region" value={form.operatingRegion} error={fieldErrors.region || fieldErrors.operatingRegion} onChange={(event) => change('operatingRegion', event.target.value)}><option>North America</option><option>Europe</option><option>Asia Pacific</option><option>Latin America</option><option>Middle East & Africa</option></SelectField>
              <FormField label="Organization Email" type="email" value={form.organizationEmail} onChange={(event) => change('organizationEmail', event.target.value)} error={fieldErrors.organizationEmail} required/>
              <FormField label="Organization Phone" type="tel" value={form.organizationPhone} error={fieldErrors.organizationPhone} onChange={(event) => change('organizationPhone', event.target.value)}/>
              <TextAreaField label="Organization Address" className="sm:col-span-2" value={form.organizationAddress} error={fieldErrors.organizationAddress} onChange={(event) => change('organizationAddress', event.target.value)} rows={2}/>
            </div>
            {Object.entries(fieldErrors).filter(([key]) => !['organizationName', 'organizationEmail', 'projectedStudentCount'].includes(key)).map(([key, message]) => <p key={key} role="alert" className="text-[10px] text-red-600">{String(message)}</p>)}
            <section aria-labelledby="subscription-heading"><h3 id="subscription-heading" className="mb-2 text-[10px] font-bold">Choose Your Subscription Tier</h3><div className="grid gap-3 sm:grid-cols-2">{plans.length ? plans.map((entry) => <label key={entry.id} className={`cursor-pointer rounded-lg border p-4 ${plan === entry.planName ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-300' : 'border-line'}`}><input type="radio" name="plan" value={entry.planName} checked={plan === entry.planName} onChange={() => setPlan(entry.planName)} className="sr-only"/><span className="font-display text-sm font-bold">{entry.planName}</span><span className="mt-1 block text-[10px] text-muted">{entry.description}</span><span className="mt-3 block font-display text-lg font-extrabold">${entry.price}<small className="text-[9px] font-normal text-muted"> / {entry.billingCycle.toLowerCase()}</small></span></label>) : <div className="rounded-lg border border-dashed border-line p-4 text-[10px] text-muted sm:col-span-2">Subscription options will appear when the platform owner publishes plans.</div>}</div></section>
            <section aria-label="Document upload" className="grid gap-2 rounded-lg bg-brand-50 p-3 text-[10px] sm:grid-cols-[1fr_auto_auto] sm:items-center">
              <div><b>Document Upload</b><span className="ml-2 text-muted">Optional. PDF, JPG, or PNG, up to 5 MB.</span><p className="mt-1 text-muted" aria-live="polite">{documentFile ? <span className="inline-flex items-center gap-1"><FileText size={12}/>File attached: {documentFile.name}</span> : documentSkipped ? 'Skipped' : 'No file selected'}</p></div>
              <input ref={fileInput} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="sr-only" aria-label="Choose a registration document" onChange={(event) => chooseDocument(event.target.files?.[0])}/>
              <div className="flex items-center gap-2"><button type="button" onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-3 py-1.5 font-semibold text-ink hover:bg-slate-50"><Upload size={13}/>Choose file</button>{documentFile && <button type="button" aria-label="Remove attached document" onClick={() => { setDocumentFile(null); setDocumentSkipped(true); setDocumentError(''); if (fileInput.current) fileInput.current.value = ''; }} className="rounded-md p-1.5 text-muted hover:bg-white hover:text-red-600"><X size={15}/></button>}</div>
              <button type="button" aria-pressed={documentSkipped} onClick={toggleDocumentSkip} className={`rounded-md px-3 py-1.5 font-semibold ${documentSkipped ? 'bg-white text-brand-700 shadow-sm' : 'text-brand-600 hover:bg-white/70'}`}>{documentSkipped ? 'Skipped for now' : 'Skip for now'}</button>
              {documentError && <p role="alert" className="text-red-600 sm:col-span-3">{documentError}</p>}
            </section>
            {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-[10px] text-red-700">{error}</p>}
            <div className="flex items-center justify-between gap-3"><button type="button" onClick={saveForLater} className="text-[10px] font-semibold text-muted hover:text-brand-700">Save for Later</button><Button type="submit" disabled={!canSubmit}>{busy ? 'Submitting…' : 'Submit for Review'} <ArrowRight size={14}/></Button></div>
          </form>
        </div>
        <footer className="flex flex-wrap justify-between gap-3 border-t border-line bg-brand-50 px-5 py-3 text-[8px] text-muted"><span>© 2024 HIIKKY Technologies. Secure Merchant Onboarding.</span><span className="flex gap-4"><button type="button" onClick={() => setDialog('Privacy Policy')} className="hover:text-brand-700">Privacy Policy</button><button type="button" onClick={() => setDialog('Terms of Service')} className="hover:text-brand-700">Terms of Service</button></span></footer>
      </div>
    </div>
    {dialog && <ActionDialog title={dialog} onClose={() => setDialog('')}/>}
    <Toast message={toast} onClose={() => setToast('')}/>
  </div>;
}

export function VerificationPage() {
  const navigate = useNavigate();
  const [dialog, setDialog] = useState('');
  let application = null;
  try { application = JSON.parse(sessionStorage.getItem(submissionKey) || 'null'); } catch { application = null; }
  return <div className="min-h-screen bg-[#f3f4f9] p-4 sm:p-8"><div className="mx-auto max-w-6xl overflow-hidden rounded-xl border-4 border-brand-500 bg-white shadow-soft">
    <header className="flex h-12 items-center justify-between border-b border-line px-5 text-[10px]"><b>◈ HIIKKY Business</b><button type="button" onClick={() => setDialog('Support')} className="text-brand-600">Support</button><span className="grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-white"><UserRound size={15}/></span></header>
    <div className="flex justify-between border-b border-line px-6 py-5 text-[9px] font-bold uppercase tracking-widest text-brand-600"><span>✓ Profile</span><span>✓ Details</span><span>◉ Verification</span></div>
    <div className="grid gap-5 p-6 md:grid-cols-[1.4fr_1fr]"><section className="rounded-lg border border-line p-6"><CheckCircle2 className="text-brand-600" size={24}/><h1 className="mt-4 font-display text-lg font-bold">Application Under Review</h1><p className="mt-2 max-w-lg text-xs leading-5 text-muted">Thank you for choosing HIIKKY. Your application{application?.organizationName ? ` for ${application.organizationName}` : ''} has been submitted. An Admin will review the request and email you with an update.</p><p className="mt-3 text-[10px] text-muted">Status: PENDING · Reference: {application?.id || 'Submitted'}{application?.submittedAt ? ` · ${new Date(application.submittedAt).toLocaleDateString()}` : ''}</p><div className="mt-5 flex flex-wrap gap-3"><Button variant="secondary" onClick={() => navigate(`/owner/registration/status?ref=${encodeURIComponent(application?.id || '')}`)}>Check application status</Button><Button onClick={() => setDialog('Support')}>Contact Support <Mail size={14}/></Button></div></section><aside className="rounded-lg bg-navy p-5 text-white"><b className="text-xs">Need immediate help?</b><p className="mt-2 text-[10px] leading-5 text-slate-300">Our onboarding specialists can help with your registration.</p><a href="mailto:support@hiikky.com" className="mt-4 inline-block rounded-md bg-white/10 px-3 py-2 text-[10px] font-semibold">Email Support</a></aside></div>
    <footer className="flex justify-end gap-4 border-t border-line bg-brand-50 px-5 py-3 text-[8px] text-muted"><button type="button" onClick={() => setDialog('Privacy Policy')}>Privacy Policy</button><button type="button" onClick={() => setDialog('Terms of Service')}>Terms of Service</button></footer>
  </div>{dialog && <ActionDialog title={dialog} onClose={() => setDialog('')}/>}</div>;
}

export function RegistrationStatusPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reference = searchParams.get('ref') || '';
  const [application, setApplication] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    if (!reference) { setError('Enter an application reference to check status.'); return () => { active = false; }; }
    adminApi.get(`/organization-registration-applications/${encodeURIComponent(reference)}/status`).then((response) => { if (active) setApplication(dataOf(response)); }).catch((requestError) => { if (active) setError(requestError.response?.data?.message || 'Unable to load application status.'); });
    return () => { active = false; };
  }, [reference]);
  async function checkAgain() {
    setBusy(true);
    setError('');
    try { setApplication(dataOf(await adminApi.get(`/organization-registration-applications/${encodeURIComponent(reference)}/status`))); }
    catch (requestError) { setError(requestError.response?.data?.message || 'Unable to load application status.'); }
    finally { setBusy(false); }
  }
  return <div className="grid min-h-screen place-items-center bg-[#f3f4f9] p-4"><section className="w-full max-w-xl rounded-xl border border-line bg-white p-6 shadow-soft"><h1 className="font-display text-xl font-bold">Registration status</h1>{application ? <><p className="mt-4 text-sm font-semibold">{application.organizationName}</p><p className="mt-2 text-xs text-muted">Status: {application.status} · Reference: {application.id}</p>{application.status === 'REJECTED' && <><p className="mt-4 text-xs leading-5 text-red-700">Reason: {application.decisionReason || 'Please contact Support for details.'}</p><Button className="mt-5" onClick={() => navigate(`/owner/registration?resubmit=${encodeURIComponent(application.id)}`)}>Resubmit application <ArrowRight size={14}/></Button></>}{application.status === 'APPROVED' && <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">Your application is approved. Use the one-time “Set your password” link sent to your email to activate owner login.</div>}{application.status === 'PENDING' && <p className="mt-4 text-xs text-muted">An Admin will review your application and email you with an update.</p>}<Button variant="secondary" className="mt-4" disabled={busy} onClick={checkAgain}>{busy ? 'Checking…' : 'Refresh status'}</Button></> : error && <p role="alert" className="mt-4 text-xs text-red-700">{error}</p>}<div className="mt-5"><button type="button" className="text-xs font-semibold text-brand-700" onClick={() => navigate('/owner/login')}>Return to login</button></div></section></div>;
}