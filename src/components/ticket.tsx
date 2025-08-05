'use client';

import React from 'react';
import type { RepairRequest, CatalogData } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TicketProps {
  request: RepairRequest;
  catalog: CatalogData;
}

const getEntityName = <T extends { id: string; name: string }>(id: string, entities: T[]): string => {
  return entities.find(e => e.id === id)?.name || 'N/A';
};

const getEntityNames = <T extends { id: string; name: string }>(ids: string[] = [], entities: T[]): string => {
  if (!ids || ids.length === 0) return 'Ninguno';
  return ids.map(id => getEntityName(id, entities)).join(', ');
};

export const Ticket = ({ request, catalog }: TicketProps) => {
  const { brands, models, colors, accessories, conditions, services } = catalog;
  const remaining = (request.quote || 0) - (request.downPayment || 0);

  return (
    <div className="p-1 font-mono print-container" style={{ width: '58mm', fontSize: '8px', lineHeight: '1.4' }}>
      <style type="text/css" media="print">
        {`
          @page { size: 58mm auto; margin: 2mm; }
          body { margin: 0; }
        `}
      </style>
      <div className="text-center">
        <h1 className="text-lg font-bold">EasyTech</h1>
        <p>Comprobante de Servicio</p>
      </div>

      <hr className="my-2 border-dashed border-black" />
      
      <div className="flex justify-between">
        <span>Folio: <strong>{String(request.folio).padStart(4, '0')}</strong></span>
        <span>{format(new Date(request.createdAt), 'dd/MM/yy HH:mm', { locale: es })}</span>
      </div>

      <hr className="my-2 border-dashed border-black" />
      
      <p><strong>Cliente:</strong> {request.clientName}</p>
      <p><strong>Teléfono:</strong> {request.phoneNumbers.map(p => p.value).join(', ')}</p>

      <hr className="my-2 border-dashed border-black" />

      <h2 className="text-center font-bold">Dispositivo</h2>
      <p><strong>Modelo:</strong> {getEntityName(request.brandId, brands)} {getEntityName(request.modelId, models)}</p>
      <p><strong>Color:</strong> {getEntityName(request.colorId, colors)}</p>
      <p><strong>IMEI:</strong> {request.imei || 'No provisto'}</p>
      
      <hr className="my-2 border-dashed border-black" />

      <h2 className="text-center font-bold">Detalles del Servicio</h2>
      <p><strong>Falla Reportada:</strong> {request.problem || 'No especificado'}</p>
      <p><strong>Servicios a Realizar:</strong> {getEntityNames(request.serviceIds, services)}</p>
      <p><strong>Condiciones:</strong> {getEntityNames(request.conditions, conditions)}</p>
      <p><strong>Accesorios:</strong> {getEntityNames(request.accessories, accessories)}</p>
      {request.password && <p><strong>PIN/Pass:</strong> {request.password}</p>}
      
      <hr className="my-2 border-dashed border-black" />

      <h2 className="text-center font-bold">Cotización</h2>
      <div className="flex justify-between">
        <span>Cotización:</span>
        <span>${request.quote?.toFixed(2) || '0.00'}</span>
      </div>
      <div className="flex justify-between">
        <span>Anticipo:</span>
        <span>${request.downPayment?.toFixed(2) || '0.00'}</span>
      </div>
      <div className="flex justify-between font-bold text-lg">
        <span>Restante:</span>
        <span>${remaining.toFixed(2)}</span>
      </div>
      
      <hr className="my-2 border-dashed border-black" />
      
      <div className="text-xs text-center space-y-1 mt-3">
        <p><strong>Términos y Condiciones:</strong></p>
        <p>1. No nos hacemos responsables por equipos olvidados después de 30 días.</p>
        <p>2. La garantía en reparaciones es de 30 días y aplica solo sobre la pieza reparada/reemplazada.</p>
        <p>3. No hay garantía en equipos mojados, con problemas de software o traídos por terceros.</p>
        <p>4. Es indispensable presentar este ticket para recoger su equipo.</p>
      </div>

      <div className="mt-4 text-center">
        <p>¡Gracias por su preferencia!</p>
      </div>
    </div>
  );
};

Ticket.displayName = 'Ticket';
