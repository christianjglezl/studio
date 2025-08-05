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

export type RepairStatus = 'Ingresado' | 'En Revisión' | 'En Reparación' | 'Reparado' | 'Listo para Entrega' | 'Entregado' | 'Cancelado';

export const repairStatuses: RepairStatus[] = ['Ingresado', 'En Revisión', 'En Reparación', 'Reparado', 'Listo para Entrega', 'Entregado', 'Cancelado'];

export interface RepairRequest {
  id: string;
  folio: number;
  clientName: string;
  phoneNumbers: { value: string }[];
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
  createdAt: string;
  quote?: number;
  downPayment?: number;
  status: RepairStatus;
}

export interface CatalogData {
  brands: Brand[];
  models: Model[];
  colors: Color[];
  accessories: Accessory[];
  conditions: Condition[];
  services: Service[];
}
