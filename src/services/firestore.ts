import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, writeBatch, serverTimestamp, getDoc, runTransaction } from 'firebase/firestore';
import type { Brand, Model, Color, Accessory, Condition, Service, TermAndCondition, RepairRequest, DeviceInRequest } from '@/lib/types';

type CollectionType = Brand | Model | Color | Accessory | Condition | Service | TermAndCondition;
type CollectionName = 'brands' | 'models' | 'colors' | 'accessories' | 'conditions' | 'services' | 'terms';


// Generic Functions
export const getCollection = async <T extends CollectionType>(collectionName: CollectionName): Promise<T[]> => {
    const q = query(collection(db, collectionName));
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));

    if (collectionName !== 'terms') {
      // Sort by name for all catalogs except terms
      return data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    // Sort terms by text
    return data.sort((a, b) => (a.text || '').localeCompare(b.text || ''));
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
