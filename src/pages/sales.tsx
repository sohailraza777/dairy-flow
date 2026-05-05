import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getSales, 
  addSale, 
  updateSale, 
  deleteSale, 
  getCustomers 
} from "@/lib/db";
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

// Updated Schema for Firebase string IDs
const formSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  date: z.string().min(1, "Date is required"),
  product: z.string().min(1, "Product is required"),
  litres: z.coerce.number().min(0.1, "Litres must be > 0"),
  ratePerLitre: z.coerce.number().min(0, "Rate must be >= 0"),
  amountPaid: z.coerce.number().min(0, "Amount paid must be >= 0"),
  notes: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export default function Sales() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [customerFilter, setCustomerFilter] = React.useState<string>("all");
  
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  // 1. Fetch Sales & Customers from Firebase
  const { data: allSales, isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: getSales
  });

  const { data: customers } = useQuery({
    queryKey: ["customers", "buyer"],
    queryFn: getCustomers
  });

  // 2. Filter data locally
  const sales = React.useMemo(() => {
    if (!allSales) return [];
    return allSales.filter((item: any) => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesCustomer = customerFilter === "all" || item.buyerId === customerFilter;
      return matchesStatus && matchesCustomer;
    });
  }, [allSales, statusFilter, customerFilter]);

  // 3. Firebase Mutations
  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const cust = customers?.find((c: any) => c.id === values.customerId);
      const total = values.litres * values.ratePerLitre;
      const status = values.amountPaid >= total ? 'paid' : values.amountPaid > 0 ? 'partial' : 'pending';
      
      return addSale({
        ...values,
        buyerId: values.customerId,
        buyerName: cust?.name || "Unknown",
        total,
        status,
        amount: total // Backward compatibility with UI fields
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast({ title: "Sale added successfully" });
      setIsDialogOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Error adding sale", description: err.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: FormValues }) => {
      const cust = customers?.find((c: any) => c.id === data.customerId);
      const total = data.litres * data.ratePerLitre;
      const status = data.amountPaid >= total ? 'paid' : data.amountPaid > 0 ? 'partial' : 'pending';
      
      return updateSale(id, {
        ...data,
        buyerId: data.customerId,
        buyerName: cust?.name || "Unknown",
        total,
        status,
        amount: total
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast({ title: "Sale updated successfully" });
      setIsDialogOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Error updating sale", description: err.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast({ title: "Sale deleted successfully" });
      setDeleteId(null);
    },
    onError: (err: any) => {
      toast({ title: "Error deleting sale", description: err.message, variant: "destructive" });
    }
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: "",
      date: new Date().toISOString().split('T')[0],
      product: "Milk",
      litres: 0,
      ratePerLitre: 0,
      amountPaid: 0,
      notes: "",
    },
  });

  const watchLitres = form.watch("litres");
  const watchRate = form.watch("ratePerLitre");
  const watchPaid = form.watch("amountPaid");
  const computedAmount = (watchLitres || 0) * (watchRate || 0);
  const remainingBalance = Math.max(0, computedAmount - (watchPaid || 0));

  const watchCustomerId = form.watch("customerId");

  // Auto-fill rate based on selected customer
  React.useEffect(() => {
    if (watchCustomerId && !editingId) {
      const cust = customers?.find((c: any) => c.id === watchCustomerId);
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
      customerId: item.buyerId,
      date: item.date.split('T')[0],
      product: item.product,
      litres: item.litres,
      ratePerLitre: item.ratePerLitre,
      amountPaid: item.amountPaid || 0,
      notes: item.notes,
    });
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingId(null);
    form.reset({
      customerId: "",
      date: new Date().toISOString().split('T')[0],
      product: "Milk",
      litres: 0,
      ratePerLitre: 0,
      amountPaid: 0,
      notes: "",
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales</h1>
          <p className="text-muted-foreground">Manage sales and buyer payments.</p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Sale
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 rounded-lg border">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filter:</span>
        </div>
        <div className="flex flex-1 gap-4 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
            </SelectContent>
          </Select>

          <Select value={customerFilter} onValueChange={setCustomerFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Buyers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Buyers</SelectItem>
              {customers?.map((c: any) => (
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
              <TableHead>Buyer</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Litres</TableHead>
              <TableHead className="text-right">Amount (₹)</TableHead>
              <TableHead className="text-right">Balance (₹)</TableHead>
              <TableHead>Status</TableHead>
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
                  <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                </TableRow>
              ))
            ) : sales?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  No sales found.
                </TableCell>
              </TableRow>
            ) : (
              sales?.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium whitespace-nowrap">{formatDate(item.date)}</TableCell>
                  <TableCell>{item.buyerName}</TableCell>
                  <TableCell>{item.product}</TableCell>
                  <TableCell className="text-right">{formatLitres(item.litres)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {(item.total - (item.amountPaid || 0)) > 0 ? (
                      <span className="text-destructive">{formatCurrency(item.total - (item.amountPaid || 0))}</span>
                    ) : (
                      formatCurrency(0)
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.status === 'paid' ? 'default' : item.status === 'partial' ? 'secondary' : 'destructive'} className="capitalize">
                      {item.status}
                    </Badge>
                  </TableCell>
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
            <DialogTitle>{editingId ? "Edit Sale" : "Add Sale"}</DialogTitle>
            <DialogDescription>
              Record a new sale to a buyer.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="customerId">Buyer</Label>
                <Controller
                  name="customerId"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="customerId" className={form.formState.errors.customerId ? "border-destructive" : ""}>
                        <SelectValue placeholder="Select buyer" />
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
                <Label htmlFor="product">Product</Label>
                <Input id="product" {...form.register("product")} className={form.formState.errors.product ? "border-destructive" : ""} />
                {form.formState.errors.product && <p className="text-xs text-destructive">{form.formState.errors.product.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="litres">Litres</Label>
                <Input id="litres" type="number" step="0.1" {...form.register("litres")} className={form.formState.errors.litres ? "border-destructive" : ""} />
                {form.formState.errors.litres && <p className="text-xs text-destructive">{form.formState.errors.litres.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ratePerLitre">Rate per Litre (₹)</Label>
                <Input id="ratePerLitre" type="number" step="0.5" {...form.register("ratePerLitre")} className={form.formState.errors.ratePerLitre ? "border-destructive" : ""} />
                {form.formState.errors.ratePerLitre && <p className="text-xs text-destructive">{form.formState.errors.ratePerLitre.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amountPaid">Amount Paid Now (₹)</Label>
                <Input id="amountPaid" type="number" step="1" {...form.register("amountPaid")} className={form.formState.errors.amountPaid ? "border-destructive" : ""} />
                {form.formState.errors.amountPaid && <p className="text-xs text-destructive">{form.formState.errors.amountPaid.message}</p>}
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input id="notes" {...form.register("notes")} />
              </div>
            </div>

            <div className="bg-muted p-4 rounded-md flex justify-between items-center mt-4">
              <div className="flex flex-col gap-1">
                <span className="font-medium text-muted-foreground text-xs uppercase">Total</span>
                <span className="text-xl font-bold">{formatCurrency(computedAmount)}</span>
              </div>
              <div className="flex flex-col gap-1 text-right">
                <span className="font-medium text-muted-foreground text-xs uppercase">Balance Due</span>
                <span className={`text-xl font-bold ${remainingBalance > 0 ? "text-destructive" : "text-primary"}`}>
                  {formatCurrency(remainingBalance)}
                </span>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : "Save Sale"}
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
              This action cannot be undone. This will permanently delete the sale record.
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