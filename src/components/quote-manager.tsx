'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { PlusCircle, Trash2, Pencil, Search, Upload, Loader2, RefreshCw } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { QuotePrice, QuotePricesMetadata } from '@/lib/types';
import { getQuotePrices, getQuotePricesMetadata, addQuotePrice, updateQuotePrice, deleteQuotePrice, replaceQuotePrices } from '@/services/firestore';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const ALL_TYPES = '__all__';
const MAX_VISIBLE_ROWS = 200;

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const QuotePriceDialog: React.FC<{
  itemToEdit?: QuotePrice;
  partTypes: string[];
  onSave: (data: Omit<QuotePrice, 'id'>) => Promise<void>;
  dialogTitle: string;
}> = ({ itemToEdit, partTypes, onSave, dialogTitle }) => {
  const [model, setModel] = useState('');
  const [partType, setPartType] = useState('');
  const [cost, setCost] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setModel(itemToEdit?.model || '');
      setPartType(itemToEdit?.partType || '');
      setCost(itemToEdit ? String(itemToEdit.cost) : '');
    }
  }, [open, itemToEdit]);

  const isValid = model.trim() && partType.trim() && cost !== '' && !isNaN(Number(cost));

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    await onSave({ model: model.trim().toUpperCase(), partType: partType.trim(), cost: Number(cost) });
    setSaving(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {itemToEdit ? (
          <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Añadir Precio</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{dialogTitle}</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="quote-model">Modelo / Descripción</Label>
            <Input id="quote-model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Ej: MOTOROLA TABLILLA CARGA E6S/E6I" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="quote-type">Tipo de Refacción</Label>
            <Input id="quote-type" list="quote-part-types" value={partType} onChange={(e) => setPartType(e.target.value)} placeholder="Ej: Tablilla/Flex de carga" />
            <datalist id="quote-part-types">
              {partTypes.map(t => <option key={t} value={t} />)}
            </datalist>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="quote-cost">Costo</Label>
            <Input id="quote-cost" type="number" step="0.01" min="0" value={cost} onChange={(e) => setCost(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!isValid || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Parses a CSV with columns model, partType, cost (Spanish headers modelo, tipo, costo also accepted).
const parseQuoteCsv = (text: string): { items: Omit<QuotePrice, 'id'>[]; skipped: number } => {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return { items: [], skipped: 0 };

  const delimiter = (lines[0].match(/;/g)?.length || 0) > (lines[0].match(/,/g)?.length || 0) ? ';' : ',';
  const splitLine = (line: string) => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === delimiter && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    return cells;
  };

  const header = splitLine(lines[0]).map(normalize);
  const findCol = (names: string[]) => header.findIndex(h => names.includes(h));
  let modelIdx = findCol(['model', 'modelo', 'descripcion']);
  let typeIdx = findCol(['parttype', 'tipo', 'tipo de refaccion', 'refaccion']);
  let costIdx = findCol(['cost', 'costo', 'precio']);
  let start = 1;
  if (modelIdx < 0 || typeIdx < 0 || costIdx < 0) {
    // No recognizable header: assume model, partType, cost order.
    modelIdx = 0; typeIdx = 1; costIdx = 2; start = 0;
  }

  const items: Omit<QuotePrice, 'id'>[] = [];
  let skipped = 0;
  for (const line of lines.slice(start)) {
    const cells = splitLine(line);
    const model = (cells[modelIdx] || '').trim();
    const partType = (cells[typeIdx] || '').trim();
    const rawCost = (cells[costIdx] || '').replace(/[$\s]/g, '');
    // "1,250.50" -> thousands separator; "292,21" -> decimal comma
    const cost = rawCost === '' ? NaN : Number(rawCost.includes('.') ? rawCost.replace(/,/g, '') : rawCost.replace(',', '.'));
    if (!model || !partType || isNaN(cost)) { skipped++; continue; }
    items.push({ model, partType, cost });
  }
  return { items, skipped };
};

export function QuoteManager() {
  const { toast } = useToast();
  const [prices, setPrices] = useState<QuotePrice[]>([]);
  const [metadata, setMetadata] = useState<QuotePricesMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState(ALL_TYPES);
  const [pendingImport, setPendingImport] = useState<{ items: Omit<QuotePrice, 'id'>[]; skipped: number; fileName: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<QuotePrice | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [priceData, meta] = await Promise.all([getQuotePrices(), getQuotePricesMetadata()]);
      setPrices(priceData);
      setMetadata(meta);
    } catch (error) {
      console.error('Error fetching quote prices:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar los precios de cotización.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const partTypes = useMemo(
    () => Array.from(new Set(prices.map(p => p.partType).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [prices]
  );

  const filteredPrices = useMemo(() => {
    const terms = normalize(searchQuery).split(/\s+/).filter(Boolean);
    return prices.filter(p => {
      if (typeFilter !== ALL_TYPES && p.partType !== typeFilter) return false;
      const haystack = normalize(`${p.model} ${p.partType}`);
      return terms.every(t => haystack.includes(t));
    });
  }, [prices, searchQuery, typeFilter]);

  const handleAdd = async (data: Omit<QuotePrice, 'id'>) => {
    try {
      const { id, metadata: meta } = await addQuotePrice(data, prices.length + 1);
      setPrices(prev => [...prev, { ...data, id }].sort((a, b) => a.model.localeCompare(b.model)));
      setMetadata(meta);
      toast({ title: 'Agregado', description: 'Precio añadido correctamente.', variant: 'success' });
    } catch (error) {
      console.error('Error adding quote price:', error);
      toast({ title: 'Error', description: 'No se pudo añadir el precio.', variant: 'destructive' });
    }
  };

  const handleUpdate = async (id: string, data: Omit<QuotePrice, 'id'>) => {
    try {
      const meta = await updateQuotePrice(id, data, prices.length);
      setPrices(prev => prev.map(p => p.id === id ? { ...data, id } : p));
      setMetadata(meta);
      toast({ title: 'Actualizado', description: 'Precio actualizado correctamente.', variant: 'success' });
    } catch (error) {
      console.error('Error updating quote price:', error);
      toast({ title: 'Error', description: 'No se pudo actualizar el precio.', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      const meta = await deleteQuotePrice(itemToDelete.id, prices.length - 1);
      setPrices(prev => prev.filter(p => p.id !== itemToDelete.id));
      setMetadata(meta);
      toast({ title: 'Eliminado', description: 'Precio eliminado.', variant: 'success' });
    } catch (error) {
      console.error('Error deleting quote price:', error);
      toast({ title: 'Error', description: 'No se pudo eliminar el precio.', variant: 'destructive' });
    } finally {
      setItemToDelete(null);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const { items, skipped } = parseQuoteCsv(await file.text());
    if (items.length === 0) {
      toast({ title: 'Archivo inválido', description: 'No se encontraron filas válidas (modelo, tipo, costo).', variant: 'destructive' });
      return;
    }
    setPendingImport({ items, skipped, fileName: file.name });
  };

  const handleConfirmImport = async () => {
    if (!pendingImport) return;
    setImporting(true);
    try {
      const meta = await replaceQuotePrices(pendingImport.items);
      setMetadata(meta);
      await loadData();
      toast({ title: 'Lista actualizada', description: `Se importaron ${pendingImport.items.length} precios.`, variant: 'success' });
    } catch (error) {
      console.error('Error importing quote prices:', error);
      toast({ title: 'Error', description: 'No se pudo importar la lista de precios.', variant: 'destructive' });
    } finally {
      setImporting(false);
      setPendingImport(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const visiblePrices = filteredPrices.slice(0, MAX_VISIBLE_ROWS);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="outline">{metadata?.count ?? prices.length} precios registrados</Badge>
        {metadata?.lastUpdated && (
          <span>Última actualización: {format(parseISO(metadata.lastUpdated), "dd 'de' LLLL yyyy, HH:mm", { locale: es })}</span>
        )}
        <Button variant="ghost" size="sm" onClick={loadData}><RefreshCw className="mr-2 h-4 w-4" /> Recargar</Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por modelo o refacción (Ej: moto e6 carga)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full lg:w-[240px]"><SelectValue placeholder="Tipo de refacción" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TYPES}>Todos los tipos</SelectItem>
            {partTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <QuotePriceDialog partTypes={partTypes} onSave={handleAdd} dialogTitle="Añadir Precio de Cotización" />
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Importar CSV
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileSelected} />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Modelo / Descripción</TableHead>
              <TableHead className="hidden sm:table-cell">Tipo de Refacción</TableHead>
              <TableHead className="text-right">Costo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiblePrices.length > 0 ? visiblePrices.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  {p.model}
                  <div className="sm:hidden text-xs text-muted-foreground">{p.partType}</div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{p.partType}</TableCell>
                <TableCell className="text-right font-semibold whitespace-nowrap">{currency.format(p.cost)}</TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <QuotePriceDialog itemToEdit={p} partTypes={partTypes} onSave={(data) => handleUpdate(p.id, data)} dialogTitle="Editar Precio" />
                  <Button variant="ghost" size="icon" onClick={() => setItemToDelete(p)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                  {prices.length === 0 ? 'No hay precios de cotización registrados.' : 'No se encontraron precios con esa búsqueda.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {filteredPrices.length > MAX_VISIBLE_ROWS && (
        <p className="text-sm text-muted-foreground text-center">
          Mostrando {MAX_VISIBLE_ROWS} de {filteredPrices.length} resultados. Refina la búsqueda para ver más.
        </p>
      )}

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este precio?</AlertDialogTitle>
            <AlertDialogDescription>
              {itemToDelete?.model} — {itemToDelete?.partType}. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!pendingImport} onOpenChange={(open) => !open && !importing && setPendingImport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reemplazar lista de precios</DialogTitle>
            <DialogDescription>
              Se encontraron {pendingImport?.items.length} precios válidos en "{pendingImport?.fileName}"
              {pendingImport?.skipped ? ` (${pendingImport.skipped} filas omitidas)` : ''}.
              Esto <strong>reemplazará</strong> los {prices.length} precios actuales.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingImport(null)} disabled={importing}>Cancelar</Button>
            <Button onClick={handleConfirmImport} disabled={importing}>
              {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reemplazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
