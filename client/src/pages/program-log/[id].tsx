import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Loader2, BarChart3, History, MessageCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface Exercise {
  id: number;
  name: string;
  sets: number;
  reps: string;
  restTime?: string;
  notes?: string;
}

interface Routine {
  id: number;
  name: string;
  exercises: Exercise[];
}

interface Program {
  enrollmentId: number;
  programId: number;
  name: string;
  description: string;
  type: 'lifting' | 'diet' | 'posing';
  routines?: Routine[];
  startDate: string;
  active: boolean;
  progress?: {
    completed: string[];
    notes: Array<{
      date: string;
      routineId: number;
      note: string;
    }>;
  };
}

interface WorkoutLog {
  routineId: number;
  exerciseLogs: {
    exerciseId: number;
    sets: Array<{
      weight?: number;
      reps: number;
      notes?: string;
    }>;
  }[];
  notes?: string;
}

interface MealLog {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  notes?: string;
}

export default function ProgramLog() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRoutine, setSelectedRoutine] = useState<string>("");
  const [workoutData, setWorkoutData] = useState<WorkoutLog>({
    routineId: 0,
    exerciseLogs: [],
    notes: "",
  });
  const [mealData, setMealData] = useState<MealLog>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    notes: "",
  });

  // Fetch program details
  const { data: program, isLoading } = useQuery<Program>({
    queryKey: [`/api/client/programs/${id}`],
  });

  // Fetch workout history
  const { data: workoutHistory } = useQuery({
    queryKey: [`/api/workouts/${id}`],
    enabled: !!id,
  });

  // Mutation for logging workout
  const logWorkoutMutation = useMutation({
    mutationFn: async (log: WorkoutLog) => {
      const response = await fetch(`/api/workouts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          clientProgramId: parseInt(id!),
          routineId: log.routineId,
          data: log,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/client/programs/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/workouts/${id}`] });
      toast({
        title: "Success",
        description: "Workout logged successfully",
      });
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  // Mutation for logging meal
  const logMealMutation = useMutation({
    mutationFn: async (log: MealLog) => {
      const response = await fetch(`/api/meals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          clientProgramId: parseInt(id!),
          data: log,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/client/programs/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/meals/${id}`] });
      toast({
        title: "Success",
        description: "Meal logged successfully",
      });
      resetMealForm();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const handleRoutineSelect = (routineId: string) => {
    setSelectedRoutine(routineId);
    const routine = program?.routines?.find(r => r.id.toString() === routineId);
    if (routine) {
      setWorkoutData({
        routineId: routine.id,
        exerciseLogs: routine.exercises.map(exercise => ({
          exerciseId: exercise.id,
          sets: Array(exercise.sets).fill({ reps: 0 }),
        })),
        notes: "",
      });
    }
  };

  const updateSetData = (exerciseIndex: number, setIndex: number, field: keyof typeof workoutData.exerciseLogs[0]["sets"][0], value: string) => {
    setWorkoutData(prev => {
      const newData = { ...prev };
      if (newData.exerciseLogs[exerciseIndex]) {
        newData.exerciseLogs[exerciseIndex].sets[setIndex] = {
          ...newData.exerciseLogs[exerciseIndex].sets[setIndex],
          [field]: field === 'reps' ? parseInt(value) : parseFloat(value),
        };
      }
      return newData;
    });
  };

  const handleSubmit = () => {
    if (!selectedRoutine || !workoutData.exerciseLogs.length) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields",
      });
      return;
    }

    logWorkoutMutation.mutate(workoutData);
  };

  const resetForm = () => {
    setSelectedRoutine("");
    setWorkoutData({
      routineId: 0,
      exerciseLogs: [],
      notes: "",
    });
  };

  const handleMealSubmit = () => {
    logMealMutation.mutate(mealData);
  };

  const resetMealForm = () => {
    setMealData({
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      notes: "",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
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
          <CardContent>
            <p className="text-muted-foreground">
              The program you're looking for doesn't exist or you don't have access to it.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{program.name}</h1>
        <p className="text-sm text-muted-foreground">{program.description}</p>
      </div>

      {program.type === 'lifting' ? (
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="log" className="space-y-4">
              <TabsList>
                <TabsTrigger value="log">Log Workout</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="log" className="space-y-4">
                <div>
                  <Label>Select Routine</Label>
                  <Select value={selectedRoutine} onValueChange={handleRoutineSelect}>
                    <SelectTrigger className="w-full">
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

                {selectedRoutine && (
                  <>
                    <div className="space-y-4">
                      {program.routines
                        ?.find(r => r.id.toString() === selectedRoutine)
                        ?.exercises.map((exercise, exerciseIndex) => (
                          <Card key={exercise.id}>
                            <CardHeader>
                              <CardTitle className="text-lg">{exercise.name}</CardTitle>
                              {exercise.notes && (
                                <p className="text-sm text-muted-foreground">{exercise.notes}</p>
                              )}
                            </CardHeader>
                            <CardContent>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Set</TableHead>
                                    <TableHead>Weight (lbs)</TableHead>
                                    <TableHead>Reps</TableHead>
                                    <TableHead>Notes</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {Array(exercise.sets).fill(0).map((_, setIndex) => (
                                    <TableRow key={setIndex}>
                                      <TableCell>{setIndex + 1}</TableCell>
                                      <TableCell>
                                        <Input
                                          type="number"
                                          placeholder="0"
                                          value={workoutData.exerciseLogs[exerciseIndex]?.sets[setIndex]?.weight || ""}
                                          onChange={(e) => updateSetData(exerciseIndex, setIndex, 'weight', e.target.value)}
                                          className="w-20"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          type="number"
                                          placeholder="0"
                                          value={workoutData.exerciseLogs[exerciseIndex]?.sets[setIndex]?.reps || ""}
                                          onChange={(e) => updateSetData(exerciseIndex, setIndex, 'reps', e.target.value)}
                                          className="w-20"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          type="text"
                                          placeholder="Optional notes"
                                          value={workoutData.exerciseLogs[exerciseIndex]?.sets[setIndex]?.notes || ""}
                                          onChange={(e) => updateSetData(exerciseIndex, setIndex, 'notes', e.target.value)}
                                        />
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </CardContent>
                          </Card>
                        ))}
                    </div>

                    <div className="space-y-2">
                      <Label>Workout Notes</Label>
                      <Textarea
                        value={workoutData.notes}
                        onChange={(e) => setWorkoutData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Add any notes about your workout..."
                        className="h-32"
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button
                        onClick={handleSubmit}
                        disabled={logWorkoutMutation.isPending}
                      >
                        {logWorkoutMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Save Workout
                      </Button>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="history">
                <div className="space-y-4">
                  {workoutHistory ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Routine</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {program.progress?.completed.map((routineId, index) => {
                          const routine = program.routines?.find(r => r.id.toString() === routineId);
                          const note = program.progress?.notes?.find(n => n.routineId.toString() === routineId);
                          return (
                            <TableRow key={index}>
                              <TableCell>{note?.date ? new Date(note.date).toLocaleDateString() : 'N/A'}</TableCell>
                              <TableCell>{routine?.name || 'Unknown'}</TableCell>
                              <TableCell>{note?.note || 'No notes'}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground">No workout history available.</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="analytics">
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Analytics coming soon
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : program.type === 'diet' ? (
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="log" className="space-y-4">
              <TabsList>
                <TabsTrigger value="log">Log Meal</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="log">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label>Calories</Label>
                      <Input
                        type="number"
                        placeholder="Enter calories"
                        value={mealData.calories || ""}
                        onChange={(e) => setMealData(prev => ({
                          ...prev,
                          calories: e.target.value ? parseInt(e.target.value) : 0
                        }))}
                        className="w-full"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Protein (g)</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={mealData.protein || ""}
                          onChange={(e) => setMealData(prev => ({
                            ...prev,
                            protein: e.target.value ? parseInt(e.target.value) : 0
                          }))}
                        />
                      </div>
                      <div>
                        <Label>Carbs (g)</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={mealData.carbs || ""}
                          onChange={(e) => setMealData(prev => ({
                            ...prev,
                            carbs: e.target.value ? parseInt(e.target.value) : 0
                          }))}
                        />
                      </div>
                      <div>
                        <Label>Fats (g)</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={mealData.fats || ""}
                          onChange={(e) => setMealData(prev => ({
                            ...prev,
                            fats: e.target.value ? parseInt(e.target.value) : 0
                          }))}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Textarea
                        placeholder="Add any notes about your meal..."
                        value={mealData.notes || ""}
                        onChange={(e) => setMealData(prev => ({
                          ...prev,
                          notes: e.target.value
                        }))}
                        className="h-32"
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleMealSubmit}
                      disabled={logMealMutation.isPending}
                    >
                      {logMealMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Save Meal Log
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="history">
                <div className="space-y-4">
                  {program.progress?.completed.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Calories</TableHead>
                          <TableHead>Protein</TableHead>
                          <TableHead>Carbs</TableHead>
                          <TableHead>Fats</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {program.progress.completed.map((entry, index) => (
                          <TableRow key={index}>
                            <TableCell>{new Date(entry).toLocaleDateString()}</TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>-</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground">No meal logs yet. Start by logging your first meal!</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="analytics">
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Analytics coming soon
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Posing Program</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This program type is currently under development.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}