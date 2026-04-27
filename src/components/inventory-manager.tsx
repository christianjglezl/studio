
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PlusCircle, Trash2, Pencil, Package, Settings, Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { CatalogData, SparePartType, SparePart, Brand, Model } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

interface InventoryManagerProps {
    catalog: CatalogData;
    onAddItem: (collectionName: keyof CatalogData, item: any) => Promise<void>;
    onUpdateItem: (collectionName: keyof CatalogData, id: string, item: any) => Promise<void>;
    onDeleteItem: (collectionName: keyof CatalogData, id: string) => Promise<void>;
}

const SparePartTypeDialog: React.FC<{
  itemToEdit?: SparePartType;
  onSave: (data: Omit<SparePartType, 'id'>) => void;
  dialogTitle: string;
}> = ({ itemToEdit, onSave, dialogTitle }) => {
  const [name, setName] = useState(itemToEdit?.name || '');
  const [isActive, setIsActive] = useState(itemToEdit?.isActive ?? true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setName(itemToEdit?.name || '');
      setIsActive(itemToEdit?.isActive ?? true);
    }
  }, [open, itemToEdit]);

  const handleSave = () => {
    if (name.trim()) {
      onSave({ name: name.trim(), isActive });
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {itemToEdit ? (
          <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Añadir Tipo</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{dialogTitle}</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="type-name">Nombre del Tipo (Ej: Pantalla, Batería)</Label>
            <Input id="type-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="type-active" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="type-active">Activo</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const SparePartDialog: React.FC<{
  itemToEdit?: SparePart;
  onSave: (data: Omit<SparePart, 'id'>) => void;
  dialogTitle: string;
  catalog: CatalogData;
}> = ({ itemToEdit, onSave, dialogTitle, catalog }) => {
  const [typeId, setTypeId] = useState(itemToEdit?.typeId || '');
  const [brandId, setBrandId] = useState(itemToEdit?.brandId || '');
  const [modelId, setModelId] = useState(itemToEdit?.modelId || '');
  const [quantity, setQuantity] = useState(itemToEdit?.quantity || 0);
  const [description, setDescription] = useState(itemToEdit?.description || '');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setTypeId(itemToEdit?.typeId || '');
      setBrandId(itemToEdit?.brandId || '');
      setModelId(itemToEdit?.modelId || '');
      setQuantity(itemToEdit?.quantity || 0);
      setDescription(itemToEdit?.description || '');
    }
  }, [open, itemToEdit]);

  const filteredModels = useMemo(() => {
    return catalog.models.filter(m => m.brandId === brandId);
  }, [catalog.models, brandId]);

  const handleSave = () => {
    if (typeId && brandId && modelId) {
      onSave({ typeId, brandId, modelId, quantity: Number(quantity), description });
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {itemToEdit ? (
          <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Registrar Refacción</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{dialogTitle}</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Tipo de Refacción</Label>
            <Select value={typeId} onValueChange={setTypeId}>
              <SelectTrigger><SelectValue placeholder="Selecciona tipo" /></SelectTrigger>
              <SelectContent>
                {catalog.sparePartTypes.filter(t => t.isActive).map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Marca</Label>
              <Select value={brandId} onValueChange={(val) => { setBrandId(val); setModelId(''); }}>
                <SelectTrigger><SelectValue placeholder="Marca" /></SelectTrigger>
                <SelectContent>
                  {catalog.brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Modelo</Label>
              <Select value={modelId} onValueChange={setModelId} disabled={!brandId}>
                <SelectTrigger><SelectValue placeholder="Modelo" /></SelectTrigger>
                <SelectContent>
                  {filteredModels.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Cantidad en Stock</Label>
            <Input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          </div>
          <div className="grid gap-2">
            <Label>Descripción (Opcional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalles técnicos, proveedor, etc." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!typeId || !brandId || !modelId}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export function InventoryManager({ catalog, onAddItem, onUpdateItem, onDeleteItem }: InventoryManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSpareParts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return catalog.spareParts.filter(sp => {
      const typeName = catalog.sparePartTypes.find(t => t.id === sp.typeId)?.name || '';
      const brandName = catalog.brands.find(b => b.id === sp.brandId)?.name || '';
      const modelName = catalog.models.find(m => m.id === sp.modelId)?.name || '';
      return typeName.toLowerCase().includes(q) || 
             brandName.toLowerCase().includes(q) || 
             modelName.toLowerCase().includes(q) ||
             (sp.description || '').toLowerCase().includes(q);
    });
  }, [catalog, searchQuery]);

  return (
    <Tabs defaultValue="stock" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="stock"><Package className="mr-2 h-4 w-4" /> Stock de Refacciones</TabsTrigger>
        <TabsTrigger value="types"><Settings className="mr-2 h-4 w-4" /> Configuración de Tipos</TabsTrigger>
      </TabsList>

      <TabsContent value="stock" className="mt-4 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por tipo, marca o modelo..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <SparePartDialog 
            catalog={catalog} 
            onSave={(data) => onAddItem('spareParts', data)} 
            dialogTitle="Registrar Nueva Refacción" 
          />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Marca/Modelo</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="hidden md:table-cell">Descripción</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSpareParts.length > 0 ? filteredSpareParts.map(sp => (
                <TableRow key={sp.id}>
                  <TableCell className="font-medium">
                    {catalog.sparePartTypes.find(t => t.id === sp.typeId)?.name || 'N/A'}
                  </TableCell>
                  <TableCell>
                    {catalog.brands.find(b => b.id === sp.brandId)?.name || 'N/A'} {' '}
                    <span className="text-muted-foreground">{catalog.models.find(m => m.id === sp.modelId)?.name || 'N/A'}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={sp.quantity > 2 ? 'outline' : 'destructive'}>
                      {sp.quantity} unidades
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {sp.description || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <SparePartDialog 
                      itemToEdit={sp} 
                      catalog={catalog} 
                      onSave={(data) => onUpdateItem('spareParts', sp.id, data)} 
                      dialogTitle="Editar Refacción" 
                    />
                    <Button variant="ghost" size="icon" onClick={() => onDeleteItem('spareParts', sp.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No hay refacciones en inventario.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="types" className="mt-4 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium">Categorías de Refacciones</h3>
            <p className="text-sm text-muted-foreground">Define qué tipos de componentes manejas en tu taller.</p>
          </div>
          <SparePartTypeDialog 
            onSave={(data) => onAddItem('sparePartTypes', data)} 
            dialogTitle="Añadir Nuevo Tipo de Refacción" 
          />
        </div>

        <div className="rounded-md border max-w-2xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Estatus</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {catalog.sparePartTypes.length > 0 ? catalog.sparePartTypes.map(type => (
                <TableRow key={type.id}>
                  <TableCell className="font-medium">{type.name}</TableCell>
                  <TableCell>
                    <Badge variant={type.isActive ? 'success' : 'secondary'}>
                      {type.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <SparePartTypeDialog 
                      itemToEdit={type} 
                      onSave={(data) => onUpdateItem('sparePartTypes', type.id, data)} 
                      dialogTitle="Editar Tipo" 
                    />
                    <Button variant="ghost" size="icon" onClick={() => onDeleteItem('sparePartTypes', type.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">No has definido tipos de refacciones.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  );
}
