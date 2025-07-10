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

export interface RepairRequest {
  id: string;
  clientName: string;
  phoneNumbers: string[];
  brand: Brand;
  model: Model;
  color: Color;
  imei?: string;
  accessories: Accessory[];
  conditions: Condition[];
  password?: string;
  pattern?: number[];
  notes?: string;
  createdAt: string;
  quote?: number;
  downPayment?: number;
}
