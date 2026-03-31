import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api';
import type { CarDetail as CarDetailType, RepairWithDocs } from '../types';
import { REPAIR_TYPES } from '../types';
import Navbar from '../components/Navbar';
import CarCharts from '../components/CarCharts';
import RepairModal from '../components/RepairModal';
import DocumentModal from '../components/DocumentModal';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Edit, Camera, Trash2, Plus, Wrench, FileText,
  ChevronDown, ChevronUp, DollarSign, Calendar, ExternalLink
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  disponible: 'bg-[#00c2ff]/25 text-[#e8f8ff]',
  vendido: 'bg-[#ff5a36]/20 text-[#ffe8e2]',
  en_reparacion: 'bg-[#2e9eff]/24 text-[#e8f3ff]',
  reservado: 'bg-[#7db7ff]/20 text-[#edf4ff]',
};
const STATUS_LABELS: Record<string, string> = {
  disponible: 'Disponible', vendido: 'Vendido', en_reparacion: 'En Reparación', reservado: 'Reservado'
};

export default function CarDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [car, setCar] = useState<CarDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'repairs' | 'charts'>('info');
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [editRepair, setEditRepair] = useState<RepairWithDocs | null>(null);
  const [showDocModal, setShowDocModal] = useState<number | null>(null);
  const [expandedRepairs, setExpandedRepairs] = useState<Set<number>>(new Set());
  const photoInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    api.get(`/cars/${id}`)
      .then(r => setCar(r.data))
      .catch(() => { toast.error('Vehículo no encontrado'); navigate('/cars'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const fmt = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

  // ── Fotos ──
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingPhotos(true);
    const fd = new FormData();
    Array.from(files).forEach(f => fd.append('photos', f));
    try {
      await api.post(`/cars/${id}/photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`${files.length} foto(s) subida(s)`);
      load();
    } catch {
      toast.error('Error al subir fotos');
    } finally {
      setUploadingPhotos(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const deletePhoto = async (photoId: number) => {
    if (!confirm('¿Eliminar esta foto?')) return;
    try {
      await api.delete(`/cars/${id}/photos/${photoId}`);
      toast.success('Foto eliminada');
      load();
    } catch { toast.error('Error al eliminar foto'); }
  };

  // ── Reparaciones ──
  const toggleRepair = (repairId: number) => {
    setExpandedRepairs(prev => {
      const next = new Set(prev);
      if (next.has(repairId)) next.delete(repairId);
      else next.add(repairId);
      return next;
    });
  };

  const deleteRepair = async (repairId: number) => {
    if (!confirm('¿Eliminar esta reparación y todos sus documentos?')) return;
    try {
      await api.delete(`/repairs/${repairId}`);
      toast.success('Reparación eliminada');
      load();
    } catch { toast.error('Error al eliminar'); }
  };

  const deleteDocument = async (docId: number) => {
    if (!confirm('¿Eliminar este documento?')) return;
    try {
      await api.delete(`/repairs/documents/${docId}`);
      toast.success('Documento eliminado');
      load();
    } catch { toast.error('Error al eliminar'); }
  };

  if (loading) return (
    <div className="site-shell"><Navbar /><div className="py-20 text-center text-[#d7e7ff]">Cargando ficha...</div></div>
  );
  if (!car) return null;

  const totalInvestment = (car.purchase_price || 0) + (car.totalRepairCost || 0);

  return (
    <div className="site-shell">
      <Navbar />

      {/* Modales */}
      {(showRepairModal || editRepair) && (
        <RepairModal
          carId={car.id}
          repair={editRepair}
          onClose={() => { setShowRepairModal(false); setEditRepair(null); }}
          onSaved={() => { setShowRepairModal(false); setEditRepair(null); load(); }}
        />
      )}
      {showDocModal !== null && (
        <DocumentModal
          repairId={showDocModal}
          onClose={() => setShowDocModal(null)}
          onSaved={() => { setShowDocModal(null); load(); }}
        />
      )}

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-[#d6e7ff] hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-[#f5fbff]">{car.brand} {car.model} {car.year || ''}</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[car.status]}`}>
                  {STATUS_LABELS[car.status]}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-[#c9daf4]">{car.plate || 'Sin patente'} · {car.color || ''}</p>
            </div>
          </div>
          <Link
            to={`/cars/${car.id}/edit`}
            className="brand-button-soft self-start"
          >
            <Edit className="w-4 h-4" /> Editar
          </Link>
        </div>

        {/* Resumen económico */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <MoneyCard label="Precio de Compra" value={fmt(car.purchase_price || 0)} color="blue" />
          <MoneyCard label="Total Reparaciones" value={fmt(car.totalRepairCost || 0)} color="orange" />
          <MoneyCard label="Inversión Total" value={fmt(totalInvestment)} color="purple" highlight />
        </div>

          <div className="mb-6 flex rounded-[24px] border border-[#8fb9ee]/35 bg-[#11243a]/85 p-1.5 shadow-[0_12px_30px_rgba(6,14,26,0.32)] backdrop-blur-sm">
          {(['info', 'repairs', 'charts'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
                className={`rounded-[18px] px-5 py-3 text-sm font-semibold transition-all ${
                activeTab === tab
                    ? 'bg-[linear-gradient(120deg,#00c2ff_0%,#2e9eff_46%,#ff5a36_100%)] text-white shadow-[0_10px_24px_rgba(0,194,255,0.3)]'
                    : 'text-[#d4e4fb] hover:bg-[#1a3554] hover:text-[#ffffff]'
              }`}
            >
              {tab === 'info' ? 'Ficha' : tab === 'repairs' ? `Historial (${car.repairs.length})` : 'Gráficos'}
            </button>
          ))}
        </div>

        {/* ── TAB: FICHA ── */}
        {activeTab === 'info' && (
          <div className="space-y-6">
            {/* Datos del auto */}
            <div className="brand-card p-6">
              <h2 className="mb-4 text-lg font-semibold text-[#f5fbff]">Datos del Vehículo</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <DataField label="Marca" value={car.brand} />
                <DataField label="Modelo" value={car.model} />
                <DataField label="Año" value={car.year?.toString() || '-'} />
                <DataField label="Color" value={car.color || '-'} />
                <DataField label="Patente" value={car.plate || '-'} />
                <DataField label="VIN/Chasis" value={car.vin || '-'} />
                <DataField label="Kilometraje" value={car.km ? `${car.km.toLocaleString('es-CL')} km` : '-'} />
                <DataField label="Fecha de llegada" value={car.arrival_date ? new Date(car.arrival_date + 'T00:00:00').toLocaleDateString('es-CL') : '-'} />
                <DataField label="Estado" value={STATUS_LABELS[car.status] || car.status} />
              </div>
              {car.notes && (
                <div className="mt-4 rounded-[20px] bg-[#142a42] p-4 border border-[#8fb9ee]/30">
                  <p className="mb-1 text-xs text-[#9edfff]">Observaciones</p>
                  <p className="text-sm text-[#eaf3ff]">{car.notes}</p>
                </div>
              )}
            </div>

            <div className="brand-card p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-[#f5fbff]">
                  Fotos <span className="text-sm font-normal text-[#c9daf4]">({car.photos.length})</span>
                </h2>
                <button
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadingPhotos}
                  className="brand-button px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Camera className="w-4 h-4" />
                  {uploadingPhotos ? 'Subiendo...' : 'Subir Fotos'}
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>
              {car.photos.length === 0 ? (
                <div className="border-2 border-dashed border-[#8fb9ee]/35 rounded-xl py-12 text-center text-[#c9daf4] bg-[#10253c]/65">
                  <Camera className="w-10 h-10 mx-auto mb-2 text-[#9edfff]" />
                  <p>No hay fotos. Haz clic en "Subir Fotos".</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {car.photos.map(photo => (
                    <div key={photo.id} className="relative group aspect-square overflow-hidden rounded-[22px] bg-[#10253c]">
                      <img
                        src={`/uploads/photos/${photo.filename}`}
                        alt={photo.original_name || 'Foto'}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <a
                          href={`/uploads/photos/${photo.filename}`}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-[#0f2238]/90 hover:bg-[#193754] p-1.5 rounded-lg"
                        >
                          <ExternalLink className="w-4 h-4 text-[#eaf3ff]" />
                        </a>
                        <button
                          onClick={() => deletePhoto(photo.id)}
                          className="bg-red-500/90 hover:bg-red-500 p-1.5 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: HISTORIAL DE REPARACIONES ── */}
        {activeTab === 'repairs' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-[#d7e7ff]">{car.repairs.length} reparacion(es) · Total: <strong>{fmt(car.totalRepairCost)}</strong></p>
              <button
                onClick={() => { setEditRepair(null); setShowRepairModal(true); }}
                className="brand-button px-4 py-2 text-sm"
              >
                <Plus className="w-4 h-4" /> Nueva Reparación
              </button>
            </div>

            {car.repairs.length === 0 ? (
              <div className="brand-card py-16 text-center text-[#d7e7ff]">
                <Wrench className="mx-auto mb-3 h-12 w-12 text-[#9edfff]" />
                <p>No hay reparaciones registradas.</p>
              </div>
            ) : (
              car.repairs.map(repair => {
                const isOpen = expandedRepairs.has(repair.id);
                const typeLabel = REPAIR_TYPES.find(t => t.value === repair.type)?.label || repair.type;
                const docsTotal = repair.documents.reduce((s, d) => s + (d.amount || 0), 0);

                return (
                  <div key={repair.id} className="overflow-hidden rounded-[24px] border border-[#8fb9ee]/30 bg-[#11243a]/88 shadow-sm">
                    <div
                      className="flex cursor-pointer items-center justify-between px-5 py-4 transition-colors hover:bg-[#173453]"
                      onClick={() => toggleRepair(repair.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="shrink-0 rounded-2xl bg-[#00c2ff]/20 p-2">
                          <Wrench className="w-4 h-4 text-[#9edfff]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-[#f5fbff]">{repair.description}</span>
                            <span className="rounded-full bg-[#00c2ff]/20 px-2 py-0.5 text-xs text-[#dff4ff]">{typeLabel}</span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-3 text-sm text-[#c9daf4]">
                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(repair.date + 'T00:00:00').toLocaleDateString('es-CL')}</span>
                            {repair.workshop && <span>· {repair.workshop}</span>}
                            <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{repair.documents.length} doc(s)</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="font-bold text-[#f5fbff]">{fmt(repair.cost || 0)}</p>
                          {docsTotal > 0 && <p className="text-xs text-[#c9daf4]">Docs: {fmt(docsTotal)}</p>}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={e => { e.stopPropagation(); setEditRepair(repair); }}
                            className="p-1.5 text-[#afc5e6] hover:text-[#eaf3ff] hover:bg-[#1f3f62] rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); deleteRepair(repair.id); }}
                            className="p-1.5 text-[#afc5e6] hover:text-[#ffd4cb] hover:bg-[#4d1e1a] rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {isOpen ? <ChevronUp className="w-4 h-4 text-[#afc5e6]" /> : <ChevronDown className="w-4 h-4 text-[#afc5e6]" />}
                        </div>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="border-t border-[#8fb9ee]/30 bg-[#0f2238] px-5 py-4">
                        {repair.notes && (
                          <p className="mb-4 text-sm italic text-[#d7e7ff]">"{repair.notes}"</p>
                        )}

                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="text-sm font-semibold text-[#f5fbff]">Boletas / Facturas</h4>
                            <button
                              onClick={() => setShowDocModal(repair.id)}
                              className="brand-button-soft px-3 py-1.5 text-xs"
                            >
                              <Plus className="w-3.5 h-3.5" /> Adjuntar Documento
                            </button>
                          </div>

                          {repair.documents.length === 0 ? (
                            <p className="text-sm text-[#c9daf4] italic">Sin documentos adjuntos.</p>
                          ) : (
                            <div className="space-y-2">
                              {repair.documents.map(doc => {
                                const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(doc.filename);
                                const docTypeLabel = { boleta: 'Boleta', factura: 'Factura', presupuesto: 'Presupuesto', otro: 'Documento' }[doc.document_type] || 'Documento';

                                return (
                                  <div key={doc.id} className="flex items-center justify-between rounded-[20px] border border-[#8fb9ee]/30 bg-[#173453] px-4 py-3">
                                    <div className="flex items-center gap-3">
                                      {isImage ? (
                                        <img src={`/uploads/documents/${doc.filename}`} className="w-10 h-10 object-cover rounded" alt="" />
                                      ) : (
                                        <div className="w-10 h-10 bg-[#4d1e1a] rounded flex items-center justify-center">
                                          <FileText className="w-5 h-5 text-[#ffd4cb]" />
                                        </div>
                                      )}
                                      <div>
                                        <p className="text-sm font-medium text-[#f5fbff]">
                                          <span className="mr-2 rounded bg-[#00c2ff]/20 px-1.5 py-0.5 text-xs text-[#dff4ff]">{docTypeLabel}</span>
                                          {doc.document_number ? `N° ${doc.document_number}` : doc.original_name || 'Documento'}
                                        </p>
                                        <p className="text-xs text-[#c9daf4]">
                                          {doc.provider && `${doc.provider} · `}
                                          {doc.amount > 0 ? fmt(doc.amount) : 'Sin monto'}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <a
                                        href={`/uploads/documents/${doc.filename}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1.5 text-[#afc5e6] hover:text-[#eaf3ff] hover:bg-[#1f3f62] rounded-lg transition-colors"
                                      >
                                        <ExternalLink className="w-4 h-4" />
                                      </a>
                                      <button
                                        onClick={() => deleteDocument(doc.id)}
                                        className="p-1.5 text-[#afc5e6] hover:text-[#ffd4cb] hover:bg-[#4d1e1a] rounded-lg transition-colors"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── TAB: GRÁFICOS ── */}
        {activeTab === 'charts' && (
          <CarCharts carId={car.id} carData={car} />
        )}
      </div>
    </div>
  );
}

function DataField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-[#142a42] border border-[#8fb9ee]/30 p-3">
      <p className="mb-0.5 text-xs text-[#9edfff]">{label}</p>
      <p className="font-medium text-[#f5fbff]">{value}</p>
    </div>
  );
}

function MoneyCard({ label, value, color, highlight }: { label: string; value: string; color: string; highlight?: boolean }) {
  const colors: Record<string, string> = {
    blue: 'border-[#6ca9e4] bg-[#163455] text-[#eaf3ff]', orange: 'border-[#e07963] bg-[#4b2721] text-[#ffe8e2]', purple: 'border-[#73b8f8] bg-[#112b48] text-[#eaf3ff]'
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]} ${highlight ? 'ring-2 ring-[#00c2ff]/45' : ''}`}>
      <p className="mb-1 text-xs text-[#c9daf4]">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
