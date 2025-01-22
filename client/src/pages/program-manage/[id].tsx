import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { Program } from "@db/schema";

export default function ManageProgram({ params }: { params: { id: string } }) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [program, setProgram] = useState<Program | null>(null);
  const [renderStartTime, setRenderStartTime] = useState<number>(0);

  // Add performance measurement
  const { data: fetchedProgram, isLoading } = useQuery<Program>({
    queryKey: [`/api/programs/${params.id}`],
    queryFn: async ({ queryKey }) => {
      const startTime = performance.now();
      console.log(`[Performance] Starting API request at ${startTime}ms`);

      const response = await fetch(queryKey[0] as string, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      const endTime = performance.now();
      console.log(`[Performance] API request completed in ${endTime - startTime}ms`);
      return data;
    }
  });

  useEffect(() => {
    if (fetchedProgram) {
      const startTime = performance.now();
      setRenderStartTime(startTime);
      console.log(`[Performance] Starting render at ${startTime}ms`);

      setProgram(fetchedProgram);
    }
  }, [fetchedProgram]);

  useEffect(() => {
    if (program && renderStartTime > 0) {
      const endTime = performance.now();
      console.log(`[Performance] Render completed in ${endTime - renderStartTime}ms`);
    }
  }, [program, renderStartTime]);

  const handleSave = async () => {
    if (!program) return;

    try {
      setIsSubmitting(true);
      setShowConfirmDialog(false);

      const startTime = performance.now();
      console.log(`[Performance] Starting save request at ${startTime}ms`);

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

      const endTime = performance.now();
      console.log(`[Performance] Save request completed in ${endTime - startTime}ms`);

      await queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      await queryClient.invalidateQueries({ queryKey: [`/api/programs/${params.id}`] });

      toast({
        title: "Success",
        description: "Program updated successfully",
      });

      setLocation("/programs");
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

  if (isLoading || !program) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Manage Program</h1>
        <Button onClick={() => setShowConfirmDialog(true)} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Program Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Program Name</Label>
              <Input
                id="name"
                value={program.name}
                onChange={(e) => setProgram({ ...program, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={program.description || ""}
                onChange={(e) => setProgram({ ...program, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={program.price || 0}
                onChange={(e) => setProgram({ ...program, price: parseFloat(e.target.value) })}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Changes</DialogTitle>
            <DialogDescription>
              Are you sure you want to save these changes? This will update the program for all users.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}