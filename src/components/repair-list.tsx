
'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { RepairRequest, RepairStatus, CatalogData, DeviceInRequest } from '@/lib/types';
import { repairStatuses } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ChevronDown, Pencil, Printer, Smartphone, MessageSquare } from 'lucide-react';
import { RepairRequestForm } from './repair-request-form';
import { updateRepairRequestStatus, updateRepairRequestNotes, updateRepairRequestWithRevisionFee } from '@/services/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface RepairListProps {
  requests: RepairRequest[];
  setRequests: React.Dispatch<React.SetStateAction<RepairRequest[]>>;
  catalog: CatalogData;
  updateCatalogState: (collectionName: keyof CatalogData, newItems: any[]) => void;
  onPrintRequest: (request: RepairRequest) => void;
  onUpdateRequest: (id: string, data: Omit<RepairRequest, 'id' | 'status' | 'folio' | 'createdAt'>) => Promise<void>;
}

const statusColors: { [key in RepairStatus]: string } = {
  Ingresado: 'bg-blue-500',
  'En Revisión': 'bg-yellow-500',
  'En Reparación': 'bg-orange-500',
  Reparado: 'bg-purple-500',
  'Listo para Entrega': 'bg-emerald-400',
  'Sin reparación': 'bg-gray-400',
  Entregado: 'bg-green-500',
  'Entregado (no reparado)': 'bg-gray-600',
};

const getEntityName = <T extends { id: string; name: string }>(id: string, entities: T[]): string => {
  if (!Array.isArray(entities)) return 'N/A';
  return entities.find(e => e.id === id)?.name || 'N/A';
};

const getEntityNames = <T extends { id: string; name: string }>(ids: string[] = [], entities: T[]): string => {
    if (!ids || ids.length === 0) return 'Ninguno';
    if (!Array.isArray(entities)) return 'Cargando...';
    return ids.map(id => getEntityName(id, entities)).join(', ');
};

const DeviceDetails = ({ device, catalog, request }: { device: DeviceInRequest; catalog: CatalogData, request: RepairRequest }) => {
  const { models, colors, accessories, conditions, services } = catalog;
  let remaining = (device.quote || 0) - (device.downPayment || 0);
  if (request.status === 'Entregado') {
      remaining = 0;
  }
  
  return (
    <div className="p-4 grid md:grid-cols-4 gap-4 bg-background rounded-lg border">
      <div className="md:col-span-4 flex items-center gap-2 font-bold text-primary">
          <Smartphone size={16}/> Dispositivo
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base font-headline">Falla y Servicios</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <p><strong>Problema:</strong> {device.problem || 'No especificado'}</p>
          <p><strong>Descripción:</strong> {device.problemDescription || 'Ninguna'}</p>
          <p><strong>Servicios:</strong> {getEntityNames(device.serviceIds, services)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base font-headline">Condición y Accesorios</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <p><strong>Condiciones:</strong> {getEntityNames(device.conditions, conditions)}</p>
          <p><strong>Accesorios:</strong> {getEntityNames(device.accessories, accessories)}</p>
          <p><strong>Notas:</strong> {device.notes || 'Ninguna'}</p>
        </CardContent>
      </Card>
       <Card>
        <CardHeader><CardTitle className="text-base font-headline">Seguridad</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <p><strong>IMEI:</strong> {device.imei || 'No provisto'}</p>
          <p><strong>Contraseña/PIN:</strong> {device.password || 'No provisto'}</p>
          <p><strong>Patrón:</strong> {device.pattern && device.pattern.length > 0 ? device.pattern.join(' - ') : 'No provisto'}</p>
        </CardContent>
      </Card>
       <Card>
        <CardHeader><CardTitle className="text-base font-headline">Cotización</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <p><strong>Cotización:</strong> ${device.quote?.toFixed(2) || '0.00'}</p>
          <p><strong>Anticipo:</strong> ${device.downPayment?.toFixed(2) || '0.00'}</p>
          <p><strong>Restante:</strong> <span className="font-bold">${remaining.toFixed(2)}</span></p>
        </CardContent>
      </Card>
    </div>
  )
}

const NotesModal = ({
  request,
  isOpen,
  onClose,
  onSave
}: {
  request: RepairRequest,
  isOpen: boolean,
  onClose: () => void,
  onSave: (notes: string) => Promise<void>
}) => {
    const [notes, setNotes] = useState(request.notes || '');
    const {toast} = useToast();

    const handleSave = async () => {
        try {
            await onSave(notes);
            toast({ title: 'Notas guardadas', description: 'Las notas internas han sido actualizadas.', variant: 'success'});
            onClose();
        } catch (error) {
            toast({ title: 'Error', description: 'No se pudieron guardar las notas.', variant: 'destructive'});
        }
    }

    if (!isOpen) return null;
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Notas Internas - Folio {String(request.folio).padStart(4, '0')}</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="internal-notes">Notas de la reparación</Label>
                    <Textarea 
                        id="internal-notes"
                        value={notes} 
                        onChange={e => setNotes(e.target.value)} 
                        rows={6}
                        placeholder="Añade notas sobre el diagnóstico, comunicación con el cliente, etc."
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave}>Guardar Notas</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const RepairRow = ({ 
  request,
  catalog,
  onStatusChange, onEdit, onPrint, onOpenNotes
}: {
  request: RepairRequest;
  catalog: CatalogData;
  onStatusChange: (request: RepairRequest, newStatus: RepairStatus) => void;
  onEdit: (request: RepairRequest) => void;
  onPrint: (request: RepairRequest) => void;
  onOpenNotes: (request: RepairRequest) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { brands, models } = catalog;

  const deviceDescription = request.devices.map(device => 
    `${getEntityName(device.brandId, brands)} ${getEntityName(device.modelId, models)}`
  ).join('; ');

  return (
    <>
      <TableRow className="align-middle">
        <TableCell>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(!isOpen)}>
            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
            <span className="sr-only">{isOpen ? "Cerrar" : "Abrir"} detalles</span>
          </Button>
        </TableCell>
        <TableCell className="font-medium">{String(request.folio).padStart(4, '0')}</TableCell>
        <TableCell>{request.clientName}</TableCell>
        <TableCell className="hidden md:table-cell">{request.phoneNumbers[0]?.value || 'N/A'}</TableCell>
        <TableCell>{deviceDescription}</TableCell>
        <TableCell className="hidden sm:table-cell">
          <div className="flex flex-col text-sm">
            <span>{format(parseISO(request.createdAt), 'PPp', { locale: es })}</span>
            {request.deliveryDate && (
                <span className="text-xs text-green-600">Entregado: {format(parseISO(request.deliveryDate), 'PPp', { locale: es })}</span>
            )}
            {request.updatedAt && !request.deliveryDate && (
                 <span className="text-xs text-muted-foreground">Act: {format(parseISO(request.updatedAt), 'PPp', { locale: es })}</span>
            )}
          </div>
        </TableCell>
        <TableCell>
          <Select
            value={request.status}
            onValueChange={(newStatus: RepairStatus) => onStatusChange(request, newStatus)}
          >
            <SelectTrigger className="w-full min-w-[180px]">
              <div className="flex items-center gap-2">
                <span className={cn('h-2.5 w-2.5 rounded-full', statusColors[request.status])} />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {repairStatuses.map(status => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
         <TableCell className="text-right">
           <Button variant="ghost" size="icon" onClick={() => onOpenNotes(request)}>
               <MessageSquare className="h-4 w-4 text-muted-foreground" />
               <span className="sr-only">Notas</span>
           </Button>
           <Button variant="ghost" size="icon" onClick={() => onEdit(request)}>
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Editar</span>
           </Button>
           <Button variant="ghost" size="icon" onClick={() => onPrint(request)}>
              <Printer className="h-4 w-4" />
              <span className="sr-only">Imprimir Ticket</span>
           </Button>
        </TableCell>
      </TableRow>
      {isOpen && (
          <TableRow className="bg-muted/50">
              <TableCell colSpan={8} className="p-2 sm:p-4 space-y-4">
                 {request.devices.map(device => (
                    <DeviceDetails key={device.id} device={device} catalog={catalog} request={request}/>
                 ))}
              </TableCell>
          </TableRow>
      )}
    </>
  );
};


export function RepairList({ 
  requests, setRequests, catalog, updateCatalogState, onPrintRequest, onUpdateRequest
}: RepairListProps) {
  const [editingRequest, setEditingRequest] = useState<RepairRequest | null>(null);
  const [notesRequest, setNotesRequest] = useState<RepairRequest | null>(null);
  const [confirmDelivery, setConfirmDelivery] = useState<{request: RepairRequest, newStatus: RepairStatus} | null>(null);
  const [confirmNoRepairDelivery, setConfirmNoRepairDelivery] = useState<{request: RepairRequest, newStatus: RepairStatus} | null>(null);

  const { toast } = useToast();
  
  const handleStatusChange = async (request: RepairRequest, newStatus: RepairStatus, chargeRevisionFee: boolean = false) => {
    try {
      if (chargeRevisionFee) {
        await updateRepairRequestWithRevisionFee(request.id, 80);
      } else {
        await updateRepairRequestStatus(request.id, newStatus, request.devices);
      }
      
      setRequests(prevRequests =>
        prevRequests.map(req => {
          if (req.id === request.id) {
            const updatedReq: RepairRequest = { 
                ...req, 
                status: newStatus, 
                updatedAt: new Date().toISOString(),
                deliveryDate: new Date().toISOString()
            };
            if (newStatus === 'Entregado') {
                updatedReq.devices = req.devices.map(d => ({ ...d, downPayment: d.quote }));
            }
            if (chargeRevisionFee && updatedReq.devices.length > 0) {
              const firstDevice = { ...updatedReq.devices[0], quote: 80, downPayment: 80 };
              updatedReq.devices = [firstDevice, ...updatedReq.devices.slice(1)];
            }
            return updatedReq;
          }
          return req;
        })
      );
      
      toast({
        title: "Estatus Actualizado",
        description: `El estatus del folio #${String(request.folio).padStart(4, '0')} ha sido cambiado a "${newStatus}".`,
        variant: "success"
      });
    } catch (error) {
      console.error("Error updating status:", error);
       toast({
        title: "Error",
        description: "No se pudo actualizar el estatus.",
        variant: "destructive"
      });
    }
  };
  
  const promptForConfirmation = (request: RepairRequest, newStatus: RepairStatus) => {
    if (newStatus === 'Entregado') {
        setConfirmDelivery({ request, newStatus });
    } else if (newStatus === 'Entregado (no reparado)') {
        setConfirmNoRepairDelivery({ request, newStatus });
    } else {
        handleStatusChange(request, newStatus);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!confirmDelivery) return;
    await handleStatusChange(confirmDelivery.request, confirmDelivery.newStatus);
    setConfirmDelivery(null);
  };

  const handleConfirmNoRepair = async (chargeFee: boolean) => {
    if (!confirmNoRepairDelivery) return;
    await handleStatusChange(confirmNoRepairDelivery.request, confirmNoRepairDelivery.newStatus, chargeFee);
    setConfirmNoRepairDelivery(null);
  }

  const handleSaveNotes = async (notes: string) => {
      if (!notesRequest) return;
      await updateRepairRequestNotes(notesRequest.id, notes);
      setRequests(prev => prev.map(r => r.id === notesRequest.id ? {...r, notes, updatedAt: new Date().toISOString()} : r));
  };
  
  const handleEdit = (request: RepairRequest) => {
    setEditingRequest(request);
  }
  
  const handleOpenNotes = (request: RepairRequest) => {
    setNotesRequest(request);
  }

  const deliveryDialogData = useMemo(() => {
    if (!confirmDelivery) return null;
    const { request } = confirmDelivery;
    const totalQuote = request.devices.reduce((acc, dev) => acc + (dev.quote || 0), 0);
    const totalDownPayment = request.devices.reduce((acc, dev) => acc + (dev.downPayment || 0), 0);
    const totalRemaining = totalQuote - totalDownPayment;
    return {
      folio: String(request.folio).padStart(4, '0'),
      clientName: request.clientName,
      totalQuote: totalQuote.toFixed(2),
      totalDownPayment: totalDownPayment.toFixed(2),
      totalRemaining: totalRemaining.toFixed(2),
    };
  }, [confirmDelivery]);

  const noRepairDialogData = useMemo(() => {
    if (!confirmNoRepairDelivery) return null;
    const { request } = confirmNoRepairDelivery;
    const totalDownPayment = request.devices.reduce((acc, dev) => acc + (dev.downPayment || 0), 0);
    const revisionFee = 80;
    const amountToCollect = Math.max(0, revisionFee - totalDownPayment);

    return {
        folio: String(request.folio).padStart(4, '0'),
        clientName: request.clientName,
        totalDownPayment: totalDownPayment.toFixed(2),
        revisionFee: revisionFee.toFixed(2),
        amountToCollect: amountToCollect.toFixed(2),
    };
  }, [confirmNoRepairDelivery]);

  return (
    <div className="space-y-6">
      <Dialog open={!!editingRequest} onOpenChange={(open) => !open && setEditingRequest(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Editar Solicitud de Reparación (Folio: {String(editingRequest?.folio).padStart(4, '0')})</DialogTitle>
          </DialogHeader>
          <RepairRequestForm
              catalog={catalog}
              updateCatalogState={updateCatalogState}
              onAddRequest={() => {}} // Not used in edit mode
              onUpdateRequest={onUpdateRequest}
              initialData={editingRequest}
              onFormClose={() => setEditingRequest(null)}
          />
        </DialogContent>
      </Dialog>
      
      {notesRequest && (
        <NotesModal 
            isOpen={!!notesRequest}
            onClose={() => setNotesRequest(null)}
            request={notesRequest}
            onSave={handleSaveNotes}
        />
      )}

      {deliveryDialogData && (
        <AlertDialog open={!!confirmDelivery} onOpenChange={() => setConfirmDelivery(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Entrega - Folio #{deliveryDialogData.folio}</AlertDialogTitle>
              <AlertDialogDescription>
                Se marcará la reparación para <strong>{deliveryDialogData.clientName}</strong> como "Entregado".
                Por favor, verifica el cobro final.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-4 text-sm space-y-2">
                <div className="flex justify-between"><span>Cotización Total:</span> <span>${deliveryDialogData.totalQuote}</span></div>
                <div className="flex justify-between"><span>Anticipo Recibido:</span> <span>${deliveryDialogData.totalDownPayment}</span></div>
                <hr className="border-dashed"/>
                <div className="flex justify-between font-bold text-lg"><span>Monto Restante a Cobrar:</span> <span className="text-green-600">${deliveryDialogData.totalRemaining}</span></div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelivery} className="bg-primary">Confirmar Entrega</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {noRepairDialogData && (
          <AlertDialog open={!!confirmNoRepairDelivery} onOpenChange={() => setConfirmNoRepairDelivery(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Entrega (Sin Reparación) - Folio #{noRepairDialogData.folio}</AlertDialogTitle>
                <AlertDialogDescription>
                  El dispositivo para <strong>{noRepairDialogData.clientName}</strong> se entregará sin reparar. ¿Deseas cobrar la tarifa de revisión?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="my-4 text-sm space-y-4">
                  <div className="space-y-2">
                    <p className="flex justify-between"><span>Tarifa de Revisión:</span> <strong>${noRepairDialogData.revisionFee}</strong></p>
                    <p className="flex justify-between"><span>Anticipo Registrado:</span> <strong>${noRepairDialogData.totalDownPayment}</strong></p>
                    <hr className="border-dashed"/>
                    <p className="flex justify-between font-bold text-lg"><span>Monto a Cobrar:</span> <span className="text-orange-600">${noRepairDialogData.amountToCollect}</span></p>
                  </div>
                  <p className="text-xs text-muted-foreground">Si el anticipo es mayor a la revisión, no se cobrará nada adicional.</p>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <Button variant="secondary" onClick={() => handleConfirmNoRepair(false)}>No Cobrar y Entregar</Button>
                <AlertDialogAction onClick={() => handleConfirmNoRepair(true)}>Cobrar ${noRepairDialogData.revisionFee} y Entregar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
      )}

      <div className="rounded-md border">
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Folio</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Teléfono</TableHead>
                <TableHead>Dispositivo(s)</TableHead>
                <TableHead className="hidden sm:table-cell w-48">Fecha</TableHead>
                <TableHead>Estatus</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
                {requests.length > 0 ? (
                  requests.map((request) => (
                    <RepairRow 
                      key={request.id}
                      request={request}
                      catalog={catalog}
                      onStatusChange={promptForConfirmation}
                      onEdit={handleEdit}
                      onPrint={onPrintRequest}
                      onOpenNotes={handleOpenNotes}
                    />
                  ))
                ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground h-24">
                        No hay solicitudes de reparación registradas.
                      </TableCell>
                    </TableRow>
                )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
