import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatCurrency, formatLitres, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, Trash2, Plus, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  date: z.string().min(1, "Date is required"),
  shift: z.enum(["morning", "evening"]),
  milkType: z.enum(["cow", "buffalo", "mixed"]),
  litres: z.coerce.number().min(0.1, "Litres must be > 0"),
  fatPercent: z.coerce.number().optional().nullable(),
  ratePerLitre: z.coerce.number().min(0, "Rate must be >= 0"),
  notes: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export default function Collections() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [shiftFilter, setShiftFilter] = React.useState<string>("all");
  const [customerFilter, setCustomerFilter] = React.useState<string>("all");
  
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  // Fetch Customers (Suppliers) directly from Firebase
  const { data: rawCustomers } = useQuery({
    queryKey: ["customers", "supplier"],
    queryFn: async () => {
      const q = query(collection(db, "customers"), where("type", "==", "supplier"));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    }
  });

  // --- THE FIX: Deduplicate suppliers by name ---
  const customers = React.useMemo(() => {
    if (!rawCustomers) return [];
    const unique = new Map();
    rawCustomers.forEach((c: any) => {
      if (!unique.has(c.name)) {
        unique.set(c.name, c);
      }
    });
    return Array.from(unique.values());
  }, [rawCustomers]);

  // Fetch Collections directly from Firebase
  const { data: allCollections, isLoading } = useQuery({
    queryKey: ["collections"],
    queryFn: async () => {
      const q = query(collection(db, "collections"), orderBy("date", "desc"));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    }
  });

  // Client-side filtering
  const collections = React.useMemo(() => {
    if (!allCollections) return [];
    return allCollections.filter((c: any) => {
      if (shiftFilter !== "all" && c.shift !== shiftFilter) return false;
      if (customerFilter !== "all" && c.customerId !== customerFilter) return false;
      return true;
    });
  }, [allCollections, shiftFilter, customerFilter]);

  // Firebase Mutations
  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const cust = customers?.find(c => c.id === values.customerId);
      const amount = values.litres * values.ratePerLitre;
      await addDoc(collection(db, "collections"), {
        ...values,
        customerName: cust?.name || "Unknown",
        amount,
        createdAt: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast({ title: "Collection added successfully" });
      setIsDialogOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Error adding collection", description: err.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: FormValues }) => {
      const cust = customers?.find(c => c.id === data.customerId);
      const amount = data.litres * data.ratePerLitre;
      await updateDoc(doc(db, "collections", id), {
        ...data,
        customerName: cust?.name || "Unknown",
        amount,
        updatedAt: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast({ title: "Collection updated successfully" });
      setIsDialogOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Error updating collection", description: err.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, "collections", id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast({ title: "Collection deleted successfully" });
      setDeleteId(null);
    },
    onError: (err: any) => {
      toast({ title: "Error deleting collection", description: err.message, variant: "destructive" });
    }
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: "",
      date: new Date().toISOString().split('T')[0],
      shift: "morning",
      milkType: "cow",
      litres: 0,
      fatPercent: null,
      ratePerLitre: 0,
      notes: "",
    },
  });

  const watchLitres = form.watch("litres");
  const watchRate = form.watch("ratePerLitre");
  const computedAmount = (watchLitres || 0) * (watchRate || 0);
  const watchCustomerId = form.watch("customerId");

  // Auto-fill rate based on selected customer
  React.useEffect(() => {
    if (watchCustomerId && !editingId) {
      const cust = customers?.find(c => c.id === watchCustomerId);
      if (cust && cust.ratePerLitre) {
        form.setValue("ratePerLitre", cust.ratePerLitre);
      }
    }
  }, [watchCustomerId, customers, editingId, form]);

  const onSubmit = (values: FormValues) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    form.reset({
      customerId: item.customerId,
      date: item.date.split('T')[0],
      shift: item.shift,
      milkType: item.milkType,
      litres: item.litres,
      fatPercent: item.fatPercent,
      ratePerLitre: item.ratePerLitre,
      notes: item.notes,
    });
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingId(null);
    form.reset({
      customerId: "",
      date: new Date().toISOString().split('T')[0],
      shift: "morning",
      milkType: "cow",
      litres: 0,
      fatPercent: null,
      ratePerLitre: 0,
      notes: "",
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Collections</h1>
          <p className="text-muted-foreground">Manage daily milk collections from suppliers.</p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Collection
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 rounded-lg border">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filter:</span>
        </div>
        <div className="flex flex-1 gap-4 flex-wrap">
          <Select value={shiftFilter} onValueChange={setShiftFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Shifts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Shifts</SelectItem>
              <SelectItem value="morning">Morning</SelectItem>
              <SelectItem value="evening">Evening</SelectItem>
            </SelectContent>
          </Select>

          <Select value={customerFilter} onValueChange={setCustomerFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Suppliers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
              {customers?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Date</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Litres</TableHead>
              <TableHead className="text-right">Rate (₹)</TableHead>
              <TableHead className="text-right">Amount (₹)</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                </TableRow>
              ))
            ) : collections?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  No collections found.
                </TableCell>
              </TableRow>
            ) : (
              collections?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium whitespace-nowrap">{formatDate(item.date)}</TableCell>
                  <TableCell>{item.customerName}</TableCell>
                  <TableCell>
                    <Badge variant={item.shift === 'morning' ? "outline" : "secondary"} className="capitalize">
                      {item.shift}
                    </Badge>
                  </TableCell>
                  <TableCell>
                     <Badge variant="outline" className="capitalize">
                      {item.milkType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatLitres(item.litres)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.ratePerLitre)}</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(item.amount)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(item.id)}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Collection" : "Add Collection"}</DialogTitle>
            <DialogDescription>
              Record a new milk collection from a supplier.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="customerId">Supplier</Label>
                <Controller
                  name="customerId"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="customerId" className={form.formState.errors.customerId ? "border-destructive" : ""}>
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers?.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.customerId && <p className="text-xs text-destructive">{form.formState.errors.customerId.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" {...form.register("date")} className={form.formState.errors.date ? "border-destructive" : ""} />
                {form.formState.errors.date && <p className="text-xs text-destructive">{form.formState.errors.date.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="shift">Shift</Label>
                <Controller
                  name="shift"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="shift">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Morning</SelectItem>
                        <SelectItem value="evening">Evening</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="milkType">Milk Type</Label>
                <Controller
                  name="milkType"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="milkType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cow">Cow</SelectItem>
                        <SelectItem value="buffalo">Buffalo</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="litres">Litres</Label>
                <Input id="litres" type="number" step="0.1" {...form.register("litres")} className={form.formState.errors.litres ? "border-destructive" : ""} />
                {form.formState.errors.litres && <p className="text-xs text-destructive">{form.formState.errors.litres.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fatPercent">Fat % (Optional)</Label>
                <Input id="fatPercent" type="number" step="0.1" {...form.register("fatPercent")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ratePerLitre">Rate per Litre (₹)</Label>
                <Input id="ratePerLitre" type="number" step="0.5" {...form.register("ratePerLitre")} className={form.formState.errors.ratePerLitre ? "border-destructive" : ""} />
                {form.formState.errors.ratePerLitre && <p className="text-xs text-destructive">{form.formState.errors.ratePerLitre.message}</p>}
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input id="notes" {...form.register("notes")} />
              </div>
            </div>

            <div className="bg-muted p-4 rounded-md flex justify-between items-center mt-4">
              <span className="font-medium text-muted-foreground">Computed Amount:</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(computedAmount)}</span>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Collection"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the collection record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}