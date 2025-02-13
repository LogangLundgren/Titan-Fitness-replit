import { useQuery } from "@tanstack/react-query";
import { PlusCircle } from "lucide-react";
import { ProgramCard } from "@/components/programs/program-card";
import { useUser } from "@/hooks/use-user";
import type { Program } from "@db/schema";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

interface ClientProgram extends Program {
  enrollmentId: number;
  startDate: string;
  active: boolean;
  version: number;
  progress?: {
    completed: string[];
    notes: string[];
  };
}

export default function Programs() {
  const { user } = useUser();
  const [, setLocation] = useLocation();

  const isCoach = user?.accountType === "coach";

  // Update query key to match API endpoints
  const { data: programs, isLoading } = useQuery<Program[] | ClientProgram[]>({
    queryKey: [`/api/${isCoach ? 'programs' : 'client/programs'}`],
  });

  const handleManageProgram = (programId: number) => {
    setLocation(`/programs/${programId}/manage`);
  };

  const handleCreateProgram = () => {
    setLocation('/programs/create');
  };

  // Loading state with skeleton UI
  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <div className="h-8 bg-muted rounded w-1/4"></div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-[200px] bg-muted rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          {isCoach ? "My Programs" : "My Enrolled Programs"}
        </h1>
        {isCoach && (
          <Button 
            onClick={handleCreateProgram}
            className="flex items-center gap-2"
          >
            <PlusCircle className="h-4 w-4" />
            Create New Program
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {programs?.map((program) => {
          // Properly type assert the program based on user type
          const key = isCoach ? program.id : (program as ClientProgram).enrollmentId;
          return (
            <ProgramCard
              key={key}
              program={program}
              showManageButton={isCoach}
              showEnrollButton={false}
              onManage={isCoach ? () => handleManageProgram(program.id) : undefined}
            />
          );
        })}

        {(!programs || programs.length === 0) && (
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