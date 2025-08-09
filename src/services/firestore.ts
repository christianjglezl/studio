

import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, writeBatch, serverTimestamp, getDoc, runTransaction } from 'firebase/firestore';
import type { Brand, Model, Color, Accessory, Condition, Service, TermAndCondition, RepairRequest, DeviceInRequest } from '@/lib/types';

type CollectionType = Brand | Model | Color | Accessory | Condition | Service | TermAndCondition;
type CollectionName = 'brands' | 'models' | 'colors' | 'accessories' | 'conditions' | 'services' | 'terms';


// Generic Functions
export const getCollection = async <T extends { name?: string, text?: string }>(collectionName: CollectionName): Promise<T[]> => {
    // This function previously had a bug where orderBy was causing queries to fail silently on collections without a matching index.
    // The query is now simplified to fetch all documents, and sorting is handled on the client-side after data is received.
    const q = query(collection(db, collectionName));
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));

    // Sort data on the client side to avoid complex Firestore indexing.
    if (data.length > 0) {
        if ('name' in data[0]!) {
            data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        } else if ('text' in data[0]!) {
            data.sort((a, b) => (a.text || '').localeCompare(b.text || ''));
        }
    }
    
    return data;
};

export const addItem = async <T extends Omit<CollectionType, 'id'>>(collectionName: CollectionName, item: T): Promise<string> => {
    // Corrected: The object was being wrapped in another object, e.g., `{...item}`.
    // It should be passed directly to addDoc.
    const docRef = await addDoc(collection(db, collectionName), item);
    return docRef.id;
};

export const updateItem = async (collectionName: CollectionName, id: string, item: Partial<CollectionType>): Promise<void> => {
    const docRef = doc(db, collectionName, id);
    // Corrected: The object was being wrapped in another object, e.g., `{...item}`.
    // It should be passed directly to updateDoc.
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
        
        // Ensure createdAt is handled correctly, even if it's not yet set on the server
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

    // Update main request document
    batch.update(requestRef, requestData);

    // Update devices subcollection
    devices.forEach(device => {
        if (!device.id) {
            console.error("Device missing ID, cannot update:", device);
            return;
        }
        // Correctly get the reference to the device document
        const deviceRef = doc(db, `repairRequests/${id}/devices`, device.id);
        
        // Create a separate object for the update, excluding the 'id' field
        const { id: deviceId, ...deviceData } = device;
        batch.update(deviceRef, deviceData);
    });
    
    await batch.commit();
}
