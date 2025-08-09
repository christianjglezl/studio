
'use client';

import React, { useState, useMemo } from 'react';
import type { RepairRequest, RepairStatus } from '@/lib/types';
import { repairStatuses } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO } from 'date-fns';
import { DollarSign, HardDrive, Wrench } from 'lucide-react';

interface DashboardProps {
    requests: RepairRequest[];
}

type TimePeriod = 'weekly' | 'monthly' | 'annually';

const statusColors: { [key in RepairStatus]: string } = {
  Ingresado: '#3b82f6', // blue-500
  'En Revisión': '#f59e0b', // yellow-500
  'En Reparación': '#f97316', // orange-500
  Reparado: '#8b5cf6', // purple-500
  'Listo para Entrega': '#6ee7b7', // emerald-300 (mint)
  Entregado: '#22c55e', // green-500
  Cancelado: '#ef4444', // red-500
};

export const Dashboard: React.FC<DashboardProps> = ({ requests }) => {
    const [timePeriod, setTimePeriod] = useState<TimePeriod>('monthly');

    const filteredRequests = useMemo(() => {
        const now = new Date();
        let interval: Interval;

        switch (timePeriod) {
            case 'weekly':
                interval = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
                break;
            case 'monthly':
                interval = { start: startOfMonth(now), end: endOfMonth(now) };
                break;
            case 'annually':
                interval = { start: startOfYear(now), end: endOfYear(now) };
                break;
        }

        return requests.filter(req => isWithinInterval(parseISO(req.createdAt), interval));
    }, [requests, timePeriod]);

    const stats = useMemo(() => {
        const totalRequests = filteredRequests.length;
        
        const totalIncome = filteredRequests
            .filter(req => req.status === 'Entregado')
            .reduce((sum, req) => sum + req.devices.reduce((deviceSum, dev) => deviceSum + (dev.quote || 0), 0), 0);

        const totalDownPayments = filteredRequests
            .reduce((sum, req) => sum + req.devices.reduce((deviceSum, dev) => deviceSum + (dev.downPayment || 0), 0), 0);
        
        const statusCounts: { [key in RepairStatus]: number } = {
            Ingresado: 0,
            'En Revisión': 0,
            'En Reparación': 0,
            Reparado: 0,
            'Listo para Entrega': 0,
            Entregado: 0,
            Cancelado: 0,
        };

        filteredRequests.forEach(req => {
            if (statusCounts.hasOwnProperty(req.status)) {
                statusCounts[req.status]++;
            }
        });
        
        const chartData = repairStatuses
            .map(status => ({
                name: status,
                value: statusCounts[status],
                fill: statusColors[status],
            }))
            .filter(item => item.value > 0);


        return { totalRequests, totalIncome, totalDownPayments, chartData };
    }, [filteredRequests]);
    
    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, ...props }: any) => {
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
                <h2 className="text-2xl font-bold font-headline">Dashboard</h2>
                <Select value={timePeriod} onValueChange={(value: TimePeriod) => setTimePeriod(value)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Seleccionar Periodo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="weekly">Semana Actual</SelectItem>
                        <SelectItem value="monthly">Mes Actual</SelectItem>
                        <SelectItem value="annually">Año Actual</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Reparaciones Totales</CardTitle>
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalRequests}</div>
                        <p className="text-xs text-muted-foreground">En el periodo seleccionado</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ingresos (Completados)</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${stats.totalIncome.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">De reparaciones entregadas</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Anticipos Recibidos</CardTitle>
                         <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${stats.totalDownPayments.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">En el periodo seleccionado</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Estatus de Reparaciones</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                        <PieChart>
                             <Pie
                                data={stats.chartData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={renderCustomizedLabel}
                                outerRadius={120}
                                dataKey="value"
                                nameKey="name"
                            >
                                {stats.chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.fill} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--background))',
                                    borderColor: 'hsl(var(--border))',
                                    borderRadius: 'var(--radius)',
                                }}
                            />
                            <Legend
                                iconSize={10}
                                layout="horizontal"
                                verticalAlign="bottom"
                                align="center"
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
};
