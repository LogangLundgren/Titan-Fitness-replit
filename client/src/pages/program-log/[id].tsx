import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Program {
  id: number;
  name: string;
  description: string;
  type: 'lifting' | 'diet' | 'posing';
  routines?: Array<{
    id: number;
    name: string;
    exercises: Array<{
      id: number;
      name: string;
      sets: number;
      reps: string;
      notes?: string;
    }>;
  }>;
}

export default function ProgramLog() {
  const { id } = useParams();
  const { toast } = useToast();
  const [selectedRoutine, setSelectedRoutine] = useState<number | null>(null);
  const [logData, setLogData] = useState({
    notes: "",
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
  });

  const { data: program, isLoading } = useQuery<Program>({
    queryKey: [`/api/programs/${id}`],
  });

  const handleLogSubmit = async () => {
    try {
      const response = await fetch(`/api/programs/${id}/logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          logType: program?.type,
          data: {
            ...logData,
            routineId: selectedRoutine,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save log");
      }

      toast({
        title: "Success",
        description: "Log saved successfully",
      });

      // Reset form
      setLogData({
        notes: "",
        calories: "",
        protein: "",
        carbs: "",
        fats: "",
      });
      setSelectedRoutine(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save log",
      });
    }
  };

  if (isLoading || !program) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  const renderLogForm = () => {
    switch (program.type) {
      case "lifting":
        return (
          <div className="space-y-4">
            <div>
              <Label>Select Routine</Label>
              <select
                className="w-full p-2 border rounded"
                value={selectedRoutine || ""}
                onChange={(e) => setSelectedRoutine(Number(e.target.value))}
              >
                <option value="">Select a routine</option>
                {program.routines?.map((routine) => (
                  <option key={routine.id} value={routine.id}>
                    {routine.name}
                  </option>
                ))}
              </select>
            </div>
            {selectedRoutine && (
              <div className="space-y-4">
                {program.routines
                  ?.find((r) => r.id === selectedRoutine)
                  ?.exercises.map((exercise) => (
                    <Card key={exercise.id}>
                      <CardContent className="pt-6">
                        <h3 className="font-medium mb-2">{exercise.name}</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {exercise.sets} sets × {exercise.reps} reps
                        </p>
                        {exercise.notes && (
                          <p className="text-sm text-muted-foreground">
                            Notes: {exercise.notes}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
            <div>
              <Label>Notes</Label>
              <Textarea
                value={logData.notes}
                onChange={(e) => setLogData({ ...logData, notes: e.target.value })}
                placeholder="Add any notes about your workout..."
              />
            </div>
          </div>
        );

      case "diet":
        return (
          <div className="space-y-4">
            <div>
              <Label>Calories</Label>
              <Input
                type="number"
                value={logData.calories}
                onChange={(e) => setLogData({ ...logData, calories: e.target.value })}
                placeholder="Enter total calories"
              />
            </div>
            <div>
              <Label>Protein (g)</Label>
              <Input
                type="number"
                value={logData.protein}
                onChange={(e) => setLogData({ ...logData, protein: e.target.value })}
                placeholder="Enter protein in grams"
              />
            </div>
            <div>
              <Label>Carbs (g)</Label>
              <Input
                type="number"
                value={logData.carbs}
                onChange={(e) => setLogData({ ...logData, carbs: e.target.value })}
                placeholder="Enter carbs in grams"
              />
            </div>
            <div>
              <Label>Fats (g)</Label>
              <Input
                type="number"
                value={logData.fats}
                onChange={(e) => setLogData({ ...logData, fats: e.target.value })}
                placeholder="Enter fats in grams"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={logData.notes}
                onChange={(e) => setLogData({ ...logData, notes: e.target.value })}
                placeholder="Add any notes about your meals..."
              />
            </div>
          </div>
        );

      case "posing":
        return (
          <div className="space-y-4">
            <div>
              <Label>Session Notes</Label>
              <Textarea
                value={logData.notes}
                onChange={(e) => setLogData({ ...logData, notes: e.target.value })}
                placeholder="Add notes about your posing practice..."
              />
            </div>
            {/* Add file upload for posing videos/photos in the next iteration */}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{program.name}</h1>
          <p className="text-muted-foreground">{program.description}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Log {program.type.charAt(0).toUpperCase() + program.type.slice(1)}</CardTitle>
        </CardHeader>
        <CardContent>
          {renderLogForm()}
          <Button onClick={handleLogSubmit} className="mt-6">
            Save Log
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
