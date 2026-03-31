import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { Car } from '../types';
import { Car as CarIcon, Plus, TrendingUp, Wrench, DollarSign, CheckCircle, Clock3, LayoutGrid } from 'lucide-react';
import Navbar from '../components/Navbar';

export default function Dashboard() {
  const navigate = useNavigate();
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/cars')
      .then(r => setCars(r.data))
      .finally(() => setLoading(false));
  }, []);

  const total = cars.length;
  const disponibles = cars.filter(c => c.status === 'disponible').length;
  const vendidos = cars.filter(c => c.status === 'vendido').length;
  const enReparacion = cars.filter(c => c.status === 'en_reparacion').length;
  const totalInvertido = cars.reduce((s, c) => s + (c.purchase_price || 0) + (c.total_repair_cost || 0), 0);

  const fmt = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
  const stripByStatus: Record<string, string> = {
    disponible: 'neo-accent-teal',
    vendido: 'neo-accent-violet',
    en_reparacion: 'neo-accent-amber',
    reservado: 'neo-accent-lime'
  };

  const statusColumns = [
    { key: 'disponible', label: 'Disponibles', dot: 'bg-[#2f3443]' },
    { key: 'en_reparacion', label: 'Preaparacion', dot: 'bg-[#b31234]' },
    { key: 'reservado', label: 'Reservados', dot: 'bg-[#596076]' },
    { key: 'vendido', label: 'Vendidos', dot: 'bg-[#1f2634]' },
  ] as const;

  return (
    <div className="site-shell">
      <Navbar />
      <div className="page-frame">
        <div className="brand-card mb-8 overflow-hidden">
          <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-10">
            <div>
              <p className="mb-3 text-sm uppercase tracking-[0.3em] text-[#7fc0ff]">Gestión de vehículos</p>
              <h1 className="brand-heading text-4xl font-semibold sm:text-5xl">Controla tu stock de autos en un solo lugar.</h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-[#d2daea] sm:text-lg">
                Registra entradas, costos de reparación, documentos y fotos de cada vehículo. Sigue el estado de tu inventario desde que llega hasta que se vende.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/cars/new" className="brand-button">
                  <Plus className="w-5 h-5" />
                  Agregar Auto
                </Link>
                <Link to="/cars" className="brand-button-soft">
                  Ver Inventario
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {statusColumns.map(col => {
                  const count = cars.filter(c => c.status === col.key).length;
                  return (
                    <span key={col.key} className="status-chip">
                      <span className={`status-chip-dot ${col.dot}`} />
                      {col.label}
                      <span className="rounded-full bg-[#eef1f6] px-2 py-0.5 text-[11px] text-[#505772]">{count}</span>
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="relative overflow-hidden rounded-[16px] bg-[#0d1016] p-6 text-white shadow-2xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(179,18,52,0.45),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(120,131,157,0.18),transparent_30%)]" />
              <div className="relative z-10 flex h-full flex-col justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 overflow-hidden rounded-[12px] border border-white/10 bg-white/10 p-2">
                    <img src="/logo.jpg" alt="Logo" className="h-full w-full rounded-[18px] object-cover" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.32em] text-[#7fc0ff]">Tu negocio</p>
                    <p className="mt-2 text-2xl font-semibold">Todo el historial, nada se pierde.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm text-white/80">
                  <div className="rounded-[12px] border border-white/10 bg-white/5 p-4">
                    <p className="text-[#7fc0ff]">Ingreso</p>
                    <p className="mt-1 font-medium text-white">Compra, llegada y estado</p>
                  </div>
                  <div className="rounded-[12px] border border-white/10 bg-white/5 p-4">
                    <p className="text-[#7fc0ff]">Evidencia</p>
                    <p className="mt-1 font-medium text-white">Fotos, boletas y facturas</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
          <StatCard
            icon={<CarIcon className="w-7 h-7 text-[#202738]" />}
            label="Total Autos"
            value={total}
            tone="sand"
            iconLabel="Ver todos los vehículos"
            onIconClick={() => navigate('/cars')}
          />
          <StatCard
            icon={<CheckCircle className="w-7 h-7 text-[#202738]" />}
            label="Disponibles"
            value={disponibles}
            tone="mint"
            iconLabel="Filtrar disponibles"
            onIconClick={() => navigate('/cars?status=disponible')}
          />
          <StatCard
            icon={<TrendingUp className="w-7 h-7 text-[#202738]" />}
            label="Vendidos"
            value={vendidos}
            tone="gold"
            iconLabel="Filtrar vendidos"
            onIconClick={() => navigate('/cars?status=vendido')}
          />
          <StatCard
            icon={<Wrench className="w-7 h-7 text-[#b31234]" />}
            label="Preaparacion"
            value={enReparacion}
            tone="copper"
            iconLabel="Filtrar preaparacion"
            onIconClick={() => navigate('/cars?status=en_reparacion')}
          />
          <StatCard
            icon={<DollarSign className="w-7 h-7 text-white" />}
            label="Total Invertido"
            value={fmt(totalInvertido)}
            tone="ink"
            iconLabel="Ver todos los vehículos"
            onIconClick={() => navigate('/cars')}
          />
        </div>

        <div className="brand-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#9aa7bf]/20 px-6 py-4">
            <h2 className="text-lg font-semibold text-[#f0f4fb]">Vehículos Recientes</h2>
            <Link to="/cars" className="text-sm font-medium text-[#7fc0ff] hover:text-[#9fd2ff]">Ver todos →</Link>
          </div>
          {loading ? (
            <div className="p-12 text-center text-[#d2daea]">Cargando...</div>
          ) : cars.length === 0 ? (
            <div className="p-12 text-center text-[#d2daea]">
              <CarIcon className="mx-auto mb-3 h-12 w-12 text-[#9fb2d2]" />
              <p>No hay vehículos registrados.</p>
              <Link to="/cars/new" className="mt-2 inline-block text-[#7fc0ff] hover:underline">Agregar el primero</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
              {cars.slice(0, 6).map(car => (
                <Link key={car.id} to={`/cars/${car.id}`} className="neo-card pb-6">
                  <div className="neo-card-header">
                    <div className="min-w-0">
                      <p className="neo-card-subtitle">{car.plate || 'Sin patente'}</p>
                      <h3 className="neo-card-title truncate">{car.brand} {car.model}</h3>
                    </div>
                    <StatusBadge status={car.status} />
                  </div>
                  <p className="neo-card-line">{car.year || 'S/A'} · {car.color || 'Sin color'} · {car.km ? `${car.km.toLocaleString('es-CL')} km` : 'KM sin registro'}</p>
                  <p className="neo-card-line font-semibold text-[#f0f4fb]">Inversión: {fmt((car.purchase_price || 0) + (car.total_repair_cost || 0))}</p>
                  <div className="neo-card-meta">
                    <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" /> {car.arrival_date || 'Sin fecha de compra'}</span>
                  </div>
                  <div className={`neo-card-strip ${stripByStatus[car.status] || 'neo-accent-teal'}`} />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="brand-panel mt-8 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-[#f0f4fb]">
                <LayoutGrid className="h-5 w-5 text-[#9fb2d2]" />
                Tablero Operativo
              </h2>
              <p className="text-sm text-[#c4cede]">Vista tipo kanban para controlar estado de cada auto.</p>
            </div>
            <Link to="/cars" className="text-sm font-medium text-[#7fc0ff] hover:text-[#9fd2ff]">Abrir listado completo</Link>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {statusColumns.map(col => {
              const list = cars.filter(c => c.status === col.key);
              return (
                <div key={col.key} className="kanban-column">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="flex items-center gap-2 text-sm font-semibold text-[#e6ecf7]">
                      <span className={`status-chip-dot ${col.dot}`} />
                      {col.label}
                    </p>
                    <span className="rounded-full bg-[#46526a] px-2 py-0.5 text-xs text-[#dbe4f3]">{list.length}</span>
                  </div>

                  {list.length === 0 ? (
                    <p className="rounded-[12px] border border-dashed border-[#7383a0] p-3 text-xs text-[#b8c4da]">Sin vehículos en esta columna.</p>
                  ) : (
                    list.slice(0, 8).map(car => (
                      <Link key={car.id} to={`/cars/${car.id}`} className="kanban-item">
                        <p className="text-[11px] uppercase tracking-[0.08em] text-[#9eabc5]">{car.plate || 'Sin patente'}</p>
                        <p className="mt-1 text-sm font-semibold text-[#eef2f8]">{car.brand} {car.model}</p>
                        <p className="mt-1 text-xs text-[#b8c4da]">{car.year || 'S/A'} · {car.color || 'Sin color'}</p>
                        <p className="mt-2 text-xs font-semibold text-[#84c4ff]">{fmt((car.purchase_price || 0) + (car.total_repair_cost || 0))}</p>
                      </Link>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
  iconLabel,
  onIconClick
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone: string;
  iconLabel: string;
  onIconClick: () => void;
}) {
  const tones: Record<string, string> = {
    sand: 'bg-[linear-gradient(180deg,#f7f9fc_0%,#eef2f8_100%)] border-[#cfd6e3]',
    mint: 'bg-[linear-gradient(180deg,#f7f9fc_0%,#edf2f8_100%)] border-[#cdd4e2]',
    gold: 'bg-[linear-gradient(180deg,#f8f9fc_0%,#edf1f8_100%)] border-[#ccd4e2]',
    copper: 'bg-[linear-gradient(180deg,#fff3f6_0%,#fde9ef_100%)] border-[#efc7d1]',
    ink: 'bg-[#111621] border-[#111621] text-white shadow-[0_14px_26px_rgba(11,15,24,0.28)]'
  };
  return (
    <div className={`${tones[tone]} rounded-[14px] border p-5 shadow-sm`}>
      <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={onIconClick}
        aria-label={iconLabel}
        className="shrink-0 rounded-[10px] border border-[#12161f]/20 bg-white/80 p-2 transition-all hover:bg-white hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b31234]/35"
      >
        {icon}
      </button>
      <div>
        <p className={`text-sm ${tone === 'ink' ? 'text-white/70' : 'text-[#5d6578]'}`}>{label}</p>
        <p className={`text-2xl font-bold ${tone === 'ink' ? 'text-white' : 'text-[#1d2433]'}`}>{value}</p>
      </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    disponible: 'bg-[#2f6fb0]/25 text-[#cfe6ff]',
    vendido: 'bg-[#4a6386]/25 text-[#dbe7fa]',
    en_reparacion: 'bg-[#2a9bff]/28 text-[#dff0ff]',
    reservado: 'bg-[#3f5170]/30 text-[#d3dded]',
  };
  const labels: Record<string, string> = {
    disponible: 'Disponible', vendido: 'Vendido', en_reparacion: 'Preaparacion', reservado: 'Reservado'
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {labels[status] || status}
    </span>
  );
}
