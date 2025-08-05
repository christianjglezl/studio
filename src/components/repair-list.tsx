'use client';

import React, { useState, useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
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
import type { RepairRequest, RepairStatus, Brand, Model, Color, Accessory, Condition, Service, CatalogData } from '@/lib/types';
import { repairStatuses } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ChevronDown, Pencil, Printer } from 'lucide-react';
import { RepairRequestForm } from './repair-request-form';
import { Ticket } from './ticket';

interface RepairListProps extends CatalogData {
  requests: RepairRequest[];
  setRequests: React.Dispatch<React.SetStateAction<RepairRequest[]>>;
  setModels: React.Dispatch<React.SetStateAction<Model[]>>;
  requestToPrint: RepairRequest | null;
  clearRequestToPrint: () => void;
}

const statusColors: { [key in RepairStatus]: string } = {
  Ingresado: 'bg-blue-500',
  'En Revisión': 'bg-yellow-500',
  'En Reparación': 'bg-orange-500',
  Reparado: 'bg-purple-500',
  'Listo para Entrega': 'bg-green-500',
  Entregado: 'bg-gray-700',
  Cancelado: 'bg-red-500',
};

const getEntityName = <T extends { id: string; name: string }>(id: string, entities: T[]): string => {
  return entities.find(e => e.id === id)?.name || 'N/A';
};

const getEntityNames = <T extends { id: string; name: string }>(ids: string[] = [], entities: T[]): string => {
    if (!ids || ids.length === 0) return 'Ninguno';
    return ids.map(id => getEntityName(id, entities)).join(', ');
};

const RepairRow = ({ 
  request, 
  catalog,
  onStatusChange, onEdit, onPrint
}: {
  request: RepairRequest;
  catalog: CatalogData;
  onStatusChange: (requestId: string, newStatus: RepairStatus) => void;
  onEdit: (request: RepairRequest) => void;
  onPrint: (request: RepairRequest) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const remaining = (request.quote || 0) - (request.downPayment || 0);
  const { brands, models, colors, accessories, conditions, services } = catalog;

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
        <TableCell>{getEntityName(request.brandId, brands)} {getEntityName(request.modelId, models)} ({getEntityName(request.colorId, colors)})</TableCell>
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
           <Button variant="ghost" size="icon" onClick={() => onPrint(request)}>
              <Printer className="h-4 w-4" />
              <span className="sr-only">Imprimir Ticket</span>
           </Button>
        </TableCell>
      </TableRow>
      {isOpen && (
          <TableRow className="bg-muted/50">
              <TableCell colSpan={8} className="p-0">
                <div className="p-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader><CardTitle className="text-base font-headline">Falla y Servicios</CardTitle></CardHeader>
                      <CardContent className="text-sm space-y-2">
                        <p><strong>Problema:</strong> {request.problem || 'No especificado'}</p>
                        <p><strong>Descripción:</strong> {request.problemDescription || 'Ninguna'}</p>
                        <p><strong>Servicios:</strong> {getEntityNames(request.serviceIds, services)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader><CardTitle className="text-base font-headline">Condición y Accesorios</CardTitle></CardHeader>
                      <CardContent className="text-sm space-y-2">
                        <p><strong>Condiciones:</strong> {getEntityNames(request.conditions, conditions)}</p>
                        <p><strong>Accesorios:</strong> {getEntityNames(request.accessories, accessories)}</p>
                        <p><strong>Notas:</strong> {request.notes || 'Ninguna'}</p>
                      </CardContent>
                    </Card>
                     <Card>
                      <CardHeader><CardTitle className="text-base font-headline">Seguridad</CardTitle></CardHeader>
                      <CardContent className="text-sm space-y-2">
                        <p><strong>IMEI:</strong> {request.imei || 'No provisto'}</p>
                        <p><strong>Contraseña/PIN:</strong> {request.password || 'No provisto'}</p>
                        <p><strong>Patrón:</strong> {request.pattern && request.pattern.length > 0 ? request.pattern.join(' - ') : 'No provisto'}</p>
                      </CardContent>
                    </Card>
                     <Card>
                      <CardHeader><CardTitle className="text-base font-headline">Cotización</CardTitle></CardHeader>
                      <CardContent className="text-sm space-y-2">
                        <p><strong>Cotización:</strong> ${request.quote?.toFixed(2) || '0.00'}</p>
                        <p><strong>Anticipo:</strong> ${request.downPayment?.toFixed(2) || '0.00'}</p>
                        <p><strong>Restante:</strong> <span className="font-bold">${remaining.toFixed(2)}</span></p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TableCell>
          </TableRow>
      )}
    </>
  );
};


export function RepairList({ 
  requests, setRequests, brands, models, setModels, colors, accessories, conditions, services,
  requestToPrint, clearRequestToPrint
}: RepairListProps) {
  const [editingRequest, setEditingRequest] = useState<RepairRequest | null>(null);
  
  const catalog: CatalogData = { brands, models, colors, accessories, conditions, services };

  const handlePrint = (request: RepairRequest) => {
    const ticketHtml = renderToStaticMarkup(<Ticket request={request} catalog={catalog} />);
    
    const printWindow = window.open('', '_blank', 'height=500,width=500,scrollbars=yes');

    if (printWindow) {
      printWindow.document.write('<html><head><title>Ticket de Reparación</title>');
      printWindow.document.write('</head><body>');
      printWindow.document.write(ticketHtml);
      printWindow.document.write('</body></html>');
      
      printWindow.document.close();
      
      // Wait for content to load before printing
      printWindow.onload = () => {
        printWindow.focus(); 
        printWindow.print();
        printWindow.close();
      };
    } else {
      alert('Por favor, habilita las ventanas emergentes para imprimir el ticket.');
    }
  };

  useEffect(() => {
    if (requestToPrint) {
      handlePrint(requestToPrint);
      clearRequestToPrint(); // Clear the request to prevent re-printing on re-renders
    }
  }, [requestToPrint, clearRequestToPrint]); // Dependency array ensures this runs only when a new request is ready to be printed

  const handleStatusChange = (requestId: string, newStatus: RepairStatus) => {
    setRequests(prevRequests =>
      prevRequests.map(req =>
        req.id === requestId ? { ...req, status: newStatus } : req
      )
    );
  };
  
  const handleEdit = (request: RepairRequest) => {
    setEditingRequest(request);
  }

  const handleUpdate = (id: string, data: Omit<RepairRequest, 'id' | 'status' | 'folio'>) => {
    setRequests(prev => prev.map(req => req.id === id ? { ...req, ...data } : req));
  }

  return (
    <div className="rounded-md border">
      <Dialog open={!!editingRequest} onOpenChange={(open) => !open && setEditingRequest(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Solicitud de Reparación (Folio: {String(editingRequest?.folio).padStart(4, '0')})</DialogTitle>
          </DialogHeader>
          <RepairRequestForm
              brands={brands}
              models={models}
              setModels={setModels}
              colors={colors}
              accessories={accessories}
              conditions={conditions}
              services={services}
              onAddRequest={() => {}} // Not used in edit mode
              onUpdateRequest={handleUpdate}
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
            <TableHead>Dispositivo</TableHead>
            <TableHead>Fecha de Ingreso</TableHead>
            <TableHead>Estatus</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        
        <TableBody>
            {requests.length > 0 ? (
              requests.map(request => (
                <RepairRow 
                  key={request.id}
                  request={request}
                  catalog={catalog}
                  onStatusChange={handleStatusChange}
                  onEdit={handleEdit}
                  onPrint={handlePrint}
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
  );
}
