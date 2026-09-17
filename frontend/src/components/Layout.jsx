import { NavLink, useNavigate } from "react-router-dom";
import { Coffee, LayoutDashboard, Users, QrCode, Gift, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Layout({ children }) {
  const { user, logout } = useAuth(); const navigate = useNavigate();
  const nav = [
    {to:"/staff", label:"Counter", icon:<Coffee size={17}/>},
    {to:"/members", label:"Members", icon:<Users size={17}/>},
    {to:"/staff/scan", label:"QR Scanner", icon:<QrCode size={17}/>},
  ];
  if (user?.role === "admin") nav.push({to:"/admin",label:"Admin",icon:<ShieldCheck size={17}/>});
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Gift size={21}/></div><div><strong>CafePoints</strong><span>LOYALTY OS</span></div></div>
      <div className="workspace"><span className="status-dot"/> Cafe Central <small>LIVE</small></div>
      <nav>{nav.map(n=><NavLink key={n.to} to={n.to} end className={({isActive})=>isActive?"nav-link active":"nav-link"}>{n.icon}<span>{n.label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><NavLink className="nav-link" to="/customer"><Gift size={17}/><span>Customer Portal</span></NavLink><button className="nav-link ghost" onClick={async()=>{await logout();navigate("/")}}><LogOut size={17}/><span>Sign out</span></button></div>
    </aside>
    <main className="main-content">{children}</main>
  </div>;
}
