import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { Program } from "@db/schema";

interface Exercise {
  id?: number;
  name: string;
  description: string;
  sets: number;
  reps: string;
  restTime: string;
  notes: string;
}

interface WorkoutDay {
  id?: number;
  name: string;
  dayOfWeek?: number;
  notes: string;
  exercises: Exercise[];
}

interface MealPlan {
  id?: number;
  mealName: string;
  targetCalories: number;
  protein: number;
  carbs: number;
  fats: number;
  notes: string;
  foodSuggestions: string[];
}

export default function ManageProgram({ params }: { params: { id: string } }) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [program, setProgram] = useState<Program | null>(null);
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [posingDetails, setPosingDetails] = useState({
    bio: "",
    details: "",
    communicationPreference: "email",
  });
  const [renderStartTime, setRenderStartTime] = useState<number>(0);

  // Add performance measurement
  const { data: fetchedProgram, isLoading } = useQuery<Program>({
    queryKey: [`/api/programs/${params.id}`],
    queryFn: async ({ queryKey }) => {
      const startTime = performance.now();
      console.log(`[Performance] Starting API request at ${startTime}ms`);

      const response = await fetch(queryKey[0] as string, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      const endTime = performance.now();
      console.log(`[Performance] API request completed in ${endTime - startTime}ms`);
      return data;
    }
  });

  useEffect(() => {
    if (fetchedProgram) {
      const startTime = performance.now();
      setRenderStartTime(startTime);
      console.log(`[Performance] Starting render at ${startTime}ms`);

      setProgram(fetchedProgram);

      // Set type-specific data
      if (fetchedProgram.type === "lifting" && fetchedProgram.routines) {
        setWorkoutDays(fetchedProgram.routines.map(routine => ({
          id: routine.id,
          name: routine.name,
          dayOfWeek: routine.dayOfWeek,
          notes: routine.notes || "",
          exercises: routine.exercises.map(exercise => ({
            id: exercise.id,
            name: exercise.name,
            description: exercise.description || "",
            sets: exercise.sets || 3,
            reps: exercise.reps || "",
            restTime: exercise.restTime || "",
            notes: exercise.notes || "",
          })),
        })));
      } else if (fetchedProgram.type === "diet") {
        // Handle diet program data
        setMealPlans(fetchedProgram.mealPlans || []);
      } else if (fetchedProgram.type === "posing") {
        // Handle posing program data
        setPosingDetails(fetchedProgram.posingPlan || {
          bio: "",
          details: "",
          communicationPreference: "email",
        });
      }
    }
  }, [fetchedProgram]);

  useEffect(() => {
    if (program && renderStartTime > 0) {
      const endTime = performance.now();
      console.log(`[Performance] Render completed in ${endTime - renderStartTime}ms`);
    }
  }, [program, renderStartTime]);

  const handleAddWorkoutDay = () => {
    setWorkoutDays(prev => [...prev, {
      name: "",
      notes: "",
      exercises: [],
    }]);
  };

  const handleAddExercise = (dayIndex: number) => {
    setWorkoutDays(prev => {
      const updated = [...prev];
      updated[dayIndex].exercises.push({
        name: "",
        description: "",
        sets: 3,
        reps: "",
        restTime: "",
        notes: "",
      });
      return updated;
    });
  };

  const handleAddMealPlan = () => {
    setMealPlans(prev => [...prev, {
      mealName: "",
      targetCalories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      notes: "",
      foodSuggestions: [],
    }]);
  };

  const handleSave = async () => {
    if (!program) return;

    try {
      setIsSubmitting(true);
      setShowConfirmDialog(false);

      const startTime = performance.now();
      console.log(`[Performance] Starting save request at ${startTime}ms`);

      const updatedProgram = {
        ...program,
        ...(program.type === "lifting" && { routines: workoutDays }),
        ...(program.type === "diet" && { mealPlans }),
        ...(program.type === "posing" && { posingPlan: posingDetails }),
      };

      const response = await fetch(`/api/programs/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedProgram),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const endTime = performance.now();
      console.log(`[Performance] Save request completed in ${endTime - startTime}ms`);

      await queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      await queryClient.invalidateQueries({ queryKey: [`/api/programs/${params.id}`] });

      toast({
        title: "Success",
        description: "Program updated successfully",
      });

      setLocation("/programs");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !program) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Manage Program</h1>
        <Button onClick={() => setShowConfirmDialog(true)} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Program Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Program Name</Label>
              <Input
                id="name"
                value={program.name}
                onChange={(e) => setProgram({ ...program, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={program.description || ""}
                onChange={(e) => setProgram({ ...program, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={program.price || 0}
                onChange={(e) => setProgram({ ...program, price: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Program Type</Label>
              <Select value={program.type} disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Select Program Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lifting">Lifting</SelectItem>
                  <SelectItem value="diet">Diet</SelectItem>
                  <SelectItem value="posing">Posing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Program type-specific content */}
        {program.type === "lifting" && (
          <div className="space-y-4">
            {workoutDays.map((day, dayIndex) => (
              <Card key={dayIndex} className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2"
                  onClick={() => setWorkoutDays(prev => prev.filter((_, i) => i !== dayIndex))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <CardHeader>
                  <CardTitle>Workout Day {dayIndex + 1}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Workout Day Name</Label>
                    <Input
                      value={day.name}
                      onChange={(e) => {
                        const updated = [...workoutDays];
                        updated[dayIndex].name = e.target.value;
                        setWorkoutDays(updated);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Day of Week (Optional)</Label>
                    <Select
                      value={day.dayOfWeek?.toString()}
                      onValueChange={(value) => {
                        const updated = [...workoutDays];
                        updated[dayIndex].dayOfWeek = value ? parseInt(value) : undefined;
                        setWorkoutDays(updated);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select day (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sunday</SelectItem>
                        <SelectItem value="1">Monday</SelectItem>
                        <SelectItem value="2">Tuesday</SelectItem>
                        <SelectItem value="3">Wednesday</SelectItem>
                        <SelectItem value="4">Thursday</SelectItem>
                        <SelectItem value="5">Friday</SelectItem>
                        <SelectItem value="6">Saturday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-4">
                    {day.exercises.map((exercise, exerciseIndex) => (
                      <div key={exerciseIndex} className="space-y-4 p-4 border rounded-lg relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-2"
                          onClick={() => {
                            const updated = [...workoutDays];
                            updated[dayIndex].exercises = updated[dayIndex].exercises.filter(
                              (_, i) => i !== exerciseIndex
                            );
                            setWorkoutDays(updated);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <div className="space-y-2">
                          <Label>Exercise Name</Label>
                          <Input
                            value={exercise.name}
                            onChange={(e) => {
                              const updated = [...workoutDays];
                              updated[dayIndex].exercises[exerciseIndex].name = e.target.value;
                              setWorkoutDays(updated);
                            }}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Sets</Label>
                            <Input
                              type="number"
                              min="1"
                              value={exercise.sets}
                              onChange={(e) => {
                                const updated = [...workoutDays];
                                updated[dayIndex].exercises[exerciseIndex].sets = parseInt(e.target.value);
                                setWorkoutDays(updated);
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Reps</Label>
                            <Input
                              value={exercise.reps}
                              placeholder="e.g., 8-12"
                              onChange={(e) => {
                                const updated = [...workoutDays];
                                updated[dayIndex].exercises[exerciseIndex].reps = e.target.value;
                                setWorkoutDays(updated);
                              }}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Rest Time</Label>
                          <Input
                            value={exercise.restTime}
                            placeholder="e.g., 60 seconds"
                            onChange={(e) => {
                              const updated = [...workoutDays];
                              updated[dayIndex].exercises[exerciseIndex].restTime = e.target.value;
                              setWorkoutDays(updated);
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Notes</Label>
                          <Textarea
                            value={exercise.notes}
                            onChange={(e) => {
                              const updated = [...workoutDays];
                              updated[dayIndex].exercises[exerciseIndex].notes = e.target.value;
                              setWorkoutDays(updated);
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      onClick={() => handleAddExercise(dayIndex)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Exercise
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button onClick={handleAddWorkoutDay} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Workout Day
            </Button>
          </div>
        )}

        {program.type === "diet" && (
          <div className="space-y-4">
            {mealPlans.map((meal, index) => (
              <Card key={index} className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2"
                  onClick={() => setMealPlans(prev => prev.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <CardHeader>
                  <CardTitle>Meal Plan {index + 1}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Meal Name</Label>
                    <Input
                      value={meal.mealName}
                      onChange={(e) => {
                        const updated = [...mealPlans];
                        updated[index].mealName = e.target.value;
                        setMealPlans(updated);
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Target Calories</Label>
                      <Input
                        type="number"
                        min="0"
                        value={meal.targetCalories}
                        onChange={(e) => {
                          const updated = [...mealPlans];
                          updated[index].targetCalories = parseInt(e.target.value);
                          setMealPlans(updated);
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Protein (g)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={meal.protein}
                        onChange={(e) => {
                          const updated = [...mealPlans];
                          updated[index].protein = parseInt(e.target.value);
                          setMealPlans(updated);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Carbs (g)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={meal.carbs}
                        onChange={(e) => {
                          const updated = [...mealPlans];
                          updated[index].carbs = parseInt(e.target.value);
                          setMealPlans(updated);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fats (g)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={meal.fats}
                        onChange={(e) => {
                          const updated = [...mealPlans];
                          updated[index].fats = parseInt(e.target.value);
                          setMealPlans(updated);
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Food Suggestions (one per line)</Label>
                    <Textarea
                      value={meal.foodSuggestions.join("\n")}
                      onChange={(e) => {
                        const updated = [...mealPlans];
                        updated[index].foodSuggestions = e.target.value.split("\n").filter(Boolean);
                        setMealPlans(updated);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={meal.notes}
                      onChange={(e) => {
                        const updated = [...mealPlans];
                        updated[index].notes = e.target.value;
                        setMealPlans(updated);
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button onClick={handleAddMealPlan} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Meal Plan
            </Button>
          </div>
        )}

        {program.type === "posing" && (
          <Card>
            <CardHeader>
              <CardTitle>Posing Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea
                  value={posingDetails.bio}
                  onChange={(e) => setPosingDetails({ ...posingDetails, bio: e.target.value })}
                  placeholder="Enter client's bio and background"
                />
              </div>
              <div className="space-y-2">
                <Label>Additional Details</Label>
                <Textarea
                  value={posingDetails.details}
                  onChange={(e) => setPosingDetails({ ...posingDetails, details: e.target.value })}
                  placeholder="Enter posing instructions and details"
                />
              </div>
              <div className="space-y-2">
                <Label>Communication Preference</Label>
                <Select
                  value={posingDetails.communicationPreference}
                  onValueChange={(value) => setPosingDetails({
                    ...posingDetails,
                    communicationPreference: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select communication preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="chat">In-App Chat</SelectItem>
                    <SelectItem value="video">Video Call</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Changes</DialogTitle>
            <DialogDescription>
              Are you sure you want to save these changes? This will update the program for all users.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}