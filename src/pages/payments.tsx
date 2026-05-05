import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getPayments, 
  addPayment, 
  deletePayment, 
  getCustomers, 
  getSales 
} from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/format";
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
import { Trash2, Plus, Filter, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Using string for customerId to match Firebase Document IDs
const formSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  date: z.string().min(1, "Date is required"),
  amount: z.coerce.number().min(1, "Amount must be > 0"),
  method: z.enum(["cash", "bank", "upi", "other"]),
  notes: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export default function Payments() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [customerFilter, setCustomerFilter] = React.useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  // 1. Fetch Data from Firebase
  const { data: payments, isLoading } = useQuery({
    queryKey: ["payments", customerFilter],
    queryFn: getPayments
  });

  const { data: customers } = useQuery({
    queryKey: ["customers", "buyer"],
    queryFn: getCustomers
  });
  
  const { data: allSales } = useQuery({
    queryKey: ["sales"],
    queryFn: getSales
  });

  // 2. Filter Payments locally
  const filteredPayments = React.useMemo(() => {
    if (!payments) return [];
    if (customerFilter === "all") return payments;
    return payments.filter((p: any) => p.customerId === customerFilter);
  }, [payments, customerFilter]);

  // 3. Calculate Outstanding Balances locally
  const outstandingBalances = React.useMemo(() => {
    if (!allSales || !payments || !customers) return [];
    
    const balances: Record<string, { customerId: string, customerName: string, balance: number }> = {};
    
    // Add up all sales per customer
    allSales.forEach((sale: any) => {
      if (!balances[sale.buyerId]) {
        const cust = customers.find((c: any) => c.id === sale.buyerId);
        balances[sale.buyerId] = { customerId: sale.buyerId, customerName: cust?.name || "Unknown", balance: 0 };
      }
      balances[sale.buyerId].balance += (Number(sale.total) || 0);
    });

    // Subtract all payments per customer
    payments.forEach((payment: any) => {
      if (balances[payment.customerId]) {
        balances[payment.customerId].balance -= (Number(payment.amount) || 0);
      }
    });
    
    return Object.values(balances)
      .filter(b => b.balance > 0)
      .sort((a, b) => b.balance - a.balance);
  }, [allSales, payments, customers]);

  // 4. Mutations
  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const cust = customers?.find((c: any) => c.id === values.customerId);
      return addPayment({
        ...values,
        customerName: cust?.name || "Unknown Customer"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast({ title: "Payment recorded successfully" });
      setIsDialogOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Error recording payment", description: err.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deletePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast({ title: "Payment deleted successfully" });
      setDeleteId(null);
    },
    onError: (err: any) => {
      toast({ title: "Error deleting payment", description: err.message, variant: "destructive" });
    }
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: "",
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      method: "cash",
      notes: "",
    },
  });

  const handleAddNew = (customerId?: string) => {
    form.reset({
      customerId: customerId || "",
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      method: "cash",
      notes: "",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (values: FormValues) => {
    createMutation.mutate(values);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">Record and manage payments from buyers.</p>
        </div>
        <Button onClick={() => handleAddNew()}>
          <Plus className="mr-2 h-4 w-4" />
          Record Payment
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 rounded-lg border">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter:</span>
            </div>
            <div className="flex flex-1 gap-4 flex-wrap">
              <Select value={customerFilter} onValueChange={setCustomerFilter}>
                <SelectTrigger className="w-[250px]">
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
                  <TableHead>Customer</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount (₹)</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredPayments?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No payments found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments?.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium whitespace-nowrap">{formatDate(item.date)}</TableCell>
                      <TableCell>{item.customerName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase text-[10px]">
                          {item.method}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-primary">
                        {formatCurrency(item.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm truncate max-w-[150px]">
                        {item.notes || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end">
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
        </div>

        <div className="md:col-span-1">
          <Card>
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Outstanding Balances
              </CardTitle>
              <CardDescription>Buyers with pending payments</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {outstandingBalances.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  No outstanding balances. All buyers are paid up!
                </div>
              ) : (
                <ul className="divide-y">
                  {outstandingBalances.map((item) => (
                    <li key={item.customerId} className="p-4 flex items-center justify-between hover:bg-muted/30">
                      <div>
                        <div className="font-medium text-sm">{item.customerName}</div>
                        <div className="text-destructive font-bold">{formatCurrency(item.balance)}</div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleAddNew(item.customerId)}>
                        Receive
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Log a payment received from a buyer.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="space-y-2">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" {...form.register("date")} className={form.formState.errors.date ? "border-destructive" : ""} />
                {form.formState.errors.date && <p className="text-xs text-destructive">{form.formState.errors.date.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="method">Method</Label>
                <Controller
                  name="method"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="method">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank">Bank Transfer</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input id="amount" type="number" step="1" {...form.register("amount")} className={form.formState.errors.amount ? "border-destructive" : ""} />
              {form.formState.errors.amount && <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes / Ref No (Optional)</Label>
              <Input id="notes" {...form.register("notes")} />
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Recording..." : "Record Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This will permanently remove the payment record and affect the buyer's balance.
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