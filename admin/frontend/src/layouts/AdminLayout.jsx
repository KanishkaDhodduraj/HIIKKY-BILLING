import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Bell, Building2, ChartNoAxesCombined, CircleHelp, CreditCard, FileBarChart, LayoutDashboard, LogOut, Menu, Settings, ShieldCheck, Users, Inbox, X, BadgeDollarSign, Headset } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const links = [
  ['Dashboard','/admin/dashboard',LayoutDashboard],['Business Owners','/admin/owners',Users,'SUPER_ADMIN'],['Business Requests','/admin/business-requests',Inbox],
  ['Platform Plans','/admin/plans',Building2],['Payment Gateway','/admin/payment-gateway',CreditCard],['Platform Analytics','/admin/analytics',ChartNoAxesCombined],['Revenue','/admin/revenue',BadgeDollarSign],['Support Center','/admin/support',Headset],['Notifications','/admin/notifications',Bell],['Reports','/admin/reports',FileBarChart],['Settings','/admin/settings',Settings,'SUPER_ADMIN'],['Profile','/admin/profile',ShieldCheck],
];
export default function AdminLayout(){
  const {user,logout}=useAuth(),navigate=useNavigate(),location=useLocation();const[menu,setMenu]=useState(false),[search,setSearch]=useState(new URLSearchParams(location.search).get('search')||'');
  const visible=links.filter(x=>!x[3]||user?.role===x[3]);
  const searchSubmit=(e)=>{e.preventDefault();const target=location.pathname.includes('business-requests')?'/admin/business-requests':'/admin/owners';navigate(`${target}${search?`?search=${encodeURIComponent(search)}`:''}`);setMenu(false);};
  return <div className="min-h-screen bg-canvas text-ink">
    {menu&&<button aria-label="Close navigation" className="fixed inset-0 z-30 bg-slate-900/30 md:hidden" onClick={()=>setMenu(false)}/>}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[196px] flex-col border-r border-line bg-white transition-transform md:translate-x-0 ${menu?'translate-x-0':'-translate-x-full'}`}>
      <div className="flex h-[62px] items-center gap-2 border-b border-line px-4"><div className="grid h-7 w-7 place-items-center rounded-md bg-brand-600 font-display text-sm font-extrabold text-white">H</div><div className="min-w-0"><div className="font-display text-[12px] font-extrabold text-brand-700">HIIKKY Admin</div><div className="text-[9px] leading-3 text-muted">Super Administrative Portal</div></div><button className="ml-auto md:hidden" onClick={()=>setMenu(false)} aria-label="Close"><X size={16}/></button></div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">{visible.map(([label,to,Icon])=><NavLink key={to} to={to} onClick={()=>setMenu(false)} className={({isActive})=>`mb-0.5 flex h-[35px] items-center gap-2.5 border-l-2 px-2.5 text-[11px] font-semibold transition ${isActive?'border-brand-600 bg-brand-100 text-brand-700':'border-transparent text-[#58627d] hover:bg-slate-50'}`}><Icon size={14} strokeWidth={2}/>{label}</NavLink>)}</nav>
      <div className="border-t border-line p-2"><button onClick={async()=>{await logout();navigate('/login');}} className="flex h-9 w-full items-center gap-2.5 px-2.5 text-[11px] font-semibold text-red-500 hover:bg-red-50"><LogOut size={14}/>Logout</button></div>
    </aside>
    <main className="min-h-screen md:ml-[196px]">
      <header className="sticky top-0 z-20 flex h-[62px] items-center gap-3 border-b border-line bg-white/95 px-4 backdrop-blur md:px-5"><button aria-label="Open navigation" className="md:hidden" onClick={()=>setMenu(true)}><Menu size={19}/></button>
        <form onSubmit={searchSubmit} className="flex h-8 w-full max-w-[420px] items-center gap-2 rounded-full bg-[#f0f3fb] px-3 text-muted"><span className="text-sm">⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search analytics, owners, or records..." className="w-full bg-transparent text-[10px] outline-none placeholder:text-slate-400" aria-label="Search records"/></form>
        <div className="ml-auto flex items-center gap-3"><NavLink to="/admin/notifications" title="Notifications" className="relative text-ink"><Bell size={15}/><i className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-red-500"/></NavLink><button title="Help" onClick={()=>navigate('/admin/profile')} className="text-ink"><CircleHelp size={15}/></button><span className="mx-0.5 h-6 border-l border-line"/><NavLink to="/admin/profile" className="flex items-center gap-2"><span className="hidden text-right sm:block"><span className="block text-[10px] font-bold">{user?.email?.split('@')[0]||'Admin User'}</span><span className="block text-[9px] text-muted">{user?.role==='SUPER_ADMIN'?'Super Admin':'Administrator'}</span></span><span className="grid h-7 w-7 place-items-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">{user?.email?.[0]?.toUpperCase()||'A'}</span></NavLink></div>
      </header>
      <div className="p-4 md:px-5 md:py-4 lg:px-6"><Outlet/></div>
    </main>
  </div>;
}
