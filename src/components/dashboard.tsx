
'use client';

import React from 'react';
import type { RepairRequest, RepairStatus, Service } from '@/lib/types';
import { repairStatuses } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, DollarSign, Wrench } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { addDays, format, isWithinInterval, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';

interface DashboardProps {
    requests: RepairRequest[];
    catalog: { services: Service[] };
}

const statusColors: { [key in RepairStatus]: string } = {
  Ingresado: '#3b82f6',
  'En Revisión': '#f59e0b',
  'En Reparación': '#f97316',
  Reparado: '#8b5cf6',
  'Listo para Entrega': '#6ee7b7',
  Entregado: '#22c55e',
  Cancelado: '#ef4444',
};

const serviceChartColors = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e'
];


export const Dashboard: React.FC<DashboardProps> = ({ requests, catalog }) => {
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
        from: startOfWeek(new Date(), { weekStartsOn: 1 }),
        to: endOfWeek(new Date(), { weekStartsOn: 1 }),
    });

    const stats = React.useMemo(() => {
        const interval = dateRange?.from && dateRange?.to 
            ? { start: dateRange.from, end: dateRange.to } 
            : null;
            
        if (!interval) {
             return { totalRequests: 0, totalIncome: 0, statusChartData: [], serviceChartData: [] };
        }

        const requestsInDateRange = requests.filter(req => isWithinInterval(parseISO(req.createdAt), interval));
        
        // Calculate income based on cash flow within the date range
        const incomeFromNewRequests = requests
            .filter(req => isWithinInterval(parseISO(req.createdAt), interval))
            .reduce((sum, req) => sum + req.devices.reduce((deviceSum, dev) => deviceSum + (dev.downPayment || 0), 0), 0);

        const incomeFromDelivered = requests
            .filter(req => req.status === 'Entregado' && req.deliveryDate && isWithinInterval(parseISO(req.deliveryDate), interval))
            .reduce((sum, req) => sum + req.devices.reduce((deviceSum, dev) => deviceSum + ((dev.quote || 0) - (dev.downPayment || 0)), 0), 0);
        
        const totalIncome = incomeFromNewRequests + incomeFromDelivered;
        
        // Status chart data
        const statusCounts: { [key in RepairStatus]: number } = { ...repairStatuses.reduce((acc, s) => ({...acc, [s]: 0}), {} as any) };
        requestsInDateRange.forEach(req => {
            if (statusCounts.hasOwnProperty(req.status)) {
                statusCounts[req.status]++;
            }
        });
        const statusChartData = repairStatuses
            .map(status => ({
                name: status,
                value: statusCounts[status],
                fill: statusColors[status],
            }))
            .filter(item => item.value > 0);
            
        // Service chart data
        const serviceCounts: { [key: string]: number } = {};
        requestsInDateRange
            .filter(req => req.status !== 'Listo para Entrega' && req.status !== 'Entregado' && req.status !== 'Cancelado')
            .forEach(req => {
                req.devices.forEach(dev => {
                    dev.serviceIds.forEach(serviceId => {
                        serviceCounts[serviceId] = (serviceCounts[serviceId] || 0) + 1;
                    })
                })
            });

        const serviceChartData = Object.entries(serviceCounts)
            .map(([serviceId, count], index) => {
                const service = catalog.services.find(s => s.id === serviceId);
                return {
                    name: service?.name || 'Desconocido',
                    value: count,
                    fill: serviceChartColors[index % serviceChartColors.length]
                }
            })
            .filter(item => item.value > 0)
            .sort((a,b) => b.value - a.value);


        return { 
            totalRequests: requestsInDateRange.length, 
            totalIncome, 
            statusChartData,
            serviceChartData
        };
    }, [requests, dateRange, catalog.services]);
    
    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        if (percent === 0) return null;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight="bold">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold font-headline">Rendimiento del Taller</h2>
                <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={"outline"}
                        className="w-[300px] justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "LLL dd, y", { locale: es })} -{" "}
                              {format(dateRange.to, "LLL dd, y", { locale: es })}
                            </>
                          ) : (
                            format(dateRange.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Selecciona un rango</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                        locale={es}
                      />
                    </PopoverContent>
                </Popover>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Reparaciones en Periodo</CardTitle>
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalRequests}</div>
                        <p className="text-xs text-muted-foreground">Ingresadas en el periodo seleccionado</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ingresos Totales (Flujo)</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${stats.totalIncome.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Anticipos y liquidaciones en el periodo</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader><CardTitle className="font-headline">Estatus de Reparaciones</CardTitle></CardHeader>
                    <CardContent>
                         {stats.totalRequests > 0 ? (
                            <ResponsiveContainer width="100%" height={350}>
                                <PieChart>
                                    <Pie data={stats.statusChartData} cx="50%" cy="50%" labelLine={false} label={renderCustomizedLabel} outerRadius={120} dataKey="value" nameKey="name">
                                        {stats.statusChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.fill} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }} />
                                    <Legend iconSize={10} layout="horizontal" verticalAlign="bottom" align="center" />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex justify-center items-center h-[350px]"><p className="text-muted-foreground">No hay datos de reparaciones para el periodo.</p></div>
                        )}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle className="font-headline">Servicios Pendientes</CardTitle></CardHeader>
                    <CardContent>
                         {stats.serviceChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={350}>
                                <PieChart>
                                    <Pie data={stats.serviceChartData} cx="50%" cy="50%" labelLine={false} label={renderCustomizedLabel} outerRadius={120} dataKey="value" nameKey="name">
                                        {stats.serviceChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.fill} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }} />
                                    <Legend iconSize={10} layout="horizontal" verticalAlign="bottom" align="center" />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex justify-center items-center h-[350px]"><p className="text-muted-foreground">No se hay servicios pendientes en este periodo.</p></div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
