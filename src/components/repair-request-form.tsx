'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import * as z from 'zod';
import { PlusCircle, Trash2, Calendar as CalendarIcon, Clock, DollarSign } from 'lucide-react';
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

const formSchema = z.object({
  clientName: z.string().min(2, { message: 'El nombre del cliente debe tener al menos 2 caracteres.' }),
  phoneNumbers: z.array(z.object({ value: z.string().min(10, { message: 'El número de teléfono debe tener al menos 10 dígitos.' }) })).min(1, { message: 'Se requiere al menos un número de teléfono.' }),
  brandId: z.string().min(1, { message: 'Por favor, selecciona una marca.' }),
  modelId: z.string().min(1, { message: 'Por favor, selecciona un modelo.' }),
  colorId: z.string().min(1, { message: 'Por favor, selecciona un color.' }),
  imei: z.string().optional(),
  accessories: z.array(z.string()).optional(),
  conditions: z.array(z.string()).optional(),
  password: z.string().optional(),
  pattern: z.array(z.number()).optional(),
  notes: z.string().optional(),
  quote: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number().positive({ message: 'La cotización debe ser un número positivo.' }).optional()
  ),
  downPayment: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number().nonnegative({ message: 'El anticipo no puede ser negativo.' }).optional()
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

export type RepairRequestFormValues = z.infer<typeof formSchema>;

interface RepairRequestFormProps {
  brands: Brand[];
  models: Model[];
  setModels: React.Dispatch<React.SetStateAction<Model[]>>;
  colors: Color[];
  accessories: Accessory[];
  conditions: Condition[];
  onAddRequest: (data: Omit<RepairRequest, 'id' | 'status' | 'folio'>) => void;
  initialData?: Partial<RepairRequestFormValues>;
  onFormSubmit?: () => void;
}

const AddNewModelDialog: React.FC<{ onAddModel: (name: string) => void }> = ({ onAddModel }) => {
  const [modelName, setModelName] = useState('');

  const handleAdd = () => {
    if (modelName.trim()) {
      onAddModel(modelName.trim());
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

export function RepairRequestForm({ brands, models, setModels, colors, accessories, conditions, onAddRequest, initialData, onFormSubmit }: RepairRequestFormProps) {
  const { toast } = useToast();
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [filteredModels, setFilteredModels] = useState<Model[]>([]);
  const [isAddingModel, setIsAddingModel] = useState(false);

  const form = useForm<RepairRequestFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: '',
      phoneNumbers: [{ value: '' }],
      accessories: [],
      conditions: [],
      pattern: [],
      quote: 0,
      downPayment: 0,
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        ...form.getValues(),
        clientName: initialData.clientName || '',
        phoneNumbers: initialData.phoneNumbers?.length ? initialData.phoneNumbers : [{ value: '' }],
      });
    }
  }, [initialData, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "phoneNumbers",
  });
  
  const selectedBrandId = form.watch('brandId');
  const quoteValue = form.watch('quote') || 0;
  const downPaymentValue = form.watch('downPayment') || 0;
  const remainingValue = quoteValue - downPaymentValue;

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selectedBrandId) {
      setFilteredModels(models.filter(model => model.brandId === selectedBrandId));
      form.setValue('modelId', '');
    } else {
      setFilteredModels([]);
    }
  }, [selectedBrandId, models, form]);

  function onSubmit(data: RepairRequestFormValues) {
    const submissionData = {
      ...data,
      folio: nextFolio++,
      createdAt: new Date().toISOString(),
    };
    onAddRequest(submissionData);
    toast({
      title: "¡Solicitud de Reparación Enviada!",
      description: `El dispositivo para ${data.clientName} ha sido registrado.`,
      className: 'bg-primary text-primary-foreground',
    });
    form.reset();
    onFormSubmit?.();
  }

  const handleModelChange = (value: string) => {
    if (value === 'add-new') {
      setIsAddingModel(true);
    } else {
      form.setValue('modelId', value);
      setIsAddingModel(false);
    }
  };
  
  const handleAddNewModel = (name: string) => {
    if (selectedBrandId) {
        const newModel: Model = {
            id: crypto.randomUUID(),
            name,
            brandId: selectedBrandId,
        };
        setModels(prev => [...prev, newModel]);
        form.setValue('modelId', newModel.id);
        setIsAddingModel(false);
    }
  };

  return (
    <Dialog open={isAddingModel} onOpenChange={setIsAddingModel}>
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
          <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                  <Card>
                      <CardHeader><CardTitle className="font-headline">Información del Cliente</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                          <FormField control={form.control} name="clientName" render={({ field }) => (
                              <FormItem><FormLabel>Nombre del Cliente</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <div>
                              <FormLabel>Número(s) de Teléfono</FormLabel>
                              {fields.map((field, index) => (
                                  <FormField key={field.id} control={form.control} name={`phoneNumbers.${index}.value`} render={({ field }) => (
                                      <FormItem className="mt-2"><FormControl>
                                          <div className="flex items-center gap-2">
                                              <Input placeholder="Ej: 555-123-4567" {...field} />
                                              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}><Trash2 className="h-4 w-4" /></Button>
                                          </div>
                                      </FormControl><FormMessage /></FormItem>
                                  )} />
                              ))}
                              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => append({ value: "" })}><PlusCircle className="mr-2 h-4 w-4" />Añadir Teléfono</Button>
                          </div>
                      </CardContent>
                  </Card>
  
                  <Card>
                      <CardHeader><CardTitle className="font-headline">Información del Dispositivo</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                           <FormField control={form.control} name="brandId" render={({ field }) => (
                              <FormItem><FormLabel>Marca</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona una marca" /></SelectTrigger></FormControl><SelectContent>{brands.map(brand => (<SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                          )} />
                           <FormField control={form.control} name="modelId" render={({ field }) => (
                              <FormItem><FormLabel>Modelo</FormLabel><Select onValueChange={handleModelChange} value={field.value} disabled={!selectedBrandId}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona un modelo" /></SelectTrigger></FormControl><SelectContent>{filteredModels.map(model => (<SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>))} <SelectItem value="add-new" className="text-primary font-medium">Añadir nuevo modelo...</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="colorId" render={({ field }) => (
                              <FormItem><FormLabel>Color</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona un color" /></SelectTrigger></FormControl><SelectContent>{colors.map(color => (<SelectItem key={color.id} value={color.id}>{color.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="imei" render={({ field }) => (
                              <FormItem><FormLabel>IMEI (Opcional)</FormLabel><FormControl><Input placeholder="IMEI del dispositivo" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                      </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader><CardTitle className="font-headline">Costos de Reparación</CardTitle></CardHeader>
                    <CardContent className="grid md:grid-cols-3 gap-6">
                        <FormField control={form.control} name="quote" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Precio de Cotización</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input type="number" placeholder="0.00" {...field} onChange={e => field.onChange(e.target.value === '' ? '' : e.target.value)} className="pl-8" />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="downPayment" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Anticipo</FormLabel>
                                <FormControl>
                                     <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input type="number" placeholder="0.00" {...field} onChange={e => field.onChange(e.target.value === '' ? '' : e.target.value)} className="pl-8" />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormItem>
                            <FormLabel>Restante</FormLabel>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input readOnly disabled value={remainingValue.toFixed(2)} className="pl-8 font-bold text-lg" />
                            </div>
                        </FormItem>
                    </CardContent>
                  </Card>
              </div>
              <div className="space-y-6">
                  <Card>
                      <CardHeader><CardTitle className="font-headline">Condición y Accesorios</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                          <FormField control={form.control} name="conditions" render={() => (
                              <FormItem>
                                  <FormLabel>Condición del Dispositivo</FormLabel>
                                  <div className="grid grid-cols-2 gap-2">
                                  {conditions.map((item) => (
                                      <FormField key={item.id} control={form.control} name="conditions" render={({ field }) => (
                                          <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                                              <FormControl><Checkbox checked={field.value?.includes(item.id)} onCheckedChange={(checked) => {
                                                  return checked ? field.onChange([...(field.value || []), item.id]) : field.onChange(field.value?.filter((value) => value !== item.id))
                                              }} /></FormControl>
                                              <FormLabel className="font-normal">{item.name}</FormLabel>
                                          </FormItem>
                                      )} />
                                  ))}
                                  </div>
                              </FormItem>
                          )} />
                           <FormField control={form.control} name="accessories" render={() => (
                              <FormItem>
                                  <FormLabel>Accesorios Incluidos</FormLabel>
                                  <div className="grid grid-cols-2 gap-2">
                                  {accessories.map((item) => (
                                      <FormField key={item.id} control={form.control} name="accessories" render={({ field }) => (
                                          <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                                              <FormControl><Checkbox checked={field.value?.includes(item.id)} onCheckedChange={(checked) => {
                                                  return checked ? field.onChange([...(field.value || []), item.id]) : field.onChange(field.value?.filter((value) => value !== item.id))
                                              }} /></FormControl>
                                              <FormLabel className="font-normal">{item.name}</FormLabel>
                                          </FormItem>
                                      )} />
                                  ))}
                                  </div>
                              </FormItem>
                          )} />
                          <FormField control={form.control} name="notes" render={({ field }) => (
                              <FormItem><FormLabel>Notas Adicionales</FormLabel><FormControl><Textarea placeholder="Describe cualquier otro problema o accesorio..." {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                      </CardContent>
                  </Card>
  
                  <Card>
                      <CardHeader><CardTitle className="font-headline">Seguridad (Opcional)</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                           <FormField control={form.control} name="password" render={({ field }) => (
                              <FormItem><FormLabel>Contraseña / PIN</FormLabel><FormControl><Input placeholder="Contraseña o PIN del dispositivo" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="pattern" render={({ field }) => (
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
  
          <div className="flex justify-end">
              <Button type="submit" size="lg">Crear Solicitud de Reparación</Button>
          </div>
        </form>
      </Form>
      <AddNewModelDialog onAddModel={handleAddNewModel} />
    </Dialog>
  );
}
