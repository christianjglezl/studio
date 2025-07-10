'use client';

import React, { useState } from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const AddItemDialog: React.FC<{ onAddItem: (name: string) => void; itemName: string }> = ({ onAddItem, itemName }) => {
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);

  const handleAdd = () => {
    if (name.trim()) {
      onAddItem(name.trim());
      setName('');
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusCircle className="mr-2 h-4 w-4" /> Add New {itemName}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New {itemName}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleAdd}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const CatalogTable = <T extends { id: string; name: string }>({ title, items, onAddItem, onDeleteItem }: {
  title: string;
  items: T[];
  onAddItem: (name: string) => void;
  onDeleteItem: (id: string) => void;
}) => (
  <div>
    <div className="flex justify-end mb-4">
      <AddItemDialog onAddItem={onAddItem} itemName={title.slice(0, -1)} />
    </div>
    <div className="rounded-md border max-h-96 overflow-y-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-secondary">
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length > 0 ? (
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => onDeleteItem(item.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={2} className="text-center text-muted-foreground">No {title.toLowerCase()} found.</TableCell>
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
  
  const addItem = <T extends { id: string; name: string }>(setter: React.Dispatch<React.SetStateAction<T[]>>) => (name: string) => {
    setter(prev => [...prev, { id: crypto.randomUUID(), name } as T]);
  };

  const deleteItem = <T extends { id: string; name: string }>(setter: React.Dispatch<React.SetStateAction<T[]>>) => (id: string) => {
    setter(prev => prev.filter(item => item.id !== id));
  };

  return (
    <Tabs defaultValue="brands" className="w-full">
      <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
        <TabsTrigger value="brands">Brands</TabsTrigger>
        <TabsTrigger value="models">Models</TabsTrigger>
        <TabsTrigger value="colors">Colors</TabsTrigger>
        <TabsTrigger value="accessories">Accessories</TabsTrigger>
        <TabsTrigger value="conditions">Conditions</TabsTrigger>
      </TabsList>
      <TabsContent value="brands" className="mt-4">
        <CatalogTable title="Brands" items={brands} onAddItem={addItem(setBrands)} onDeleteItem={deleteItem(setBrands)} />
      </TabsContent>
      <TabsContent value="models" className="mt-4">
        <CatalogTable title="Models" items={models} onAddItem={addItem(setModels)} onDeleteItem={deleteItem(setModels)} />
      </TabsContent>
      <TabsContent value="colors" className="mt-4">
        <CatalogTable title="Colors" items={colors} onAddItem={addItem(setColors)} onDeleteItem={deleteItem(setColors)} />
      </TabsContent>
      <TabsContent value="accessories" className="mt-4">
        <CatalogTable title="Accessories" items={accessories} onAddItem={addItem(setAccessories)} onDeleteItem={deleteItem(setAccessories)} />
      </TabsContent>
      <TabsContent value="conditions" className="mt-4">
        <CatalogTable title="Conditions" items={conditions} onAddItem={addItem(setConditions)} onDeleteItem={deleteItem(setConditions)} />
      </TabsContent>
    </Tabs>
  );
}
