
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray, useFormContext, FormProvider } from 'react-hook-form';
import * as z from 'zod';
import { PlusCircle, Trash2, Calendar as CalendarIcon, Clock, DollarSign, Smartphone, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PatternLock } from '@/components/pattern-lock';
import type { Brand, Model, Color, Accessory, Condition, RepairRequest, Service, DeviceInRequest, CatalogData } from '@/lib/types';
import { useEffect, useState, useMemo } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { addItem } from '@/services/firestore';


const deviceSchema = z.object({
  id: z.string().optional(),
  brandId: z.string().min(1, { message: 'Por favor, selecciona una marca.' }),
  modelId: z.string().min(1, { message: 'Por favor, selecciona un modelo.' }),
  colorId: z.string().min(1, { message: 'Por favor, selecciona un color.' }),
  imei: z.string().optional(),
  problem: z.string().optional(),
  problemDescription: z.string().optional(),
  serviceIds: z.array(z.string()).min(1, { message: 'Debes seleccionar al menos un servicio.' }),
  serviceCosts: z.array(z.object({
    serviceId: z.string(),
    cost: z.preprocess(
        (val) => (val === "" || val === undefined ? 0 : parseFloat(String(val))),
        z.number({invalid_type_error: "El costo debe ser un número."}).nonnegative({ message: 'El costo no puede ser negativo.' }).optional().default(0)
    ),
  })).optional(),
  accessories: z.array(z.string()).optional(),
  conditions: z.array(z.string()).min(1, { message: 'Debes seleccionar al menos una condición.' }),
  password: z.string().optional(),
  pattern: z.array(z.number()).optional(),
  notes: z.string().optional(),
  quote: z.preprocess(
    (val) => (val === "" || val === undefined ? 0 : parseFloat(String(val))),
    z.number({invalid_type_error: "La cotización debe ser un número."}).nonnegative({ message: 'La cotización no puede ser negativa.' }).optional().default(0)
  ),
  downPayment: z.preprocess(
    (val) => (val === "" || val === undefined ? 0 : parseFloat(String(val))),
    z.number({invalid_type_error: "El anticipo debe ser un número."}).nonnegative({ message: 'El anticipo no puede ser negativo.' }).optional().default(0)
  ),
}).refine(data => {
    if (data.quote !== undefined && data.downPayment !== undefined) {
        return data.downPayment <= data.quote;
    }
    return true;
}, {
    message: "El anticipo no puede ser mayor que la cotización.",
    path: ["downPayment"],
});

const formSchema = z.object({
  clientName: z.string().min(2, { message: 'El nombre del cliente debe tener al menos 2 caracteres.' }),
  phoneNumbers: z.array(z.object({ value: z.string().min(10, { message: 'El número de teléfono debe tener 10 dígitos.' }).max(10, { message: 'El número de teléfono debe tener 10 dígitos.' }) })).min(1, { message: 'Se requiere al menos un número de teléfono.' }),
  devices: z.array(deviceSchema).min(1, { message: 'Debes registrar al menos un dispositivo.' }),
});


export type RepairRequestFormValues = z.infer<typeof formSchema>;

interface RepairRequestFormProps {
  catalog: CatalogData;
  updateCatalogState: (collectionName: keyof CatalogData, newItems: any[]) => void;
  onAddRequest: (data: Omit<RepairRequest, 'id' | 'status' | 'folio' | 'createdAt'>) => void;
  onUpdateRequest?: (id: string, data: Omit<RepairRequest, 'id' | 'status' | 'folio' | 'createdAt'>) => void;
  initialData?: RepairRequest | null;
  onFormClose?: () => void;
}

const AddNewModelDialog: React.FC<{ onAddModel: (name: string, brandId: string) => void, brandId: string }> = ({ onAddModel, brandId }) => {
  const [modelName, setModelName] = useState('');

  const handleAdd = () => {
    if (modelName.trim()) {
      onAddModel(modelName.trim(), brandId);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Añadir Nuevo Modelo</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="model-name" className="text-right">
            Nombre
          </Label>
          <Input
            id="model-name"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            className="col-span-3"
            placeholder="Ej: Galaxy S25"
          />
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancelar</Button>
        </DialogClose>
        <DialogClose asChild>
          <Button onClick={handleAdd} disabled={!modelName.trim()}>Añadir</Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
};

const newDeviceDefault: Omit<DeviceInRequest, 'id'> = {
    brandId: '', modelId: '', colorId: '', imei: '',
    problem: '', problemDescription: '', serviceIds: [], serviceCosts: [],
    accessories: [], conditions: [], password: '', pattern: [], notes: '',
    quote: 0, downPayment: 0,
};

const DeviceFormSection: React.FC<{
  index: number;
  catalog: CatalogData;
  isEditing: boolean;
  onRemove: () => void;
  canRemove: boolean;
  onToggle: () => void;
  isOpen: boolean;
  onModelChange: (value: string, index: number) => void;
}> = ({ index, catalog, isEditing, onRemove, canRemove, onToggle, isOpen, onModelChange }) => {
    const { control, watch, getValues, setValue } = useFormContext<RepairRequestFormValues>();
    const { brands, models, colors, accessories, conditions, services } = catalog;
    
    const watchedDevice = watch(`devices.${index}`);
    const selectedBrandId = watchedDevice?.brandId;

    const filteredModels = useMemo(() => {
        if (!selectedBrandId || !Array.isArray(models)) return [];
        return models.filter(m => m.brandId === selectedBrandId);
    }, [selectedBrandId, models]);

    const quoteValue = watchedDevice?.quote || 0;
    const downPaymentValue = watchedDevice?.downPayment || 0;
    const remainingValue = quoteValue - downPaymentValue;
    const selectedServiceIds = watchedDevice?.serviceIds || [];
    const selectedServicesText = selectedServiceIds.length > 0
        ? `${selectedServiceIds.length} servicio(s) seleccionado(s)`
        : 'Seleccionar servicios';

    const handleServiceSelection = (checked: boolean, serviceId: string) => {
        const currentServiceIds = getValues(`devices.${index}.serviceIds`) || [];
        const currentServiceCosts = getValues(`devices.${index}.serviceCosts`) || [];
        
        let newServiceIds: string[];
        let newServiceCosts: {serviceId: string, cost: number}[];

        if (checked) {
            newServiceIds = [...currentServiceIds, serviceId];
            newServiceCosts = [...currentServiceCosts, { serviceId, cost: 0 }];
        } else {
            newServiceIds = currentServiceIds.filter(id => id !== serviceId);
            newServiceCosts = currentServiceCosts.filter(sc => sc.serviceId !== serviceId);
        }
        setValue(`devices.${index}.serviceIds`, newServiceIds);
        setValue(`devices.${index}.serviceCosts`, newServiceCosts, { shouldValidate: true });
    };

    return (
        <Collapsible open={isOpen} onOpenChange={onToggle} className="group">
            <Card className="border-primary border-2 p-0 overflow-hidden">
                 <div className="flex justify-between items-center w-full p-4 sm:p-6">
                    <CollapsibleTrigger asChild>
                        <div role="button" className="flex items-center gap-2 text-lg font-headline text-primary cursor-pointer">
                            {isOpen ? <ChevronUp /> : <ChevronDown />}
                            <Smartphone /> Dispositivo #{index + 1}
                        </div>
                    </CollapsibleTrigger>
                     {canRemove && !isEditing && (
                       <Button type="button" variant="destructive" size="icon" className="h-7 w-7 flex-shrink-0" onClick={onRemove}>
                         <Trash2 className="h-4 w-4" />
                       </Button>
                     )}
                 </div>
                <CollapsibleContent>
                    <div className="grid md:grid-cols-2 gap-6 p-4 sm:p-6 pt-0">
                        <div className="space-y-6">
                            <Card>
                                <CardHeader><CardTitle className="font-headline text-base">Información del Dispositivo</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField control={control} name={`devices.${index}.brandId`} render={({ field: brandField }) => (
                                        <FormItem><FormLabel>Marca</FormLabel><Select onValueChange={(val) => { brandField.onChange(val); setValue(`devices.${index}.modelId`, '')}} value={brandField.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona una marca" /></SelectTrigger></FormControl><SelectContent>{brands.map(brand => (<SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={control} name={`devices.${index}.modelId`} render={({ field }) => (
                                        <FormItem><FormLabel>Modelo</FormLabel><Select onValueChange={(val) => onModelChange(val, index)} value={field.value} disabled={!selectedBrandId}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona un modelo" /></SelectTrigger></FormControl><SelectContent>{filteredModels.map(model => (<SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>))} {!isEditing && <SelectItem value="add-new" className="text-primary font-medium">Añadir nuevo modelo...</SelectItem>}</SelectContent></Select><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={control} name={`devices.${index}.colorId`} render={({ field }) => (
                                        <FormItem><FormLabel>Color</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona un color" /></SelectTrigger></FormControl><SelectContent>{colors.map(color => (<SelectItem key={color.id} value={color.id}>{color.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={control} name={`devices.${index}.imei`} render={({ field }) => (
                                        <FormItem><FormLabel>IMEI (Opcional)</FormLabel><FormControl><Input placeholder="IMEI del dispositivo" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader><CardTitle className="font-headline text-base">Falla y Servicio</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField control={control} name={`devices.${index}.problem`} render={({ field }) => (
                                        <FormItem><FormLabel>Problema (Título)</FormLabel><FormControl><Input placeholder="Ej: Pantalla no responde" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={control} name={`devices.${index}.problemDescription`} render={({ field }) => (
                                        <FormItem><FormLabel>Descripción del Problema</FormLabel><FormControl><Textarea placeholder="Describe el problema con más detalle..." {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={control} name={`devices.${index}.serviceIds`} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Servicio(s) Requerido(s)</FormLabel>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                                                       {selectedServicesText}
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="w-full max-h-60 overflow-y-auto">
                                                    {services.map((item) => (
                                                        <DropdownMenuCheckboxItem
                                                            key={item.id}
                                                            checked={field.value?.includes(item.id)}
                                                            onCheckedChange={(checked) => handleServiceSelection(!!checked, item.id)}
                                                            onSelect={(e) => e.preventDefault()}
                                                        >
                                                            {item.name}
                                                        </DropdownMenuCheckboxItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                            <FormDescription>Selecciona al menos un servicio.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </CardContent>
                            </Card>
                            
                            <Card>
                                <CardHeader><CardTitle className="font-headline text-base">Costos de Reparación</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    {watchedDevice.serviceCosts?.map((serviceCost, costIndex) => {
                                        const service = services.find(s => s.id === serviceCost.serviceId);
                                        return (
                                            <FormField
                                                key={serviceCost.serviceId}
                                                control={control}
                                                name={`devices.${index}.serviceCosts.${costIndex}.cost`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{service?.name || 'Servicio Desconocido'}</FormLabel>
                                                        <FormControl>
                                                            <div className="relative">
                                                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                                <Input 
                                                                    type="number" 
                                                                    placeholder="0.00" 
                                                                    {...field} 
                                                                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)} 
                                                                    onFocus={(e) => {
                                                                        if (e.target.value === '0') {
                                                                            e.target.value = '';
                                                                            field.onChange('');
                                                                        }
                                                                    }}
                                                                    className="pl-8" 
                                                                />
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        );
                                    })}
                                    
                                    <Separator />

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                        <FormField control={control} name={`devices.${index}.quote`} render={({ field }) => (
                                            <FormItem>
                                              <FormLabel>Cotización Total</FormLabel>
                                              <FormControl>
                                                <div className="relative">
                                                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                  <Input type="number" readOnly disabled {...field} className="pl-8 font-bold" />
                                                </div>
                                              </FormControl>
                                              <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={control} name={`devices.${index}.downPayment`} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Anticipo</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                        <Input 
                                                            type="number" 
                                                            placeholder="0.00" 
                                                            {...field} 
                                                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)} 
                                                            onFocus={(e) => {
                                                                if (e.target.value === '0') {
                                                                    e.target.value = '';
                                                                    field.onChange('');
                                                                }
                                                            }}
                                                            className="pl-8" 
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormItem>
                                            <FormLabel>Restante</FormLabel>
                                            <div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input readOnly disabled value={remainingValue.toFixed(2)} className="pl-8 font-bold text-lg" /></div>
                                        </FormItem>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="space-y-6">
                            <Card>
                                <CardHeader><CardTitle className="font-headline text-base">Condición y Accesorios</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField control={control} name={`devices.${index}.conditions`} render={() => (
                                        <FormItem>
                                            <div className="mb-4">
                                            <FormLabel>Condición del Dispositivo</FormLabel>
                                            <FormDescription>Selecciona al menos una condición.</FormDescription>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {conditions.map((item) => (
                                                    <FormField key={item.id} control={control} name={`devices.${index}.conditions`} render={({ field }) => (
                                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(item.id)} onCheckedChange={(checked) => {
                                                            return checked ? field.onChange([...(field.value || []), item.id]) : field.onChange(field.value?.filter((value) => value !== item.id))
                                                        }} /></FormControl><FormLabel className="font-normal">{item.name}</FormLabel></FormItem>
                                                    )} />
                                                ))}
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={control} name={`devices.${index}.accessories`} render={() => (
                                        <FormItem>
                                            <div className="mb-4">
                                                <FormLabel>Accesorios Entregados</FormLabel>
                                                <FormDescription>Selecciona los accesorios que deja el cliente.</FormDescription>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                            {accessories.map((item) => (
                                                <FormField key={item.id} control={control} name={`devices.${index}.accessories`} render={({ field }) => (
                                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(item.id)} onCheckedChange={(checked) => {
                                                        return checked ? field.onChange([...(field.value || []), item.id]) : field.onChange(field.value?.filter((value) => value !== item.id))
                                                    }} /></FormControl><FormLabel className="font-normal">{item.name}</FormLabel></FormItem>
                                                )} />
                                            ))}</div>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={control} name={`devices.${index}.notes`} render={({ field }) => (
                                        <FormItem><FormLabel>Notas Adicionales</FormLabel><FormControl><Textarea placeholder="Describe cualquier otro problema o accesorio..." {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </CardContent>
                            </Card>
            
                            <Card>
                                <CardHeader><CardTitle className="font-headline text-base">Seguridad (Opcional)</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField control={control} name={`devices.${index}.password`} render={({ field }) => (
                                        <FormItem><FormLabel>Contraseña / PIN</FormLabel><FormControl><Input placeholder="Contraseña o PIN del dispositivo" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={control} name={`devices.${index}.pattern`} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Patrón de Bloqueo</FormLabel>
                                            <FormControl>
                                                <PatternLock name={field.name} />
                                            </FormControl>
                                            <FormDescription>Dibuja el patrón de desbloqueo si aplica.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
};


export function RepairRequestForm({ 
  catalog, updateCatalogState,
  onAddRequest, onUpdateRequest, initialData = null, onFormClose
}: RepairRequestFormProps) {
  const { models } = catalog;
  const { toast } = useToast();
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [addingModel, setAddingModel] = useState<{ open: boolean, index: number, brandId: string }>({ open: false, index: -1, brandId: '' });
  const [openDevices, setOpenDevices] = useState<{ [key: number]: boolean }>({0: true});
  
  const isEditing = !!initialData;

  const form = useForm<RepairRequestFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: '',
      phoneNumbers: [{ value: '' }],
      devices: [newDeviceDefault as DeviceInRequest],
    },
  });

  const { fields: phoneFields, append: appendPhone, remove: removePhone } = useFieldArray({
    control: form.control,
    name: "phoneNumbers",
  });
  
  const { fields: deviceFields, append: appendDevice, remove: removeDevice } = useFieldArray({
    control: form.control,
    name: "devices",
  });

  useEffect(() => {
    if (isEditing && initialData) {
      form.reset({
        clientName: initialData.clientName,
        phoneNumbers: initialData.phoneNumbers,
        devices: initialData.devices.map(d => ({...d})), // Create a copy
      });
      const openStates = initialData.devices.reduce((acc, _, index) => {
        acc[index] = true;
        return acc;
      }, {} as {[key: number]: boolean});
      setOpenDevices(openStates);
    }
  }, [initialData, isEditing, form]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
    useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (name && name.startsWith('devices') && name.includes('serviceCosts')) {
        const deviceIndexMatch = name.match(/devices\.(\d+)\.serviceCosts/);
        if (deviceIndexMatch) {
          const deviceIndex = parseInt(deviceIndexMatch[1], 10);
          const devices = form.getValues('devices');
          const device = devices[deviceIndex];
          if (device && device.serviceCosts) {
            const totalQuote = device.serviceCosts.reduce((acc, current) => acc + (current.cost || 0), 0);
            form.setValue(`devices.${deviceIndex}.quote`, totalQuote, { shouldValidate: true });
          }
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);


  function onSubmit(data: RepairRequestFormValues) {
    // Assign temporary client-side IDs for devices before submission if they don't have one
    const devicesWithIds = data.devices.map(d => ({ ...d, id: d.id || crypto.randomUUID() }));
    const finalData = { ...data, devices: devicesWithIds };
    
    if (isEditing && initialData && onUpdateRequest) {
      onUpdateRequest(initialData.id, finalData);
      toast({
        title: '¡Registro Actualizado!',
        description: `El registro para ${data.clientName} ha sido actualizado.`,
        variant: 'success',
      });
      onFormClose?.();
    } else {
      onAddRequest(finalData);
      toast({
        title: `¡${data.devices.length} Dispositivo(s) Registrado(s)!`,
        description: `Los dispositivos para ${data.clientName} se han añadido.`,
        variant: 'success',
      });
      
      form.reset({
          clientName: '',
          phoneNumbers: [{ value: '' }],
          devices: [newDeviceDefault as DeviceInRequest]
      });
      setOpenDevices({ 0: true });
    }
  }

  const handleModelChange = (value: string, index: number) => {
    const brandId = form.getValues(`devices.${index}.brandId`);
    if (value === 'add-new' && brandId) {
      setAddingModel({ open: true, index, brandId });
    } else {
      form.setValue(`devices.${index}.modelId`, value);
      setAddingModel({ open: false, index: -1, brandId: '' });
    }
  };
  
  const handleAddNewModel = async (name: string, brandId: string) => {
    if (brandId) {
        const newModelData = { name, brandId };
        const newId = await addItem('models', newModelData);
        const newModel: Model = { id: newId, ...newModelData };
        updateCatalogState('models', [...models, newModel]);
        form.setValue(`devices.${addingModel.index}.modelId`, newModel.id);
        setAddingModel({ open: false, index: -1, brandId: '' });
    }
  };

  const handleAddDevice = async () => {
    const lastDeviceIndex = deviceFields.length - 1;
    const result = await form.trigger([
        `devices.${lastDeviceIndex}.brandId`,
        `devices.${lastDeviceIndex}.modelId`,
        `devices.${lastDeviceIndex}.colorId`,
        `devices.${lastDeviceIndex}.conditions`,
        `devices.${lastDeviceIndex}.serviceIds`
    ]);

    if (!result) {
        toast({
            title: 'Formulario Incompleto',
            description: 'Por favor, completa la información del dispositivo actual antes de agregar uno nuevo.',
            variant: 'destructive',
        });
        return;
    }
    
    setOpenDevices(prev => {
        const newOpenDevices: { [key: number]: boolean } = {};
        Object.keys(prev).forEach(key => {
            newOpenDevices[Number(key)] = false;
        });
        newOpenDevices[deviceFields.length] = true;
        return newOpenDevices;
    });
    appendDevice(newDeviceDefault as DeviceInRequest);
  };
  
  const handleToggleDevice = (index: number) => {
    setOpenDevices(prev => ({...prev, [index]: !prev[index]}));
  };

  return (
    <Dialog open={addingModel.open} onOpenChange={(open) => setAddingModel(prev => ({ ...prev, open }))}>
      <FormProvider {...form}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {!isEditing && (
              <div className="flex justify-between items-center p-2 bg-secondary rounded-lg">
                  <div className='flex flex-wrap items-center gap-4'>
                      <div className="flex items-center gap-2 text-sm text-secondary-foreground">
                          <CalendarIcon className="h-4 w-4" />
                          <span>{format(currentDateTime, 'PPP', { locale: es })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-secondary-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{format(currentDateTime, 'p', { locale: es })}</span>
                      </div>
                  </div>
              </div>
            )}
            
            <Card>
              <CardHeader><CardTitle className="font-headline">Información del Cliente</CardTitle></CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-8">
                <FormField control={form.control} name="clientName" render={({ field }) => (
                    <FormItem><FormLabel>Nombre del Cliente</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div>
                    <FormLabel>Número(s) de Teléfono</FormLabel>
                    {phoneFields.map((field, index) => (
                        <FormField key={field.id} control={form.control} name={`phoneNumbers.${index}.value`} render={({ field }) => (
                            <FormItem className="mt-2"><FormControl>
                                <div className="flex items-center gap-2">
                                    <Input type="tel" maxLength={10} placeholder="Ej: 5512345678" {...field} />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removePhone(index)} disabled={phoneFields.length <= 1}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </FormControl><FormMessage /></FormItem>
                        )} />
                    ))}
                    <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => appendPhone({ value: "" })}><PlusCircle className="mr-2 h-4 w-4" />Añadir Teléfono</Button>
                </div>
              </CardContent>
            </Card>
    
            <Separator />

            <div className="space-y-4">
              {deviceFields.map((field, index) => (
                  <DeviceFormSection 
                      key={field.id}
                      index={index}
                      catalog={catalog}
                      isEditing={isEditing}
                      onRemove={() => removeDevice(index)}
                      canRemove={deviceFields.length > 1}
                      isOpen={openDevices[index] ?? false}
                      onToggle={() => handleToggleDevice(index)}
                      onModelChange={handleModelChange}
                  />
              ))}
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              {!isEditing && (
                  <Button type="button" variant="outline" onClick={handleAddDevice}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Agregar Otro Dispositivo
                  </Button>
              )}
              <div className={cn(isEditing && 'w-full flex justify-end', 'w-full sm:w-auto')}>
                  <Button type="submit" size="lg" className="w-full sm:w-auto">
                      {isEditing ? 'Actualizar Registro' : 'Guardar'}
                  </Button>
              </div>
            </div>
          </form>
        </Form>
      </FormProvider>
      {addingModel.brandId && !isEditing && (
        <AddNewModelDialog onAddModel={handleAddNewModel} brandId={addingModel.brandId} />
      )}
    </Dialog>
  );
}

    