import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Loader2, Plus, Trash2 } from "lucide-react";
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
  id?: number; // Added id for delete mutation
}

interface WorkoutHistory {
  date: string;
  routineId: number;
  routineName: string;
  exercises: Array<{
    exerciseId: number;
    name: string;
    sets: Array<{
      weight: number;
      reps: number;
    }>;
  }>;
  notes?: string;
}

interface MealHistory {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  notes?: string;
  id: number; // Added id for delete mutation
}

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
                                    <Input
                                      type="number"
                                      placeholder="0"
                                      value={workoutData.exerciseLogs[exerciseIndex]?.sets[setIndex]?.weight || ""}
                                      onChange={(e) => updateSetData(exerciseIndex, setIndex, 'weight', e.target.value)}
                                      className="w-24"
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Routine</TableHead>
                        <TableHead>Volume</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workoutHistory.map((log) => (
                        <TableRow key={log.routineId}>
                          <TableCell>{new Date(log.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}</TableCell>
                          <TableCell>{log.routineName}</TableCell>
                          <TableCell>Coming soon</TableCell>
                          <TableCell>{log.notes || 'No notes'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                  <CardHeader>
                    <CardTitle>Volume Progression</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    {workoutHistory && workoutHistory.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={workoutHistory.map(log => ({
                            date: new Date(log.date).toLocaleDateString(),
                            volume: log.exercises.reduce((total, ex) =>
                              total + ex.sets.reduce((setTotal, set) =>
                                setTotal + (set.weight * set.reps), 0), 0)
                          }))}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="volume" stroke="#2563eb" />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">Start logging workouts to see your progress</p>
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
                        <Input
                          type="number"
                          placeholder="Enter calories"
                          value={mealData.calories || ""}
                          onChange={(e) => setMealData(prev => ({
                            ...prev,
                            calories: e.target.value ? parseInt(e.target.value) : 0
                          }))}
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
                    Save Meal Log
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history">
              <div className="space-y-4">
                {mealHistory && mealHistory.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Calories</TableHead>
                        <TableHead>Protein</TableHead>
                        <TableHead>Carbs</TableHead>
                        <TableHead>Fats</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMealHistory.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{new Date(log.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}</TableCell>
                          <TableCell>{log.calories}</TableCell>
                          <TableCell>{log.protein}g</TableCell>
                          <TableCell>{log.carbs}g</TableCell>
                          <TableCell>{log.fats}g</TableCell>
                          <TableCell>{log.notes || 'No notes'}</TableCell>
                          <TableCell>
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
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground">No meal logs yet.</p>
                      <p className="text-sm text-muted-foreground mt-1">Start by logging your first meal!</p>
                    </CardContent>
                  </Card>
                )}
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