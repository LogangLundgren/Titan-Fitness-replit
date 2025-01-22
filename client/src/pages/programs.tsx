import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Edit } from "lucide-react";
import { ProgramCard } from "@/components/programs/program-card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import type { Program } from "@db/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Switch } from "@/components/ui/switch";

interface Exercise {
  name: string;
  description: string;
  sets: number;
  reps: string;
  restTime: string;
  notes: string;
}

interface WorkoutDay {
  dayOfWeek?: number;
  name: string;
  notes: string;
  exercises: Exercise[];
}

interface MealPlan {
  mealName: string;
  targetCalories: number;
  protein: number;
  carbs: number;
  fats: number;
  notes: string;
  foodSuggestions: string[];
}

interface PosingPlan {
  bio: string;
  details: string;
  communicationPreference: string;
}

export default function Programs() {
  const { user } = useUser();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [currentTab, setCurrentTab] = useState("details");
  const [newProgram, setNewProgram] = useState({
    name: "",
    description: "",
    type: "lifting",
    price: 0,
    isPublic: false,
    workoutDays: [] as WorkoutDay[],
    mealPlans: [] as MealPlan[],
    posingPlan: {
      bio: "",
      details: "",
      communicationPreference: "email"
    } as PosingPlan,
  });

  const { data: programs, isLoading } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
  });

  const isCoach = user?.accountType === "coach";
  const userPrograms = programs?.filter(p =>
    isCoach ? p.coachId === user.id : p.clientId === user.id
  );

  const handleAddWorkoutDay = () => {
    setNewProgram(prev => ({
      ...prev,
      workoutDays: [...prev.workoutDays, {
        name: "",
        notes: "",
        exercises: [],
      }],
    }));
  };

  const handleAddExercise = (dayIndex: number) => {
    setNewProgram(prev => {
      const workoutDays = [...prev.workoutDays];
      workoutDays[dayIndex].exercises.push({
        name: "",
        description: "",
        sets: 3,
        reps: "",
        restTime: "",
        notes: "",
      });
      return { ...prev, workoutDays };
    });
  };

  const handleRemoveExercise = (dayIndex: number, exerciseIndex: number) => {
    setNewProgram(prev => {
      const workoutDays = [...prev.workoutDays];
      workoutDays[dayIndex].exercises.splice(exerciseIndex, 1);
      return { ...prev, workoutDays };
    });
  };

  const handleRemoveWorkoutDay = (dayIndex: number) => {
    setNewProgram(prev => ({
      ...prev,
      workoutDays: prev.workoutDays.filter((_, i) => i !== dayIndex),
    }));
  };

  const handleAddMealPlan = () => {
    setNewProgram(prev => ({
      ...prev,
      mealPlans: [...prev.mealPlans, {
        mealName: "",
        targetCalories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        notes: "",
        foodSuggestions: [],
      }],
    }));
  };

  const handleRemoveMealPlan = (index: number) => {
    setNewProgram(prev => ({
      ...prev,
      mealPlans: prev.mealPlans.filter((_, i) => i !== index),
    }));
  };

  const handleCreateProgram = async () => {
    try {
      const programData: any = {
        name: newProgram.name,
        description: newProgram.description,
        type: newProgram.type,
        price: newProgram.price,
        isPublic: newProgram.isPublic,
      };

      // Add type-specific data
      if (newProgram.type === "lifting") {
        const exercises = newProgram.workoutDays.flatMap((day, dayIndex) =>
          day.exercises.map((exercise, exerciseIndex) => ({
            ...exercise,
            order: dayIndex * 1000 + exerciseIndex,
          }))
        );

        const schedule = newProgram.workoutDays.map(day => ({
          dayOfWeek: day.dayOfWeek,
          name: day.name,
          notes: day.notes,
        }));

        programData.exercises = exercises;
        programData.schedule = schedule;
      } else if (newProgram.type === "diet") {
        programData.mealPlans = newProgram.mealPlans;
      } else if (newProgram.type === "posing") {
        programData.posingPlan = newProgram.posingPlan;
      }

      const response = await fetch("/api/programs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(programData),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({
        title: "Success",
        description: "Program created successfully",
      });
      setIsCreating(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
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
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Program
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Create New Program</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[80vh] px-1">
                <Tabs value={currentTab} onValueChange={setCurrentTab}>
                  <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
                    <TabsTrigger value="details">Program Details</TabsTrigger>
                    {newProgram.type === "lifting" && (
                      <TabsTrigger value="workouts">Workout Days</TabsTrigger>
                    )}
                    {newProgram.type === "diet" && (
                      <TabsTrigger value="meals">Meal Plans</TabsTrigger>
                    )}
                    {newProgram.type === "posing" && (
                      <TabsTrigger value="posing">Posing Details</TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="details" className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Program Name</Label>
                      <Input
                        id="name"
                        value={newProgram.name}
                        onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newProgram.description}
                        onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Type</Label>
                      <Select
                        value={newProgram.type}
                        onValueChange={(value) => {
                          setNewProgram(prev => ({
                            ...prev,
                            type: value,
                            // Reset type-specific data when changing types
                            workoutDays: value === "lifting" ? prev.workoutDays : [],
                            mealPlans: value === "diet" ? prev.mealPlans : [],
                            posingPlan: value === "posing" ? prev.posingPlan : {
                              bio: "",
                              details: "",
                              communicationPreference: "email"
                            },
                          }));
                          setCurrentTab("details");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lifting">Lifting</SelectItem>
                          <SelectItem value="diet">Diet</SelectItem>
                          <SelectItem value="posing">Posing</SelectItem>
                          <SelectItem value="coaching">Comprehensive Coaching</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Price ($)</Label>
                      <Input
                        id="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={newProgram.price}
                        onChange={(e) => setNewProgram({ ...newProgram, price: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isPublic"
                        checked={newProgram.isPublic}
                        onCheckedChange={(checked) => setNewProgram({ ...newProgram, isPublic: checked })}
                      />
                      <Label htmlFor="isPublic">Make Program Public</Label>
                    </div>
                  </TabsContent>

                  {newProgram.type === "lifting" && (
                    <TabsContent value="workouts" className="space-y-4 py-4">
                      <div className="space-y-4">
                        {newProgram.workoutDays.map((day, dayIndex) => (
                          <Card key={dayIndex} className="relative">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-2 top-2"
                              onClick={() => handleRemoveWorkoutDay(dayIndex)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <CardHeader>
                              <div className="space-y-2">
                                <Label>Workout Day Name</Label>
                                <Input
                                  placeholder="e.g., Push Day, Pull Day"
                                  value={day.name}
                                  onChange={(e) => {
                                    const workoutDays = [...newProgram.workoutDays];
                                    workoutDays[dayIndex].name = e.target.value;
                                    setNewProgram({ ...newProgram, workoutDays });
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Day of Week (Optional)</Label>
                                <Select
                                  value={day.dayOfWeek?.toString()}
                                  onValueChange={(value) => {
                                    const workoutDays = [...newProgram.workoutDays];
                                    workoutDays[dayIndex].dayOfWeek = value ? parseInt(value) : undefined;
                                    setNewProgram({ ...newProgram, workoutDays });
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
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="space-y-2">
                                <Label>Day Notes</Label>
                                <Textarea
                                  value={day.notes}
                                  onChange={(e) => {
                                    const workoutDays = [...newProgram.workoutDays];
                                    workoutDays[dayIndex].notes = e.target.value;
                                    setNewProgram({ ...newProgram, workoutDays });
                                  }}
                                />
                              </div>

                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-medium">Exercises</h4>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAddExercise(dayIndex)}
                                  >
                                    Add Exercise
                                  </Button>
                                </div>

                                {day.exercises.map((exercise, exerciseIndex) => (
                                  <div key={exerciseIndex} className="space-y-4 p-4 border rounded-lg relative">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="absolute right-2 top-2"
                                      onClick={() => handleRemoveExercise(dayIndex, exerciseIndex)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                    <div className="space-y-2">
                                      <Label>Exercise Name</Label>
                                      <Input
                                        value={exercise.name}
                                        onChange={(e) => {
                                          const workoutDays = [...newProgram.workoutDays];
                                          workoutDays[dayIndex].exercises[exerciseIndex].name = e.target.value;
                                          setNewProgram({ ...newProgram, workoutDays });
                                        }}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Description</Label>
                                      <Textarea
                                        value={exercise.description}
                                        onChange={(e) => {
                                          const workoutDays = [...newProgram.workoutDays];
                                          workoutDays[dayIndex].exercises[exerciseIndex].description = e.target.value;
                                          setNewProgram({ ...newProgram, workoutDays });
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
                                            const workoutDays = [...newProgram.workoutDays];
                                            workoutDays[dayIndex].exercises[exerciseIndex].sets = parseInt(e.target.value);
                                            setNewProgram({ ...newProgram, workoutDays });
                                          }}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Reps</Label>
                                        <Input
                                          placeholder="e.g., 8-12 or 12,10,8"
                                          value={exercise.reps}
                                          onChange={(e) => {
                                            const workoutDays = [...newProgram.workoutDays];
                                            workoutDays[dayIndex].exercises[exerciseIndex].reps = e.target.value;
                                            setNewProgram({ ...newProgram, workoutDays });
                                          }}
                                        />
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Rest Time</Label>
                                      <Input
                                        placeholder="e.g., 60 seconds"
                                        value={exercise.restTime}
                                        onChange={(e) => {
                                          const workoutDays = [...newProgram.workoutDays];
                                          workoutDays[dayIndex].exercises[exerciseIndex].restTime = e.target.value;
                                          setNewProgram({ ...newProgram, workoutDays });
                                        }}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Notes</Label>
                                      <Textarea
                                        value={exercise.notes}
                                        onChange={(e) => {
                                          const workoutDays = [...newProgram.workoutDays];
                                          workoutDays[dayIndex].exercises[exerciseIndex].notes = e.target.value;
                                          setNewProgram({ ...newProgram, workoutDays });
                                        }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      <Button onClick={handleAddWorkoutDay} className="w-full">
                        Add Workout Day
                      </Button>
                    </TabsContent>
                  )}

                  {newProgram.type === "diet" && (
                    <TabsContent value="meals" className="space-y-4 py-4">
                      <div className="space-y-4">
                        {newProgram.mealPlans.map((meal, index) => (
                          <Card key={index} className="relative">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-2 top-2"
                              onClick={() => handleRemoveMealPlan(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <CardHeader>
                              <div className="space-y-2">
                                <Label>Meal Name</Label>
                                <Input
                                  placeholder="e.g., Breakfast, Lunch, Dinner"
                                  value={meal.mealName}
                                  onChange={(e) => {
                                    const mealPlans = [...newProgram.mealPlans];
                                    mealPlans[index].mealName = e.target.value;
                                    setNewProgram({ ...newProgram, mealPlans });
                                  }}
                                />
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Target Calories</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={meal.targetCalories}
                                    onChange={(e) => {
                                      const mealPlans = [...newProgram.mealPlans];
                                      mealPlans[index].targetCalories = parseInt(e.target.value);
                                      setNewProgram({ ...newProgram, mealPlans });
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
                                      const mealPlans = [...newProgram.mealPlans];
                                      mealPlans[index].protein = parseInt(e.target.value);
                                      setNewProgram({ ...newProgram, mealPlans });
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
                                      const mealPlans = [...newProgram.mealPlans];
                                      mealPlans[index].carbs = parseInt(e.target.value);
                                      setNewProgram({ ...newProgram, mealPlans });
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
                                      const mealPlans = [...newProgram.mealPlans];
                                      mealPlans[index].fats = parseInt(e.target.value);
                                      setNewProgram({ ...newProgram, mealPlans });
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>Notes</Label>
                                <Textarea
                                  value={meal.notes}
                                  onChange={(e) => {
                                    const mealPlans = [...newProgram.mealPlans];
                                    mealPlans[index].notes = e.target.value;
                                    setNewProgram({ ...newProgram, mealPlans });
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Food Suggestions (one per line)</Label>
                                <Textarea
                                  value={meal.foodSuggestions.join("\n")}
                                  onChange={(e) => {
                                    const mealPlans = [...newProgram.mealPlans];
                                    mealPlans[index].foodSuggestions = e.target.value.split("\n").filter(Boolean);
                                    setNewProgram({ ...newProgram, mealPlans });
                                  }}
                                />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      <Button onClick={handleAddMealPlan} className="w-full">
                        Add Meal Plan
                      </Button>
                    </TabsContent>
                  )}

                  {newProgram.type === "posing" && (
                    <TabsContent value="posing" className="space-y-4 py-4">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Bio</Label>
                          <Textarea
                            value={newProgram.posingPlan.bio}
                            onChange={(e) => {
                              setNewProgram({
                                ...newProgram,
                                posingPlan: {
                                  ...newProgram.posingPlan,
                                  bio: e.target.value,
                                },
                              });
                            }}
                            placeholder="Enter client's bio and background"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Additional Details</Label>
                          <Textarea
                            value={newProgram.posingPlan.details}
                            onChange={(e) => {
                              setNewProgram({
                                ...newProgram,
                                posingPlan: {
                                  ...newProgram.posingPlan,
                                  details: e.target.value,
                                },
                              });
                            }}
                            placeholder="Enter posing instructions and details"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Communication Preference</Label>
                          <Select
                            value={newProgram.posingPlan.communicationPreference}
                            onValueChange={(value) => {
                              setNewProgram({
                                ...newProgram,
                                posingPlan: {
                                  ...newProgram.posingPlan,
                                  communicationPreference: value,
                                },
                              });
                            }}
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
                      </div>
                    </TabsContent>
                  )}
                </Tabs>

                <Button
                  className="w-full mt-6"
                  onClick={handleCreateProgram}
                  disabled={!newProgram.name || !newProgram.type || (
                    (newProgram.type === "lifting" && newProgram.workoutDays.length === 0) ||
                    (newProgram.type === "diet" && newProgram.mealPlans.length === 0) ||
                    (newProgram.type === "posing" && !newProgram.posingPlan.bio)
                  )}
                >
                  Create Program
                </Button>
              </ScrollArea>
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