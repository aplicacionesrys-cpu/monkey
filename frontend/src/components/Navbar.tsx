import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, LogOut, List } from 'lucide-react';

export default function Navbar() {
  const { username, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <nav className="sticky top-0 z-40 border-b border-[#12161f]/15 bg-[#fafbfd]/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3 text-[#111318] font-semibold text-lg tracking-wide">
            <div className="h-11 w-11 overflow-hidden rounded-[12px] border border-[#12161f]/30 bg-white p-1 shadow-[0_8px_14px_rgba(18,22,31,0.12)]">
              <img src="/logo.jpg" alt="Logo" className="h-full w-full rounded-xl object-cover" />
            </div>
            <div>
              <div className="leading-none">AutoGestión</div>
              <div className="text-[10px] font-medium uppercase tracking-[0.28em] text-[#7f0f26]">Compraventa</div>
            </div>
          </Link>

          <div className="hidden sm:flex items-center gap-2 rounded-[12px] border border-[#12161f]/20 bg-white p-1.5">
            <NavLink to="/" label="Dashboard" icon={<LayoutDashboard className="w-4 h-4" />} active={location.pathname === '/'} />
            <NavLink to="/cars" label="Vehículos" icon={<List className="w-4 h-4" />} active={isActive('/cars')} />
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden rounded-[10px] border border-[#12161f]/20 bg-white px-3 py-2 text-sm text-[#2e3443] sm:block">Hola, <strong>{username}</strong></span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-[10px] border border-[#12161f]/20 bg-white px-3 py-2 text-sm text-[#2e3443] transition-colors hover:bg-[#f4f6fa]"
            >
              <LogOut className="w-4 h-4" /> Salir
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, label, icon, active }: { to: string; label: string; icon: React.ReactNode; active: boolean }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-4 py-2 rounded-[8px] text-sm font-semibold uppercase tracking-[0.04em] transition-all ${
        active ? 'bg-[linear-gradient(135deg,#b31234_0%,#7f0f26_100%)] text-white shadow-[0_8px_20px_rgba(127,15,38,0.3)]' : 'text-[#3e4457] hover:bg-[#f1f4f9] hover:text-[#1d2433]'
      }`}
    >
      {icon} {label}
    </Link>
  );
}
