
'use client';

import { useState, useEffect, useCallback } from 'react';
import { HardDrive, Wrench, List, LogOut, LineChart, PackageSearch, Loader2, Calculator, ShieldCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RepairRequestForm } from '@/components/repair-request-form';
import { CatalogManager } from '@/components/catalog-manager';
import { RepairList } from '@/components/repair-list';
import { InventoryManager } from '@/components/inventory-manager';
import { QuoteManager } from '@/components/quote-manager';
import { UnlockManager } from '@/components/unlock-manager';
import type { Brand, Model, Color, Accessory, Condition, RepairRequest, CatalogData, TermAndCondition, SparePartType, SparePart, Service } from '@/lib/types';
import { Ticket } from '@/components/ticket';
import { getCollection, addItem, updateItem, deleteItem, addRepairRequest, getRepairRequests, updateRepairRequestWithDevices } from '@/services/firestore';
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
    conditions: [], services: [], terms: [],
    sparePartTypes: [], spareParts: []
  });

  const [repairRequests, setRepairRequests] = useState<RepairRequest[]>([]);
  const [requestToPrint, setRequestToPrint] = useState<RepairRequest | null>(null);

  const fetchCatalogData = useCallback(async () => {
    try {
      const [
        brands, models, colors, accessories, 
        conditions, services, terms,
        sparePartTypes, spareParts
      ] = await Promise.all([
        getCollection<Brand>('brands'),
        getCollection<Model>('models'),
        getCollection<Color>('colors'),
        getCollection<Accessory>('accessories'),
        getCollection<Condition>('conditions'),
        getCollection<Service>('services'),
        getCollection<TermAndCondition>('terms'),
        getCollection<SparePartType>('sparePartTypes'),
        getCollection<SparePart>('spareParts'),
      ]);
      setCatalog({ 
        brands, models, colors, accessories, 
        conditions, services, terms,
        sparePartTypes, spareParts 
      });
    } catch (error: any) {
      console.error("Error fetching catalog data:", error);
      toast({
        title: "Error de Carga de Catálogo",
        description: `No se pudieron cargar los datos del catálogo.`,
        variant: "destructive",
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
          description: `No se pudieron cargar las solicitudes de reparación.`,
          variant: "destructive",
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
        if (typeof window !== 'undefined') {
          window.print();
          setRequestToPrint(null);
        }
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
        toast({ title: "Error", description: `No se pudo agregar la solicitud.`, variant: "destructive" });
    }
  };

  const handleUpdateRepairRequest = async (id: string, data: Omit<RepairRequest, 'id' | 'status' | 'folio' | 'createdAt'>) => {
      try {
        await updateRepairRequestWithDevices(id, data);
        const updatedRequests = await getRepairRequests();
        setRepairRequests(updatedRequests);
        toast({ title: "Actualizado", description: "La solicitud se ha actualizado.", variant: "success" });
      } catch (error: any) {
          console.error("Failed to update repair request:", error)
          toast({ title: "Error", description: `No se pudo actualizar la solicitud.`, variant: "destructive" });
      }
  }
  
  const updateCatalogState = (collectionName: keyof CatalogData, newItems: any[]) => {
    setCatalog(prev => ({
        ...prev,
        [collectionName]: Array.isArray(newItems) ? newItems : [],
    }));
  };

  const handleAddItem = async (collectionName: keyof CatalogData, item: any) => {
    try {
      const id = await addItem(collectionName, item);
      const newItem = { ...item, id };
      updateCatalogState(collectionName, [...(catalog[collectionName] || []), newItem]);
      toast({ title: "Agregado", description: "Elemento añadido correctamente.", variant: "success" });
    } catch (error: any) {
      console.error("Error adding item:", error);
      toast({ title: "Error", description: `No se pudo añadir el elemento.`, variant: "destructive" });
    }
  };
  
  const handleUpdateItem = async (collectionName: keyof CatalogData, id: string, item: any) => {
    try {
      await updateItem(collectionName, id, item);
      const updatedItems = (catalog[collectionName] || []).map((i: any) => i.id === id ? { ...i, ...item } : i)
      updateCatalogState(collectionName, updatedItems);
      toast({ title: "Actualizado", description: "Elemento actualizado correctamente.", variant: "success" });
    } catch (error: any) {
      console.error("Error updating item:", error);
      toast({ title: "Error", description: `No se pudo actualizar el elemento.`, variant: "destructive" });
    }
  };

  const handleDeleteItem = async (collectionName: keyof CatalogData, id: string) => {
    try {
      await deleteItem(collectionName, id);
      const filteredItems = (catalog[collectionName] || []).filter((i: any) => i.id !== id);
      updateCatalogState(collectionName, filteredItems);
      toast({ title: "Eliminado", description: "Elemento eliminado.", variant: "success" });
    } catch (error: any) {
      console.error("Error deleting item:", error);
      toast({ title: "Error", description: `No se pudo eliminar el elemento.`, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12">
        <div className="w-full max-w-6xl space-y-8">
           <header className="mb-8 flex justify-between items-center">
            <div className="flex items-center gap-3 mb-2">
              <Image src={LOGO_URL} alt="Easy Tech Logo" width={50} height={50} />
              <h1 className="text-4xl font-bold font-headline text-primary">Easy Tech</h1>
            </div>
          </header>
          <Skeleton className="h-10 w-full" />
          <Card>
            <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
            <CardContent><div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-20 w-full" /></div></CardContent>
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
                 <Image src={LOGO_URL} alt="Easy Tech Logo" width={50} height={50} />
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
            <TabsList className="h-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-1 mb-8">
              <TabsTrigger value="repair">
                <Wrench className="mr-2 h-4 w-4" />
                Nueva Reparación
              </TabsTrigger>
              <TabsTrigger value="list">
                <List className="mr-2 h-4 w-4" />
                Reparaciones
              </TabsTrigger>
              <TabsTrigger value="inventory">
                <PackageSearch className="mr-2 h-4 w-4" />
                Inventario
              </TabsTrigger>
              <TabsTrigger value="quotes">
                <Calculator className="mr-2 h-4 w-4" />
                Cotizaciones
              </TabsTrigger>
              <TabsTrigger value="unlocks">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Desbloqueos
              </TabsTrigger>
              <TabsTrigger value="dashboard">
                  <LineChart className="mr-2 h-4 w-4" />
                  Dashboard
              </TabsTrigger>
              <TabsTrigger value="catalog">
                <HardDrive className="mr-2 h-4 w-4" />
                Configuración
              </TabsTrigger>
            </TabsList>

            <TabsContent value="repair">
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline">Registrar Nuevo Dispositivo</CardTitle>
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

            <TabsContent value="inventory">
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline">Gestión de Inventario</CardTitle>
                  <CardDescription>Control de stock de refacciones y componentes.</CardDescription>
                </CardHeader>
                <CardContent>
                  <InventoryManager 
                    catalog={catalog}
                    onAddItem={handleAddItem}
                    onUpdateItem={handleUpdateItem}
                    onDeleteItem={handleDeleteItem}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quotes">
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline">Cotizaciones</CardTitle>
                  <CardDescription>Lista de precios de refacciones por modelo para cotizar reparaciones.</CardDescription>
                </CardHeader>
                <CardContent>
                  <QuoteManager />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="unlocks">
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline">Desbloqueos y Liberaciones</CardTitle>
                  <CardDescription>Consulta el estatus de bloqueo de equipos (iCloud, operador, lista negra) con Server.</CardDescription>
                </CardHeader>
                <CardContent>
                  <UnlockManager />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="dashboard">
                <Dashboard requests={repairRequests} catalog={catalog}/>
            </TabsContent>

            <TabsContent value="catalog">
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline">Configuración de Catálogos</CardTitle>
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
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return <AppScreen />;
}
