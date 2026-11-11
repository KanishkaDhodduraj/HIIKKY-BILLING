import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Bell, BookOpen, CreditCard, FileBarChart, GraduationCap, LayoutDashboard, LogOut, Menu, Percent, Settings, Users, X, ChartNoAxesCombined, ReceiptText, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const links = [
  ['Dashboard', '/owner/dashboard', LayoutDashboard], ['Users', '/owner/users', Users], ['Students', '/owner/students', GraduationCap], ['Subscription Plans', '/owner/subscription-plans', Package],
  ['Courses', '/owner/courses', GraduationCap], ['Billing', '/owner/billing', CreditCard], ['Invoices', '/owner/invoices', ReceiptText],
  ['Revenue Analytics', '/owner/revenue-analytics', ChartNoAxesCombined], ['Subscription Analytics', '/owner/subscription-analytics', BarChart3],
  ['Discounts', '/owner/discounts', Percent], ['Reports', '/owner/reports', FileBarChart], ['Notifications', '/owner/notifications', Bell], ['Settings', '/owner/settings', Settings],
];
export default function OwnerLayout() {
  const { user, logout } = useAuth(), navigate = useNavigate(), location = useLocation();
  const [menu, setMenu] = useState(false), [search, setSearch] = useState(new URLSearchParams(location.search).get('search') || '');
  const searchSubmit = (event) => { event.preventDefault(); const target = location.pathname; navigate(`${target}${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''}`); setMenu(false); };
  return <div className="min-h-screen bg-canvas text-ink">
    {menu&&<button aria-label="Close navigation" className="fixed inset-0 z-30 bg-slate-900/40 md:hidden" onClick={()=>setMenu(false)}/>}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[218px] flex-col bg-navy text-white transition-transform md:translate-x-0 ${menu?'translate-x-0':'-translate-x-full'}`}>
      <div className="flex h-[78px] shrink-0 items-center gap-3 border-b border-white/10 px-5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 font-display text-lg font-black">H</span><span><b className="block font-display text-sm font-extrabold">HIIKKY</b><small className="text-[9px] text-slate-300">Business Owner</small></span><button className="ml-auto rounded-lg p-1 text-slate-300 md:hidden" aria-label="Close navigation" onClick={()=>setMenu(false)}><X size={17}/></button></div>
      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">{links.map(([label,to,Icon])=><NavLink key={to} to={to} onClick={()=>setMenu(false)} className={({isActive})=>`mb-1 flex h-10 items-center gap-3 rounded-lg px-3 text-[11px] font-semibold transition ${isActive?'bg-brand-600 text-white shadow-sm':'text-slate-200 hover:bg-white/10'}`}><Icon size={15}/>{label}</NavLink>)}</nav>
      <div className="border-t border-white/10 p-3"><button onClick={async()=>{await logout();navigate('/owner/login');}} className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-[11px] font-semibold text-red-300 hover:bg-white/10"><LogOut size={15}/>Logout</button></div>
    </aside>
    <main className="min-h-screen md:ml-[218px]">
      <header className="sticky top-0 z-20 flex h-[68px] items-center gap-3 border-b border-line bg-white/95 px-4 backdrop-blur md:px-6">
        <button aria-label="Open navigation" className="rounded-md p-1 md:hidden" onClick={()=>setMenu(true)}><Menu size={20}/></button>
        <form onSubmit={searchSubmit} className="flex h-9 w-full max-w-[420px] items-center gap-2 rounded-full bg-[#f1f3fb] px-3 text-muted"><span className="text-sm">⌕</span><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Search customers, courses, or invoices…" className="w-full bg-transparent text-[10px] outline-none placeholder:text-slate-400" aria-label="Search current page"/></form>
        <div className="ml-auto flex items-center gap-4"><NavLink to="/owner/notifications" title="Notifications" className="relative"><Bell size={16}/><i className="absolute -right-1 -top-0.5 h-1.5 w-1.5 rounded-full bg-red-500"/></NavLink><NavLink to="/owner/settings" title="Settings"><Settings size={16}/></NavLink><span className="h-7 border-l border-line"/><NavLink to="/owner/settings" className="flex items-center gap-2"><span className="hidden text-right sm:block"><b className="block text-[10px]">{user?.fullName||user?.email?.split('@')[0]||'Business Owner'}</b><small className="block text-[9px] text-muted">Business Owner</small></span><span className="grid h-8 w-8 place-items-center rounded-full bg-[#d9d4ff] text-[10px] font-extrabold text-brand-700">{(user?.firstName||user?.email||'H').slice(0,1).toUpperCase()}</span></NavLink></div>
      </header>
      <div className="mx-auto max-w-[1500px] p-4 md:p-6"><Outlet/></div>
    </main>
  </div>;
}
