
'use client';

import React from 'react';
import type { RepairRequest, CatalogData, DeviceInRequest } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TicketProps {
  request: RepairRequest;
  catalog: CatalogData;
}

const LOGO_URL = "https://firebasestorage.googleapis.com/v0/b/techcheck-x5724.firebasestorage.app/o/logoEasy.png?alt=media&token=0fbd7512-4ec8-4b6d-9191-4fad7f472c3e";

const getEntityName = <T extends { id: string; name: string }>(id: string, entities: T[]): string => {
  return entities.find(e => e.id === id)?.name || 'N/A';
};

const getEntityNames = <T extends { id: string; name: string }>(ids: string[] = [], entities: T[]): string => {
  if (!ids || ids.length === 0) return 'Ninguno';
  return ids.map(id => getEntityName(id, entities)).join(', ');
};

const DeviceTicketSection = ({ device, catalog, index, totalDevices }: { device: DeviceInRequest; catalog: CatalogData; index: number, totalDevices: number }) => {
  const { brands, models, colors, accessories, conditions, services } = catalog;
  const remaining = (device.quote || 0) - (device.downPayment || 0);

  return (
    <div className='py-2'>
      <h2 className="text-center font-bold text-base">Dispositivo #{index + 1} de {totalDevices}</h2>
      <p><strong>Modelo:</strong> {getEntityName(device.brandId, brands)} {getEntityName(device.modelId, models)}</p>
      <p><strong>Color:</strong> {getEntityName(device.colorId, colors)}</p>
      <p><strong>IMEI:</strong> {device.imei || 'No provisto'}</p>
      
      <hr className="my-1 border-dashed border-black" />

      <h3 className="text-center font-bold">Detalles del Servicio</h3>
      <p><strong>Falla Reportada:</strong> {device.problem || 'No especificado'}</p>
      <p><strong>Servicios a Realizar:</strong> {getEntityNames(device.serviceIds, services)}</p>
      <p><strong>Condiciones:</strong> {getEntityNames(device.conditions, conditions)}</p>
      <p><strong>Accesorios:</strong> {getEntityNames(device.accessories, accessories)}</p>
      {device.password && <p><strong>PIN/Pass:</strong> {device.password}</p>}
      
      <hr className="my-1 border-dashed border-black" />

      <h3 className="text-center font-bold">Cotización (Dispositivo)</h3>
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
    </div>
  )
}


export const Ticket = ({ request, catalog }: TicketProps) => {

  const totalQuote = request.devices.reduce((acc, dev) => acc + (dev.quote || 0), 0);
  const totalDownPayment = request.devices.reduce((acc, dev) => acc + (dev.downPayment || 0), 0);
  const totalRemaining = totalQuote - totalDownPayment;
  const showTotals = request.devices.length > 1;

  return (
    <div className="p-1 font-mono" style={{ width: '58mm', fontSize: '12px', lineHeight: '1.5' }}>
       <style type="text/css" media="print">
        {`
          @page { size: 58mm auto; margin: 0; }
          body { margin: 0; }
        `}
      </style>
      <div className="text-center">
        {/* Using a standard <img> tag for better print compatibility */}
        <img src={LOGO_URL} alt="Easy Tech Logo" style={{ width: '60px', height: '60px', display: 'inline-block', marginBottom: '4px' }} />
        <h1 className="text-xl font-bold">Easy Tech</h1>
        <p>Comprobante de Servicio</p>
        <p>Tel: 4922153353</p>
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
        <React.Fragment key={device.id || index}>
          <DeviceTicketSection device={device} catalog={catalog} index={index} totalDevices={request.devices.length}/>
          {/* Add a separator after each device except the last one */}
          {index < request.devices.length - 1 && <hr className="my-2 border-solid border-black" />}
        </React.Fragment>
      ))}
      
      {showTotals && (
        <>
          <hr className="my-2 border-solid border-black" />
          <h2 className="text-center font-bold text-lg">Totales Globales</h2>
          <div className="flex justify-between text-sm">
            <span>Cotización Total:</span>
            <span>${totalQuote.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Anticipo Total:</span>
            <span>${totalDownPayment.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-xl">
            <span>Restante Total:</span>
            <span>${totalRemaining.toFixed(2)}</span>
          </div>
        </>
      )}

      <hr className="my-2 border-dashed border-black" />
      
      <div className="text-xs text-center space-y-1 mt-3">
        <p><strong>Términos y Condiciones:</strong></p>
        {catalog.terms.map(term => (
          <p key={term.id}>{term.text}</p>
        ))}
      </div>

      <div className="mt-4 text-center">
        <p>¡Gracias por su preferencia!</p>
      </div>

      <hr className="my-2 border-dashed border-black" />
      
      {/* This empty div will force the printer to feed some blank paper */}
      <div style={{ height: '20px' }}></div>
    </div>
  );
};

Ticket.displayName = 'Ticket';
