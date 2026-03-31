import { useEffect, useState } from 'react';
import api from '../api';
import { CarStats } from '../types';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
} from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import type { CarDetail } from '../types';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title);

const COLORS = ['#00c2ff', '#2e9eff', '#ff5a36', '#7db7ff', '#49d4ff', '#ff865d', '#8fdcff', '#5aa8ff'];

interface Props {
  carId: number;
  carData: CarDetail;
}

export default function CarCharts({ carId, carData }: Props) {
  const [stats, setStats] = useState<CarStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/cars/${carId}/stats`)
      .then(r => setStats(r.data))
      .finally(() => setLoading(false));
  }, [carId]);

  if (loading) return <div className="py-12 text-center text-[#d7e7ff]">Cargando gráficos...</div>;
  if (!stats) return null;

  const fmt = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

  // Datos para gráfico de inversión total (torta)
  const pieData = {
    labels: ['Precio de Compra', 'Reparaciones'],
    datasets: [{
      data: [stats.purchase_price, stats.total_repairs],
      backgroundColor: ['#3b82f6', '#f97316'],
      borderWidth: 2,
      borderColor: '#fff',
    }]
  };

  // Datos para tipo de reparación (barras)
  const REPAIR_LABELS: Record<string, string> = {
    mecanica: 'Mecánica', chaperia: 'Chapería', electricidad: 'Electricidad',
    tapizado: 'Tapizado', neumaticos: 'Neumáticos', revision: 'Revisión',
    limpieza: 'Limpieza', otro: 'Otro'
  };
  const barData = {
    labels: stats.by_type.map(t => REPAIR_LABELS[t.type] || t.type),
    datasets: [{
      label: 'Costo ($)',
      data: stats.by_type.map(t => t.total),
      backgroundColor: stats.by_type.map((_, i) => COLORS[i % COLORS.length]),
      borderRadius: 6,
    }]
  };

  // Gráfico de línea (gasto acumulado por mes)
  const monthLabels = stats.by_month.map(m => {
    const [y, mo] = m.month.split('-');
    return new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString('es-CL', { month: 'short', year: '2-digit' });
  });
  const lineData = {
    labels: monthLabels,
    datasets: [{
      label: 'Gasto mensual ($)',
      data: stats.by_month.map(m => m.total),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.1)',
      fill: true,
      tension: 0.3,
      pointBackgroundColor: '#3b82f6',
    }]
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { position: 'bottom' as const } }
  };

  const barOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { ticks: { callback: (v: number | string) => fmt(Number(v)) } } }
  };

  return (
    <div className="space-y-6">
      {/* Resumen numérico */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Precio de Compra" value={fmt(stats.purchase_price)} color="sand" />
        <SummaryCard label="Total Reparaciones" value={fmt(stats.total_repairs)} color="copper" />
        <SummaryCard label="Inversión Total" value={fmt(stats.total_investment)} color="gold" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución de inversión */}
        <div className="brand-card p-5">
          <h3 className="mb-4 font-semibold text-[#f5fbff]">Distribución de Inversión</h3>
          {stats.purchase_price === 0 && stats.total_repairs === 0 ? (
            <p className="py-8 text-center text-[#d7e7ff]">Sin datos para mostrar</p>
          ) : (
            <div className="max-w-xs mx-auto">
              <Pie data={pieData} options={chartOptions} />
            </div>
          )}
        </div>

        {/* Costo por tipo de reparación */}
        <div className="brand-card p-5">
          <h3 className="mb-4 font-semibold text-[#f5fbff]">Costo por Tipo de Reparación</h3>
          {stats.by_type.length === 0 ? (
            <p className="py-8 text-center text-[#d7e7ff]">Sin reparaciones registradas</p>
          ) : (
            <Bar data={barData} options={barOptions} />
          )}
        </div>
      </div>

      {/* Evolución de gastos por mes */}
      {stats.by_month.length > 0 && (
        <div className="brand-card p-5">
          <h3 className="mb-4 font-semibold text-[#f5fbff]">Evolución de Gastos por Mes</h3>
          <Line data={lineData} options={{
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { ticks: { callback: (v: number | string) => fmt(Number(v)) } } }
          }} />
        </div>
      )}

      {/* Tabla de reparaciones */}
      {stats.repairs_list.length > 0 && (
        <div className="overflow-hidden rounded-[24px] border border-[#8fb9ee]/30 bg-[#11243a]/88 shadow-sm">
          <div className="border-b border-[#8fb9ee]/30 px-5 py-4">
            <h3 className="font-semibold text-[#f5fbff]">Detalle de Reparaciones</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[#8fb9ee]/30 bg-[#173453]">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-[#9edfff]">Fecha</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-[#9edfff]">Descripción</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-[#9edfff]">Tipo</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-[#9edfff]">Taller</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-[#9edfff]">Costo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#8fb9ee]/30">
                {stats.repairs_list.map(r => (
                  <tr key={r.id} className="hover:bg-[#173453]">
                    <td className="px-5 py-3 text-[#d7e7ff]">{new Date(r.date + 'T00:00:00').toLocaleDateString('es-CL')}</td>
                    <td className="px-5 py-3 font-medium text-[#f5fbff]">{r.description}</td>
                    <td className="px-5 py-3 text-[#d7e7ff]">{REPAIR_LABELS[r.type] || r.type}</td>
                    <td className="px-5 py-3 text-[#d7e7ff]">{r.workshop || '-'}</td>
                    <td className="px-5 py-3 text-right font-semibold text-[#f5fbff]">{fmt(r.cost || 0)}</td>
                  </tr>
                ))}
                <tr className="bg-[#0f2238] font-bold">
                  <td colSpan={4} className="px-5 py-3 text-[#f5fbff]">Total</td>
                  <td className="px-5 py-3 text-right text-[#9edfff]">{fmt(stats.total_repairs)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  const c: Record<string, string> = {
    sand: 'bg-[#163455] text-[#eaf3ff] border border-[#6ca9e4]',
    copper: 'bg-[#4b2721] text-[#ffe8e2] border border-[#e07963]',
    gold: 'bg-[#112b48] text-[#eaf3ff] border border-[#73b8f8]'
  };
  return (
    <div className={`${c[color]} rounded-[22px] p-4`}>
      <p className="mb-1 text-xs text-[#c9daf4]">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

const REPAIR_LABELS: Record<string, string> = {
  mecanica: 'Mecánica', chaperia: 'Chapería', electricidad: 'Electricidad',
  tapizado: 'Tapizado', neumaticos: 'Neumáticos', revision: 'Revisión',
  limpieza: 'Limpieza', otro: 'Otro'
};
