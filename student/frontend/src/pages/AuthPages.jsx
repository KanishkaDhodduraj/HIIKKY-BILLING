import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, BookOpenCheck } from 'lucide-react';
import { api, dataOf } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Button, FormField, SelectField } from '../components/shared';

function AuthShell({ title, description, children, footer }) {
  return <main className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_.95fr]">
    <section className="hidden flex-col justify-between bg-navy p-12 text-white lg:flex"><Link to="/student/login" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 font-display text-xl font-black">H</span><span><b className="block font-display text-base font-extrabold">HIIKKY</b><small className="text-[10px] text-slate-300">Student Portal</small></span></Link><div className="max-w-lg"><BookOpenCheck size={30} className="mb-5 text-brand-200" /><h2 className="font-display text-4xl font-extrabold leading-tight">Your learning, all in one place.</h2><p className="mt-4 max-w-md text-sm leading-6 text-slate-300">Access your courses, keep track of your plan, and stay up to date with billing and messages from your school.</p></div><p className="text-[10px] text-slate-400">Secure access to your organization’s learning workspace.</p></section>
    <section className="flex items-center justify-center px-5 py-10"><div className="w-full max-w-md"><Link to="/student/login" className="mb-9 inline-flex items-center gap-2 lg:hidden"><span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 font-display font-black text-white">H</span><b className="font-display text-sm">HIIKKY Student</b></Link><div className="mb-7"><h1 className="font-display text-2xl font-extrabold">{title}</h1><p className="mt-2 text-xs leading-5 text-muted">{description}</p></div>{children}{footer && <div className="mt-6 border-t border-line pt-5 text-center text-xs text-muted">{footer}</div>}</div></section>
  </main>;
}

function messageOf(error) { return error.response?.data?.message || 'Something went wrong. Please try again.'; }
function fieldErrorsOf(error) { return error.response?.data?.fieldErrors || {}; }

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setFieldErrors({});
    try { await login(form); navigate('/student/dashboard', { replace: true }); }
    catch (failure) { setError(messageOf(failure)); setFieldErrors(fieldErrorsOf(failure)); }
    finally { setBusy(false); }
  }
  return <AuthShell title="Welcome back" description="Sign in to continue to your learning dashboard." footer={<>New to this organization? <Link className="font-bold text-brand-700" to="/student/register">Create an account</Link></>}>
    <form onSubmit={submit} className="grid gap-4">
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">{error}</div>}
      <FormField label="Email address" type="email" autoComplete="email" required value={form.email} error={fieldErrors.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
      <FormField label="Password" type="password" autoComplete="current-password" required value={form.password} error={fieldErrors.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
      <div className="-mt-2 text-right"><Link to="/student/forgot-password" className="text-[11px] font-semibold text-brand-700 hover:underline">Forgot password?</Link></div>
      <Button disabled={busy} className="mt-1 h-11">{busy ? 'Signing in…' : <>Sign in <ArrowRight size={14} /></>}</Button>
      <p className="text-center text-[10px] leading-4 text-muted">Your account must be approved by your organization before you can sign in.</p>
    </form>
  </AuthShell>;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState([]);
  const [form, setForm] = useState({ organizationId: '', fullName: '', email: '', phone: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/registration/organizations').then((response) => setOrganizations(dataOf(response) || [])).catch((failure) => setError(messageOf(failure))).finally(() => setLoading(false)); }, []);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setFieldErrors({});
    try {
      await api.post('/registration', form);
      navigate('/student/register/submitted', { replace: true, state: { organizationName: organizations.find((item) => item.id === form.organizationId)?.name } });
    } catch (failure) { setError(messageOf(failure)); setFieldErrors(fieldErrorsOf(failure)); }
    finally { setBusy(false); }
  }
  return <AuthShell title="Create your student account" description="Choose your organization and submit your details for approval." footer={<>Already registered? <Link className="font-bold text-brand-700" to="/student/login">Sign in</Link></>}>
    <form onSubmit={submit} className="grid gap-4">
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">{error}</div>}
      <SelectField label="Organization" required value={form.organizationId} error={fieldErrors.organizationId} disabled={loading} onChange={(event) => setForm({ ...form, organizationId: event.target.value })}><option value="">{loading ? 'Loading organizations…' : 'Select your organization'}</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</SelectField>
      <FormField label="Full name" autoComplete="name" required value={form.fullName} error={fieldErrors.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
      <FormField label="Email address" type="email" autoComplete="email" required value={form.email} error={fieldErrors.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
      <FormField label="Phone number" type="tel" autoComplete="tel" value={form.phone} error={fieldErrors.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
      <Button disabled={busy || loading || organizations.length === 0} className="mt-1 h-11">{busy ? 'Submitting…' : 'Submit registration'}</Button>
      <p className="text-[10px] leading-4 text-muted">Your request is sent to the organization owner. You can set a password after approval and invitation.</p>
    </form>
  </AuthShell>;
}

export function RegistrationSubmittedPage() {
  const location = useLocation();
  const organization = location.state?.organizationName || 'your organization';
  return <AuthShell title="Registration submitted" description="Your account is waiting for review.">
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-xs leading-5 text-emerald-900"><b>Thanks for registering.</b><p className="mt-2">The owner of {organization} will review your request. If approved, you’ll receive an invitation to set your password.</p></div>
    <Link to="/student/login" className="mt-5 inline-flex text-xs font-bold text-brand-700">Back to sign in</Link>
  </AuthShell>;
}

export function PasswordLinkPage({ reset = false }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const token = params.get('token') || '';
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setFieldErrors({});
    try {
      if (reset) {
        if (password !== confirm) { setFieldErrors({ confirm: 'Passwords do not match' }); return; }
        await api.post('/auth/set-password', { token, password });
        setSuccess('Password set. You can now sign in.');
        window.setTimeout(() => navigate('/student/login', { replace: true }), 1200);
      } else {
        await api.post('/auth/forgot-password', { email });
        setSuccess('If an active account exists, a password link has been sent.');
      }
    } catch (failure) { setError(messageOf(failure)); setFieldErrors(fieldErrorsOf(failure)); }
    finally { setBusy(false); }
  }
  const title = reset ? (token ? 'Set your password' : 'Password link required') : 'Reset your password';
  return <AuthShell title={title} description={reset ? 'Choose a strong password for your student account.' : 'Enter your email and we’ll send password reset instructions if your account is active.'} footer={<Link className="font-bold text-brand-700" to="/student/login">Back to sign in</Link>}>
    {reset && !token ? <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Open the password link sent to your email to continue.</div> : <form onSubmit={submit} className="grid gap-4">
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">{error}</div>}
      {success && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800">{success}</div>}
      {!reset ? <FormField label="Email address" type="email" autoComplete="email" required value={email} error={fieldErrors.email} onChange={(event) => setEmail(event.target.value)} /> : <><FormField label="New password" type="password" autoComplete="new-password" minLength="12" required value={password} error={fieldErrors.password} onChange={(event) => setPassword(event.target.value)} /><FormField label="Confirm password" type="password" autoComplete="new-password" minLength="12" required value={confirm} error={fieldErrors.confirm} onChange={(event) => setConfirm(event.target.value)} /><p className="-mt-2 text-[10px] text-muted">Use at least 12 characters.</p></>}
      <Button disabled={busy || Boolean(success)} className="h-11">{busy ? 'Please wait…' : reset ? 'Set password' : 'Send reset link'}</Button>
    </form>}
  </AuthShell>;
}
