import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { Plus, Trash2, Edit2, LogOut } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@/lib/utils";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  price: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Price must be a positive number",
  }),
  image_url: z.string().url("Must be a valid URL"),
});

type ProductFormValues = z.infer<typeof productSchema>;

const Admin = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      image_url: "",
    },
  });

  useEffect(() => {
    checkAdmin();
    fetchProducts();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      toast.error("Unauthorized: Admin access required");
      navigate("/");
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch products");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (values: ProductFormValues) => {
    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update({
            name: values.name,
            description: values.description,
            price: parseFloat(values.price),
            image_url: values.image_url,
          })
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast.success("Product updated successfully");
      } else {
        const { error } = await supabase
          .from('products')
          .insert({
            name: values.name,
            description: values.description,
            price: parseFloat(values.price),
            image_url: values.image_url,
          });

        if (error) throw error;
        toast.success("Product added successfully");
      }

      setIsDialogOpen(false);
      form.reset();
      setEditingProduct(null);
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message || "Failed to save product");
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    form.reset({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      image_url: product.image_url,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Product deleted successfully");
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete product");
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Logged out successfully");
      navigate("/auth");
    } catch (error: any) {
      toast.error("Error logging out");
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
          <Button 
            onClick={handleLogout} 
            className="flex items-center justify-center bg-transparent border border-input text-foreground hover:bg-transparent hover:text-foreground w-full sm:w-auto"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className={cn(buttonVariants({ variant: "default" }), "flex items-center justify-center w-full sm:w-auto")}>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm sm:text-base">Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Product name" className="h-10 sm:h-11" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm sm:text-base">Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Product description" 
                            className="min-h-[100px] resize-none"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm sm:text-base">Price</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" className="h-10 sm:h-11" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="image_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm sm:text-base">Image URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/image.jpg" className="h-10 sm:h-11" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className={cn(buttonVariants({ variant: "default" }), "w-full h-10 sm:h-11")}>
                    {editingProduct ? "Update Product" : "Add Product"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {products.map((product) => (
          <Card key={product.id} className="flex flex-col">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex justify-between items-center">
                <span className="truncate text-base sm:text-lg">{product.name}</span>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleEdit(product)}
                    className={cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 sm:h-10 sm:w-10")}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => handleDelete(product.id)}
                    className={cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 sm:h-10 sm:w-10 text-destructive")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-40 sm:h-48 object-cover rounded-lg mb-3 sm:mb-4"
              />
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{product.description}</p>
              <p className="font-bold text-base sm:text-lg">₱{product.price.toFixed(2)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Admin; 