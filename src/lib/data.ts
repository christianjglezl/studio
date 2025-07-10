import type { Brand, Model, Color, Accessory, Condition } from './types';

export const initialBrands: Brand[] = [
  { id: '1', name: 'Apple' },
  { id: '2', name: 'Samsung' },
  { id: '3', name: 'Google' },
  { id: '4', name: 'OnePlus' },
  { id: '5', name: 'Xiaomi' },
];

export const initialModels: Model[] = [
  { id: '101', name: 'iPhone 14 Pro' },
  { id: '102', name: 'iPhone 13' },
  { id: '201', name: 'Galaxy S23 Ultra' },
  { id: '202', name: 'Galaxy Z Fold 5' },
  { id: '301', name: 'Pixel 7 Pro' },
  { id: '302', name: 'Pixel 8' },
];

export const initialColors: Color[] = [
  { id: 'cl1', name: 'Space Black' },
  { id: 'cl2', name: 'Deep Purple' },
  { id: 'cl3', name: 'Silver' },
  { id: 'cl4', name: 'Gold' },
  { id: 'cl5', name: 'Phantom Black' },
  { id: 'cl6', name: 'Cream' },
  { id: 'cl7', name: 'Obsidian' },
];

export const initialAccessories: Accessory[] = [
  { id: 'ac1', name: 'Case' },
  { id: 'ac2', name: 'Chip Tray' },
  { id: 'ac3', name: 'Screen Protector' },
  { id: 'ac4', name: 'Charger' },
];

export const initialConditions: Condition[] = [
  { id: 'co1', name: 'Cracked Screen' },
  { id: 'co2', name: 'Water Damage' },
  { id: 'co3', name: 'Does not turn on' },
  { id: 'co4', name: 'Battery Issue' },
  { id: 'co5', name: 'Bent Frame' },
  { id: 'co6', name: 'Speaker Issue' },
];
