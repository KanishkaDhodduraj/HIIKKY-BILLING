import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Clock3, Search } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { api, dataOf } from '../api/client';
import { Badge, Button, DataTable, FormField, Pagination, SelectField, Toast } from '../components/shared';

function useNotice() {
  const [notice, setNotice] = useState({ message: '', type: 'success' });
  const show = (message, type = 'success') => setNotice({ message, type });
  const toast = <Toast message={notice.message} type={notice.type} onClose={() => setNotice({ message: '', type: 'success' })} />;
  return { show, toast };
}

export function CoursesPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState('recent');
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async (nextPage = page) => {
    setLoading(true);
    try {
      const response = await api.get('/courses', { params: { page: nextPage, size: 12, ...filters } });
      setRows(dataOf(response) || []); setTotal(Number(response.headers['x-total-count'] || 0)); setPage(nextPage); setError('');
    } catch (failure) { setError(failure.response?.data?.message || 'Unable to load courses.'); }
    finally { setLoading(false); }
  }, [filters, page]);
  useEffect(() => { load(0); }, [filters]);
  const categories = ['All', ...new Set(rows.map((course) => course.category).filter(Boolean))];
  function apply(event) { event.preventDefault(); setPage(0); setFilters({ search: search.trim(), category, sortBy }); }
  return <div className="space-y-4"><header><h1 className="font-display text-2xl font-extrabold">My Courses</h1><p className="mt-1 text-xs text-muted">Browse published courses available through your organization.</p></header>
    {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</div>}
    <form onSubmit={apply} className="flex flex-wrap items-end gap-2 rounded-xl border border-line bg-white p-3 shadow-soft"><label className="relative min-w-[190px] flex-1"><span className="mb-1.5 block text-[10px] font-semibold">Search courses</span><Search size={13} className="absolute left-3 top-[33px] text-muted" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Course name, code, or instructor" className="h-10 w-full rounded-lg border border-line pl-9 pr-3 text-xs outline-none focus:border-brand-500" /></label><SelectField label="Category" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</SelectField><SelectField label="Sort by" value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="recent">Recently added</option><option value="courseName">Course name</option></SelectField><Button>Apply filters</Button></form>
    <section className="overflow-hidden rounded-xl border border-line bg-white shadow-soft"><DataTable loading={loading} rows={rows} empty="No courses match your filters." columns={[{ key: 'courseName', label: 'Course', render: (row) => <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-700"><BookOpen size={16} /></span><span><b className="block">{row.courseName}</b><small className="text-[9px] text-muted">{row.courseCode || row.category || 'Course'}</small></span></div> }, { key: 'instructorName', label: 'Instructor' }, { key: 'durationHours', label: 'Duration', render: (row) => <span className="inline-flex items-center gap-1"><Clock3 size={12} />{row.durationHours || '—'} hrs</span> }, { key: 'progressPercent', label: 'Progress', render: (row) => <span className="flex items-center gap-2"><span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100"><span className="block h-full bg-brand-600" style={{ width: `${row.progressPercent || 0}%` }} /></span>{row.progressPercent || 0}%</span> }, { key: 'status', label: 'Status', render: (row) => <Badge tone={row.status === 'COMPLETED' ? 'success' : 'brand'}>{row.status || 'ACTIVE'}</Badge> }]} actions={(row) => <Link className="text-[10px] font-bold text-brand-700 hover:underline" to={`/student/courses/${row.id}`}>Open course</Link>} /><Pagination page={page} total={total} size={12} onPage={load} /></section>
  </div>;
}

export function CourseDetailPage() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const { show, toast } = useNotice();
  useEffect(() => { api.get(`/courses/${courseId}`).then((response) => { const data = dataOf(response); setCourse(data); setProgress(data.progressPercent || 0); }).catch((failure) => show(failure.response?.data?.message || 'Unable to load the course.', 'error')).finally(() => setLoading(false)); }, [courseId]);
  async function openCourse() {
    setBusy(true);
    try { const response = await api.post(`/courses/${courseId}/access`, {}); show(`Course opened. Last access recorded at ${new Date(dataOf(response).lastAccessedAt).toLocaleString()}.`); }
    catch (failure) { show(failure.response?.data?.message || 'Unable to open the course.', 'error'); }
    finally { setBusy(false); }
  }
  async function saveProgress() {
    setBusy(true);
    try { const response = await api.patch(`/courses/${courseId}/progress`, { progressPercent: progress }); setCourse((current) => ({ ...current, ...dataOf(response) })); show('Course progress updated.'); }
    catch (failure) { show(failure.response?.data?.message || 'Unable to update progress.', 'error'); }
    finally { setBusy(false); }
  }
  if (loading) return <div className="p-10 text-center text-xs text-muted">Loading course…</div>;
  if (!course) return <div role="alert" className="rounded-lg bg-red-50 p-4 text-xs text-red-700">This course is unavailable.</div>;
  return <div className="space-y-4">{toast}<Link to="/student/courses" className="text-[10px] font-bold text-brand-700">← My courses</Link><header><h1 className="mt-2 font-display text-2xl font-extrabold">{course.courseName}</h1><p className="mt-1 text-xs text-muted">{course.courseCode} {course.category ? `· ${course.category}` : ''} {course.instructorName ? `· ${course.instructorName}` : ''}</p></header>
    <section className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]"><div className="rounded-xl border border-line bg-white p-5 shadow-soft"><div className="flex items-center justify-between"><h2 className="text-xs font-bold">Course progress</h2><Badge tone={progress === 100 ? 'success' : 'brand'}>{progress}% complete</Badge></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} /></div><div className="mt-5 flex flex-wrap items-center gap-3"><Button disabled={busy} onClick={openCourse}>{busy ? 'Please wait…' : 'Open course'}</Button><label className="flex items-center gap-2 text-[10px] text-muted">Update progress <input aria-label="Course progress percent" type="range" min="0" max="100" step="10" value={progress} disabled={busy} onChange={(event) => setProgress(Number(event.target.value))} /></label><Button variant="secondary" disabled={busy || progress === course.progressPercent} onClick={saveProgress}>Save progress</Button></div><p className="mt-3 text-[9px] leading-4 text-muted">Progress is a learning record for your account. Course materials are provided by your organization.</p></div>
      <div className="rounded-xl border border-line bg-white p-5 shadow-soft"><h2 className="text-xs font-bold">Course installments</h2><p className="mt-1 text-[10px] text-muted">Read-only schedule from your organization.</p>{course.installments?.length ? <div className="mt-3 divide-y divide-slate-100">{course.installments.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-3"><span><b className="block text-[10px]">{item.installmentName || `Installment ${item.installmentNumber}`}</b><small className="text-[9px] text-muted">Due {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '—'}</small></span><b className="text-[10px]">${Number(item.amount).toFixed(2)}</b></div>)}</div> : <div className="mt-4 rounded-lg bg-slate-50 p-4 text-center text-[10px] text-muted">No installments for this course.</div>}</div></section>
  </div>;
}
