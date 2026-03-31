import { useState, useEffect } from 'react';
import api from '../api';
import { RepairWithDocs, REPAIR_TYPES } from '../types';
import toast from 'react-hot-toast';
import { X, Save } from 'lucide-react';

interface Props {
  carId: number;
  repair: RepairWithDocs | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function RepairModal({ carId, repair, onClose, onSaved }: Props) {
  const isEdit = !!repair;
  const [form, setForm] = useState({
    type: 'otro',
    workshop: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    cost: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (repair) {
      setForm({
        type: repair.type || 'otro',
        workshop: repair.workshop || '',
        description: repair.description || '',
        date: repair.date || '',
        cost: repair.cost?.toString() || '',
        notes: repair.notes || ''
      });
    }
  }, [repair]);

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim() || !form.date) {
      toast.error('Descripción y fecha son obligatorias');
      return;
    }
    setLoading(true);
    const payload = { ...form, cost: form.cost ? parseFloat(form.cost) : 0 };
    try {
      if (isEdit) {
        await api.put(`/repairs/${repair!.id}`, payload);
        toast.success('Reparación actualizada');
      } else {
        await api.post(`/repairs/car/${carId}`, payload);
        toast.success('Reparación registrada');
      }
      onSaved();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="brand-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#8fb9ee]/30">
          <h2 className="text-lg font-bold text-[#f5fbff]">{isEdit ? 'Editar Reparación' : 'Nueva Reparación'}</h2>
          <button onClick={onClose} className="text-[#afc5e6] hover:text-[#ffffff] p-1.5 rounded-lg hover:bg-[#173453] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-[#eaf3ff] mb-1">Descripción *</label>
              <input
                type="text"
                name="description"
                value={form.description}
                onChange={handle}
                placeholder="Cambio de aceite, pintura puerta..."
                className="brand-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#eaf3ff] mb-1">Tipo</label>
              <select
                name="type"
                value={form.type}
                onChange={handle}
                className="brand-input"
              >
                {REPAIR_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#eaf3ff] mb-1">Fecha *</label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handle}
                className="brand-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#eaf3ff] mb-1">Taller / Proveedor</label>
              <input
                type="text"
                name="workshop"
                value={form.workshop}
                onChange={handle}
                placeholder="Nombre del taller..."
                className="brand-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#eaf3ff] mb-1">Costo ($)</label>
              <input
                type="number"
                name="cost"
                value={form.cost}
                onChange={handle}
                placeholder="0"
                min="0"
                step="1"
                className="brand-input"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-[#eaf3ff] mb-1">Notas adicionales</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handle}
                rows={3}
                placeholder="Detalles adicionales..."
                className="brand-input resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="brand-button-soft flex-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="brand-button flex-1 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
