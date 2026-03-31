import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { CAR_STATUS } from '../types';
import { CAR_BRANDS, CAR_CATALOG } from '../constants/carCatalog';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import { ArrowLeft, Save } from 'lucide-react';

const CUSTOM_MODELS_STORAGE_KEY = 'custom_models_by_brand_v1';

export default function CarForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({
    brand: '', model: '', year: '', color: '', plate: '', vin: '',
    km: '', arrival_date: '', purchase_price: '', status: 'disponible', notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [customCatalog, setCustomCatalog] = useState<Record<string, string[]>>({});
  const [newModel, setNewModel] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_MODELS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        setCustomCatalog(parsed as Record<string, string[]>);
      }
    } catch {
      // Si el storage esta corrupto, seguimos con el catalogo base.
    }
  }, []);

  const catalog = useMemo(() => {
    const merged: Record<string, string[]> = {};
    const allBrands = new Set([...Object.keys(CAR_CATALOG), ...Object.keys(customCatalog)]);

    allBrands.forEach((brand) => {
      const baseModels = CAR_CATALOG[brand] || [];
      const customModels = customCatalog[brand] || [];
      merged[brand] = Array.from(new Set([...baseModels, ...customModels]))
        .sort((a, b) => a.localeCompare(b));
    });

    return merged;
  }, [customCatalog]);

  const brandOptions = useMemo(
    () => Object.keys(catalog).sort((a, b) => a.localeCompare(b)),
    [catalog]
  );

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/cars/${id}`)
      .then(r => {
        const c = r.data;
        setForm({
          brand: c.brand || '', model: c.model || '', year: c.year?.toString() || '',
          color: c.color || '', plate: c.plate || '', vin: c.vin || '',
          km: c.km?.toString() || '', arrival_date: c.arrival_date || '',
          purchase_price: c.purchase_price?.toString() || '', status: c.status || 'disponible',
          notes: c.notes || ''
        });
      })
      .catch(() => { toast.error('Error cargando datos'); navigate('/cars'); })
      .finally(() => setLoadingData(false));
  }, [id]);

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextBrand = e.target.value;
    setForm(prev => {
      const nextModels = catalog[nextBrand] || [];
      const keepCurrentModel = prev.model && nextModels.includes(prev.model);
      return {
        ...prev,
        brand: nextBrand,
        model: keepCurrentModel ? prev.model : ''
      };
    });
  };

  const modelOptions = catalog[form.brand] || [];

  const handleAddModel = () => {
    const modelName = newModel.trim();
    if (!form.brand) {
      toast.error('Selecciona una marca primero');
      return;
    }
    if (!modelName) {
      toast.error('Escribe un modelo valido');
      return;
    }

    const exists = (catalog[form.brand] || []).some(
      (m) => m.toLowerCase() === modelName.toLowerCase()
    );
    if (exists) {
      toast.error('Ese modelo ya existe en la marca seleccionada');
      return;
    }

    setCustomCatalog((prev) => {
      const next = {
        ...prev,
        [form.brand]: [...(prev[form.brand] || []), modelName],
      };
      localStorage.setItem(CUSTOM_MODELS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });

    setForm((prev) => ({ ...prev, model: modelName }));
    setNewModel('');
    toast.success(`Modelo agregado a ${form.brand}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.brand.trim() || !form.model.trim()) {
      toast.error('Marca y modelo son obligatorios');
      return;
    }
    setLoading(true);
    const payload = {
      ...form,
      year: form.year ? parseInt(form.year) : null,
      km: form.km ? parseInt(form.km) : null,
      purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : 0,
    };
    try {
      if (isEdit) {
        await api.put(`/cars/${id}`, payload);
        toast.success('Auto actualizado');
        navigate(`/cars/${id}`);
      } else {
        const { data } = await api.post('/cars', payload);
        toast.success('Auto registrado correctamente');
        navigate(`/cars/${data.id}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) return (
    <div className="site-shell"><Navbar /><div className="py-20 text-center text-[#d7e7ff]">Cargando...</div></div>
  );

  return (
    <div className="site-shell">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-[#d6e7ff] hover:text-[#ffffff]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-[#8fdcff]">Ficha del vehículo</p>
            <h1 className="text-3xl font-semibold text-[#f5fbff]">{isEdit ? 'Editar Vehículo' : 'Registrar Nuevo Vehículo'}</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="brand-card space-y-6 p-6 sm:p-8">

          {/* Sección identificación */}
          <Section title="Identificación del Vehículo">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#eaf3ff]">Marca *</label>
                <select
                  name="brand"
                  value={form.brand}
                  onChange={handleBrandChange}
                  className="brand-input"
                >
                  <option value="">Selecciona una marca</option>
                  {brandOptions.map((brand) => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-[#eaf3ff]">Modelo *</label>
                <input
                  type="text"
                  name="model"
                  value={form.model}
                  onChange={handle}
                  list="model-suggestions"
                  className="brand-input"
                  disabled={!form.brand}
                  placeholder={form.brand ? 'Escribe o selecciona un modelo' : 'Primero elige una marca'}
                />
                <datalist id="model-suggestions">
                  {modelOptions.map((model) => (
                    <option key={model} value={model} />
                  ))}
                </datalist>
                {form.brand && (
                  <p className="mt-1 text-xs text-[#c9daf4]">
                    Sugerencias disponibles: {modelOptions.length}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2 rounded-[14px] border border-[#8fdcff]/25 bg-[#0f1f33]/55 p-4">
                <p className="text-sm font-semibold text-[#eaf3ff]">Agregar modelo a una marca</p>
                <p className="mt-1 text-xs text-[#c9daf4]">Se guarda en este navegador para futuros registros.</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    className="brand-input flex-1"
                    placeholder={form.brand ? `Nuevo modelo para ${form.brand}` : 'Primero selecciona una marca'}
                    disabled={!form.brand}
                  />
                  <button
                    type="button"
                    onClick={handleAddModel}
                    disabled={!form.brand}
                    className="brand-button sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Agregar modelo
                  </button>
                </div>
              </div>

              <Field label="Año" name="year" value={form.year} onChange={handle} placeholder="2020" type="number" />
              <Field label="Color" name="color" value={form.color} onChange={handle} placeholder="Blanco, Negro..." />
              <Field label="Patente" name="plate" value={form.plate} onChange={handle} placeholder="ABCD12" />
            </div>
          </Section>

          {/* Sección datos de ingreso */}
          <Section title="Datos de Ingreso y Compra">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Kilometraje" name="km" value={form.km} onChange={handle} placeholder="150000" type="number" />
              <Field label="Fecha de compra" name="arrival_date" value={form.arrival_date} onChange={handle} type="date" />
              <Field label="Precio de Compra ($)" name="purchase_price" value={form.purchase_price} onChange={handle} placeholder="0" type="number" />
              <div>
                <label className="block text-sm font-semibold text-[#eaf3ff] mb-1">Estado</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handle}
                  className="brand-input"
                >
                  {CAR_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
          </Section>

          {/* Notas */}
          <Section title="Observaciones">
            <textarea
              name="notes"
              value={form.notes}
              onChange={handle}
              rows={4}
              placeholder="Notas internas sobre el vehículo..."
              className="brand-input resize-none"
            />
          </Section>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="brand-button-soft flex-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="brand-button flex-1 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Registrar Auto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 border-b border-[#8fdcff]/30 pb-2 text-sm font-semibold uppercase tracking-[0.22em] text-[#9edfff]">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, name, value, onChange, placeholder, type = 'text' }: {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-[#eaf3ff]">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="brand-input"
      />
    </div>
  );
}
