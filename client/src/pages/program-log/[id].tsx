import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { queryClient } from "@/lib/queryClient";

interface Program {
  id: number;
  name: string;
  description: string;
  type: 'lifting' | 'diet' | 'posing';
  routines?: Array<{
    id: number;
    name: string;
    exercises: Array<{
      name: string;
      sets: number;
      reps: string;
    }>;
  }>;
}

export default function ProgramLog() {
  const { id } = useParams();
  const { toast } = useToast();
  const [selectedRoutine, setSelectedRoutine] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [mealData, setMealData] = useState({
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
  });

  // Optimized query with proper key structure
  const { data: program, isLoading } = useQuery<Program>({
    queryKey: ["programs", id],
    staleTime: 30000, // Cache for 30 seconds
    cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  const handleSaveLog = async () => {
    if (!program) return;

    try {
      const logData = program.type === 'diet' ? {
        ...mealData,
        notes,
      } : {
        routineId: selectedRoutine,
        notes,
      };

      const response = await fetch(`/api/programs/${id}/logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          logType: program.type,
          data: logData,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save log");
      }

      toast({
        title: "Success",
        description: "Log saved successfully",
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["programs", id] });

      // Reset form
      if (program.type === 'diet') {
        setMealData({
          calories: "",
          protein: "",
          carbs: "",
          fats: "",
        });
      } else {
        setSelectedRoutine("");
      }
      setNotes("");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save log",
      });
    }
  };

  // Loading state with skeleton UI
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-6 space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3"></div>
        <div className="h-4 bg-muted rounded w-2/3"></div>
        <Card>
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/4"></div>
          </CardHeader>
          <div className="p-6 space-y-4">
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </Card>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="max-w-2xl mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Program not found</CardTitle>
          </CardHeader>
          <div className="p-6">
            <p className="text-muted-foreground">The program you're looking for doesn't exist or you don't have access to it.</p>
          </div>
        </Card>
      </div>
    );
  }

  const renderLiftingLog = () => (
    <div className="space-y-4">
      <div>
        <Label>Select Routine</Label>
        <Select value={selectedRoutine} onValueChange={setSelectedRoutine}>
          <SelectTrigger>
            <SelectValue placeholder="Select a routine" />
          </SelectTrigger>
          <SelectContent>
            {program.routines?.map((routine) => (
              <SelectItem key={routine.id} value={routine.id.toString()}>
                {routine.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any notes about your workout..."
          className="h-32"
        />
      </div>
      <Button onClick={handleSaveLog} className="w-full">
        Save Log
      </Button>
    </div>
  );

  const renderMealLog = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label>Calories Consumed</Label>
          <Input
            type="number"
            value={mealData.calories}
            onChange={(e) => setMealData({ ...mealData, calories: e.target.value })}
            placeholder="0"
          />
          <div className="mt-1 text-sm text-muted-foreground">
            Target: 550g
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Protein (g)</Label>
            <Input
              type="number"
              value={mealData.protein}
              onChange={(e) => setMealData({ ...mealData, protein: e.target.value })}
              placeholder="0"
            />
            <div className="mt-1 text-sm text-muted-foreground">
              Target: 20g
            </div>
          </div>
          <div>
            <Label>Carbs (g)</Label>
            <Input
              type="number"
              value={mealData.carbs}
              onChange={(e) => setMealData({ ...mealData, carbs: e.target.value })}
              placeholder="0"
            />
            <div className="mt-1 text-sm text-muted-foreground">
              Target: 5g
            </div>
          </div>
          <div>
            <Label>Fats (g)</Label>
            <Input
              type="number"
              value={mealData.fats}
              onChange={(e) => setMealData({ ...mealData, fats: e.target.value })}
              placeholder="0"
            />
            <div className="mt-1 text-sm text-muted-foreground">
              Target: 5g
            </div>
          </div>
        </div>
      </div>

      <div>
        <Label>Logged Foods</Label>
        <div className="mt-2 text-sm text-muted-foreground">
          No foods logged yet
        </div>
        <Button variant="outline" className="mt-4 w-full">
          Add Food
        </Button>
      </div>

      <Button onClick={handleSaveLog} className="w-full">
        Submit Meal Log
      </Button>
    </div>
  );

  const renderPosingLog = () => (
    <div className="space-y-4">
      <div>
        <Label>Session Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes about your posing practice..."
          className="h-32"
        />
      </div>
      <Button onClick={handleSaveLog} className="w-full">
        Save Log
      </Button>
    </div>
  );

  const renderLogForm = () => {
    switch (program.type) {
      case "lifting":
        return renderLiftingLog();
      case "diet":
        return renderMealLog();
      case "posing":
        return renderPosingLog();
      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{program.name}</h1>
        <p className="text-sm text-muted-foreground">{program.description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Log {program.type === 'lifting' ? 'Lifting' : program.type === 'diet' ? 'Meal' : 'Posing'}
          </CardTitle>
        </CardHeader>
        <div className="p-6">
          {renderLogForm()}
        </div>
      </Card>
    </div>
  );
}