

import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, writeBatch, serverTimestamp, getDoc, runTransaction } from 'firebase/firestore';
import type { Brand, Model, Color, Accessory, Condition, Service, TermAndCondition, RepairRequest, DeviceInRequest } from '@/lib/types';

type CollectionType = Brand | Model | Color | Accessory | Condition | Service | TermAndCondition;
type CollectionName = 'brands' | 'models' | 'colors' | 'accessories' | 'conditions' | 'services' | 'terms';


// Generic Functions
export const getCollection = async <T extends { name?: string, text?: string }>(collectionName: CollectionName): Promise<T[]> => {
    const q = query(collection(db, collectionName));
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));

    if (data.length > 0) {
        if ('name' in data[0]! && data.every(item => typeof item.name === 'string')) {
            data.sort((a, b) => (a.name!).localeCompare(b.name!));
        } else if ('text' in data[0]! && data.every(item => typeof item.text === 'string')) {
            data.sort((a, b) => (a.text!).localeCompare(b.text!));
        }
    }
    
    return data;
};

export const addItem = async (collectionName: CollectionName, item: Omit<CollectionType, 'id'>): Promise<string> => {
    // This is the correct implementation. The item is passed directly.
    const docRef = await addDoc(collection(db, collectionName), item);
    return docRef.id;
};

export const updateItem = async (collectionName: CollectionName, id: string, item: Partial<Omit<CollectionType, 'id'>>): Promise<void> => {
    const docRef = doc(db, collectionName, id);
    // This is the correct implementation. The item is passed directly.
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
        
        const createdAt = data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString();

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
        }
        transaction.set(counterRef, { currentFolio: nextFolio }, { merge: true });

        const newRequestRef = doc(collection(db, "repairRequests"));
        const { devices, ...request } = requestData;

        transaction.set(newRequestRef, {
            ...request,
            folio: nextFolio,
            status: 'Ingresado',
            createdAt: serverTimestamp(),
        });

        devices.forEach(device => {
            const deviceRef = doc(collection(db, `repairRequests/${newRequestRef.id}/devices`));
            transaction.set(deviceRef, device);
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
            return;
        }
        const deviceRef = doc(db, `repairRequests/${id}/devices`, device.id);
        
        const { id: deviceId, ...deviceData } = device;
        batch.update(deviceRef, deviceData);
    });
    
    await batch.commit();
}
