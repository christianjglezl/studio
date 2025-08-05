'use client';

import { useState, useEffect, useRef } from 'react';
import { HardDrive, Wrench, Smartphone, List } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RepairRequestForm } from '@/components/repair-request-form';
import { CatalogManager } from '@/components/catalog-manager';
import { RepairList } from '@/components/repair-list';
import type { Brand, Model, Color, Accessory, Condition, RepairRequest, Service, CatalogData, DeviceInRequest } from '@/lib/types';
import { initialBrands, initialModels, initialColors, initialAccessories, initialConditions, initialServices } from '@/lib/data';
import { Ticket } from '@/components/ticket';

let nextFolio = 1;

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  
  // State for catalog data
  const [brands, setBrands] = useState<Brand[]>(initialBrands);
  const [models, setModels] = useState<Model[]>(initialModels);
  const [colors, setColors] = useState<Color[]>(initialColors);
  const [accessories, setAccessories] = useState<Accessory[]>(initialAccessories);
  const [conditions, setConditions] = useState<Condition[]>(initialConditions);
  const [services, setServices] = useState<Service[]>(initialServices);
  
  // State for repair requests
  const [repairRequests, setRepairRequests] = useState<RepairRequest[]>([]);
  const [requestToPrint, setRequestToPrint] = useState<RepairRequest | null>(null);

  const catalog: CatalogData = { brands, models, colors, accessories, conditions, services };

  const handlePrint = (request: RepairRequest) => {
    setRequestToPrint(request);
  };
  
  useEffect(() => {
    if (requestToPrint) {
      // The call to window.print() will trigger the @media print styles
      window.print();
      // Clean up after printing
      setRequestToPrint(null);
    }
  }, [requestToPrint]);


  useEffect(() => {
    setIsClient(true);
  }, []);

  const addRepairRequest = (newRequestData: Omit<RepairRequest, 'id' | 'status' | 'folio' | 'createdAt'>) => {
    const devicesWithIds: DeviceInRequest[] = newRequestData.devices.map(d => ({...d, id: crypto.randomUUID()}));
    
    const requestWithId: RepairRequest = { 
      ...newRequestData, 
      devices: devicesWithIds,
      id: crypto.randomUUID(),
      folio: nextFolio++,
      createdAt: new Date().toISOString(),
      status: 'Ingresado'
    };
    
    setRepairRequests(prev => [requestWithId, ...prev]);
    setRequestToPrint(requestWithId); // Set the just-added request to be printed
  }

  if (!isClient) {
    return null; // or a loading spinner
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
                    onAddRequest={addRepairRequest}
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
                    brands={brands}
                    models={models}
                    setModels={setModels}
                    colors={colors}
                    accessories={accessories}
                    conditions={conditions}
                    services={services}
                    onPrintRequest={handlePrint}
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
                    brands={brands} setBrands={setBrands}
                    models={models} setModels={setModels}
                    colors={colors} setColors={setColors}
                    accessories={accessories} setAccessories={setAccessories}
                    conditions={conditions} setConditions={setConditions}
                    services={services} setServices={setServices}
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
