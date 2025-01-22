import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export default function CreateLiftingProgram() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [program, setProgram] = useState({
    name: "",
    description: "",
    type: "lifting",
    price: 0,
    workoutDays: [] as WorkoutDay[],
  });

  const handleAddWorkoutDay = () => {
    setProgram(prev => ({
      ...prev,
      workoutDays: [...prev.workoutDays, {
        name: "",
        notes: "",
        exercises: [],
      }],
    }));
  };

  const handleAddExercise = (dayIndex: number) => {
    setProgram(prev => {
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
    setProgram(prev => {
      const workoutDays = [...prev.workoutDays];
      workoutDays[dayIndex].exercises.splice(exerciseIndex, 1);
      return { ...prev, workoutDays };
    });
  };

  const handleRemoveWorkoutDay = (dayIndex: number) => {
    setProgram(prev => ({
      ...prev,
      workoutDays: prev.workoutDays.filter((_, i) => i !== dayIndex),
    }));
  };

  const handleSubmit = async () => {
    if (!program.name) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Program name is required",
      });
      return;
    }

    if (program.workoutDays.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Add at least one workout day",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/programs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(program),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      toast({
        title: "Success",
        description: "Program created successfully",
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

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Create Lifting Program</h1>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Program
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
                value={program.description}
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
                value={program.price}
                onChange={(e) => setProgram({ ...program, price: parseFloat(e.target.value) })}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {program.workoutDays.map((day, dayIndex) => (
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
                <CardTitle>Workout Day {dayIndex + 1}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Workout Day Name</Label>
                  <Input
                    placeholder="e.g., Push Day, Pull Day"
                    value={day.name}
                    onChange={(e) => {
                      const workoutDays = [...program.workoutDays];
                      workoutDays[dayIndex].name = e.target.value;
                      setProgram({ ...program, workoutDays });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Day of Week (Optional)</Label>
                  <Select
                    value={day.dayOfWeek?.toString()}
                    onValueChange={(value) => {
                      const workoutDays = [...program.workoutDays];
                      workoutDays[dayIndex].dayOfWeek = value ? parseInt(value) : undefined;
                      setProgram({ ...program, workoutDays });
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
                <div className="space-y-2">
                  <Label>Day Notes</Label>
                  <Textarea
                    value={day.notes}
                    onChange={(e) => {
                      const workoutDays = [...program.workoutDays];
                      workoutDays[dayIndex].notes = e.target.value;
                      setProgram({ ...program, workoutDays });
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
                      <Plus className="h-4 w-4 mr-2" />
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
                            const workoutDays = [...program.workoutDays];
                            workoutDays[dayIndex].exercises[exerciseIndex].name = e.target.value;
                            setProgram({ ...program, workoutDays });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={exercise.description}
                          onChange={(e) => {
                            const workoutDays = [...program.workoutDays];
                            workoutDays[dayIndex].exercises[exerciseIndex].description = e.target.value;
                            setProgram({ ...program, workoutDays });
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
                              const workoutDays = [...program.workoutDays];
                              workoutDays[dayIndex].exercises[exerciseIndex].sets = parseInt(e.target.value);
                              setProgram({ ...program, workoutDays });
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Reps</Label>
                          <Input
                            placeholder="e.g., 8-12 or 12,10,8"
                            value={exercise.reps}
                            onChange={(e) => {
                              const workoutDays = [...program.workoutDays];
                              workoutDays[dayIndex].exercises[exerciseIndex].reps = e.target.value;
                              setProgram({ ...program, workoutDays });
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
                            const workoutDays = [...program.workoutDays];
                            workoutDays[dayIndex].exercises[exerciseIndex].restTime = e.target.value;
                            setProgram({ ...program, workoutDays });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                          value={exercise.notes}
                          onChange={(e) => {
                            const workoutDays = [...program.workoutDays];
                            workoutDays[dayIndex].exercises[exerciseIndex].notes = e.target.value;
                            setProgram({ ...program, workoutDays });
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
          <Plus className="h-4 w-4 mr-2" />
          Add Workout Day
        </Button>
      </div>
    </div>
  );
}
