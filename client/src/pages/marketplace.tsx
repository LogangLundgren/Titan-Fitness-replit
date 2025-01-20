import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { ProgramCard } from "@/components/programs/program-card";
import type { Program } from "@db/schema";

export default function Marketplace() {
  const { data: programs, isLoading } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
  });

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
        <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {programs?.map((program) => (
          <ProgramCard
            key={program.id}
            program={program}
            showEnrollButton
          />
        ))}
        
        {programs?.length === 0 && (
          <div className="col-span-full text-center py-12">
            <h3 className="text-lg font-medium">No programs available</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Check back later for new programs!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
