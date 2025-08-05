'use client';

import React from 'react';
import type { RepairRequest, CatalogData, DeviceInRequest } from '@/lib/types';
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

const DeviceTicketSection = ({ device, catalog, index }: { device: DeviceInRequest; catalog: CatalogData; index: number }) => {
  const { brands, models, colors, accessories, conditions, services } = catalog;
  const remaining = (device.quote || 0) - (device.downPayment || 0);

  return (
    <>
      <h2 className="text-center font-bold">Dispositivo #{index + 1}</h2>
      <p><strong>Modelo:</strong> {getEntityName(device.brandId, brands)} {getEntityName(device.modelId, models)}</p>
      <p><strong>Color:</strong> {getEntityName(device.colorId, colors)}</p>
      <p><strong>IMEI:</strong> {device.imei || 'No provisto'}</p>
      
      <hr className="my-1 border-dashed border-black" />

      <h3 className="text-center font-bold text-xs">Detalles del Servicio</h3>
      <p><strong>Falla Reportada:</strong> {device.problem || 'No especificado'}</p>
      <p><strong>Servicios a Realizar:</strong> {getEntityNames(device.serviceIds, services)}</p>
      <p><strong>Condiciones:</strong> {getEntityNames(device.conditions, conditions)}</p>
      <p><strong>Accesorios:</strong> {getEntityNames(device.accessories, accessories)}</p>
      {device.password && <p><strong>PIN/Pass:</strong> {device.password}</p>}
      
      <hr className="my-1 border-dashed border-black" />

      <h3 className="text-center font-bold text-xs">Cotización</h3>
      <div className="flex justify-between">
        <span>Cotización:</span>
        <span>${device.quote?.toFixed(2) || '0.00'}</span>
      </div>
      <div className="flex justify-between">
        <span>Anticipo:</span>
        <span>${device.downPayment?.toFixed(2) || '0.00'}</span>
      </div>
      <div className="flex justify-between font-bold">
        <span>Restante:</span>
        <span>${remaining.toFixed(2)}</span>
      </div>

      {/* Add a separator after each device except the last one */}
      <hr className="my-2 border-solid border-black" />
    </>
  )
}


export const Ticket = ({ request, catalog }: TicketProps) => {

  const totalQuote = request.devices.reduce((acc, dev) => acc + (dev.quote || 0), 0);
  const totalDownPayment = request.devices.reduce((acc, dev) => acc + (dev.downPayment || 0), 0);
  const totalRemaining = totalQuote - totalDownPayment;

  return (
    <div className="p-1 font-mono" style={{ width: '58mm', fontSize: '8px', lineHeight: '1.4' }}>
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

      <hr className="my-2 border-solid border-black" />

      {request.devices.map((device, index) => (
        <DeviceTicketSection key={device.id || index} device={device} catalog={catalog} index={index} />
      ))}
      
      <h2 className="text-center font-bold">Totales Globales</h2>
       <div className="flex justify-between text-xs">
        <span>Cotización Total:</span>
        <span>${totalQuote.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span>Anticipo Total:</span>
        <span>${totalDownPayment.toFixed(2)}</span>
      </div>
      <div className="flex justify-between font-bold text-lg">
        <span>Restante Total:</span>
        <span>${totalRemaining.toFixed(2)}</span>
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
