
export interface Brand {
  id: string;
  name: string;
}

export interface Model {
  id: string;
  name: string;
  brandId: string;
}

export interface Color {
  id: string;
  name: string;
}

export interface Accessory {
  id: string;
  name: string;
}

export interface Condition {
  id: string;
  name: string;
}

export interface Service {
  id: string;
  name: string;
}

export interface TermAndCondition {
  id: string;
  text: string;
}

export interface SparePartType {
  id: string;
  name: string;
  isActive: boolean;
}

export interface SparePart {
  id: string;
  typeId: string;
  brandId: string;
  modelId: string;
  quantity: number;
  description?: string;
}

export type RepairStatus = 'Ingresado' | 'En Revisión' | 'En Reparación' | 'Reparado' | 'Listo para Entrega' | 'Entregado' | 'Sin reparación' | 'Entregado (no reparado)';

export const repairStatuses: RepairStatus[] = ['Ingresado', 'En Revisión', 'En Reparación', 'Reparado', 'Listo para Entrega', 'Sin reparación', 'Entregado', 'Entregado (no reparado)'];

export interface DeviceInRequest {
  id: string;
  brandId: string;
  modelId: string;
  colorId: string;
  imei?: string;
  problem?: string;
  problemDescription?: string;
  serviceIds: string[];
  serviceCosts?: { serviceId: string; cost: number }[];
  accessories: string[];
  conditions: string[];
  password?: string;
  pattern?: number[];
  notes?: string;
  quote?: number;
  downPayment?: number;
}

export interface RepairRequest {
  id: string;
  folio: number;
  clientName: string;
  phoneNumbers: { value: string }[];
  devices: DeviceInRequest[];
  createdAt: string;
  updatedAt?: string;
  deliveryDate?: string;
  status: RepairStatus;
  notes?: string;
}

export interface CatalogData {
  brands: Brand[];
  models: Model[];
  colors: Color[];
  accessories: Accessory[];
  conditions: Condition[];
  services: Service[];
  terms: TermAndCondition[];
  sparePartTypes: SparePartType[];
  spareParts: SparePart[];
}

export interface QuotePrice {
  id: string;
  model: string;
  partType: string;
  cost: number;
}

export interface QuotePricesMetadata {
  count: number;
  lastUpdated: string;
}

export interface SickwService {
  id: string;
  serviceId: string;
  name: string;
  price?: string;
  publicPrice?: number;
}

export interface UnlockCheck {
  id: string;
  imei: string;
  serviceId: string;
  serviceName: string;
  status: 'success' | 'error';
  result: string;
  price?: string;
  orderId?: string;
  checkedBy?: string;
  createdAt: string;
}
