import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface MealPlan {
  mealName: string;
  targetCalories: number;
  protein: number;
  carbs: number;
  fats: number;
  notes: string;
  foodSuggestions: string[];
}

export default function CreateDietProgram() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [program, setProgram] = useState({
    name: "",
    description: "",
    type: "diet",
    price: 0,
    mealPlans: [] as MealPlan[],
  });

  const handleAddMealPlan = () => {
    setProgram(prev => ({
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
    setProgram(prev => ({
      ...prev,
      mealPlans: prev.mealPlans.filter((_, i) => i !== index),
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

    if (program.mealPlans.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Add at least one meal plan",
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
        <h1 className="text-3xl font-bold tracking-tight">Create Diet Program</h1>
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
          {program.mealPlans.map((meal, index) => (
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
                <CardTitle>Meal Plan {index + 1}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Meal Name</Label>
                  <Input
                    placeholder="e.g., Breakfast, Lunch, Dinner"
                    value={meal.mealName}
                    onChange={(e) => {
                      const mealPlans = [...program.mealPlans];
                      mealPlans[index].mealName = e.target.value;
                      setProgram({ ...program, mealPlans });
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
                        const mealPlans = [...program.mealPlans];
                        mealPlans[index].targetCalories = parseInt(e.target.value);
                        setProgram({ ...program, mealPlans });
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
                        const mealPlans = [...program.mealPlans];
                        mealPlans[index].protein = parseInt(e.target.value);
                        setProgram({ ...program, mealPlans });
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
                        const mealPlans = [...program.mealPlans];
                        mealPlans[index].carbs = parseInt(e.target.value);
                        setProgram({ ...program, mealPlans });
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
                        const mealPlans = [...program.mealPlans];
                        mealPlans[index].fats = parseInt(e.target.value);
                        setProgram({ ...program, mealPlans });
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={meal.notes}
                    onChange={(e) => {
                      const mealPlans = [...program.mealPlans];
                      mealPlans[index].notes = e.target.value;
                      setProgram({ ...program, mealPlans });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Food Suggestions (one per line)</Label>
                  <Textarea
                    value={meal.foodSuggestions.join("\n")}
                    onChange={(e) => {
                      const mealPlans = [...program.mealPlans];
                      mealPlans[index].foodSuggestions = e.target.value.split("\n").filter(Boolean);
                      setProgram({ ...program, mealPlans });
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button onClick={handleAddMealPlan} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Meal Plan
        </Button>
      </div>
    </div>
  );
}
