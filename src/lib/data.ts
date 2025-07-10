import type { Brand, Model, Color, Accessory, Condition, Service } from './types';

export const initialBrands: Brand[] = [
  { id: '1', name: 'Apple' },
  { id: '2', name: 'Samsung' },
  { id: '3', name: 'Google' },
  { id: '4', name: 'OnePlus' },
  { id: '5', name: 'Xiaomi' },
  { id: '6', name: 'Huawei' },
  { id: '7', name: 'Motorola' },
  { id: '8', name: 'Nokia' },
  { id: '9', name: 'Sony' },
  { id: '10', name: 'LG' },
  { id: '11', name: 'Oppo' },
  { id: '12', name: 'Vivo' },
  { id: '13', name: 'Realme' },
];

export const initialModels: Model[] = [
  // Apple
  { id: '101', name: 'iPhone 15 Pro Max', brandId: '1' },
  { id: '102', name: 'iPhone 15 Pro', brandId: '1' },
  { id: '103', name: 'iPhone 15 Plus', brandId: '1' },
  { id: '104', name: 'iPhone 15', brandId: '1' },
  { id: '105', name: 'iPhone 14 Pro Max', brandId: '1' },
  { id: '106', name: 'iPhone 14 Pro', brandId: '1' },
  { id: '107', name: 'iPhone 14 Plus', brandId: '1' },
  { id: '108', name: 'iPhone 14', brandId: '1' },
  { id: '109', name: 'iPhone 13', brandId: '1' },
  { id: '110', name: 'iPhone SE (3rd gen)', brandId: '1' },
  
  // Samsung
  { id: '201', name: 'Galaxy S24 Ultra', brandId: '2' },
  { id: '202', name: 'Galaxy S24+', brandId: '2' },
  { id: '203', name: 'Galaxy S24', brandId: '2' },
  { id: '204', name: 'Galaxy S23 Ultra', brandId: '2' },
  { id: '205', name: 'Galaxy Z Fold 5', brandId: '2' },
  { id: '206', name: 'Galaxy Z Flip 5', brandId: '2' },
  { id: '207', name: 'Galaxy A54', brandId: '2' },
  { id: '208', name: 'Galaxy A34', brandId: '2' },

  // Google
  { id: '301', name: 'Pixel 8 Pro', brandId: '3' },
  { id: '302', name: 'Pixel 8', brandId: '3' },
  { id: '303', name: 'Pixel 8a', brandId: '3' },
  { id: '304', name: 'Pixel 7 Pro', brandId: '3' },
  { id: '305', name: 'Pixel 7a', brandId: '3' },
  { id: '306', name: 'Pixel Fold', brandId: '3' },

  // OnePlus
  { id: '401', name: 'OnePlus 12', brandId: '4' },
  { id: '402', name: 'OnePlus 11', brandId: '4' },
  { id: '403', name: 'OnePlus Open', brandId: '4' },
  { id: '404', name: 'OnePlus Nord 3', brandId: '4' },

  // Xiaomi
  { id: '501', name: 'Xiaomi 14 Ultra', brandId: '5' },
  { id: '502', name: 'Xiaomi 14', brandId: '5' },
  { id: '503', name: 'Xiaomi 13T Pro', brandId: '5' },
  { id: '504', name: 'Redmi Note 13 Pro+', brandId: '5' },
  { id: '505', name: 'Poco F6 Pro', brandId: '5' },

  // Huawei
  { id: '601', name: 'Pura 70 Ultra', brandId: '6' },
  { id: '602', name: 'Pura 70 Pro', brandId: '6' },
  { id: '603', name: 'Mate X3', brandId: '6' },
  { id: '604', name: 'Nova 12', brandId: '6' },

  // Motorola
  { id: '701', name: 'Edge 50 Ultra', brandId: '7' },
  { id: '702', name: 'Edge 50 Pro', brandId: '7' },
  { id: '703', name: 'Razr 40 Ultra', brandId: '7' },
  { id: '704', name: 'Moto G84', brandId: '7' },

  // Nokia
  { id: '801', name: 'Nokia XR21', brandId: '8' },
  { id: '802', name: 'Nokia G42', brandId: '8' },
  { id: '803', name: 'Nokia X30', brandId: '8' },
  
  // Sony
  { id: '901', name: 'Xperia 1 VI', brandId: '9' },
  { id: '902', name: 'Xperia 5 V', brandId: '9' },
  { id: '903', name: 'Xperia 10 VI', brandId: '9' },

  // LG
  { id: '1001', name: 'LG Wing', brandId: '10' },
  { id: '1002', name: 'LG Velvet', brandId: '10' },
  { id: '1003', name: 'LG G8 ThinQ', brandId: '10' },

  // Oppo
  { id: '1101', name: 'Find X7 Ultra', brandId: '11' },
  { id: '1102', name: 'Reno11 Pro', brandId: '11' },
  { id: '1103', name: 'Find N3', brandId: '11' },

  // Vivo
  { id: '1201', name: 'X100 Pro', brandId: '12' },
  { id: '1202', name: 'V30 Pro', brandId: '12' },
  { id: '1203', name: 'X Fold3 Pro', brandId: '12' },

  // Realme
  { id: '1301', name: 'GT 6', brandId: '13' },
  { id: '1302', name: '12 Pro+', brandId: '13' },
];

export const initialColors: Color[] = [
  { id: 'cl1', name: 'Negro Espacial' },
  { id: 'cl2', name: 'Morado Oscuro' },
  { id: 'cl3', name: 'Plata' },
  { id: 'cl4', name: 'Dorado' },
  { id: 'cl5', name: 'Negro Fantasma' },
  { id: 'cl6', name: 'Crema' },
  { id: 'cl7', name: 'Obsidiana' },
  { id: 'cl8', name: 'Verde' },
  { id: 'cl9', name: 'Azul' },
  { id: 'cl10', name: 'Blanco' },
  { id: 'cl11', name: 'Rojo' },
  { id: 'cl12', name: 'Titanio Natural' },
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

export const initialServices: Service[] = [
    { id: 'sv1', name: 'Cambio de pantalla' },
    { id: 'sv2', name: 'Cuenta Google (FRP)' },
    { id: 'sv3', name: 'Liberación de Red' },
    { id: 'sv4', name: 'Reparación de Bocina/Altavoz' },
    { id: 'sv5', name: 'Diagnóstico/Revisión' },
    { id: 'sv6', name: 'Reparación de Centro de Carga' },
    { id: 'sv7', name: 'Cambio de Batería' },
    { id: 'sv8', name: 'Reparación de Placa Base' },
    { id: 'sv9', name: 'Problemas de Software/Flasheo' },
    { id: 'sv10', name: 'Reparación de Daño por Líquido' },
    { id: 'sv11', name: 'Cambio de Cámara (Trasera/Frontal)' },
    { id: 'sv12', name: 'Reparación de Micrófono' },
    { id: 'sv13', name: 'Cambio de Tapa Trasera' },
];
