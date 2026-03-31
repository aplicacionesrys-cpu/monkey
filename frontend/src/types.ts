export interface User {
  username: string;
  token: string;
}

export interface Car {
  id: number;
  brand: string;
  model: string;
  year: number | null;
  color: string | null;
  plate: string | null;
  vin: string | null;
  km: number | null;
  arrival_date: string | null;
  purchase_price: number;
  status: 'disponible' | 'vendido' | 'en_reparacion' | 'reservado';
  notes: string | null;
  created_at: string;
  updated_at: string;
  photo_count?: number;
  repair_count?: number;
  total_repair_cost?: number;
}

export interface CarDetail extends Car {
  photos: CarPhoto[];
  repairs: RepairWithDocs[];
  totalRepairCost: number;
}

export interface CarPhoto {
  id: number;
  car_id: number;
  filename: string;
  original_name: string | null;
  created_at: string;
}

export interface Repair {
  id: number;
  car_id: number;
  type: string;
  workshop: string | null;
  description: string;
  date: string;
  cost: number;
  notes: string | null;
  created_at: string;
}

export interface RepairDocument {
  id: number;
  repair_id: number;
  filename: string;
  original_name: string | null;
  document_type: 'boleta' | 'factura' | 'presupuesto' | 'otro';
  document_number: string | null;
  provider: string | null;
  amount: number;
  created_at: string;
}

export interface RepairWithDocs extends Repair {
  documents: RepairDocument[];
}

export interface CarStats {
  purchase_price: number;
  total_repairs: number;
  total_investment: number;
  by_type: { type: string; total: number; count: number }[];
  by_month: { month: string; total: number }[];
  repairs_list: Repair[];
}

export const REPAIR_TYPES = [
  { value: 'mecanica', label: 'Mecánica' },
  { value: 'chaperia', label: 'Chaperíay Pintura' },
  { value: 'electricidad', label: 'Electricidad' },
  { value: 'tapizado', label: 'Tapizado' },
  { value: 'neumaticos', label: 'Neumáticos' },
  { value: 'revision', label: 'Revisión / Inspección' },
  { value: 'limpieza', label: 'Limpieza / Detailing' },
  { value: 'otro', label: 'Otro' },
];

export const DOC_TYPES = [
  { value: 'boleta', label: 'Boleta' },
  { value: 'factura', label: 'Factura' },
  { value: 'presupuesto', label: 'Presupuesto' },
  { value: 'otro', label: 'Otro' },
];

export const CAR_STATUS = [
  { value: 'disponible', label: 'Disponible' },
  { value: 'en_reparacion', label: 'En Reparación' },
  { value: 'reservado', label: 'Reservado' },
  { value: 'vendido', label: 'Vendido' },
];
