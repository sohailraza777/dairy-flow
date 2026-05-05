import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getCustomers, 
  addCustomer, 
  updateCustomer, 
  deleteCustomer 
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, Trash2, Plus, Filter, Search, Phone, MapPin, User as UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["supplier", "buyer", "both"]),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  ratePerLitre: z.coerce.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export default function Customers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string | null>(null);

  // Fetch Customers directly from Firestore
  const { data: allCustomers, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: getCustomers
  });

  // Client-side filtering and searching
  const customers = React.useMemo(() => {
    if (!allCustomers) return [];
    return allCustomers.filter((c: any) => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "all" || c.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [allCustomers, search, typeFilter]);

  const customerDetails = React.useMemo(() => {
    return allCustomers?.find((c: any) => c.id === selectedCustomerId);
  }, [allCustomers, selectedCustomerId]);

  const createMutation = useMutation({
    mutationFn: addCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({ title: "Customer added successfully" });
      setIsDialogOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Error adding customer", description: err.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({ title: "Customer updated successfully" });
      setIsDialogOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Error updating customer", description: err.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({ title: "Customer deleted successfully" });
      setDeleteId(null);
    },
    onError: (err: any) => {
      toast({ title: "Error deleting customer", description: err.message, variant: "destructive" });
    }
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "supplier",
      phone: "",
      address: "",
      ratePerLitre: null,
      notes: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleEdit = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    setEditingId(item.id);
    form.reset({
      name: item.name,
      type: item.type,
      phone: item.phone,
      address: item.address,
      ratePerLitre: item.ratePerLitre,
      notes: item.notes,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteId(id);
  };

  const handleAddNew = () => {
    setEditingId(null);
    form.reset({
      name: "",
      type: "supplier",
      phone: "",
      address: "",
      ratePerLitre: null,
      notes: "",
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">Manage your suppliers and buyers.</p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 rounded-lg border">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filter:</span>
        </div>
        <div className="flex flex-1 gap-4 flex-wrap">
          <div className="relative w-full max-w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Search customers..." 
              className="pl-8" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="supplier">Suppliers</SelectItem>
              <SelectItem value="buyer">Buyers</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="text-right">Default Rate (₹)</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                </TableRow>
              ))
            ) : customers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No customers found.
                </TableCell>
              </TableRow>
            ) : (
              customers?.map((item: any) => (
                <TableRow 
                  key={item.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedCustomerId(item.id)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="bg-primary/10 p-1.5 rounded-full">
                        <UserIcon className="h-4 w-4 text-primary" />
                      </div>
                      {item.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.type === 'supplier' ? "default" : item.type === 'buyer' ? "secondary" : "outline"} className="capitalize">
                      {item.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.phone || "-"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{item.address || "-"}</TableCell>
                  <TableCell className="text-right">{item.ratePerLitre ? formatCurrency(item.ratePerLitre) : "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={(e) => handleEdit(e, item)}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={(e) => handleDelete(e, item.id)}>
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
            <DialogTitle>{editingId ? "Edit Customer" : "Add Customer"}</DialogTitle>
            <DialogDescription>
              Add a new supplier or buyer to your network.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" {...form.register("name")} className={form.formState.errors.name ? "border-destructive" : ""} />
                {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="type">Customer Type</Label>
                <Controller
                  name="type"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="supplier">Supplier (Provides milk)</SelectItem>
                        <SelectItem value="buyer">Buyer (Purchases milk/products)</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" {...form.register("phone")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ratePerLitre">Default Rate (₹/L)</Label>
                <Input id="ratePerLitre" type="number" step="0.5" {...form.register("ratePerLitre")} />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" {...form.register("address")} />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" {...form.register("notes")} />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Customer"}
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
              This action cannot be undone. This will permanently delete the customer and all associated records.
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

      <Sheet open={!!selectedCustomerId} onOpenChange={(open) => !open && setSelectedCustomerId(null)}>
        <SheetContent className="sm:max-w-md w-full overflow-y-auto">
          <SheetHeader className="pb-4 border-b mb-4">
            <SheetTitle className="flex items-center gap-2 text-2xl">
              <div className="bg-primary/10 p-2 rounded-full">
                <UserIcon className="h-6 w-6 text-primary" />
              </div>
              {customerDetails?.name}
            </SheetTitle>
            <SheetDescription>
              <div className="flex gap-2 items-center mt-2">
                <Badge variant="outline" className="capitalize">{customerDetails?.type}</Badge>
                <span className="text-xs text-muted-foreground">Joined {customerDetails && formatDate(customerDetails.createdAt)}</span>
              </div>
            </SheetDescription>
          </SheetHeader>

          {customerDetails ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {customerDetails.phone && (
                  <div className="flex flex-col gap-1 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3"/> Phone</span>
                    <span className="font-medium">{customerDetails.phone}</span>
                  </div>
                )}
                {customerDetails.address && (
                  <div className="flex flex-col gap-1 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3 w-3"/> Address</span>
                    <span className="font-medium">{customerDetails.address}</span>
                  </div>
                )}
                {customerDetails.ratePerLitre && (
                  <div className="flex flex-col gap-1 text-sm">
                    <span className="text-muted-foreground">Default Rate</span>
                    <span className="font-medium">{formatCurrency(customerDetails.ratePerLitre)}/L</span>
                  </div>
                )}
              </div>

              {customerDetails.notes && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Notes</h4>
                  <p className="text-sm bg-muted/30 p-3 rounded-md border">{customerDetails.notes}</p>
                </div>
              )}
              
              <div className="pt-4 border-t flex justify-end gap-2">
                <Button variant="outline" onClick={(e) => { setSelectedCustomerId(null); handleEdit(e, customerDetails); }}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button variant="destructive" onClick={(e) => { setSelectedCustomerId(null); handleDelete(e, customerDetails.id); }}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">Customer details not available.</div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}