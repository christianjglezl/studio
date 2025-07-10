'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import * as z from 'zod';
import { PlusCircle, Trash2, Calendar as CalendarIcon, Clock, DollarSign, RefreshCw, Smartphone, ChevronDown, ChevronUp } from 'lucide-react';
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
import type { Brand, Model, Color, Accessory, Condition, RepairRequest } from '@/lib/types';
import { useEffect, useState } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';


const deviceSchema = z.object({
  brandId: z.string().min(1, { message: 'Por favor, selecciona una marca.' }),
  modelId: z.string().min(1, { message: 'Por favor, selecciona un modelo.' }),
  colorId: z.string().min(1, { message: 'Por favor, selecciona un color.' }),
  imei: z.string().optional(),
  accessories: z.array(z.string()).optional(),
  conditions: z.array(z.string()).min(1, { message: 'Debes seleccionar al menos una condición.' }),
  password: z.string().optional(),
  pattern: z.array(z.number()).optional(),
  notes: z.string().optional(),
  quote: z.preprocess(
    (val) => (val === "" || val === undefined ? 0 : parseFloat(String(val))),
    z.number({invalid_type_error: "La cotización debe ser un número."}).nonnegative({ message: 'La cotización no puede ser negativa.' }).optional()
  ),
  downPayment: z.preprocess(
    (val) => (val === "" || val === undefined ? 0 : parseFloat(String(val))),
    z.number({invalid_type_error: "El anticipo debe ser un número."}).nonnegative({ message: 'El anticipo no puede ser negativo.' }).optional()
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
  phoneNumbers: z.array(z.object({ value: z.string().min(10, { message: 'El número de teléfono debe tener al menos 10 dígitos.' }) })).min(1, { message: 'Se requiere al menos un número de teléfono.' }),
  devices: z.array(deviceSchema).min(1, { message: 'Debes registrar al menos un dispositivo.' }),
});


export type RepairRequestFormValues = z.infer<typeof formSchema>;

interface RepairRequestFormProps {
  brands: Brand[];
  models: Model[];
  setModels: React.Dispatch<React.SetStateAction<Model[]>>;
  colors: Color[];
  accessories: Accessory[];
  conditions: Condition[];
  onAddRequest: (data: Omit<RepairRequest, 'id' | 'status' | 'folio'>) => void;
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

let nextFolio = 1;

const newDeviceDefault = {
    brandId: '', modelId: '', colorId: '', imei: '',
    accessories: [], conditions: [], password: '', pattern: [], notes: '',
    quote: 0, downPayment: 0,
};

export function RepairRequestForm({ brands, models, setModels, colors, accessories, conditions, onAddRequest }: RepairRequestFormProps) {
  const { toast } = useToast();
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [addingModel, setAddingModel] = useState<{ open: boolean, index: number, brandId: string }>({ open: false, index: -1, brandId: '' });
  const [openDevices, setOpenDevices] = useState<{ [key: number]: boolean }>({0: true});

  const form = useForm<RepairRequestFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: '',
      phoneNumbers: [{ value: '' }],
      devices: [newDeviceDefault],
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
  
  const watchedDevices = form.watch('devices');

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  function onSubmit(data: RepairRequestFormValues) {
    data.devices.forEach(deviceData => {
        const submissionData = {
          clientName: data.clientName,
          phoneNumbers: data.phoneNumbers,
          ...deviceData,
          folio: nextFolio++,
          createdAt: new Date().toISOString(),
        };
        onAddRequest(submissionData);
    });
    
    toast({
      title: `¡${data.devices.length} Dispositivo(s) Registrado(s)!`,
      description: `Los dispositivos para ${data.clientName} se han añadido.`,
      className: 'bg-primary text-primary-foreground',
    });
    
    form.reset({
        clientName: '',
        phoneNumbers: [{ value: '' }],
        devices: [newDeviceDefault]
    });
    setOpenDevices({ 0: true });
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
  
  const handleAddNewModel = (name: string, brandId: string) => {
    if (brandId) {
        const newModel: Model = {
            id: crypto.randomUUID(),
            name,
            brandId: brandId,
        };
        setModels(prev => [...prev, newModel]);
        form.setValue(`devices.${addingModel.index}.modelId`, newModel.id);
        setAddingModel({ open: false, index: -1, brandId: '' });
    }
  };

  const handleAddDevice = () => {
    setOpenDevices(prev => {
        const newOpenDevices: { [key: number]: boolean } = {};
        Object.keys(prev).forEach(key => {
            newOpenDevices[Number(key)] = false;
        });
        newOpenDevices[deviceFields.length] = true;
        return newOpenDevices;
    });
    appendDevice(newDeviceDefault);
  };
  
  const handleToggleDevice = (index: number) => {
    setOpenDevices(prev => ({...prev, [index]: !prev[index]}));
  };

  return (
    <Dialog open={addingModel.open} onOpenChange={(open) => setAddingModel(prev => ({ ...prev, open }))}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="flex justify-between items-center p-2 bg-secondary rounded-lg">
              <div className='flex items-center gap-4'>
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
                                  <Input placeholder="Ej: 555-123-4567" {...field} />
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

          {deviceFields.map((field, index) => {
             const selectedBrandId = watchedDevices[index]?.brandId;
             const filteredModels = selectedBrandId ? models.filter(m => m.brandId === selectedBrandId) : [];
             const quoteValue = watchedDevices[index]?.quote || 0;
             const downPaymentValue = watchedDevices[index]?.downPayment || 0;
             const remainingValue = quoteValue - downPaymentValue;
             const isOpen = openDevices[index] ?? false;

             return (
                <Collapsible key={field.id} open={isOpen} onOpenChange={() => handleToggleDevice(index)} asChild>
                <Card className="border-primary border-2 p-0">
                    <div className="flex justify-between items-start mt-6 mb-4 px-6">
                       <CollapsibleTrigger asChild>
                       <button type="button" className="flex items-center gap-2 text-lg font-headline text-primary pt-1 w-full">
                          {isOpen ? <ChevronUp /> : <ChevronDown />}
                          <Smartphone /> Dispositivo #{index + 1}
                       </button>
                       </CollapsibleTrigger>
                       {deviceFields.length > 1 && (
                         <Button type="button" variant="destructive" size="icon" className="h-7 w-7 mt-1 flex-shrink-0" onClick={() => removeDevice(index)}>
                           <Trash2 className="h-4 w-4" />
                         </Button>
                       )}
                    </div>
                    <CollapsibleContent asChild>
                        <CardContent className="grid md:grid-cols-2 gap-8 p-6 pt-0">
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader><CardTitle className="font-headline text-base">Información del Dispositivo</CardTitle></CardHeader>
                                    <CardContent className="space-y-4">
                                        <FormField control={form.control} name={`devices.${index}.brandId`} render={({ field: brandField }) => (
                                            <FormItem><FormLabel>Marca</FormLabel><Select onValueChange={(val) => { brandField.onChange(val); form.setValue(`devices.${index}.modelId`, '')}} value={brandField.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona una marca" /></SelectTrigger></FormControl><SelectContent>{brands.map(brand => (<SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name={`devices.${index}.modelId`} render={({ field }) => (
                                            <FormItem><FormLabel>Modelo</FormLabel><Select onValueChange={(val) => handleModelChange(val, index)} value={field.value} disabled={!selectedBrandId}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona un modelo" /></SelectTrigger></FormControl><SelectContent>{filteredModels.map(model => (<SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>))} <SelectItem value="add-new" className="text-primary font-medium">Añadir nuevo modelo...</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name={`devices.${index}.colorId`} render={({ field }) => (
                                            <FormItem><FormLabel>Color</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona un color" /></SelectTrigger></FormControl><SelectContent>{colors.map(color => (<SelectItem key={color.id} value={color.id}>{color.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name={`devices.${index}.imei`} render={({ field }) => (
                                            <FormItem><FormLabel>IMEI (Opcional)</FormLabel><FormControl><Input placeholder="IMEI del dispositivo" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader><CardTitle className="font-headline text-base">Costos de Reparación</CardTitle></CardHeader>
                                    <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                        <FormField control={form.control} name={`devices.${index}.quote`} render={({ field }) => (
                                            <FormItem><FormLabel>Cotización</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" placeholder="0.00" {...field} onChange={e => field.onChange(e.target.value)} className="pl-8" /></div></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name={`devices.${index}.downPayment`} render={({ field }) => (
                                            <FormItem><FormLabel>Anticipo (Opcional)</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" placeholder="0.00" {...field} onChange={e => field.onChange(e.target.value)} className="pl-8" /></div></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormItem>
                                            <FormLabel>Restante</FormLabel>
                                            <div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input readOnly disabled value={remainingValue.toFixed(2)} className="pl-8 font-bold text-lg" /></div>
                                        </FormItem>
                                    </CardContent>
                                </Card>
                            </div>
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader><CardTitle className="font-headline text-base">Condición y Accesorios</CardTitle></CardHeader>
                                    <CardContent className="space-y-4">
                                        <FormField control={form.control} name={`devices.${index}.conditions`} render={() => (
                                            <FormItem>
                                                <div className="mb-4">
                                                <FormLabel>Condición del Dispositivo</FormLabel>
                                                <FormDescription>Selecciona al menos una condición.</FormDescription>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {conditions.map((item) => (
                                                        <FormField key={item.id} control={form.control} name={`devices.${index}.conditions`} render={({ field }) => (
                                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(item.id)} onCheckedChange={(checked) => {
                                                                return checked ? field.onChange([...(field.value || []), item.id]) : field.onChange(field.value?.filter((value) => value !== item.id))
                                                            }} /></FormControl><FormLabel className="font-normal">{item.name}</FormLabel></FormItem>
                                                        )} />
                                                    ))}
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name={`devices.${index}.accessories`} render={() => (
                                            <FormItem>
                                                <div className="mb-4">
                                                    <FormLabel>Accesorios Entregados</FormLabel>
                                                    <FormDescription>Selecciona los accesorios que deja el cliente.</FormDescription>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                {accessories.map((item) => (
                                                    <FormField key={item.id} control={form.control} name={`devices.${index}.accessories`} render={({ field }) => (
                                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(item.id)} onCheckedChange={(checked) => {
                                                            return checked ? field.onChange([...(field.value || []), item.id]) : field.onChange(field.value?.filter((value) => value !== item.id))
                                                        }} /></FormControl><FormLabel className="font-normal">{item.name}</FormLabel></FormItem>
                                                    )} />
                                                ))}</div>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name={`devices.${index}.notes`} render={({ field }) => (
                                            <FormItem><FormLabel>Notas Adicionales</FormLabel><FormControl><Textarea placeholder="Describe cualquier otro problema o accesorio..." {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </CardContent>
                                </Card>
                
                                <Card>
                                    <CardHeader><CardTitle className="font-headline text-base">Seguridad (Opcional)</CardTitle></CardHeader>
                                    <CardContent className="space-y-4">
                                        <FormField control={form.control} name={`devices.${index}.password`} render={({ field }) => (
                                            <FormItem><FormLabel>Contraseña / PIN</FormLabel><FormControl><Input placeholder="Contraseña o PIN del dispositivo" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name={`devices.${index}.pattern`} render={({ field }) => (
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
                        </CardContent>
                    </CollapsibleContent>
                </Card>
                </Collapsible>
             );
          })}

          <div className="flex justify-between items-center">
            <Button type="button" variant="outline" onClick={handleAddDevice}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Agregar Otro Dispositivo
            </Button>
            <Button type="submit" size="lg">
                Guardar
            </Button>
          </div>
        </form>
      </Form>
      {addingModel.brandId && (
        <AddNewModelDialog onAddModel={handleAddNewModel} brandId={addingModel.brandId} />
      )}
    </Dialog>
  );
}
