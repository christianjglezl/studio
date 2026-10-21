'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Loader2, RefreshCw, ShieldCheck, History, Settings, PlusCircle, Trash2, Eye, Wallet } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { groupByCategory } from '@/lib/sickw';
import { translateResult, translateError, type ResultTone } from '@/lib/sickw-translate';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import type { SickwService, UnlockCheck } from '@/lib/types';
import { getSickwServices, addSickwService, updateSickwServicePublicPrice, deleteSickwService, getUnlockChecks, addUnlockCheck } from '@/services/firestore';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

type SickwApiResponse = {
  status: 'success' | 'error';
  result?: string;
  balance?: string;
  price?: string;
  orderId?: string;
  services?: Omit<SickwService, 'id'>[];
};

// Checks at or above this price (USD) ask for confirmation before spending balance.
const EXPENSIVE_PRICE = 1;
// Preselected service when the tab opens (999 = demo, used for model lookup by IMEI).
const DEFAULT_SERVICE_ID = '999';

const callSickwApi = async (body: Record<string, string>): Promise<SickwApiResponse> => {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
  const res = await fetch('/api/sickw', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return res.json();
};

const formatDate = (iso: string) => format(parseISO(iso), "dd/MM/yyyy HH:mm", { locale: es });

const toneStyles: Record<ResultTone, string> = {
  good: 'text-green-700 dark:text-green-400',
  bad: 'text-red-700 dark:text-red-400',
  warn: 'text-amber-700 dark:text-amber-400',
  neutral: '',
};

const ResultBox: React.FC<{ check: Pick<UnlockCheck, 'status' | 'result'> }> = ({ check }) => {
  const [showOriginal, setShowOriginal] = useState(false);
  const raw = check.result || 'Sin resultado.';

  const original = (
    <pre className="whitespace-pre-wrap break-words rounded-md border bg-muted/40 p-4 text-xs font-mono">{raw}</pre>
  );
  const toggle = (
    <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setShowOriginal(v => !v)}>
      {showOriginal ? 'Ocultar respuesta original' : 'Ver respuesta original'}
    </Button>
  );

  if (check.status !== 'success') {
    const error = translateError(raw);
    return (
      <div className="space-y-2">
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 space-y-1">
          <p className="font-medium text-destructive">{error.message}</p>
          {error.help && <p className="text-sm text-muted-foreground">{error.help}</p>}
        </div>
        {error.message !== raw && <>{toggle}{showOriginal && original}</>}
      </div>
    );
  }

  const lines = translateResult(raw);
  return (
    <div className="space-y-2">
      <div className="rounded-md border divide-y">
        {lines.map((line, i) => (
          <div key={i} className="grid gap-1 p-3 sm:grid-cols-[220px_1fr] sm:gap-4">
            <span className="text-sm text-muted-foreground">{line.label}</span>
            <div>
              <span className={`text-sm font-medium break-words ${toneStyles[line.tone]}`}>{line.value}</span>
              {line.help && <p className="mt-1 text-xs text-muted-foreground">{line.help}</p>}
            </div>
          </div>
        ))}
      </div>
      {toggle}
      {showOriginal && original}
    </div>
  );
};

const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

// Inline editor for the customer-facing price; saves on blur or Enter when the value changed.
const PublicPriceCell: React.FC<{ value?: number; onSave: (value: number | null) => Promise<void> }> = ({ value, onSave }) => {
  const [draft, setDraft] = useState(value !== undefined ? String(value) : '');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraft(value !== undefined ? String(value) : ''); }, [value]);

  const commit = async () => {
    const trimmed = draft.trim();
    const next = trimmed === '' ? null : Number(trimmed);
    if (next !== null && (isNaN(next) || next < 0)) {
      setDraft(value !== undefined ? String(value) : '');
      return;
    }
    if ((next ?? undefined) === value) return;
    setSaving(true);
    await onSave(next);
    setSaving(false);
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <span className="text-muted-foreground text-sm">$</span>
      <Input
        type="number"
        min="0"
        step="1"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        placeholder="0"
        className="h-8 w-24 text-right"
        disabled={saving}
      />
      {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
    </div>
  );
};

export function UnlockManager() {
  const { toast } = useToast();
  const [services, setServices] = useState<SickwService[]>([]);
  const [checks, setChecks] = useState<UnlockCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const [imei, setImei] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<UnlockCheck | null>(null);
  const [duplicate, setDuplicate] = useState<UnlockCheck | null>(null);
  const [confirmExpensive, setConfirmExpensive] = useState(false);

  const [sickwCatalog, setSickwCatalog] = useState<Omit<SickwService, 'id'>[] | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');

  const [historySearch, setHistorySearch] = useState('');
  const [checkToView, setCheckToView] = useState<UnlockCheck | null>(null);

  const [newServiceId, setNewServiceId] = useState('');
  const [newServiceName, setNewServiceName] = useState('');

  const refreshBalance = useCallback(async () => {
    setBalanceLoading(true);
    try {
      const data = await callSickwApi({ action: 'balance' });
      setBalance(data.status === 'success' ? data.balance ?? null : null);
      if (data.status !== 'success') {
        toast({ title: 'Server', description: data.result || 'No se pudo obtener el saldo.', variant: 'destructive' });
      }
    } catch (error: any) {
      console.error('Error fetching sickw balance:', error);
      toast({ title: 'Error', description: error?.message || 'No se pudo obtener el saldo.', variant: 'destructive' });
    } finally {
      setBalanceLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const load = async () => {
      try {
        const [servicesData, checksData] = await Promise.all([getSickwServices(), getUnlockChecks()]);
        setServices(servicesData);
        setChecks(checksData);
        const defaultService = servicesData.find(s => s.serviceId === DEFAULT_SERVICE_ID) ?? (servicesData.length === 1 ? servicesData[0] : undefined);
        if (defaultService) setServiceId(defaultService.serviceId);
      } catch (error) {
        console.error('Error loading unlock data:', error);
        toast({ title: 'Error', description: 'No se pudieron cargar los datos de desbloqueos.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();
    refreshBalance();
  }, [toast, refreshBalance]);

  const normalizedImei = imei.replace(/[\s-]/g, '').toUpperCase();
  const isImeiValid = /^[A-Z0-9]{8,20}$/.test(normalizedImei);
  const selectedService = services.find(s => s.serviceId === serviceId);

  const loadSickwCatalog = async () => {
    setCatalogLoading(true);
    try {
      const data = await callSickwApi({ action: 'services' });
      if (data.status === 'success' && data.services) {
        setSickwCatalog(data.services);
      } else {
        toast({ title: 'Server', description: data.result || 'No se pudo obtener la lista de servicios.', variant: 'destructive' });
      }
    } catch (error: any) {
      console.error('Error fetching sickw services:', error);
      toast({ title: 'Error', description: error?.message || 'No se pudo obtener la lista de servicios.', variant: 'destructive' });
    } finally {
      setCatalogLoading(false);
    }
  };

  const catalogGroups = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return groupByCategory((sickwCatalog || []).filter(s => !q || s.name.toLowerCase().includes(q) || s.serviceId === q));
  }, [sickwCatalog, catalogSearch]);
  const [openCategories, setOpenCategories] = useState<string[]>([]);

  const serviceGroups = useMemo(() => groupByCategory(services), [services]);

  const runCheck = async () => {
    if (!selectedService) return;
    setDuplicate(null);
    setConfirmExpensive(false);
    setChecking(true);
    setLastCheck(null);
    try {
      const data = await callSickwApi({ action: 'check', imei: normalizedImei, serviceId: selectedService.serviceId });
      const check: Omit<UnlockCheck, 'id' | 'createdAt'> = {
        imei: normalizedImei,
        serviceId: selectedService.serviceId,
        serviceName: selectedService.name,
        status: data.status,
        result: data.result || '',
        price: data.price,
        orderId: data.orderId,
        checkedBy: auth.currentUser?.email || undefined,
      };
      // Only successful (charged) checks are worth keeping in the history.
      const saved: UnlockCheck = { ...check, id: '', createdAt: new Date().toISOString() };
      if (data.status === 'success') {
        saved.id = await addUnlockCheck(check);
        setChecks(prev => [saved, ...prev]);
      }
      setLastCheck(saved);
      if (data.balance !== undefined) setBalance(data.balance);
    } catch (error: any) {
      console.error('Error running sickw check:', error);
      toast({ title: 'Error', description: error?.message || 'No se pudo realizar la consulta.', variant: 'destructive' });
    } finally {
      setChecking(false);
    }
  };

  const handleCheck = () => {
    if (!isImeiValid || !selectedService) return;
    const previous = checks.find(c => c.imei === normalizedImei && c.serviceId === selectedService.serviceId && c.status === 'success');
    if (previous) {
      setDuplicate(previous);
      return;
    }
    if (Number(selectedService.price) >= EXPENSIVE_PRICE) {
      setConfirmExpensive(true);
      return;
    }
    runCheck();
  };

  const handleAddService = async (service: Omit<SickwService, 'id'>) => {
    const sid = service.serviceId.trim();
    const name = service.name.trim();
    if (!/^\d+$/.test(sid) || !name) return;
    if (services.some(s => s.serviceId === sid)) {
      toast({ title: 'Duplicado', description: 'Ese ID de servicio ya está registrado.', variant: 'destructive' });
      return;
    }
    try {
      const item = service.price ? { serviceId: sid, name, price: service.price } : { serviceId: sid, name };
      const id = await addSickwService(item);
      setServices(prev => [...prev, { id, ...item }].sort((a, b) => a.name.localeCompare(b.name)));
      setNewServiceId('');
      setNewServiceName('');
      toast({ title: 'Agregado', description: 'Servicio añadido correctamente.', variant: 'success' });
    } catch (error) {
      console.error('Error adding sickw service:', error);
      toast({ title: 'Error', description: 'No se pudo añadir el servicio.', variant: 'destructive' });
    }
  };

  const handleUpdatePublicPrice = async (service: SickwService, publicPrice: number | null) => {
    try {
      await updateSickwServicePublicPrice(service.id, publicPrice);
      setServices(prev => prev.map(s => s.id === service.id ? { ...s, publicPrice: publicPrice ?? undefined } : s));
      toast({ title: 'Actualizado', description: `Precio al público de "${service.name}" guardado.`, variant: 'success' });
    } catch (error) {
      console.error('Error updating public price:', error);
      toast({ title: 'Error', description: 'No se pudo guardar el precio al público.', variant: 'destructive' });
    }
  };

  const handleDeleteService = async (service: SickwService) => {
    try {
      await deleteSickwService(service.id);
      setServices(prev => prev.filter(s => s.id !== service.id));
      if (serviceId === service.serviceId) setServiceId('');
      toast({ title: 'Eliminado', description: 'Servicio eliminado.', variant: 'success' });
    } catch (error) {
      console.error('Error deleting sickw service:', error);
      toast({ title: 'Error', description: 'No se pudo eliminar el servicio.', variant: 'destructive' });
    }
  };

  const filteredChecks = useMemo(() => {
    const q = historySearch.replace(/[\s-]/g, '').toUpperCase();
    return q ? checks.filter(c => c.imei.includes(q)) : checks;
  }, [checks, historySearch]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="check" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="check"><ShieldCheck className="mr-2 h-4 w-4" /> Consultar</TabsTrigger>
        <TabsTrigger value="history"><History className="mr-2 h-4 w-4" /> Historial</TabsTrigger>
        <TabsTrigger value="services"><Settings className="mr-2 h-4 w-4" /> Servicios</TabsTrigger>
      </TabsList>

      <TabsContent value="check" className="mt-4 space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Server</CardTitle>
            <Button variant="ghost" size="icon" onClick={refreshBalance} disabled={balanceLoading}>
              {balanceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-muted-foreground" />
            <span className="text-2xl font-bold">{balance !== null ? `$${balance}` : '—'}</span>
            <span className="text-xs text-muted-foreground">USD</span>
          </CardContent>
        </Card>

        {services.length === 0 ? (
          <div className="rounded-md border p-6 text-center text-muted-foreground">
            Aún no hay servicios configurados. Elige los que usas en la pestaña <strong>Servicios</strong>.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div className="grid gap-2">
              <Label htmlFor="unlock-imei">IMEI o Número de Serie</Label>
              <Input
                id="unlock-imei"
                value={imei}
                onChange={(e) => setImei(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                placeholder="Ej: 356789012345678"
                className="font-mono"
              />
            </div>
            <div className="grid gap-2">
              <Label>Servicio</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger><SelectValue placeholder="Selecciona servicio" /></SelectTrigger>
                <SelectContent>
                  {serviceGroups.map(group => (
                    <SelectGroup key={group.category}>
                      <SelectLabel>{group.category}</SelectLabel>
                      {group.items.map(s => <SelectItem key={s.id} value={s.serviceId}>{s.name}{s.price ? ` · $${s.price}` : ''} (#{s.serviceId})</SelectItem>)}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCheck} disabled={!isImeiValid || !selectedService || checking}>
              {checking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Consultar
            </Button>
          </div>
        )}
        {imei && !isImeiValid && <p className="text-sm text-destructive">Ingresa un IMEI o número de serie válido (8 a 20 caracteres, solo letras y números).</p>}

        {lastCheck && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={lastCheck.status === 'success' ? 'default' : 'destructive'}>
                {lastCheck.status === 'success' ? 'Consulta exitosa' : 'Error'}
              </Badge>
              <span className="text-sm text-muted-foreground font-mono">{lastCheck.imei}</span>
              <span className="text-sm text-muted-foreground">· {lastCheck.serviceName}</span>
              {lastCheck.price && <span className="text-sm text-muted-foreground">· Costo: ${lastCheck.price} USD</span>}
              {selectedService?.serviceId === lastCheck.serviceId && selectedService.publicPrice !== undefined && (
                <span className="text-sm font-semibold">· Precio al público: {mxn.format(selectedService.publicPrice)}</span>
              )}
            </div>
            <ResultBox check={lastCheck} />
          </div>
        )}
      </TabsContent>

      <TabsContent value="history" className="mt-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por IMEI o número de serie..." value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} className="pl-10" />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>IMEI / Serie</TableHead>
                <TableHead className="hidden md:table-cell">Servicio</TableHead>
                <TableHead className="hidden md:table-cell">Usuario</TableHead>
                <TableHead className="text-right">Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredChecks.length > 0 ? filteredChecks.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(c.createdAt)}</TableCell>
                  <TableCell className="font-mono">{c.imei}</TableCell>
                  <TableCell className="hidden md:table-cell">{c.serviceName}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{c.checkedBy || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setCheckToView(c)}><Eye className="mr-2 h-4 w-4" /> Ver</Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No hay consultas registradas.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="services" className="mt-4 space-y-4">
        <div>
          <h3 className="text-lg font-medium">Servicios de Server</h3>
          <p className="text-sm text-muted-foreground">Elige los servicios que usas en el taller (ej: estado de iCloud, bloqueo de operador, lista negra). Solo los servicios agregados aparecen al consultar.</p>
        </div>

        <div className="rounded-md border p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <span className="font-medium">Catálogo de Server</span>
            <Button size="sm" variant="outline" onClick={loadSickwCatalog} disabled={catalogLoading}>
              {catalogLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {sickwCatalog ? 'Recargar lista' : 'Cargar servicios disponibles'}
            </Button>
          </div>
          {sickwCatalog && (
            <>
              <Input placeholder="Buscar servicio (ej: iphone, blacklist, samsung)..." value={catalogSearch} onChange={(e) => setCatalogSearch(e.target.value)} />
              {catalogGroups.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No se encontraron servicios.</p>}
              <Accordion
                type="multiple"
                // While searching, expand every group that has matches.
                value={catalogSearch.trim() ? catalogGroups.map(g => g.category) : openCategories}
                onValueChange={setOpenCategories}
                className="space-y-2"
              >
                {catalogGroups.map(group => (
                  <AccordionItem key={group.category} value={group.category} className="rounded-md border px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <span className="flex items-center gap-2">
                        {group.category}
                        <Badge variant="secondary">{group.items.length}</Badge>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Servicio</TableHead>
                            <TableHead className="text-right">Precio</TableHead>
                            <TableHead className="text-right"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.items.map(s => {
                            const added = services.some(x => x.serviceId === s.serviceId);
                            return (
                              <TableRow key={s.serviceId}>
                                <TableCell className="font-mono">{s.serviceId}</TableCell>
                                <TableCell>{s.name}</TableCell>
                                <TableCell className="text-right whitespace-nowrap">${s.price}</TableCell>
                                <TableCell className="text-right">
                                  <Button size="sm" variant={added ? 'ghost' : 'outline'} disabled={added} onClick={() => handleAddService(s)}>
                                    {added ? 'Agregado' : <><PlusCircle className="mr-1 h-4 w-4" /> Agregar</>}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </>
          )}
        </div>

        <p className="text-sm text-muted-foreground">O agrégalo manualmente:</p>
        <div className="grid gap-4 sm:grid-cols-[140px_1fr_auto] sm:items-end max-w-2xl">
          <div className="grid gap-2">
            <Label htmlFor="sickw-service-id">ID</Label>
            <Input id="sickw-service-id" inputMode="numeric" value={newServiceId} onChange={(e) => setNewServiceId(e.target.value)} placeholder="Ej: 3" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sickw-service-name">Nombre</Label>
            <Input id="sickw-service-name" value={newServiceName} onChange={(e) => setNewServiceName(e.target.value)} placeholder="Ej: iCloud / FMI Status" />
          </div>
          <Button onClick={() => handleAddService({ serviceId: newServiceId, name: newServiceName })} disabled={!/^\d+$/.test(newServiceId.trim()) || !newServiceName.trim()}>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir
          </Button>
        </div>
        <div className="rounded-md border max-w-4xl overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="text-right">Costo (USD)</TableHead>
                <TableHead className="text-right">Precio al público (MXN)</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.length > 0 ? services.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono">{s.serviceId}</TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{s.price ? `$${s.price}` : '-'}</TableCell>
                  <TableCell className="text-right">
                    <PublicPriceCell value={s.publicPrice} onSave={(value) => handleUpdatePublicPrice(s, value)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteService(s)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No hay servicios configurados.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <AlertDialog open={!!duplicate} onOpenChange={(open) => !open && setDuplicate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Este equipo ya fue consultado</AlertDialogTitle>
            <AlertDialogDescription>
              {duplicate && `El ${formatDate(duplicate.createdAt)} se consultó ${duplicate.imei} con "${duplicate.serviceName}". Consultar de nuevo consumirá saldo.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { if (duplicate) setCheckToView(duplicate); }}>Ver resultado anterior</AlertDialogCancel>
            <AlertDialogAction onClick={runCheck}>Consultar de nuevo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmExpensive} onOpenChange={setConfirmExpensive}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar consulta</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedService && `"${selectedService.name}" cuesta $${selectedService.price} USD de tu saldo. ¿Deseas continuar con ${normalizedImei}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={runCheck}>Consultar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!checkToView} onOpenChange={(open) => !open && setCheckToView(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-mono">{checkToView?.imei}</DialogTitle>
            <DialogDescription>
              {checkToView && `${checkToView.serviceName} · ${formatDate(checkToView.createdAt)}${checkToView.checkedBy ? ` · ${checkToView.checkedBy}` : ''}`}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {checkToView && <ResultBox check={checkToView} />}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckToView(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
