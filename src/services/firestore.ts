
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, writeBatch, serverTimestamp, getDoc, runTransaction } from 'firebase/firestore';
import type { Brand, Model, Color, Accessory, Condition, Service, TermAndCondition, RepairRequest, DeviceInRequest, CatalogData } from '@/lib/types';

// This is a generic type for items in our catalog collections
type CollectionType = Brand | Model | Color | Accessory | Condition | Service | TermAndCondition;

// Generic Functions for Catalog Management
export const getCollection = async <T extends { name?: string, text?: string }>(collectionName: keyof CatalogData): Promise<T[]> => {
    const q = query(collection(db, collectionName));
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));

    // Client-side sorting to avoid complex Firestore indexes for now
    data.sort((a, b) => {
        const nameA = a.name || a.text || '';
        const nameB = b.name || b.text || '';
        return nameA.localeCompare(nameB);
    });
    
    return data;
};

export const addItem = async (collectionName: keyof CatalogData, item: Omit<CollectionType, 'id'>): Promise<string> => {
    // This is the simplest and most direct way to add a document.
    // The `item` object is passed directly.
    const docRef = await addDoc(collection(db, collectionName), item);
    return docRef.id;
};

export const updateItem = async (collectionName: keyof CatalogData, id: string, item: Partial<Omit<CollectionType, 'id'>>): Promise<void> => {
    const docRef = doc(db, collectionName, id);
    // This is the correct way to update a document with new data.
    await updateDoc(docRef, item);
};

export const deleteItem = async (collectionName: keyof CatalogData, id: string): Promise<void> => {
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
        
        const createdAt = data.createdAt?.toDate().toISOString() || new Date().toISOString();

        return { 
            id: doc.id, 
            ...data, 
            createdAt,
            devices 
        } as RepairRequest;
    }));
};

export const addRepairRequest = async (requestData: Omit<RepairRequest, 'id' | 'createdAt' | 'folio'> & {folio: number | null}) => {
    return runTransaction(db, async (transaction) => {
        const counterRef = doc(db, "counters", "repairRequests");
        const counterSnap = await transaction.get(counterRef);
        
        let nextFolio = 1;
        if (counterSnap.exists()) {
            nextFolio = counterSnap.data().currentFolio + 1;
        } else {
            // Initialize the counter if it doesn't exist.
            transaction.set(counterRef, { currentFolio: 1 });
        }
        transaction.update(counterRef, { currentFolio: nextFolio });

        const newRequestRef = doc(collection(db, "repairRequests"));
        const { devices, ...request } = requestData;

        transaction.set(newRequestRef, {
            ...request,
            folio: nextFolio,
            status: 'Ingresado',
            createdAt: serverTimestamp(),
        });

        devices.forEach(device => {
            // Assign a new random ID if the device doesn't have one
            const deviceId = device.id || doc(collection(db, 'id')).id;
            const deviceRef = doc(db, `repairRequests/${newRequestRef.id}/devices`, deviceId);
            transaction.set(deviceRef, { ...device, id: deviceId });
        });

        return { id: newRequestRef.id, folio: nextFolio };
    });
};

export const updateRepairRequest = async (id: string, data: Partial<Omit<RepairRequest, 'devices'>>) => {
    const docRef = doc(db, 'repairRequests', id);
    await updateDoc(docRef, data);
};

export const updateRepairRequestWithDevices = async (id: string, data: Omit<RepairRequest, 'id' | 'folio' | 'createdAt' | 'status'>) => {
    const batch = writeBatch(db);
    const requestRef = doc(db, 'repairRequests', id);

    const { devices, ...requestData } = data;

    batch.update(requestRef, requestData);

    devices.forEach(device => {
        if (!device.id) {
            console.error("Device missing ID, cannot update:", device);
            return; // Or create a new one if that's the desired behavior
        }
        const deviceRef = doc(db, `repairRequests/${id}/devices`, device.id);
        
        const { id: deviceId, ...deviceData } = device;
        batch.update(deviceRef, deviceData);
    });
    
    await batch.commit();
}
