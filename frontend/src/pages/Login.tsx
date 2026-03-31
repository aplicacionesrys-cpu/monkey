import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { ShieldCheck, TrendingUp, Wrench } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget as HTMLFormElement);
    const submittedUsername = String(form.get('username') || username).trim();
    const submittedPassword = String(form.get('password') || password).trim();

    if (!submittedUsername || !submittedPassword) {
      toast.error('Ingresa usuario y contraseña');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', {
        username: submittedUsername,
        password: submittedPassword,
      });

      login(data.token, data.username);
      toast.success(`Bienvenido, ${data.username}!`);
      navigate('/', { replace: true });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="site-shell flex items-center justify-center p-4 sm:p-6">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[16px] border border-[#12161f]/20 bg-white shadow-[0_26px_58px_rgba(10,14,22,0.14)] lg:grid-cols-[0.9fr_1.1fr]">
        <section className="hidden border-r border-[#12161f]/18 bg-[linear-gradient(160deg,#f3f5f8_0%,#eceff4_100%)] p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="mb-8 flex items-center gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-[14px] border border-[#12161f]/25 bg-white p-2 shadow-[0_10px_20px_rgba(12,16,24,0.12)]">
                <img src="/logo.jpg" alt="Logo" className="h-full w-full rounded-[18px] object-cover" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-[#7f0f26]">AutoGestión</p>
                <h1 className="mt-2 text-5xl font-semibold leading-none text-[#111318]">Control de alto impacto.</h1>
              </div>
            </div>
            <p className="max-w-xl text-lg leading-8 text-[#4c5469]">
              Administra cada vehículo como una ficha comercial completa: ingreso, fotos, arreglos, boletas, facturas y costo final para tomar decisiones de venta con números claros.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Feature icon={<ShieldCheck className="h-5 w-5" />} title="Control" text="Toda la información centralizada por vehículo." />
            <Feature icon={<Wrench className="h-5 w-5" />} title="Historial" text="Registro completo de reparaciones y documentos." />
            <Feature icon={<TrendingUp className="h-5 w-5" />} title="Rentabilidad" text="Inversión total lista para vender mejor." />
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-4 lg:hidden">
              <div className="h-16 w-16 overflow-hidden rounded-[14px] border border-[#12161f]/25 bg-white p-2">
                <img src="/logo.jpg" alt="Logo" className="h-full w-full rounded-[14px] object-cover" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold brand-heading">AutoGestión</h1>
                <p className="text-sm text-[#5b6275]">Sistema para compraventa de vehículos</p>
              </div>
            </div>

            <div className="brand-card p-8">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 h-20 w-20 overflow-hidden rounded-[14px] border border-[#12161f]/25 bg-white p-2">
                  <img src="/logo.jpg" alt="Logo" className="h-full w-full rounded-[18px] object-cover" />
                </div>
                <h2 className="text-3xl font-semibold brand-heading">Entrar al sistema</h2>
                <p className="mt-2 text-[#5b6275]">Interfaz ejecutiva con presencia firme y foco en resultados.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#2e3443]">Usuario</label>
                  <input
                    type="text"
                    name="username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="brand-input"
                    placeholder="admin"
                    autoComplete="username"
                    maxLength={50}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#2e3443]">Contraseña</label>
                  <input
                    type="password"
                    name="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="brand-input"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    maxLength={100}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="brand-button w-full disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? 'Iniciando sesión...' : 'Ingresar'}
                </button>
              </form>

              <div className="mt-6 rounded-[12px] border border-[#12161f]/18 bg-[#f4f6fa] p-4 text-center text-sm text-[#5b6275]">
                Credencial por defecto: <strong className="text-[#111318]">admin</strong> / <strong className="text-[#111318]">admin123</strong>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-[12px] border border-[#12161f]/18 bg-white p-4">
      <div className="mb-3 inline-flex rounded-[10px] bg-[#eff2f8] p-2 text-[#2f3647]">{icon}</div>
      <h3 className="text-lg font-semibold text-[#151923]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#5f667a]">{text}</p>
    </div>
  );
}
