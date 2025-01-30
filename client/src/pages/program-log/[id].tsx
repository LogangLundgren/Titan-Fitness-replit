<style jsx global>{`
  /* Remove spinners for number inputs */
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type=number] {
    -moz-appearance: textfield;
  }
`}</style>

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Loader2, Plus, Trash2, Pencil, X, Check } from "lucide-react";
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { startOfMonth, endOfMonth } from "date-fns";

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
  id?: number;
}

interface WorkoutHistory {
  id: number;
  date: string;
  routineId: number;
  routineName: string;
  exercises: Array<{
    name: string;
    sets: Array<{
      weight: number;
      reps: number;
    }>;
    id: number; // Added exerciseId
  }>;
  notes?: string;
  canEdit?: boolean;
  canDelete?: boolean;
}

interface MealHistory {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  notes?: string;
  id: number;
  canEdit?: boolean;
  canDelete?: boolean;
}

const NumberInput = ({ value, onChange, className = "w-20" }: {
  value: number | undefined | null,
  onChange: (value: number | null) => void,
  className?: string
}) => (
  <Input
    type="text"
    className={className}
    value={value ?? ""}
    onChange={(e) => {
      const val = e.target.value;
      if (val === "") {
        onChange(null);
      } else {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          onChange(num);
        }
      }
    }}
    pattern="[0-9]*\.?[0-9]*"
  />
);


export default function ProgramLog() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
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

  const { data: program, isLoading } = useQuery<Program>({
    queryKey: [`/api/client/programs/${id}`],
  });

  const { data: workoutHistory } = useQuery<WorkoutHistory[]>({
    queryKey: [`/api/workouts/${id}`],
    enabled: !!id && program?.type === 'lifting',
  });

  const { data: mealHistory } = useQuery<MealHistory[]>({
    queryKey: [`/api/meals/${id}`],
    enabled: !!id && program?.type === 'diet',
  });

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

  const deleteMealMutation = useMutation({
    mutationFn: async (mealId: number) => {
      const response = await fetch(`/api/meals/${mealId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/meals/${id}`] });
      toast({
        title: "Success",
        description: "Meal log deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const deleteWorkoutMutation = useMutation({
    mutationFn: async (workoutId: number) => {
      const response = await fetch(`/api/workouts/${workoutId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workouts/${id}`] });
      toast({
        title: "Success",
        description: "Workout log deleted successfully",
      });
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

  const filteredMealHistory = mealHistory?.filter(log => {
    const logDate = new Date(log.date);
    return logDate >= dateRange.from && logDate <= dateRange.to;
  });

  const updateWorkoutMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: WorkoutLog }) => {
      const response = await fetch(`/api/workouts/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ data }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workouts/${id}`] });
      toast({
        title: "Success",
        description: "Workout updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const [editingWorkoutId, setEditingWorkoutId] = useState<number | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutLog | null>(null);

  const handleEditWorkout = (workout: WorkoutHistory) => {
    setEditingWorkoutId(workout.id);
    setEditingWorkout({
      routineId: workout.routineId,
      exerciseLogs: workout.exercises.map(ex => ({
        exerciseId: ex.id,
        sets: ex.sets.map(set => ({
          weight: set.weight,
          reps: set.reps,
        })),
      })),
      notes: workout.notes || "",
    });
  };

  const handleSaveWorkout = async (workoutId: number) => {
    if (!editingWorkout) return;

    try {
      await updateWorkoutMutation.mutateAsync({
        id: workoutId,
        data: editingWorkout,
      });
      setEditingWorkoutId(null);
      setEditingWorkout(null);
    } catch (error) {
      console.error("Error updating workout:", error);
    }
  };


  const updateMealMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: MealLog }) => {
      const response = await fetch(`/api/meals/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ data }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/meals/${id}`] });
      toast({
        title: "Success",
        description: "Meal log updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const [editingMealId, setEditingMealId] = useState<number | null>(null);
  const [editingMeal, setEditingMeal] = useState<MealLog | null>(null);

  const handleEditMeal = (meal: MealHistory) => {
    setEditingMealId(meal.id);
    setEditingMeal({
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fats: meal.fats || 0,
      notes: meal.notes || "",
    });
  };

  const handleSaveMeal = async (mealId: number) => {
    if (!editingMeal) return;

    try {
      await updateMealMutation.mutateAsync({
        id: mealId,
        data: editingMeal,
      });
      setEditingMealId(null);
      setEditingMeal(null);
    } catch (error) {
      console.error("Error updating meal:", error);
    }
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
    <div className="container max-w-5xl mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{program.name}</h1>
          <p className="text-sm text-muted-foreground">{program.description}</p>
        </div>
      </div>

      {program.type === 'lifting' ? (
        <div className="space-y-6">
          <Tabs defaultValue="log" className="space-y-4">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="log">Log Workout</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="log">
              {selectedRoutine ? (
                <div className="space-y-6">
                  {program.routines
                    ?.find(r => r.id.toString() === selectedRoutine)
                    ?.exercises.map((exercise, exerciseIndex) => (
                      <Card key={exercise.id} className="overflow-hidden">
                        <CardHeader className="bg-muted/40">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{exercise.name}</CardTitle>
                            <span className="text-sm text-muted-foreground">
                              {exercise.sets} sets × {exercise.reps} reps
                            </span>
                          </div>
                          {exercise.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{exercise.notes}</p>
                          )}
                        </CardHeader>
                        <CardContent className="pt-6">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[80px]">Set</TableHead>
                                <TableHead className="w-[120px]">Weight (lbs)</TableHead>
                                <TableHead className="w-[100px]">Reps</TableHead>
                                <TableHead>Notes</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Array(exercise.sets).fill(0).map((_, setIndex) => (
                                <TableRow key={setIndex}>
                                  <TableCell className="font-medium">{setIndex + 1}</TableCell>
                                  <TableCell>
                                    <NumberInput
                                      value={workoutData.exerciseLogs[exerciseIndex]?.sets[setIndex]?.weight}
                                      onChange={(val) => updateSetData(exerciseIndex, setIndex, 'weight', val === null ? "" : val.toString())}
                                      className="w-24"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <NumberInput
                                      value={workoutData.exerciseLogs[exerciseIndex]?.sets[setIndex]?.reps}
                                      onChange={(val) => updateSetData(exerciseIndex, setIndex, 'reps', val === null ? "" : val.toString())}
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

                  <Card>
                    <CardContent className="pt-6">
                      <Label>Workout Notes</Label>
                      <Textarea
                        value={workoutData.notes}
                        onChange={(e) => setWorkoutData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Add any notes about your workout..."
                        className="mt-2 h-32"
                      />
                    </CardContent>
                  </Card>

                  <div className="flex justify-end gap-4">
                    <Button
                      variant="outline"
                      onClick={resetForm}
                    >
                      Clear
                    </Button>
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
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <Label>Select Routine</Label>
                      <Select value={selectedRoutine} onValueChange={handleRoutineSelect}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a routine to log" />
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
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="history">
              <div className="space-y-4">
                {workoutHistory && workoutHistory.length > 0 ? (
                  <div className="space-y-6">
                    {workoutHistory.map((log) => (
                      <Card key={`${log.date}-${log.routineId}`}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                          <div>
                            <CardTitle className="text-lg">
                              {log.routineName}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {new Date(log.date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {log.canEdit && editingWorkoutId !== log.id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditWorkout(log)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {editingWorkoutId === log.id && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setEditingWorkoutId(null);
                                    setEditingWorkout(null);
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleSaveWorkout(log.id)}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {log.canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this workout log?")) {
                                    deleteWorkoutMutation.mutate(log.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Exercise</TableHead>
                                <TableHead>Sets</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {log.exercises.map((exercise, index) => (
                                <TableRow key={`${index}-${exercise.name}`}>
                                  <TableCell className="font-medium">
                                    {exercise.name}
                                  </TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      {editingWorkoutId === log.id ? (
                                        exercise.sets.map((set, setIndex) => (
                                          <div key={setIndex} className="flex items-center gap-2">
                                            <NumberInput
                                              value={editingWorkout?.exerciseLogs[index]?.sets[setIndex]?.weight}
                                              onChange={(val) => {
                                                const newWorkout = { ...editingWorkout! };
                                                newWorkout.exerciseLogs[index].sets[setIndex].weight = val ?? 0;
                                                setEditingWorkout(newWorkout);
                                              }}
                                            />
                                            <span>lbs ×</span>
                                            <NumberInput
                                              value={editingWorkout?.exerciseLogs[index]?.sets[setIndex]?.reps}
                                              onChange={(val) => {
                                                const newWorkout = { ...editingWorkout! };
                                                newWorkout.exerciseLogs[index].sets[setIndex].reps = val ?? 0;
                                                setEditingWorkout(newWorkout);
                                              }}
                                            />
                                            <span>reps</span>
                                          </div>
                                        ))
                                      ) : (
                                        exercise.sets.map((set, setIndex) => (
                                          <div key={setIndex} className="text-sm">
                                            Set {setIndex + 1}: {set.weight}lbs × {set.reps} reps
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          {(log.notes || editingWorkoutId === log.id) && (
                            <div className="mt-4">
                              <Label>Notes</Label>
                              {editingWorkoutId === log.id ? (
                                <Textarea
                                  value={editingWorkout?.notes || ""}
                                  onChange={(e) => setEditingWorkout(prev => ({ ...prev!, notes: e.target.value }))}
                                  className="mt-1"
                                />
                              ) : (
                                <p className="text-sm text-muted-foreground mt-1">{log.notes}</p>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground">No workout history available yet.</p>
                      <p className="text-sm text-muted-foreground mt-1">Start logging your workouts to see them here!</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="analytics">
              <div className="space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle>Volume Progression</CardTitle>
                    <DateRangePicker
                      value={dateRange}
                      onChange={setDateRange}
                    />
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    {workoutHistory && workoutHistory.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={workoutHistory
                            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                            .map(log => ({
                              date: new Date(log.date).toLocaleDateString(),
                              volume: log.exercises.reduce((sum, exercise) => sum + exercise.sets.reduce((setSum, set) => setSum + set.weight * set.reps, 0), 0),
                              routine: log.routineName
                            }))}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-background border rounded-lg p-2 shadow-lg">
                                    <p className="font-medium">{payload[0].payload.routine}</p>
                                    <p>Volume: {payload[0].value.toLocaleString()} lbs</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="volume"
                            name="Total Volume (lbs)"
                            stroke="#2563eb"
                            dot
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">Start logging workouts to see your progress</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Workout Frequency</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    {workoutHistory && workoutHistory.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={Object.entries(
                            workoutHistory.reduce((acc: { [key: string]: number }, log) => {
                              acc[log.routineName] = (acc[log.routineName] || 0) + 1;
                              return acc;
                            }, {})
                          ).map(([name, count]) => ({
                            name,
                            count,
                          }))}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          <Bar
                            dataKey="count"
                            name="Number of Workouts"
                            fill="#2563eb"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">No workout data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

          </Tabs>
        </div>
      ) : program.type === 'diet' ? (
        <div className="space-y-6">
          <Tabs defaultValue="log" className="space-y-4">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="log">Log Meal</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="log">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Macro Targets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label>Calories</Label>
                        <NumberInput
                          value={mealData.calories}
                          onChange={(val) => setMealData(prev => ({ ...prev, calories: val ?? 0 }))}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Protein (g)</Label>
                          <NumberInput
                            value={mealData.protein}
                            onChange={(val) => setMealData(prev => ({ ...prev, protein: val ?? 0 }))}
                          />
                        </div>
                        <div>
                          <Label>Carbs (g)</Label>
                          <NumberInput
                            value={mealData.carbs}
                            onChange={(val) => setMealData(prev => ({ ...prev, carbs: val ?? 0 }))}
                          />
                        </div>
                        <div>
                          <Label>Fats (g)</Label>
                          <NumberInput
                            value={mealData.fats}
                            onChange={(val) => setMealData(prev => ({ ...prev, fats: val ?? 0 }))}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Foods</CardTitle>
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Food
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground text-center py-8">
                        Food logging coming soon
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardContent className="pt-6">
                    <Label>Meal Notes</Label>
                    <Textarea
                      placeholder="Add any notes about your meal..."
                      value={mealData.notes || ""}
                      onChange={(e) => setMealData(prev => ({
                        ...prev,
                        notes: e.target.value
                      }))}
                      className="mt-2 h-32"
                    />
                  </CardContent>
                </Card>
              </div>
              <div className="md:col-span-2 flex justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={resetMealForm}
                >
                  Clear
                </Button>
                <Button
                  onClick={handleMealSubmit}
                  disabled={logMealMutation.isPending}
                >
                  {logMealMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Meal
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="history">
              <div className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle>Meal History</CardTitle>
                    <DateRangePicker
                      value={dateRange}
                      onChange={setDateRange}
                    />
                  </CardHeader>
                  <CardContent>
                    {filteredMealHistory && filteredMealHistory.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Calories</TableHead>
                            <TableHead>Protein (g)</TableHead>
                            <TableHead>Carbs (g)</TableHead>
                            <TableHead>Fats (g)</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredMealHistory.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell>{new Date(log.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}</TableCell>
                              <TableCell>
                                {editingMealId === log.id ? (
                                  <NumberInput
                                    value={editingMeal?.calories}
                                    onChange={(val) => setEditingMeal(prev => ({ ...prev!, calories: val ?? 0 }))}
                                  />
                                ) : log.calories}
                              </TableCell>
                              <TableCell>
                                {editingMealId === log.id ? (
                                  <NumberInput
                                    value={editingMeal?.protein}
                                    onChange={(val) => setEditingMeal(prev => ({ ...prev!, protein: val ?? 0 }))}
                                  />
                                ) : `${log.protein}g`}
                              </TableCell>
                              <TableCell>
                                {editingMealId === log.id ? (
                                  <NumberInput
                                    value={editingMeal?.carbs}
                                    onChange={(val) => setEditingMeal(prev => ({ ...prev!, carbs: val ?? 0 }))}
                                  />
                                ) : `${log.carbs}g`}
                              </TableCell>
                              <TableCell>
                                {editingMealId === log.id ? (
                                  <NumberInput
                                    value={editingMeal?.fats}
                                    onChange={(val) => setEditingMeal(prev => ({ ...prev!, fats: val ?? 0 }))}
                                  />
                                ) : `${log.fats}g`}
                              </TableCell>
                              <TableCell>
                                {editingMealId === log.id ? (
                                  <Input
                                    type="text"
                                    value={editingMeal?.notes || ""}
                                    onChange={(e) => setEditingMeal(prev => ({ ...prev!, notes: e.target.value }))}
                                  />
                                ) : (log.notes || 'No notes')}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  {log.canEdit && editingMealId !== log.id && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEditMeal(log)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {editingMealId === log.id && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          setEditingMealId(null);
                                          setEditingMeal(null);
                                        }}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleSaveMeal(log.id)}
                                      >
                                        <Check className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                  {log.canDelete && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        if (confirm("Are you sure you want to delete this meal log?")) {
                                          deleteMealMutation.mutate(log.id);
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="py-8 text-center">
                        <p className="text-muted-foreground">No meal logs available for the selected date range.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="analytics">
              <div className="space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle>Macro Trends</CardTitle>
                    <DateRangePicker
                      value={dateRange}
                      onChange={setDateRange}
                    />
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    {filteredMealHistory && filteredMealHistory.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={filteredMealHistory.map(log => ({
                            date: new Date(log.date).toLocaleDateString(),
                            calories: log.calories,
                            protein: log.protein,
                            carbs: log.carbs,
                            fats: log.fats,
                          }))}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" name="Calories" dataKey="calories" stroke="#2563eb" />
                          <Line type="monotone" name="Protein" dataKey="protein" stroke="#16a34a" />
                          <Line type="monotone" name="Carbs" dataKey="carbs" stroke="#ca8a04" />
                          <Line type="monotone" name="Fats" dataKey="fats" stroke="#dc2626" />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">Start logging meals to see your trends</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Macro Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    {filteredMealHistory && filteredMealHistory.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[{
                            name: 'Latest Meal',
                            protein: filteredMealHistory[0].protein * 4,
                            carbs: filteredMealHistory[0].carbs * 4,
                            fats: filteredMealHistory[0].fats * 9,
                          }]}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="protein" name="Protein (cal)" fill="#16a34a" />
                          <Bar dataKey="carbs" name="Carbs (cal)" fill="#ca8a04" />
                          <Bar dataKey="fats" name="Fats (cal)" fill="#dc2626" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">No macro data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
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