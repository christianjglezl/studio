'use client';

import { useState, useEffect } from 'react';
import { HardDrive, Wrench, Smartphone, List } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RepairRequestForm } from '@/components/repair-request-form';
import { CatalogManager } from '@/components/catalog-manager';
import { RepairList } from '@/components/repair-list';
import type { Brand, Model, Color, Accessory, Condition, RepairRequest, Service, CatalogData, TermAndCondition } from '@/lib/types';
import { Ticket } from '@/components/ticket';
import { getCollection, addItem, updateItem, deleteItem, addRepairRequest, getRepairRequests, updateRepairRequest, updateRepairRequestWithDevices } from '@/services/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const [loading, setLoading] = useState(true);
  
  // State for catalog data
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [terms, setTerms] = useState<TermAndCondition[]>([]);
  
  // State for repair requests
  const [repairRequests, setRepairRequests] = useState<RepairRequest[]>([]);
  const [requestToPrint, setRequestToPrint] = useState<RepairRequest | null>(null);

  const catalog: CatalogData = { brands, models, colors, accessories, conditions, services, terms };
  
  // Fetch all data from Firestore on initial load
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [
          brandsData, modelsData, colorsData, accessoriesData, 
          conditionsData, servicesData, termsData, repairRequestsData
        ] = await Promise.all([
          getCollection<Brand>('brands'),
          getCollection<Model>('models'),
          getCollection<Color>('colors'),
          getCollection<Accessory>('accessories'),
          getCollection<Condition>('conditions'),
          getCollection<Service>('services'),
          getCollection<TermAndCondition>('terms'),
          getRepairRequests(),
        ]);
        setBrands(brandsData);
        setModels(modelsData);
        setColors(colorsData);
        setAccessories(accessoriesData);
        setConditions(conditionsData);
        setServices(servicesData);
        setTerms(termsData);
        setRepairRequests(repairRequestsData);
      } catch (error) {
        console.error("Error fetching data from Firestore:", error);
        // Optionally show a toast notification to the user
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);


  useEffect(() => {
    if (requestToPrint) {
      setTimeout(() => {
        window.print();
        setRequestToPrint(null);
      }, 100);
    }
  }, [requestToPrint]);
  
  const handlePrint = (request: RepairRequest) => {
    setRequestToPrint(request);
  };

  const handleAddRepairRequest = async (newRequestData: Omit<RepairRequest, 'id' | 'status' | 'folio' | 'createdAt'>) => {
    try {
        const { id, folio } = await addRepairRequest({ ...newRequestData, folio: null });

        // Create a full request object to update state and for printing
        const fullRequest: RepairRequest = {
            ...newRequestData,
            id,
            folio,
            createdAt: new Date().toISOString(),
            status: 'Ingresado'
        };

        setRepairRequests(prev => [fullRequest, ...prev]);
        handlePrint(fullRequest);
    } catch (error) {
        console.error("Error adding repair request:", error);
    }
  };

  const handleUpdateRepairRequest = async (id: string, data: Omit<RepairRequest, 'id' | 'status' | 'folio' | 'createdAt'>) => {
      try {
        await updateRepairRequestWithDevices(id, data);
        // refetch requests to show updated data
        const updatedRequests = await getRepairRequests();
        setRepairRequests(updatedRequests);

      } catch (error) {
          console.error("Failed to update repair request:", error)
      }
  }


  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12">
        <div className="w-full max-w-6xl space-y-8">
           <header className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Smartphone className="w-8 h-8 text-primary" />
              <h1 className="text-4xl font-bold font-headline text-primary">TechCheck</h1>
            </div>
            <p className="text-muted-foreground">Gestión de Centro de Reparación de Celulares</p>
          </header>
          <Skeleton className="h-10 w-full" />
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 print:hidden">
        <div className="w-full max-w-6xl">
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Smartphone className="w-8 h-8 text-primary" />
              <h1 className="text-4xl font-bold font-headline text-primary">TechCheck</h1>
            </div>
            <p className="text-muted-foreground">Gestión de Centro de Reparación de Celulares</p>
          </header>
          
          <Tabs defaultValue="repair" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="repair">
                <Wrench className="mr-2 h-4 w-4" />
                Nueva Solicitud de Reparación
              </TabsTrigger>
              <TabsTrigger value="list">
                <List className="mr-2 h-4 w-4" />
                Lista de Reparaciones
              </TabsTrigger>
              <TabsTrigger value="catalog">
                <HardDrive className="mr-2 h-4 w-4" />
                Catálogo
              </TabsTrigger>
            </TabsList>
            <TabsContent value="repair">
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline">Registrar Nuevo Dispositivo</CardTitle>
                  <CardDescription>Completa el formulario para registrar un nuevo dispositivo para reparación.</CardDescription>
                </CardHeader>
                <CardContent>
                  <RepairRequestForm 
                    brands={brands}
                    models={models}
                    setModels={setModels}
                    colors={colors}
                    accessories={accessories}
                    conditions={conditions}
                    services={services}
                    onAddRequest={handleAddRepairRequest}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="list">
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline">Lista de Reparaciones</CardTitle>
                  <CardDescription>Ver y gestionar todas las solicitudes de reparación registradas.</CardDescription>
                </CardHeader>
                <CardContent>
                  <RepairList 
                    requests={repairRequests} 
                    setRequests={setRepairRequests}
                    catalog={catalog}
                    setModels={setModels}
                    onPrintRequest={handlePrint}
                    onUpdateRequest={handleUpdateRepairRequest}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="catalog">
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline">Gestionar Catálogos</CardTitle>
                  <CardDescription>Agrega o elimina elementos de tus catálogos.</CardDescription>
                </CardHeader>
                <CardContent>
                  <CatalogManager 
                    catalog={catalog}
                    onAddItem={async (collectionName, item) => {
                      const id = await addItem(collectionName, item);
                      const fullItem = { id, ...item };
                      // This is a bit verbose, but ensures type safety
                      switch(collectionName) {
                        case 'brands': setBrands(prev => [...prev, fullItem as Brand]); break;
                        case 'models': setModels(prev => [...prev, fullItem as Model]); break;
                        case 'colors': setColors(prev => [...prev, fullItem as Color]); break;
                        case 'accessories': setAccessories(prev => [...prev, fullItem as Accessory]); break;
                        case 'conditions': setConditions(prev => [...prev, fullItem as Condition]); break;
                        case 'services': setServices(prev => [...prev, fullItem as Service]); break;
                        case 'terms': setTerms(prev => [...prev, fullItem as TermAndCondition]); break;
                      }
                    }}
                    onUpdateItem={async (collectionName, id, item) => {
                      await updateItem(collectionName, id, item);
                      switch(collectionName) {
                        case 'brands': setBrands(prev => prev.map(i => i.id === id ? {...i, ...item} : i)); break;
                        case 'models': setModels(prev => prev.map(i => i.id === id ? {...i, ...item} : i)); break;
                        case 'colors': setColors(prev => prev.map(i => i.id === id ? {...i, ...item} : i)); break;
                        case 'accessories': setAccessories(prev => prev.map(i => i.id === id ? {...i, ...item} : i)); break;
                        case 'conditions': setConditions(prev => prev.map(i => i.id === id ? {...i, ...item} : i)); break;
                        case 'services': setServices(prev => prev.map(i => i.id === id ? {...i, ...item} : i)); break;
                        case 'terms': setTerms(prev => prev.map(i => i.id === id ? {...i, ...item} : i)); break;
                      }
                    }}
                    onDeleteItem={async (collectionName, id) => {
                       await deleteItem(collectionName, id);
                       switch(collectionName) {
                        case 'brands': setBrands(prev => prev.filter(i => i.id !== id)); break;
                        case 'models': setModels(prev => prev.filter(i => i.id !== id)); break;
                        case 'colors': setColors(prev => prev.filter(i => i.id !== id)); break;
                        case 'accessories': setAccessories(prev => prev.filter(i => i.id !== id)); break;
                        case 'conditions': setConditions(prev => prev.filter(i => i.id !== id)); break;
                        case 'services': setServices(prev => prev.filter(i => i.id !== id)); break;
                        case 'terms': setTerms(prev => prev.filter(i => i.id !== id)); break;
                      }
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <div className="print-container">
        {requestToPrint && <Ticket request={requestToPrint} catalog={catalog} />}
      </div>
    </>
  );
}
