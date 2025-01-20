import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { ProgramCard } from "@/components/programs/program-card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import type { Program, ClientProgram } from "@db/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function Programs() {
  const { user } = useUser();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [newProgram, setNewProgram] = useState({
    name: "",
    description: "",
    type: "lifting",
    price: 0,
  });

  const { data: programs, isLoading } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
  });

  const isCoach = user?.accountType === "coach";
  const userPrograms = programs?.filter(p => 
    isCoach ? p.coachId === user.id : true
  );

  const handleCreateProgram = async () => {
    try {
      const response = await fetch("/api/programs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newProgram),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      toast({
        title: "Success",
        description: "Program created successfully",
      });
      setIsCreating(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">
          {isCoach ? "My Programs" : "Enrolled Programs"}
        </h1>
        
        {isCoach && (
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Program
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Program</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Program Name</Label>
                  <Input
                    id="name"
                    value={newProgram.name}
                    onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newProgram.description}
                    onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={newProgram.type}
                    onValueChange={(value) => setNewProgram({ ...newProgram, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lifting">Lifting</SelectItem>
                      <SelectItem value="diet">Diet</SelectItem>
                      <SelectItem value="posing">Posing</SelectItem>
                      <SelectItem value="coaching">Coaching</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newProgram.price}
                    onChange={(e) => setNewProgram({ ...newProgram, price: parseFloat(e.target.value) })}
                  />
                </div>
                <Button 
                  className="w-full mt-4" 
                  onClick={handleCreateProgram}
                >
                  Create Program
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {userPrograms?.map((program) => (
          <ProgramCard
            key={program.id}
            program={program}
            showManageButton={isCoach}
          />
        ))}
        
        {userPrograms?.length === 0 && (
          <div className="col-span-full text-center py-12">
            <h3 className="text-lg font-medium">
              {isCoach ? "No programs created" : "No programs enrolled"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {isCoach 
                ? "Create your first program to get started!"
                : "Enroll in a program from the marketplace to get started!"
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
