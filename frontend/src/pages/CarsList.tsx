import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';
import { Car } from '../types';
import { Car as CarIcon, Plus, Search, Trash2, Eye, UserRound, Clock3 } from 'lucide-react';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  disponible: 'bg-[#2f6fb0]/25 text-[#cfe6ff]',
  vendido: 'bg-[#4a6386]/25 text-[#dbe7fa]',
  en_reparacion: 'bg-[#2a9bff]/28 text-[#dff0ff]',
  reservado: 'bg-[#3f5170]/30 text-[#d3dded]',
};
const STATUS_LABELS: Record<string, string> = {
  disponible: 'Disponible', vendido: 'Vendido', en_reparacion: 'En Reparación', reservado: 'Reservado'
};
const STRIP_CLASS: Record<string, string> = {
  disponible: 'neo-accent-teal',
  vendido: 'neo-accent-violet',
  en_reparacion: 'neo-accent-amber',
  reservado: 'neo-accent-lime'
};
const STATUS_DOT: Record<string, string> = {
  disponible: 'bg-[#2f3443]',
  vendido: 'bg-[#1f2634]',
  en_reparacion: 'bg-[#b31234]',
  reservado: 'bg-[#596076]'
};

export default function CarsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [cars, setCars] = useState<Car[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/cars').then(r => setCars(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    setStatusFilter(searchParams.get('status') || '');
  }, [searchParams]);

  const handleDelete = async (car: Car) => {
    if (!confirm(`¿Eliminar "${car.brand} ${car.model}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/cars/${car.id}`);
      toast.success('Auto eliminado');
      load();
    } catch {
      toast.error('Error al eliminar el auto');
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

  const filtered = cars.filter(c => {
    const matchSearch = !search || `${c.brand} ${c.model} ${c.plate || ''} ${c.year || ''}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="site-shell">
      <Navbar />
      <div className="page-frame">
        <div className="mb-6 flex flex-col gap-4 rounded-[16px] border border-[#9aa7bf]/20 bg-[#2d313a]/88 p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm uppercase tracking-[0.28em] text-[#7fc0ff]">Inventario</p>
            <h1 className="text-3xl font-semibold text-[#f0f4fb]">Vehículos</h1>
            <p className="mt-2 text-[#d2daea]">Cada auto se presenta como una ficha clara, comercial y lista para revisar.</p>
          </div>
          <Link
            to="/cars/new"
            className="brand-button"
          >
            <Plus className="w-4 h-4" /> Agregar Auto
          </Link>
        </div>

        <div className="brand-panel mb-6 flex flex-col gap-3 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a6b3ca]" />
            <input
              type="text"
              placeholder="Buscar por marca, modelo, patente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="brand-input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => {
              const nextStatus = e.target.value;
              setStatusFilter(nextStatus);
              const nextParams = new URLSearchParams(searchParams);
              if (nextStatus) nextParams.set('status', nextStatus);
              else nextParams.delete('status');
              setSearchParams(nextParams);
            }}
            className="brand-input sm:max-w-[220px]"
          >
            <option value="">Todos los estados</option>
            <option value="disponible">Disponible</option>
            <option value="en_reparacion">En Reparación</option>
            <option value="reservado">Reservado</option>
            <option value="vendido">Vendido</option>
          </select>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {Object.keys(STATUS_LABELS).map((key) => {
            const count = cars.filter(c => c.status === key).length;
            return (
              <span key={key} className="status-chip">
                <span className={`status-chip-dot ${STATUS_DOT[key]}`} />
                {STATUS_LABELS[key]}
                <span className="rounded-full bg-[#46526a] px-2 py-0.5 text-[11px] text-[#dbe4f3]">{count}</span>
              </span>
            );
          })}
        </div>

        {loading ? (
          <div className="py-20 text-center text-[#d2daea]">Cargando vehículos...</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-[#d2daea]">
            <CarIcon className="mx-auto mb-4 h-16 w-16 text-[#9fb2d2]" />
            <p className="text-lg">No se encontraron vehículos</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map(car => (
              <div key={car.id} className="neo-card pb-6">
                <div className="neo-card-header">
                  <div className="min-w-0">
                    <p className="neo-card-subtitle">{car.plate || 'Sin patente'}</p>
                    <h2 className="neo-card-title truncate">{car.brand} {car.model}</h2>
                    <p className="mt-1 text-[14px] text-[#b8c4da]">{car.year || 'S/A'} · {car.color || 'Sin color'}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[car.status]}`}>
                    {STATUS_LABELS[car.status]}
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  <p className="neo-card-line">Compra: {fmt(car.purchase_price || 0)}</p>
                  <p className="neo-card-line">Reparaciones: {fmt(car.total_repair_cost || 0)}</p>
                  <p className="neo-card-line font-semibold text-[#f0f4fb]">Inversión total: {fmt((car.purchase_price || 0) + (car.total_repair_cost || 0))}</p>
                </div>
                <div className="neo-card-meta">
                  <span className="inline-flex items-center gap-1.5"><UserRound className="h-4 w-4" /> {car.vin ? 'VIN cargado' : 'Sin VIN'}</span>
                  <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" /> {car.arrival_date || 'Sin fecha'}</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link
                    to={`/cars/${car.id}`}
                    className="brand-button-soft flex-1 text-sm"
                  >
                    <Eye className="w-4 h-4" /> Ver Ficha
                  </Link>
                  <button
                    onClick={() => handleDelete(car)}
                    className="flex items-center justify-center gap-1.5 rounded-[10px] border border-[#6f86a8]/35 bg-[#2a3342] px-3 py-2 text-sm font-medium text-[#d8e6fb] transition-colors hover:bg-[#354157]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className={`neo-card-strip ${STRIP_CLASS[car.status] || 'neo-accent-teal'}`} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
