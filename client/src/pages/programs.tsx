import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { ProgramCard } from "@/components/programs/program-card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import type { Program } from "@db/schema";
import { useLocation } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";

export default function Programs() {
  const { user } = useUser();
  const [location, setLocation] = useLocation();
  const [isSelectingType, setIsSelectingType] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("");

  const { data: programs, isLoading } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
  });

  const isCoach = user?.accountType === "coach";
  const userPrograms = programs?.filter(p =>
    isCoach ? p.coachId === user.id : p.clientId === user.id
  );

  const handleCreateProgram = () => {
    if (!selectedType) return;

    setIsSelectingType(false);
    setLocation(`/programs/create/${selectedType}`);
  };

  const handleManageProgram = (programId: number) => {
    setLocation(`/programs/${programId}/manage`);
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
          <Dialog open={isSelectingType} onOpenChange={setIsSelectingType}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Program
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Select Program Type</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Select
                  value={selectedType}
                  onValueChange={(value) => setSelectedType(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select program type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lifting">Strength Training</SelectItem>
                    <SelectItem value="diet">Nutrition Plan</SelectItem>
                    <SelectItem value="posing">Posing Coaching</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  className="w-full" 
                  onClick={handleCreateProgram}
                  disabled={!selectedType}
                >
                  Continue
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
            onManage={() => handleManageProgram(program.id)}
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