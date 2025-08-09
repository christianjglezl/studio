
'use client';

import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { RepairRequest, RepairStatus, Model, CatalogData, DeviceInRequest } from '@/lib/types';
import { repairStatuses } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ChevronDown, Pencil, Printer, Smartphone } from 'lucide-react';
import { RepairRequestForm } from './repair-request-form';
import { updateRepairRequest } from '@/services/firestore';
import { useToast } from '@/hooks/use-toast';
import { Dashboard } from './dashboard';
import { Separator } from './ui/separator';

interface RepairListProps {
  requests: RepairRequest[];
  setRequests: React.Dispatch<React.SetStateAction<RepairRequest[]>>;
  catalog: CatalogData;
  setModels: React.Dispatch<React.SetStateAction<Model[]>>;
  onPrintRequest: (request: RepairRequest) => void;
  onUpdateRequest: (id: string, data: Omit<RepairRequest, 'id' | 'status' | 'folio' | 'createdAt'>) => Promise<void>;
}

const statusColors: { [key in RepairStatus]: string } = {
  Ingresado: 'bg-blue-500',
  'En Revisión': 'bg-yellow-500',
  'En Reparación': 'bg-orange-500',
  Reparado: 'bg-purple-500',
  'Listo para Entrega': 'bg-emerald-400', // Mint color
  Entregado: 'bg-green-500',
  Cancelado: 'bg-red-500',
};

const getEntityName = <T extends { id: string; name: string }>(id: string, entities: T[]): string => {
  return entities.find(e => e.id === id)?.name || 'N/A';
};

const getEntityNames = <T extends { id: string; name: string }>(ids: string[] = [], entities: T[]): string => {
    if (!ids || ids.length === 0) return 'Ninguno';
    return ids.map(id => getEntityName(id, entities)).join(', ');
};

const DeviceDetails = ({ device, catalog }: { device: DeviceInRequest; catalog: CatalogData }) => {
  const { models, colors, accessories, conditions, services } = catalog;
  const remaining = (device.quote || 0) - (device.downPayment || 0);
  
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

const RepairRow = ({ 
  request,
  device,
  deviceIndex,
  totalDevices,
  catalog,
  onStatusChange, onEdit, onPrint
}: {
  request: RepairRequest;
  device: DeviceInRequest;
  deviceIndex: number;
  totalDevices: number;
  catalog: CatalogData;
  onStatusChange: (requestId: string, newStatus: RepairStatus) => void;
  onEdit: (request: RepairRequest) => void;
  onPrint: (request: RepairRequest) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { brands, models } = catalog;

  const deviceDescription = `${getEntityName(device.brandId, brands)} ${getEntityName(device.modelId, models)}`;
  const deviceCountIndicator = totalDevices > 1 ? ` (${deviceIndex + 1} de ${totalDevices})` : '';

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
        <TableCell>{request.phoneNumbers[0]?.value || 'N/A'}</TableCell>
        <TableCell>{deviceDescription}{deviceCountIndicator}</TableCell>
        <TableCell>{format(new Date(request.createdAt), 'PPp', { locale: es })}</TableCell>
        <TableCell>
          <Select
            value={request.status}
            onValueChange={(newStatus: RepairStatus) => onStatusChange(request.id, newStatus)}
          >
            <SelectTrigger className="w-[180px]">
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
           <Button variant="ghost" size="icon" onClick={() => onEdit(request)}>
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Editar</span>
           </Button>
           <Button variant="ghost" size="icon" onClick={() => onPrint({...request, devices: [device] })}>
              <Printer className="h-4 w-4" />
              <span className="sr-only">Imprimir Ticket</span>
           </Button>
        </TableCell>
      </TableRow>
      {isOpen && (
          <TableRow className="bg-muted/50">
              <TableCell colSpan={8} className="p-4 space-y-4">
                <DeviceDetails device={device} catalog={catalog} />
              </TableCell>
          </TableRow>
      )}
    </>
  );
};


export function RepairList({ 
  requests, setRequests, catalog, setModels, onPrintRequest, onUpdateRequest
}: RepairListProps) {
  const [editingRequest, setEditingRequest] = useState<RepairRequest | null>(null);
  const { toast } = useToast();
  
  const handleStatusChange = async (requestId: string, newStatus: RepairStatus) => {
    try {
      await updateRepairRequest(requestId, { status: newStatus });
      setRequests(prevRequests =>
        prevRequests.map(req =>
          req.id === requestId ? { ...req, status: newStatus } : req
        )
      );
      toast({
        title: "Estatus Actualizado",
        description: `El estatus del folio #${String(requests.find(r=>r.id===requestId)?.folio).padStart(4, '0')} ha sido cambiado a "${newStatus}".`,
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
  
  const handleEdit = (request: RepairRequest) => {
    setEditingRequest(request);
  }
  
  const allDevices = requests.flatMap(req => 
      req.devices.map((dev, index) => ({
          request: req,
          device: dev,
          deviceIndex: index,
          totalDevices: req.devices.length,
      }))
  );


  return (
    <div className="space-y-6">
      <Dashboard requests={requests} />
      <Separator />
      <div className="rounded-md border">
        <Dialog open={!!editingRequest} onOpenChange={(open) => !open && setEditingRequest(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Solicitud de Reparación (Folio: {String(editingRequest?.folio).padStart(4, '0')})</DialogTitle>
            </DialogHeader>
            <RepairRequestForm
                brands={catalog.brands}
                models={catalog.models}
                setModels={setModels}
                colors={catalog.colors}
                accessories={catalog.accessories}
                conditions={catalog.conditions}
                services={catalog.services}
                onAddRequest={() => {}} // Not used in edit mode
                onUpdateRequest={onUpdateRequest}
                initialData={editingRequest}
                onFormClose={() => setEditingRequest(null)}
            />
          </DialogContent>
        </Dialog>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Folio</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Dispositivo(s)</TableHead>
              <TableHead>Fecha de Ingreso</TableHead>
              <TableHead>Estatus</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          
          <TableBody>
              {allDevices.length > 0 ? (
                allDevices.map(({ request, device, deviceIndex, totalDevices }) => (
                  <RepairRow 
                    key={device.id}
                    request={request}
                    device={device}
                    deviceIndex={deviceIndex}
                    totalDevices={totalDevices}
                    catalog={catalog}
                    onStatusChange={handleStatusChange}
                    onEdit={handleEdit}
                    onPrint={onPrintRequest}
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
  );
}
