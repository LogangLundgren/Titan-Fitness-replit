import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { Program, Routine } from "@db/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export default function ProgramManage() {
  const [, params] = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: program, isLoading } = useQuery<Program & { routines: Array<Routine & { exercises: any[] }> }>({
    queryKey: [`/api/programs/${params.id}`],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/programs/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(program),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await queryClient.invalidateQueries({ queryKey: [`/api/programs/${params.id}`] });
      toast({
        title: "Success",
        description: "Program updated successfully",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium">Program not found</h3>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Manage Program: {program.name}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Program Name</Label>
              <Input
                value={program.name}
                onChange={(e) =>
                  queryClient.setQueryData([`/api/programs/${params.id}`], {
                    ...program,
                    name: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={program.description || ""}
                onChange={(e) =>
                  queryClient.setQueryData([`/api/programs/${params.id}`], {
                    ...program,
                    description: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Price ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={program.price || 0}
                onChange={(e) =>
                  queryClient.setQueryData([`/api/programs/${params.id}`], {
                    ...program,
                    price: parseFloat(e.target.value),
                  })
                }
              />
            </div>
          </div>
        </Card>

        {/* We'll add workout days editing in the next iteration */}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Save Changes
        </Button>
      </form>
    </div>
  );
}