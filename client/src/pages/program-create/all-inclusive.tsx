import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const programSchema = z.object({
  name: z.string().min(1, "Program name is required"),
  description: z.string(),
  price: z.number().min(0, "Price must be 0 or greater"),
  liftingProgramId: z.string().min(1, "Please select a lifting program"),
  dietProgramId: z.string().min(1, "Please select a diet program"),
  posingProgramId: z.string().min(1, "Please select a posing program"),
});

type ProgramFormValues = z.infer<typeof programSchema>;

export default function CreateAllInclusiveProgram() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ProgramFormValues>({
    resolver: zodResolver(programSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
    },
  });

  const { data: liftingPrograms, isLoading: isLoadingLifting } = useQuery({
    queryKey: ["programs", "lifting"],
    queryFn: async () => {
      const response = await fetch("/api/programs?type=lifting");
      if (!response.ok) throw new Error("Failed to fetch lifting programs");
      return response.json();
    },
  });

  const { data: dietPrograms, isLoading: isLoadingDiet } = useQuery({
    queryKey: ["programs", "diet"],
    queryFn: async () => {
      const response = await fetch("/api/programs?type=diet");
      if (!response.ok) throw new Error("Failed to fetch diet programs");
      return response.json();
    },
  });

  const { data: posingPrograms, isLoading: isLoadingPosing } = useQuery({
    queryKey: ["programs", "posing"],
    queryFn: async () => {
      const response = await fetch("/api/programs?type=posing");
      if (!response.ok) throw new Error("Failed to fetch posing programs");
      return response.json();
    },
  });

  const createProgram = useMutation({
    mutationFn: async (data: ProgramFormValues) => {
      const response = await fetch("/api/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          type: "all-inclusive",
        }),
      });
      if (!response.ok) throw new Error("Failed to create program");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast({
        title: "Success",
        description: "Program created successfully",
      });
      setLocation("/programs");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create program",
      });
    },
  });

  const onSubmit = (data: ProgramFormValues) => {
    createProgram.mutate(data);
  };

  if (isLoadingLifting || isLoadingDiet || isLoadingPosing) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          Create All-Inclusive Program
        </h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Program Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Program Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter program name" {...field} />
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
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter program description" {...field} />
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
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Enter price"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="liftingProgramId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Lifting Program</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a lifting program" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {liftingPrograms?.map((program: any) => (
                          <SelectItem key={program.id} value={program.id}>
                            {program.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dietProgramId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Diet Program</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a diet program" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {dietPrograms?.map((program: any) => (
                          <SelectItem key={program.id} value={program.id}>
                            {program.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="posingProgramId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Posing Program</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a posing program" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {posingPrograms?.map((program: any) => (
                          <SelectItem key={program.id} value={program.id}>
                            {program.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={createProgram.isPending}>
              {createProgram.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Create Program
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
