import type { Brand, Model, Color, Accessory, Condition } from './types';

export const initialBrands: Brand[] = [
  { id: '1', name: 'Apple' },
  { id: '2', name: 'Samsung' },
  { id: '3', name: 'Google' },
  { id: '4', name: 'OnePlus' },
  { id: '5', name: 'Xiaomi' },
];

export const initialModels: Model[] = [
  { id: '101', name: 'iPhone 14 Pro', brandId: '1' },
  { id: '102', name: 'iPhone 13', brandId: '1' },
  { id: '103', name: 'iPhone 15', brandId: '1' },
  { id: '201', name: 'Galaxy S23 Ultra', brandId: '2' },
  { id: '202', name: 'Galaxy Z Fold 5', brandId: '2' },
  { id: '203', name: 'Galaxy A54', brandId: '2' },
  { id: '301', name: 'Pixel 7 Pro', brandId: '3' },
  { id: '302', name: 'Pixel 8', brandId: '3' },
  { id: '401', name: 'OnePlus 11', brandId: '4' },
  { id: '501', name: 'Xiaomi 13 Pro', brandId: '5' },
];

export const initialColors: Color[] = [
  { id: 'cl1', name: 'Negro Espacial' },
  { id: 'cl2', name: 'Morado Oscuro' },
  { id: 'cl3', name: 'Plata' },
  { id: 'cl4', name: 'Dorado' },
  { id: 'cl5', name: 'Negro Fantasma' },
  { id: 'cl6', name: 'Crema' },
  { id: 'cl7', name: 'Obsidiana' },
];

export const initialAccessories: Accessory[] = [
  { id: 'ac1', name: 'Funda' },
  { id: 'ac2', name: 'Bandeja SIM' },
  { id: 'ac3', name: 'Protector de Pantalla' },
  { id: 'ac4', name: 'Cargador' },
];

export const initialConditions: Condition[] = [
  { id: 'co1', name: 'Pantalla Rota' },
  { id: 'co2', name: 'Daño por Agua' },
  { id: 'co3', name: 'No enciende' },
  { id: 'co4', name: 'Problema de Batería' },
  { id: 'co5', name: 'Marco Doblado' },
  { id: 'co6', name: 'Problema de Altavoz' },
];
