import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { ProgramCard } from "@/components/programs/program-card";
import { useUser } from "@/hooks/use-user";
import type { Program } from "@db/schema";
import { useLocation } from "wouter";

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
  const [location, setLocation] = useLocation();

  const isCoach = user?.accountType === "coach";

  // Optimized query with proper key structure
  const { data: programs, isLoading } = useQuery<Program[] | ClientProgram[]>({
    queryKey: [isCoach ? "coach-programs" : "client-programs"],
    staleTime: 30000, // Cache for 30 seconds
    cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  const handleManageProgram = (programId: number) => {
    setLocation(`/programs/${programId}/manage`);
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
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {programs?.map((program) => {
          // Properly type assert the program based on user type
          const key = isCoach ? program.id : (program as ClientProgram).id;
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