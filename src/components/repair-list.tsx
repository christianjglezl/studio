'use client';

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { RepairRequest, RepairStatus, Brand, Model, Color } from '@/lib/types';
import { repairStatuses } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface RepairListProps {
  requests: RepairRequest[];
  setRequests: React.Dispatch<React.SetStateAction<RepairRequest[]>>;
  brands: Brand[];
  models: Model[];
  colors: Color[];
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

export function RepairList({ requests, setRequests, brands, models, colors }: RepairListProps) {

  const handleStatusChange = (requestId: string, newStatus: RepairStatus) => {
    setRequests(prevRequests =>
      prevRequests.map(req =>
        req.id === requestId ? { ...req, status: newStatus } : req
      )
    );
  };
  
  const getEntityName = <T extends { id: string; name: string }>(id: string, entities: T[]): string => {
    return entities.find(e => e.id === id)?.name || 'N/A';
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Folio</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Dispositivo</TableHead>
            <TableHead>Fecha de Ingreso</TableHead>
            <TableHead>Cotización</TableHead>
            <TableHead>Estatus</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.length > 0 ? (
            requests.map(request => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">{String(request.folio).padStart(4, '0')}</TableCell>
                <TableCell>{request.clientName}</TableCell>
                <TableCell>{getEntityName(request.brandId, brands)} {getEntityName(request.modelId, models)} ({getEntityName(request.colorId, colors)})</TableCell>
                <TableCell>{format(new Date(request.createdAt), 'PPpp', { locale: es })}</TableCell>
                <TableCell>${(request.quote || 0).toFixed(2)}</TableCell>
                <TableCell>
                  <Select
                    value={request.status}
                    onValueChange={(newStatus: RepairStatus) => handleStatusChange(request.id, newStatus)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <Badge className={cn('mr-2', statusColors[request.status])}>•</Badge>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {repairStatuses.map(status => (
                        <SelectItem key={status} value={status}>
                           <Badge className={cn('mr-2', statusColors[status])}>•</Badge>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                No hay solicitudes de reparación registradas.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
