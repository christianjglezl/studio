'use client';

import React, { useState } from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Brand, Model, Color, Accessory, Condition } from '@/lib/types';

interface CatalogManagerProps {
  brands: Brand[];
  setBrands: React.Dispatch<React.SetStateAction<Brand[]>>;
  models: Model[];
  setModels: React.Dispatch<React.SetStateAction<Model[]>>;
  colors: Color[];
  setColors: React.Dispatch<React.SetStateAction<Color[]>>;
  accessories: Accessory[];
  setAccessories: React.Dispatch<React.SetStateAction<Accessory[]>>;
  conditions: Condition[];
  setConditions: React.Dispatch<React.SetStateAction<Condition[]>>;
}

const AddItemDialog: React.FC<{ onAddItem: (name: string, brandId?: string) => void; itemName: string; brands?: Brand[]; hasBrandSelection?: boolean }> = ({ onAddItem, itemName, brands, hasBrandSelection = false }) => {
  const [name, setName] = useState('');
  const [brandId, setBrandId] = useState<string | undefined>(undefined);
  const [open, setOpen] = useState(false);

  const handleAdd = () => {
    if (name.trim() && (!hasBrandSelection || brandId)) {
      onAddItem(name.trim(), brandId);
      setName('');
      setBrandId(undefined);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nuevo {itemName}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Añadir Nuevo {itemName}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {hasBrandSelection && brands && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="brand" className="text-right">Marca</Label>
              <Select onValueChange={setBrandId}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecciona una marca" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map(brand => (
                    <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Nombre</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleAdd}>Añadir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const CatalogTable = <T extends { id: string; name: string }>({ title, items, onAddItem, onDeleteItem, brands, hasBrandSelection }: {
  title: string;
  items: T[];
  onAddItem: (name: string, brandId?: string) => void;
  onDeleteItem: (id: string) => void;
  brands?: Brand[];
  hasBrandSelection?: boolean;
}) => (
  <div>
    <div className="flex justify-end mb-4">
      <AddItemDialog onAddItem={onAddItem} itemName={title.slice(0, -1)} brands={brands} hasBrandSelection={hasBrandSelection} />
    </div>
    <div className="rounded-md border max-h-96 overflow-y-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-secondary">
          <TableRow>
            <TableHead>Nombre</TableHead>
            {hasBrandSelection && <TableHead>Marca</TableHead>}
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length > 0 ? (
            items.map((item) => {
              const model = item as unknown as Model;
              const brand = brands?.find(b => b.id === model.brandId);
              return (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                {hasBrandSelection && <TableCell>{brand?.name || 'N/A'}</TableCell>}
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => onDeleteItem(item.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                    <span className="sr-only">Eliminar</span>
                  </Button>
                </TableCell>
              </TableRow>
            )})
          ) : (
            <TableRow>
              <TableCell colSpan={hasBrandSelection ? 3 : 2} className="text-center text-muted-foreground">No se encontraron {title.toLowerCase()}.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  </div>
);

export function CatalogManager({
  brands, setBrands,
  models, setModels,
  colors, setColors,
  accessories, setAccessories,
  conditions, setConditions
}: CatalogManagerProps) {
  
  const addItem = <T extends { id: string; name: string }>(setter: React.Dispatch<React.SetStateAction<T[]>>) => (name: string, brandId?: string) => {
    const newItem: T = { id: crypto.randomUUID(), name } as T;
    if (brandId) {
      (newItem as Model).brandId = brandId;
    }
    setter(prev => [...prev, newItem]);
  };

  const deleteItem = <T extends { id: string; name: string }>(setter: React.Dispatch<React.SetStateAction<T[]>>) => (id: string) => {
    setter(prev => prev.filter(item => item.id !== id));
  };

  return (
    <Tabs defaultValue="brands" className="w-full">
      <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
        <TabsTrigger value="brands">Marcas</TabsTrigger>
        <TabsTrigger value="models">Modelos</TabsTrigger>
        <TabsTrigger value="colors">Colores</TabsTrigger>
        <TabsTrigger value="accessories">Accesorios</TabsTrigger>
        <TabsTrigger value="conditions">Condiciones</TabsTrigger>
      </TabsList>
      <TabsContent value="brands" className="mt-4">
        <CatalogTable title="Marcas" items={brands} onAddItem={addItem(setBrands)} onDeleteItem={deleteItem(setBrands)} />
      </TabsContent>
      <TabsContent value="models" className="mt-4">
        <CatalogTable title="Modelos" items={models} onAddItem={addItem(setModels)} onDeleteItem={deleteItem(setModels)} brands={brands} hasBrandSelection />
      </TabsContent>
      <TabsContent value="colors" className="mt-4">
        <CatalogTable title="Colores" items={colors} onAddItem={addItem(setColors)} onDeleteItem={deleteItem(setColors)} />
      </TabsContent>
      <TabsContent value="accessories" className="mt-4">
        <CatalogTable title="Accesorios" items={accessories} onAddItem={addItem(setAccessories)} onDeleteItem={deleteItem(setAccessories)} />
      </TabsContent>
      <TabsContent value="conditions" className="mt-4">
        <CatalogTable title="Condiciones" items={conditions} onAddItem={addItem(setConditions)} onDeleteItem={deleteItem(setConditions)} />
      </TabsContent>
    </Tabs>
  );
}
