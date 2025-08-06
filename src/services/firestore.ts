
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, writeBatch, serverTimestamp, getDoc, runTransaction } from 'firebase/firestore';
import type { Brand, Model, Color, Accessory, Condition, Service, TermAndCondition, RepairRequest, DeviceInRequest } from '@/lib/types';

type CollectionType = Brand | Model | Color | Accessory | Condition | Service | TermAndCondition;
type CollectionName = 'brands' | 'models' | 'colors' | 'accessories' | 'conditions' | 'services' | 'terms';


// Generic Functions
export const getCollection = async <T extends { name?: string, text?: string }>(collectionName: CollectionName): Promise<T[]> => {
    const isTerms = collectionName === 'terms';
    const q = query(collection(db, collectionName), orderBy(isTerms ? 'text' : 'name'));
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    return data;
};

export const addItem = async <T extends Omit<CollectionType, 'id'>>(collectionName: CollectionName, item: T): Promise<string> => {
    const docRef = await addDoc(collection(db, collectionName), item);
    return docRef.id;
};

export const updateItem = async (collectionName: CollectionName, id: string, item: Partial<CollectionType>): Promise<void> => {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, item);
};

export const deleteItem = async (collectionName: CollectionName, id: string): Promise<void> => {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
};


// Repair Request Specific Functions
export const getRepairRequests = async (): Promise<RepairRequest[]> => {
    const q = query(collection(db, "repairRequests"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return Promise.all(querySnapshot.docs.map(async (doc) => {
        const data = doc.data();
        const devicesSnapshot = await getDocs(collection(db, `repairRequests/${doc.id}/devices`));
        const devices = devicesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as DeviceInRequest));
        return { 
            id: doc.id, 
            ...data, 
            createdAt: data.createdAt.toDate().toISOString(),
            devices 
        } as RepairRequest;
    }));
};

export const addRepairRequest = async (requestData: Omit<RepairRequest, 'id' | 'createdAt' | 'folio'> & {folio: number | null}) => {
    const batch = writeBatch(db);

    // Get the highest folio number to increment it
    const counterRef = doc(db, "counters", "repairRequests");
    
    // Use a transaction to safely increment the folio
    const newFolio = await runTransaction(db, async (transaction) => {
      const counterSnap = await transaction.get(counterRef);
      let nextFolio = 1;
      if (counterSnap.exists()) {
        nextFolio = counterSnap.data().currentFolio + 1;
      }
      transaction.set(counterRef, { currentFolio: nextFolio }, { merge: true });
      return nextFolio;
    });

    
    const newRequestRef = doc(collection(db, "repairRequests"));
    
    const { devices, ...request } = requestData;

    batch.set(newRequestRef, {
        ...request,
        folio: newFolio,
        status: 'Ingresado',
        createdAt: serverTimestamp(),
    });

    devices.forEach(device => {
        const deviceRef = doc(collection(db, `repairRequests/${newRequestRef.id}/devices`));
        batch.set(deviceRef, device);
    });

    await batch.commit();
    return { id: newRequestRef.id, folio: newFolio };
};

export const updateRepairRequest = async (id: string, data: Partial<Omit<RepairRequest, 'devices'>>) => {
    const docRef = doc(db, 'repairRequests', id);
    await updateDoc(docRef, data);
};

export const updateRepairRequestWithDevices = async (id: string, data: Omit<RepairRequest, 'id' | 'folio' | 'createdAt' | 'status'>) => {
    const batch = writeBatch(db);
    const requestRef = doc(db, 'repairRequests', id);

    const { devices, ...requestData } = data;

    // Update main request document
    batch.update(requestRef, requestData);

    // Update devices subcollection
    devices.forEach(device => {
        if (!device.id) {
            console.error("Device missing ID, cannot update:", device);
            return; // or throw an error
        }
        const deviceRef = doc(db, `repairRequests/${id}/devices`, device.id);
        const { id: deviceId, ...deviceData } = device; // remove id from data object
        batch.update(deviceRef, deviceData);
    });
    
    await batch.commit();
}


export const seedInitialData = async () => {
    try {
        const brandsCollection = collection(db, 'brands');
        const brandsSnapshot = await getDocs(query(brandsCollection));
        
        // If there is already data, don't seed
        if (!brandsSnapshot.empty) {
            return;
        }

        console.log("No initial data found. Seeding database...");

        const batch = writeBatch(db);

        // Seed Simple Catalogs
        const simpleCatalogs: { name: CollectionName; data: { name: string }[] } = {
            colors: [
                { name: 'Negro' }, { name: 'Blanco' }, { name: 'Gris' }, { name: 'Plata' },
                { name: 'Dorado' }, { name: 'Oro Rosa' }, { name: 'Azul' }, { name: 'Rojo' },
                { name: 'Verde' }, { name: 'Morado' },
            ],
            accessories: [
                { name: 'Caja' }, { name: 'Cargador' }, { name: 'Cable USB' }, { name: 'Funda' }, { name: 'SIM' },
            ],
            conditions: [
                { name: 'Pantalla Rota' }, { name: 'Carcasa Rota' }, { name: 'Golpeado' },
                { name: 'Rayado' }, { name: 'Mojado' }, { name: 'No Enciende' }, { name: 'Botón no funciona' },
            ],
            services: [
                { name: 'Cambio de Pantalla' }, { name: 'Cambio de Batería' },
                { name: 'Reparación de Centro de Carga' }, { name: 'Reparación de Botones' },
                { name: 'Diagnóstico' }, { name: 'Software' }, { name: 'Limpieza' },
            ]
        };
        
        for (const [collectionName, data] of Object.entries(simpleCatalogs)) {
            data.forEach(item => {
                const docRef = doc(collection(db, collectionName));
                batch.set(docRef, item);
            });
        }
        
        // Seed Terms and Conditions
        const terms = [
            { text: 'No nos hacemos responsables por equipos olvidados después de 30 días.' },
            { text: 'La garantía solo cubre la pieza reparada.' },
            { text: 'Equipos mojados no tienen garantía.' },
            { text: 'Cualquier otra falla no reportada no entra en la garantía.' },
            { text: 'Para aplicar la garantía es indispensable presentar este ticket.' }
        ];
        terms.forEach(term => {
            const docRef = doc(collection(db, 'terms'));
            batch.set(docRef, term);
        });

        // Seed Brands and Models (more complex due to relationship)
        const brandsWithModels = [
            { 
                name: 'Apple', 
                models: ['iPhone 8', 'iPhone X', 'iPhone XR', 'iPhone XS', 'iPhone 11', 'iPhone 12', 'iPhone 13', 'iPhone 14', 'iPhone 15'] 
            },
            {
                name: 'Samsung',
                models: ['Galaxy S10', 'Galaxy S20', 'Galaxy S21', 'Galaxy S22', 'Galaxy S23', 'Galaxy A12', 'Galaxy A32', 'Galaxy A52', 'Galaxy Note 20']
            },
            {
                name: 'Xiaomi',
                models: ['Redmi Note 9', 'Redmi Note 10', 'Redmi Note 11', 'Poco X3', 'Poco F3', 'Mi 11']
            },
            {
                name: 'Motorola',
                models: ['Moto G Power', 'Moto G Stylus', 'Moto G Pure', 'Edge 20', 'Edge 30']
            },
            {
                name: 'Huawei',
                models: ['P30', 'P40', 'P50', 'Mate 30', 'Mate 40']
            },
            {
                name: 'Google',
                models: ['Pixel 4a', 'Pixel 5', 'Pixel 6', 'Pixel 7', 'Pixel 8']
            }
        ];

        const brandRefs = new Map<string, string>();

        brandsWithModels.forEach(brandData => {
            const brandRef = doc(collection(db, 'brands'));
            batch.set(brandRef, { name: brandData.name });
            brandRefs.set(brandData.name, brandRef.id);
        });
        
        // We need to commit the brands first to get their IDs for the models
        // But with this approach, we can't get the ID before commit.
        // So we will do it in a separate step after the initial commit.

        await batch.commit();

        // Now, a new batch for models
        const modelsBatch = writeBatch(db);
        const newBrandsSnapshot = await getDocs(query(collection(db, 'brands')));
        const newBrandMap = new Map<string, string>();
        newBrandsSnapshot.forEach(doc => newBrandMap.set(doc.data().name, doc.id));
        
        brandsWithModels.forEach(brandData => {
            const brandId = newBrandMap.get(brandData.name);
            if (brandId) {
                brandData.models.forEach(modelName => {
                    const modelRef = doc(collection(db, 'models'));
                    modelsBatch.set(modelRef, { name: modelName, brandId: brandId });
                });
            }
        });

        await modelsBatch.commit();
        console.log("Database seeded successfully.");

    } catch (error) {
        console.error("Error seeding initial data:", error);
    }
};

    

    