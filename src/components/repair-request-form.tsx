'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import * as z from 'zod';
import { PlusCircle, Trash2, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';

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
import type { Brand, Model, Color, Accessory, Condition } from '@/lib/types';
import { useEffect, useState } from 'react';

const formSchema = z.object({
  clientName: z.string().min(2, { message: 'Client name must be at least 2 characters.' }),
  phoneNumbers: z.array(z.object({ value: z.string().min(10, { message: 'Phone number must be at least 10 digits.' }) })).min(1, { message: 'At least one phone number is required.' }),
  brandId: z.string().min(1, { message: 'Please select a brand.' }),
  modelId: z.string().min(1, { message: 'Please select a model.' }),
  colorId: z.string().min(1, { message: 'Please select a color.' }),
  imei: z.string().optional(),
  accessories: z.array(z.string()).optional(),
  conditions: z.array(z.string()).optional(),
  password: z.string().optional(),
  pattern: z.array(z.number()).optional(),
  notes: z.string().optional(),
});

type RepairRequestFormValues = z.infer<typeof formSchema>;

interface RepairRequestFormProps {
  brands: Brand[];
  models: Model[];
  colors: Color[];
  accessories: Accessory[];
  conditions: Condition[];
}

export function RepairRequestForm({ brands, models, colors, accessories, conditions }: RepairRequestFormProps) {
  const { toast } = useToast();
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  const form = useForm<RepairRequestFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: '',
      phoneNumbers: [{ value: '' }],
      accessories: [],
      conditions: [],
      pattern: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "phoneNumbers",
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  function onSubmit(data: RepairRequestFormValues) {
    const submissionData = {
      ...data,
      timestamp: new Date().toISOString(),
    };
    console.log(submissionData);
    toast({
      title: "Repair Request Submitted!",
      description: `Device for ${data.clientName} has been registered.`,
      className: 'bg-primary text-primary-foreground',
    });
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex justify-between items-center p-2 bg-secondary rounded-lg">
            <div className='flex items-center gap-4'>
                <div className="flex items-center gap-2 text-sm text-secondary-foreground">
                    <CalendarIcon className="h-4 w-4" />
                    <span>{format(currentDateTime, 'PPP')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-secondary-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{format(currentDateTime, 'p')}</span>
                </div>
            </div>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
                <Card>
                    <CardHeader><CardTitle className="font-headline">Client Information</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <FormField control={form.control} name="clientName" render={({ field }) => (
                            <FormItem><FormLabel>Client Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div>
                            <FormLabel>Phone Number(s)</FormLabel>
                            {fields.map((field, index) => (
                                <FormField key={field.id} control={form.control} name={`phoneNumbers.${index}.value`} render={({ field }) => (
                                    <FormItem className="mt-2"><FormControl>
                                        <div className="flex items-center gap-2">
                                            <Input placeholder="e.g., 555-123-4567" {...field} />
                                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </FormControl><FormMessage /></FormItem>
                                )} />
                            ))}
                            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => append({ value: "" })}><PlusCircle className="mr-2 h-4 w-4" />Add Phone</Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle className="font-headline">Device Information</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                         <FormField control={form.control} name="brandId" render={({ field }) => (
                            <FormItem><FormLabel>Brand</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a brand" /></SelectTrigger></FormControl><SelectContent>{brands.map(brand => (<SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                        )} />
                         <FormField control={form.control} name="modelId" render={({ field }) => (
                            <FormItem><FormLabel>Model</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a model" /></SelectTrigger></FormControl><SelectContent>{models.map(model => (<SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="colorId" render={({ field }) => (
                            <FormItem><FormLabel>Color</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a color" /></SelectTrigger></FormControl><SelectContent>{colors.map(color => (<SelectItem key={color.id} value={color.id}>{color.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="imei" render={({ field }) => (
                            <FormItem><FormLabel>IMEI (Optional)</FormLabel><FormControl><Input placeholder="Device IMEI" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </CardContent>
                </Card>
            </div>
            <div className="space-y-6">
                <Card>
                    <CardHeader><CardTitle className="font-headline">Condition & Accessories</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <FormField control={form.control} name="conditions" render={() => (
                            <FormItem>
                                <FormLabel>Device Condition</FormLabel>
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
                                <FormLabel>Accessories Included</FormLabel>
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
                            <FormItem><FormLabel>Additional Notes</FormLabel><FormControl><Textarea placeholder="Describe any other issues or accessories..." {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle className="font-headline">Security (Optional)</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                         <FormField control={form.control} name="password" render={({ field }) => (
                            <FormItem><FormLabel>Password / PIN</FormLabel><FormControl><Input placeholder="Device password or PIN" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="pattern" render={({ field }) => (
                             <FormItem>
                                <FormLabel>Lock Pattern</FormLabel>
                                <FormControl>
                                    <PatternLock name={field.name} />
                                </FormControl>
                                <FormDescription>Draw the unlock pattern if applicable.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </CardContent>
                </Card>
            </div>
        </div>

        <div className="flex justify-end">
            <Button type="submit" size="lg">Create Repair Request</Button>
        </div>
      </form>
    </Form>
  );
}
