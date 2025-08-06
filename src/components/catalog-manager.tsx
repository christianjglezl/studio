
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

type CollectionName = keyof Omit<CatalogData, 'terms'>;
type TermCollectionName = 'terms';


interface CatalogManagerProps {
    catalog: CatalogData;
    onAddItem: (collectionName: keyof CatalogData, item: any) => Promise<void>;
    onUpdateItem: (collectionName: keyof CatalogData, id: string, item: any) => Promise<void>;
    onDeleteItem: (collectionName: keyof CatalogData, id: string) => Promise<void>;
}

// Simplified form for adding/editing items with a single 'name' field
const NameBasedFormDialog: React.FC<{
  itemToEdit?: { id: string; name: string };
  onSave: (data: { name: string }) => void;
  dialogTitle: string;
  itemName: string;
}> = ({ itemToEdit, onSave, dialogTitle, itemName }) => {
  const [name, setName] = useState(itemToEdit?.name || '');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setName(itemToEdit?.name || '');
    }
  }, [open, itemToEdit]);

  const handleSave = () => {
    if (name.trim()) {
      onSave({ name: name.trim() });
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {itemToEdit ? (
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Editar</span>
          </Button>
        ) : (
          <Button size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nuevo {itemName}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Nombre</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={handleSave} disabled={!name.trim()}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Form for adding/editing Models, which require brand selection
const ModelFormDialog: React.FC<{
  itemToEdit?: Model;
  onSave: (data: { name: string; brandId: string }) => void;
  dialogTitle: string;
  brands: Brand[];
}> = ({ itemToEdit, onSave, dialogTitle, brands }) => {
  const [name, setName] = useState(itemToEdit?.name || '');
  const [brandId, setBrandId] = useState<string | undefined>(itemToEdit?.brandId);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setName(itemToEdit?.name || '');
      setBrandId(itemToEdit?.brandId);
    }
  }, [open, itemToEdit]);

  const handleSave = () => {
    if (name.trim() && brandId) {
      onSave({ name: name.trim(), brandId });
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {itemToEdit ? (
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Editar</span>
          </Button>
        ) : (
          <Button size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nuevo Modelo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
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
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Nombre</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={handleSave} disabled={!name.trim() || !brandId}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Form for adding/editing Terms, which use a textarea
const TermFormDialog: React.FC<{
  itemToEdit?: TermAndCondition;
  onSave: (data: { text: string }) => void;
  dialogTitle: string;
}> = ({ itemToEdit, onSave, dialogTitle }) => {
  const [text, setText] = useState(itemToEdit?.text || '');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setText(itemToEdit?.text || '');
    }
  }, [open, itemToEdit]);

  const handleSave = () => {
    if (text.trim()) {
      onSave({ text: text.trim() });
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {itemToEdit ? (
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Editar</span>
          </Button>
        ) : (
          <Button size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nuevo Término
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="text" className="text-right">Texto</Label>
            <Textarea id="text" value={text} onChange={(e) => setText(e.target.value)} className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={handleSave} disabled={!text.trim()}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


export function CatalogManager({
  catalog, onAddItem, onUpdateItem, onDeleteItem
}: CatalogManagerProps) {

  const handleSave = (collectionName: keyof CatalogData, id?: string) => (itemData: any) => {
    if (id) {
      onUpdateItem(collectionName, id, itemData);
    } else {
      onAddItem(collectionName, itemData);
    }
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

      {/* Marcas */}
      <TabsContent value="brands" className="mt-4">
        <div className="flex justify-end mb-4">
            <NameBasedFormDialog onSave={handleSave('brands')} dialogTitle="Añadir Nueva Marca" itemName="Marca" />
        </div>
        <div className="rounded-md border max-h-96 overflow-y-auto">
            <Table>
                <TableHeader className="sticky top-0 bg-secondary"><TableRow><TableHead>Nombre</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>
                    {catalog.brands.map(item => (
                        <TableRow key={item.id}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell className="text-right">
                                <NameBasedFormDialog itemToEdit={item} onSave={handleSave('brands', item.id)} dialogTitle="Editar Marca" itemName="Marca" />
                                <Button variant="ghost" size="icon" onClick={() => onDeleteItem('brands', item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
      </TabsContent>

      {/* Modelos */}
      <TabsContent value="models" className="mt-4">
         <div className="flex justify-end mb-4">
            <ModelFormDialog onSave={handleSave('models')} dialogTitle="Añadir Nuevo Modelo" brands={catalog.brands} />
        </div>
        <div className="rounded-md border max-h-96 overflow-y-auto">
            <Table>
                <TableHeader className="sticky top-0 bg-secondary"><TableRow><TableHead>Nombre</TableHead><TableHead>Marca</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>
                    {catalog.models.map(item => (
                        <TableRow key={item.id}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>{catalog.brands.find(b => b.id === item.brandId)?.name || 'N/A'}</TableCell>
                            <TableCell className="text-right">
                                <ModelFormDialog itemToEdit={item} onSave={handleSave('models', item.id)} dialogTitle="Editar Modelo" brands={catalog.brands} />
                                <Button variant="ghost" size="icon" onClick={() => onDeleteItem('models', item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
      </TabsContent>
      
      {/* Colores */}
       <TabsContent value="colors" className="mt-4">
        <div className="flex justify-end mb-4">
            <NameBasedFormDialog onSave={handleSave('colors')} dialogTitle="Añadir Nuevo Color" itemName="Color" />
        </div>
        <div className="rounded-md border max-h-96 overflow-y-auto">
            <Table>
                <TableHeader className="sticky top-0 bg-secondary"><TableRow><TableHead>Nombre</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>
                    {catalog.colors.map(item => (
                        <TableRow key={item.id}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell className="text-right">
                                <NameBasedFormDialog itemToEdit={item} onSave={handleSave('colors', item.id)} dialogTitle="Editar Color" itemName="Color" />
                                <Button variant="ghost" size="icon" onClick={() => onDeleteItem('colors', item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
      </TabsContent>

      {/* Accesorios */}
      <TabsContent value="accessories" className="mt-4">
        <div className="flex justify-end mb-4">
            <NameBasedFormDialog onSave={handleSave('accessories')} dialogTitle="Añadir Nuevo Accesorio" itemName="Accesorio" />
        </div>
        <div className="rounded-md border max-h-96 overflow-y-auto">
            <Table>
                <TableHeader className="sticky top-0 bg-secondary"><TableRow><TableHead>Nombre</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>
                    {catalog.accessories.map(item => (
                        <TableRow key={item.id}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell className="text-right">
                                <NameBasedFormDialog itemToEdit={item} onSave={handleSave('accessories', item.id)} dialogTitle="Editar Accesorio" itemName="Accesorio" />
                                <Button variant="ghost" size="icon" onClick={() => onDeleteItem('accessories', item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
      </TabsContent>

      {/* Condiciones */}
      <TabsContent value="conditions" className="mt-4">
        <div className="flex justify-end mb-4">
            <NameBasedFormDialog onSave={handleSave('conditions')} dialogTitle="Añadir Nueva Condición" itemName="Condición" />
        </div>
        <div className="rounded-md border max-h-96 overflow-y-auto">
            <Table>
                <TableHeader className="sticky top-0 bg-secondary"><TableRow><TableHead>Nombre</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>
                    {catalog.conditions.map(item => (
                        <TableRow key={item.id}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell className="text-right">
                                <NameBasedFormDialog itemToEdit={item} onSave={handleSave('conditions', item.id)} dialogTitle="Editar Condición" itemName="Condición" />
                                <Button variant="ghost" size="icon" onClick={() => onDeleteItem('conditions', item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
      </TabsContent>

      {/* Servicios */}
      <TabsContent value="services" className="mt-4">
        <div className="flex justify-end mb-4">
            <NameBasedFormDialog onSave={handleSave('services')} dialogTitle="Añadir Nuevo Servicio" itemName="Servicio" />
        </div>
        <div className="rounded-md border max-h-96 overflow-y-auto">
            <Table>
                <TableHeader className="sticky top-0 bg-secondary"><TableRow><TableHead>Nombre</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>
                    {catalog.services.map(item => (
                        <TableRow key={item.id}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell className="text-right">
                                <NameBasedFormDialog itemToEdit={item} onSave={handleSave('services', item.id)} dialogTitle="Editar Servicio" itemName="Servicio" />
                                <Button variant="ghost" size="icon" onClick={() => onDeleteItem('services', item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
      </TabsContent>

      {/* Terminos */}
      <TabsContent value="terms" className="mt-4">
        <div className="flex justify-end mb-4">
            <TermFormDialog onSave={handleSave('terms')} dialogTitle="Añadir Nuevo Término" />
        </div>
         <div className="rounded-md border max-h-96 overflow-y-auto">
            <Table>
                <TableHeader className="sticky top-0 bg-secondary"><TableRow><TableHead>Texto</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>
                    {catalog.terms.map(item => (
                        <TableRow key={item.id}>
                            <TableCell className="whitespace-pre-wrap">{item.text}</TableCell>
                            <TableCell className="text-right">
                                <TermFormDialog itemToEdit={item} onSave={handleSave('terms', item.id)} dialogTitle="Editar Término" />
                                <Button variant="ghost" size="icon" onClick={() => onDeleteItem('terms', item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
      </TabsContent>
    </Tabs>
  );
}
