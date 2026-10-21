
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, writeBatch, serverTimestamp, getDoc, runTransaction, setDoc, deleteField } from 'firebase/firestore';
import type { Brand, Model, Color, Accessory, Condition, Service, TermAndCondition, RepairRequest, DeviceInRequest, CatalogData, RepairStatus, SparePartType, SparePart, QuotePrice, QuotePricesMetadata, SickwService, UnlockCheck } from '@/lib/types';

// This is a generic type for items in our catalog collections
type CollectionType = Brand | Model | Color | Accessory | Condition | Service | TermAndCondition | SparePartType | SparePart;

// Generic Functions for Catalog Management
export const getCollection = async <T extends { name?: string, text?: string }>(collectionName: keyof CatalogData): Promise<T[]> => {
    const q = query(collection(db, collectionName));
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));

    // Client-side sorting for items with names/text
    data.sort((a, b) => {
        const nameA = a.name || a.text || '';
        const nameB = b.name || b.text || '';
        return nameA.localeCompare(nameB);
    });
    
    return data;
};

export const addItem = async (collectionName: keyof CatalogData, item: Omit<CollectionType, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(db, collectionName), item);
    return docRef.id;
};

export const updateItem = async (collectionName: keyof CatalogData, id: string, item: Partial<Omit<CollectionType, 'id'>>): Promise<void> => {
    const docRef = doc(db, collectionName, id);
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
        const updatedAt = data.updatedAt?.toDate().toISOString();
        const deliveryDate = data.deliveryDate?.toDate().toISOString();

        return { 
            id: doc.id, 
            ...data, 
            createdAt,
            updatedAt,
            deliveryDate,
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
            transaction.set(counterRef, { currentFolio: 1 });
        }
        transaction.update(counterRef, { currentFolio: nextFolio });

        const newRequestRef = doc(collection(db, "repairRequests"));
        const { devices, ...request } = requestData;

        transaction.set(newRequestRef, {
            ...request,
            folio: nextFolio,
            status: 'Ingresado',
            notes: '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        devices.forEach(device => {
            const deviceId = device.id || doc(collection(db, 'id')).id;
            const deviceRef = doc(db, `repairRequests/${newRequestRef.id}/devices`, deviceId);
            transaction.set(deviceRef, { ...device, id: deviceId });
        });

        return { id: newRequestRef.id, folio: nextFolio };
    });
};

export const updateRepairRequestStatus = async (id: string, status: RepairStatus, devices: DeviceInRequest[]): Promise<void> => {
    const requestRef = doc(db, 'repairRequests', id);
    const batch = writeBatch(db);

    const updateData: { [key: string]: any } = {
        status: status,
        updatedAt: serverTimestamp(),
    };

    if (status === 'Entregado' || status === 'Entregado (no reparado)') {
        updateData.deliveryDate = serverTimestamp();
    }
    
    if (status === 'Entregado') {
        devices.forEach(device => {
            if (device.id) {
                const deviceRef = doc(db, `repairRequests/${id}/devices`, device.id);
                batch.update(deviceRef, { downPayment: device.quote });
            }
        });
    }

    batch.update(requestRef, updateData);
    await batch.commit();
};

export const updateRepairRequestWithRevisionFee = async (id: string, fee: number): Promise<void> => {
    const requestRef = doc(db, 'repairRequests', id);
    const batch = writeBatch(db);

    const updateData = {
        status: 'Entregado (no reparado)',
        updatedAt: serverTimestamp(),
        deliveryDate: serverTimestamp(),
    };
    batch.update(requestRef, updateData);

    const devicesSnapshot = await getDocs(collection(db, `repairRequests/${id}/devices`));
    if (!devicesSnapshot.empty) {
        const firstDeviceDoc = devicesSnapshot.docs[0];
        const deviceRef = doc(db, `repairRequests/${id}/devices`, firstDeviceDoc.id);
        batch.update(deviceRef, {
            quote: fee,
            downPayment: fee,
        });
    }

    await batch.commit();
};


export const updateRepairRequestNotes = async (id: string, notes: string): Promise<void> => {
    const requestRef = doc(db, 'repairRequests', id);
    await updateDoc(requestRef, {
        notes: notes,
        updatedAt: serverTimestamp()
    });
}

export const updateRepairRequestWithDevices = async (id: string, data: Omit<RepairRequest, 'id' | 'folio' | 'createdAt' | 'status'>) => {
    const batch = writeBatch(db);
    const requestRef = doc(db, 'repairRequests', id);
    const { devices, ...requestData } = data;
    const finalRequestData: Partial<Omit<RepairRequest, 'id'|'devices'>> & { updatedAt: any } = {...requestData, updatedAt: serverTimestamp()};
    batch.update(requestRef, finalRequestData);

    devices.forEach(device => {
        if (!device.id) return;
        const deviceRef = doc(db, `repairRequests/${id}/devices`, device.id);
        const { id: deviceId, ...deviceData } = device;
        batch.update(deviceRef, deviceData);
    });
    
    await batch.commit();
}


export const deleteRepairRequest = async (requestId: string): Promise<void> => {
    const batch = writeBatch(db);
    const devicesRef = collection(db, `repairRequests/${requestId}/devices`);
    const devicesSnapshot = await getDocs(devicesRef);
    devicesSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });
    const requestRef = doc(db, 'repairRequests', requestId);
    batch.delete(requestRef);
    await batch.commit();
};


// Quote Prices (Cotizaciones)
const QUOTE_PRICES = 'quotePrices';
const quoteMetadataRef = () => doc(db, 'metadata', 'quotePrices');

const touchQuoteMetadata = async (count: number): Promise<QuotePricesMetadata> => {
    const metadata = { count, lastUpdated: new Date().toISOString() };
    await setDoc(quoteMetadataRef(), metadata);
    return metadata;
};

export const getQuotePrices = async (): Promise<QuotePrice[]> => {
    const querySnapshot = await getDocs(collection(db, QUOTE_PRICES));
    const data = querySnapshot.docs.map(d => {
        const raw = d.data();
        return {
            id: d.id,
            model: String(raw.model ?? ''),
            partType: String(raw.partType ?? ''),
            cost: Number(raw.cost) || 0,
        } as QuotePrice;
    });
    data.sort((a, b) => a.model.localeCompare(b.model) || a.partType.localeCompare(b.partType));
    return data;
};

export const getQuotePricesMetadata = async (): Promise<QuotePricesMetadata | null> => {
    const snap = await getDoc(quoteMetadataRef());
    return snap.exists() ? (snap.data() as QuotePricesMetadata) : null;
};

export const addQuotePrice = async (item: Omit<QuotePrice, 'id'>, newCount: number) => {
    const docRef = await addDoc(collection(db, QUOTE_PRICES), item);
    const metadata = await touchQuoteMetadata(newCount);
    return { id: docRef.id, metadata };
};

export const updateQuotePrice = async (id: string, item: Omit<QuotePrice, 'id'>, count: number) => {
    await updateDoc(doc(db, QUOTE_PRICES, id), item);
    return touchQuoteMetadata(count);
};

export const deleteQuotePrice = async (id: string, newCount: number) => {
    await deleteDoc(doc(db, QUOTE_PRICES, id));
    return touchQuoteMetadata(newCount);
};

// Replaces the whole price list (used by CSV import). Firestore batches allow max 500 writes.
export const replaceQuotePrices = async (items: Omit<QuotePrice, 'id'>[]) => {
    const existing = await getDocs(collection(db, QUOTE_PRICES));
    const ops: ((batch: ReturnType<typeof writeBatch>) => void)[] = [
        ...existing.docs.map(d => (batch: ReturnType<typeof writeBatch>) => batch.delete(d.ref)),
        ...items.map(item => (batch: ReturnType<typeof writeBatch>) => batch.set(doc(collection(db, QUOTE_PRICES)), item)),
    ];
    for (let i = 0; i < ops.length; i += 450) {
        const batch = writeBatch(db);
        ops.slice(i, i + 450).forEach(op => op(batch));
        await batch.commit();
    }
    return touchQuoteMetadata(items.length);
};


// Unlock / lock-status checks (sickw.com)
export const getSickwServices = async (): Promise<SickwService[]> => {
    const querySnapshot = await getDocs(collection(db, 'sickwServices'));
    const data = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as SickwService));
    data.sort((a, b) => a.name.localeCompare(b.name));
    return data;
};

export const addSickwService = async (item: Omit<SickwService, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(db, 'sickwServices'), item);
    return docRef.id;
};

// null clears the customer-facing price
export const updateSickwServicePublicPrice = async (id: string, publicPrice: number | null): Promise<void> => {
    await updateDoc(doc(db, 'sickwServices', id), { publicPrice: publicPrice ?? deleteField() });
};

export const deleteSickwService = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'sickwServices', id));
};

export const getUnlockChecks = async (): Promise<UnlockCheck[]> => {
    const q = query(collection(db, 'unlockChecks'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(d => {
        const data = d.data();
        return {
            id: d.id,
            ...data,
            createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
        } as UnlockCheck;
    });
};

export const addUnlockCheck = async (check: Omit<UnlockCheck, 'id' | 'createdAt'>): Promise<string> => {
    // Firestore rejects undefined values
    const clean = Object.fromEntries(Object.entries(check).filter(([, v]) => v !== undefined));
    const docRef = await addDoc(collection(db, 'unlockChecks'), { ...clean, createdAt: serverTimestamp() });
    return docRef.id;
};
