'use client';

import { useState, useEffect } from 'react';
import { HardDrive, List, Wrench } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RepairRequestForm } from '@/components/repair-request-form';
import { CatalogManager } from '@/components/catalog-manager';
import type { Brand, Model, Color, Accessory, Condition } from '@/lib/types';
import { initialBrands, initialModels, initialColors, initialAccessories, initialConditions } from '@/lib/data';

export default function Home() {
  const [isClient, setIsClient] = useState(false);

  // State for catalog data
  const [brands, setBrands] = useState<Brand[]>(initialBrands);
  const [models, setModels] = useState<Model[]>(initialModels);
  const [colors, setColors] = useState<Color[]>(initialColors);
  const [accessories, setAccessories] = useState<Accessory[]>(initialAccessories);
  const [conditions, setConditions] = useState<Condition[]>(initialConditions);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null; // or a loading spinner
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12">
      <div className="w-full max-w-6xl">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Wrench className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold font-headline text-primary">TechCheck</h1>
          </div>
          <p className="text-muted-foreground">Cell Phone Repair Center Management</p>
        </header>
        
        <Tabs defaultValue="repair" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="repair">
              <Wrench className="mr-2 h-4 w-4" />
              New Repair Request
            </TabsTrigger>
            <TabsTrigger value="catalog">
              <HardDrive className="mr-2 h-4 w-4" />
              Catalog
            </TabsTrigger>
          </TabsList>
          <TabsContent value="repair">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline">Register New Device</CardTitle>
                <CardDescription>Fill out the form to register a new device for repair.</CardDescription>
              </CardHeader>
              <CardContent>
                <RepairRequestForm 
                  brands={brands}
                  models={models}
                  colors={colors}
                  accessories={accessories}
                  conditions={conditions}
                />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="catalog">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline">Manage Catalogs</CardTitle>
                <CardDescription>Add or remove items from your catalogs.</CardDescription>
              </CardHeader>
              <CardContent>
                <CatalogManager 
                  brands={brands} setBrands={setBrands}
                  models={models} setModels={setModels}
                  colors={colors} setColors={setColors}
                  accessories={accessories} setAccessories={setAccessories}
                  conditions={conditions} setConditions={setConditions}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
