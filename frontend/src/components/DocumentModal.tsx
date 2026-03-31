import { useState, useRef } from 'react';
import api from '../api';
import { DOC_TYPES } from '../types';
import toast from 'react-hot-toast';
import { X, Upload, FileText } from 'lucide-react';

interface Props {
  repairId: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function DocumentModal({ repairId, onClose, onSaved }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    document_type: 'boleta',
    document_number: '',
    provider: '',
    amount: ''
  });
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      toast.error('Selecciona al menos un documento');
      return;
    }
    setLoading(true);
    const fd = new FormData();
    files.forEach(f => fd.append('documents', f));
    fd.append('document_type', form.document_type);
    if (form.document_number) fd.append('document_number', form.document_number);
    if (form.provider) fd.append('provider', form.provider);
    fd.append('amount', form.amount || '0');

    try {
      await api.post(`/repairs/${repairId}/documents`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Documento(s) adjuntado(s)');
      onSaved();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al subir');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="brand-card rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#8fb9ee]/30">
          <h2 className="text-lg font-bold text-[#f5fbff]">Adjuntar Boleta / Factura</h2>
          <button onClick={onClose} className="text-[#afc5e6] hover:text-[#ffffff] p-1.5 rounded-lg hover:bg-[#173453] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Área de subida */}
          <div
            className="border-2 border-dashed border-[#8fb9ee]/35 rounded-xl p-6 text-center cursor-pointer hover:border-[#00c2ff] hover:bg-[#173453] transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {files.length > 0 ? (
              <div>
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-[#eaf3ff] justify-center">
                    <FileText className="w-4 h-4 text-[#9edfff]" />
                    {f.name}
                  </div>
                ))}
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-[#9edfff] mx-auto mb-2" />
                <p className="text-sm text-[#eaf3ff]">Haz clic para seleccionar PDF o imágenes</p>
                <p className="text-xs text-[#c9daf4] mt-1">Máximo 15MB por archivo</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/*"
            multiple
            className="hidden"
            onChange={handleFiles}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#eaf3ff] mb-1">Tipo</label>
              <select
                name="document_type"
                value={form.document_type}
                onChange={handle}
                className="brand-input"
              >
                {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#eaf3ff] mb-1">N° Documento</label>
              <input
                type="text"
                name="document_number"
                value={form.document_number}
                onChange={handle}
                placeholder="12345"
                className="brand-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#eaf3ff] mb-1">Proveedor</label>
              <input
                type="text"
                name="provider"
                value={form.provider}
                onChange={handle}
                placeholder="Nombre del taller..."
                className="brand-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#eaf3ff] mb-1">Monto ($)</label>
              <input
                type="number"
                name="amount"
                value={form.amount}
                onChange={handle}
                placeholder="0"
                min="0"
                step="1"
                className="brand-input"
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
              <Upload className="w-4 h-4" />
              {loading ? 'Subiendo...' : 'Adjuntar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
