
'use client';

import { useState, useEffect, useCallback } from 'react';
import { HardDrive, Wrench, List, LogOut, LineChart } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RepairRequestForm } from '@/components/repair-request-form';
import { CatalogManager } from '@/components/catalog-manager';
import { RepairList } from '@/components/repair-list';
import type { Brand, Model, Color, Accessory, Condition, RepairRequest, Service, CatalogData, TermAndCondition } from '@/lib/types';
import { Ticket } from '@/components/ticket';
import { getCollection, addItem, updateItem, deleteItem, addRepairRequest, getRepairRequests, updateRepairRequest, updateRepairRequestWithDevices } from '@/services/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dashboard } from '@/components/dashboard';


const LOGO_URL = "https://firebasestorage.googleapis.com/v0/b/techcheck-x5724.firebasestorage.app/o/logoEasy.png?alt=media&token=0fbd7512-4ec8-4b6d-9191-4fad7f472c3e";


function AppScreen() {
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const [catalog, setCatalog] = useState<CatalogData>({
    brands: [], models: [], colors: [], accessories: [],
    conditions: [], services: [], terms: []
  });

  const [repairRequests, setRepairRequests] = useState<RepairRequest[]>([]);
  const [requestToPrint, setRequestToPrint] = useState<RepairRequest | null>(null);

  const fetchCatalogData = useCallback(async () => {
    try {
      const [
        brands, models, colors, accessories, 
        conditions, services, terms
      ] = await Promise.all([
        getCollection<Brand>('brands'),
        getCollection<Model>('models'),
        getCollection<Color>('colors'),
        getCollection<Accessory>('accessories'),
        getCollection<Condition>('conditions'),
        getCollection<Service>('services'),
        getCollection<TermAndCondition>('terms'),
      ]);
      setCatalog({ brands, models, colors, accessories, conditions, services, terms });
    } catch (error: any) {
      console.error("Error fetching catalog data:", error);
      toast({
        title: "Error de Carga de Catálogo",
        description: `No se pudieron cargar los datos del catálogo. ${error.message}`,
        variant: "destructive",
        duration: 10000,
      });
    }
  }, [toast]);
  
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      await fetchCatalogData();
      try {
        const repairRequestsData = await getRepairRequests();
        setRepairRequests(repairRequestsData);
      } catch (error: any) {
        console.error("Error fetching repair requests:", error);
        toast({
          title: "Error al Cargar Reparaciones",
          description: `No se pudieron cargar las solicitudes de reparación. ${error.message}`,
          variant: "destructive",
          duration: 10000,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [fetchCatalogData, toast]);


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

        const fullRequest: RepairRequest = {
            ...newRequestData,
            id,
            folio,
            createdAt: new Date().toISOString(),
            status: 'Ingresado'
        };

        setRepairRequests(prev => [fullRequest, ...prev]);
        handlePrint(fullRequest);
    } catch (error: any) {
        console.error("Error adding repair request:", error);
        toast({ title: "Error", description: `No se pudo agregar la solicitud: ${error.message}`, variant: "destructive" });
    }
  };

  const handleUpdateRepairRequest = async (id: string, data: Omit<RepairRequest, 'id' | 'status' | 'folio' | 'createdAt'>) => {
      try {
        await updateRepairRequestWithDevices(id, data);
        const updatedRequests = await getRepairRequests();
        setRepairRequests(updatedRequests);
        toast({ title: "Actualizado", description: "La solicitud de reparación se ha actualizado.", variant: "success" });
      } catch (error: any) {
          console.error("Failed to update repair request:", error)
          toast({ title: "Error", description: `No se pudo actualizar la solicitud: ${error.message}`, variant: "destructive" });
      }
  }
  
  const updateCatalogState = (collectionName: keyof CatalogData, newItems: any[]) => {
    setCatalog(prev => ({
        ...prev,
        [collectionName]: newItems.sort((a: any, b: any) => (a.name || a.text).localeCompare(b.name || b.text)),
    }));
  };

  const handleAddItem = async (collectionName: keyof CatalogData, item: any) => {
    try {
      const id = await addItem(collectionName, item);
      const newItem = { ...item, id };
      
      updateCatalogState(collectionName, [...catalog[collectionName], newItem]);

      toast({ title: "Agregado", description: "El elemento se ha añadido al catálogo.", variant: "success" });
    } catch (error: any) {
      console.error("Error adding item:", error);
      toast({ title: "Error al Guardar", description: `No se pudo añadir el elemento: ${error.message}`, variant: "destructive" });
    }
  };
  
  const handleUpdateItem = async (collectionName: keyof CatalogData, id: string, item: any) => {
    try {
      await updateItem(collectionName, id, item);
      
      const updatedItems = catalog[collectionName].map((i: any) => i.id === id ? { ...i, ...item } : i)
      updateCatalogState(collectionName, updatedItems);

      toast({ title: "Actualizado", description: "El elemento del catálogo se ha actualizado.", variant: "success" });
    } catch (error: any) {
      console.error("Error updating item:", error);
      toast({ title: "Error al Actualizar", description: `No se pudo actualizar el elemento: ${error.message}`, variant: "destructive" });
    }
  };

  const handleDeleteItem = async (collectionName: keyof CatalogData, id: string) => {
    try {
      await deleteItem(collectionName, id);

      const filteredItems = catalog[collectionName].filter((i: any) => i.id !== id);
      updateCatalogState(collectionName, filteredItems);

      toast({ title: "Eliminado", description: "El elemento del catálogo ha sido eliminado.", variant: "success" });
    } catch (error: any) {
      console.error("Error deleting item:", error);
      toast({ title: "Error al Eliminar", description: `No se pudo eliminar el elemento: ${error.message}`, variant: "destructive" });
    }
  };


  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12">
        <div className="w-full max-w-6xl space-y-8">
           <header className="mb-8 flex justify-between items-center">
            <div className="flex items-center gap-3 mb-2">
              <Image src={LOGO_URL} alt="Easy Tech Logo" width={50} height={50} unoptimized />
              <h1 className="text-4xl font-bold font-headline text-primary">Easy Tech</h1>
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
      <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 print:hidden">
        <div className="w-full max-w-6xl">
          <header className="mb-8 flex flex-col sm:flex-row justify-between sm:items-start gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                 <Image src={LOGO_URL} alt="Easy Tech Logo" width={50} height={50} unoptimized/>
                <h1 className="text-3xl sm:text-4xl font-bold font-headline text-primary">Easy Tech</h1>
              </div>
              <p className="text-muted-foreground">Gestión de Centro de Reparación de Celulares</p>
            </div>
            <Button variant="ghost" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </Button>
          </header>
          
          <Tabs defaultValue="repair" className="w-full">
            <TabsList className="h-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
              <TabsTrigger value="repair">
                <Wrench className="mr-2 h-4 w-4" />
                Nueva Reparación
              </TabsTrigger>
              <TabsTrigger value="list">
                <List className="mr-2 h-4 w-4" />
                Reparaciones
              </TabsTrigger>
              <TabsTrigger value="dashboard">
                  <LineChart className="mr-2 h-4 w-4" />
                  Dashboard
              </TabsTrigger>
              <TabsTrigger value="catalog">
                <HardDrive className="mr-2 h-4 w-4" />
                Catálogos
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
                    catalog={catalog}
                    updateCatalogState={updateCatalogState}
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
                    updateCatalogState={updateCatalogState}
                    onPrintRequest={handlePrint}
                    onUpdateRequest={handleUpdateRepairRequest}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="dashboard">
                <Dashboard requests={repairRequests} catalog={catalog}/>
            </TabsContent>
            <TabsContent value="catalog">
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline">Gestionar Catálogos</CardTitle>
                  <CardDescription>Agrega, edita o elimina elementos de tus catálogos.</CardDescription>
                </CardHeader>
                <CardContent>
                  <CatalogManager 
                    catalog={catalog}
                    onAddItem={handleAddItem}
                    onUpdateItem={handleUpdateItem}
                    onDeleteItem={handleDeleteItem}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <div className="print-container hidden print:block">
        {requestToPrint && <Ticket request={requestToPrint} catalog={catalog} />}
      </div>
    </>
  );
}


export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-6xl space-y-8 text-center">
          <Skeleton className="h-12 w-1/2 mx-auto" />
          <Skeleton className="h-8 w-3/4 mx-auto" />
        </div>
      </div>
    );
  }

  return <AppScreen />;
}
