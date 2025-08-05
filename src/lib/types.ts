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

export type RepairStatus = 'Ingresado' | 'En Revisión' | 'En Reparación' | 'Reparado' | 'Listo para Entrega' | 'Entregado' | 'Cancelado';

export const repairStatuses: RepairStatus[] = ['Ingresado', 'En Revisión', 'En Reparación', 'Reparado', 'Listo para Entrega', 'Entregado', 'Cancelado'];

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
  status: RepairStatus;
}

export interface CatalogData {
  brands: Brand[];
  models: Model[];
  colors: Color[];
  accessories: Accessory[];
  conditions: Condition[];
  services: Service[];
  terms: TermAndCondition[];
}
