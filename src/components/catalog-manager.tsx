
'use client';

import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, Pencil } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CatalogData, Brand, Model, TermAndCondition, Color, Accessory, Condition, Service } from '@/lib/types';
import { Textarea } from './ui/textarea';

type CollectionName = keyof CatalogData;

interface CatalogManagerProps {
    catalog: CatalogData;
    onAddItem: (collectionName: CollectionName, item: any) => Promise<void>;
    onUpdateItem: (collectionName: CollectionName, id: string, item: any) => Promise<void>;
    onDeleteItem: (collectionName: CollectionName, id: string) => Promise<void>;
}

const AddItemDialog: React.FC<{
  onAddItem: (itemData: any) => void;
  itemName: string;
  brands?: Brand[];
  hasBrandSelection?: boolean;
  isTextArea?: boolean;
}> = ({ onAddItem, itemName, brands, hasBrandSelection = false, isTextArea = false }) => {
  const [name, setName] = useState('');
  const [brandId, setBrandId] = useState<string | undefined>(undefined);
  const [open, setOpen] = useState(false);

  const handleAdd = () => {
    if (name.trim() && (!hasBrandSelection || brandId)) {
      const itemData: any = {};
      if (isTextArea) {
        itemData.text = name.trim();
      } else {
        itemData.name = name.trim();
      }
      if (hasBrandSelection && brandId) {
        itemData.brandId = brandId;
      }
      onAddItem(itemData);
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
              <Select onValueChange={setBrandId} value={brandId}>
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
            <Label htmlFor="name" className="text-right">{isTextArea ? 'Texto' : 'Nombre'}</Label>
            {isTextArea ? (
                 <Textarea id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
            ) : (
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
            )}
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

const EditItemDialog: React.FC<{
    item: { id: string; name?: string; text?: string; brandId?: string };
    onUpdateItem: (id: string, itemData: any) => void;
    itemName: string;
    brands?: Brand[];
    hasBrandSelection?: boolean;
    isTextArea?: boolean;
  }> = ({ item, onUpdateItem, itemName, brands, hasBrandSelection = false, isTextArea = false }) => {
    const [name, setName] = useState(item.name || item.text || '');
    const [brandId, setBrandId] = useState<string | undefined>(item.brandId);
    const [open, setOpen] = useState(false);
  
    useEffect(() => {
        if(open) {
            setName(item.name || item.text || '');
            setBrandId(item.brandId);
        }
    }, [open, item]);

    const handleUpdate = () => {
      if (name.trim() && (!hasBrandSelection || brandId)) {
        const itemData: any = {};
         if (isTextArea) {
            itemData.text = name.trim();
        } else {
            itemData.name = name.trim();
        }
        if (hasBrandSelection && brandId) {
            itemData.brandId = brandId;
        }
        onUpdateItem(item.id, itemData);
        setOpen(false);
      }
    };
  
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
            <Button variant="ghost" size="icon">
                <Pencil className="h-4 w-4 text-muted-foreground" />
                <span className="sr-only">Editar</span>
            </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar {itemName}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {hasBrandSelection && brands && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="brand-edit" className="text-right">Marca</Label>
                <Select value={brandId} onValueChange={setBrandId}>
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
              <Label htmlFor="name-edit" className="text-right">{isTextArea ? 'Texto' : 'Nombre'}</Label>
              {isTextArea ? (
                   <Textarea id="name-edit" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
              ) : (
                  <Input id="name-edit" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleUpdate}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

const CatalogTable = <T extends { id: string; name?: string; text?: string }>({ title, items, onAddItem, onUpdateItem, onDeleteItem, brands, hasBrandSelection, isTextArea }: {
  title: string;
  items: T[];
  onAddItem: (itemData: any) => void;
  onUpdateItem: (id: string, itemData: any) => void;
  onDeleteItem: (id: string) => void;
  brands?: Brand[];
  hasBrandSelection?: boolean;
  isTextArea?: boolean;
}) => (
  <div>
    <div className="flex justify-end mb-4">
      <AddItemDialog onAddItem={onAddItem} itemName={title.slice(0, -1)} brands={brands} hasBrandSelection={hasBrandSelection} isTextArea={isTextArea}/>
    </div>
    <div className="rounded-md border max-h-96 overflow-y-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-secondary">
          <TableRow>
            <TableHead>{isTextArea ? 'Texto' : 'Nombre'}</TableHead>
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
                <TableCell className="font-medium whitespace-pre-wrap">{item.name || item.text}</TableCell>
                {hasBrandSelection && <TableCell>{brand?.name || 'N/A'}</TableCell>}
                <TableCell className="text-right">
                  <EditItemDialog 
                    item={item as Model} 
                    onUpdateItem={onUpdateItem} 
                    itemName={title.slice(0,-1)} 
                    brands={brands} 
                    hasBrandSelection={hasBrandSelection}
                    isTextArea={isTextArea}
                   />
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
  catalog, onAddItem, onUpdateItem, onDeleteItem
}: CatalogManagerProps) {
  
  const handleAddItem = (collectionName: CollectionName) => (itemData: any) => {
    onAddItem(collectionName, itemData);
  };
  
  const handleUpdateItem = (collectionName: CollectionName) => (id: string, itemData: any) => {
    onUpdateItem(collectionName, id, itemData);
  };

  const handleDeleteItem = (collectionName: CollectionName) => (id: string) => {
    onDeleteItem(collectionName, id);
  };

  return (
    <Tabs defaultValue="brands" className="w-full">
      <TabsList className="grid w-full grid-cols-3 md:grid-cols-7">
        <TabsTrigger value="brands">Marcas</TabsTrigger>
        <TabsTrigger value="models">Modelos</TabsTrigger>
        <TabsTrigger value="colors">Colores</TabsTrigger>
        <TabsTrigger value="accessories">Accesorios</TabsTrigger>
        <TabsTrigger value="conditions">Condiciones</TabsTrigger>
        <TabsTrigger value="services">Servicios</TabsTrigger>
        <TabsTrigger value="terms">Términos</TabsTrigger>
      </TabsList>
      <TabsContent value="brands" className="mt-4">
        <CatalogTable title="Marcas" items={catalog.brands} onAddItem={handleAddItem('brands')} onUpdateItem={handleUpdateItem('brands')} onDeleteItem={handleDeleteItem('brands')} />
      </TabsContent>
      <TabsContent value="models" className="mt-4">
        <CatalogTable title="Modelos" items={catalog.models} onAddItem={handleAddItem('models')} onUpdateItem={handleUpdateItem('models')} onDeleteItem={handleDeleteItem('models')} brands={catalog.brands} hasBrandSelection />
      </TabsContent>
      <TabsContent value="colors" className="mt-4">
        <CatalogTable title="Colores" items={catalog.colors} onAddItem={handleAddItem('colors')} onUpdateItem={handleUpdateItem('colors')} onDeleteItem={handleDeleteItem('colors')} />
      </TabsContent>
      <TabsContent value="accessories" className="mt-4">
        <CatalogTable title="Accesorios" items={catalog.accessories} onAddItem={handleAddItem('accessories')} onUpdateItem={handleUpdateItem('accessories')} onDeleteItem={handleDeleteItem('accessories')} />
      </TabsContent>
      <TabsContent value="conditions" className="mt-4">
        <CatalogTable title="Condiciones" items={catalog.conditions} onAddItem={handleAddItem('conditions')} onUpdateItem={handleUpdateItem('conditions')} onDeleteItem={handleDeleteItem('conditions')} />
      </TabsContent>
      <TabsContent value="services" className="mt-4">
        <CatalogTable title="Servicios" items={catalog.services} onAddItem={handleAddItem('services')} onUpdateItem={handleUpdateItem('services')} onDeleteItem={handleDeleteItem('services')} />
      </TabsContent>
      <TabsContent value="terms" className="mt-4">
        <CatalogTable title="Términos" items={catalog.terms} onAddItem={handleAddItem('terms')} onUpdateItem={handleUpdateItem('terms')} onDeleteItem={handleDeleteItem('terms')} isTextArea/>
      </TabsContent>
    </Tabs>
  );
}

    