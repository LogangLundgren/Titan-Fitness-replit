import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { NutritionAnalytics } from "@/components/analytics/nutrition-analytics";
import type { MealLog } from "@db/schema";

interface MealFormData {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  data: {
    items: Array<{
      name: string;
      portion: string;
      calories: number;
    }>;
  };
}

export default function MealLogPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mealData, setMealData] = useState<MealFormData>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    data: { items: [{ name: "", portion: "", calories: 0 }] },
  });

  // Move hook calls to the top level
  const { data: mealLogs, isLoading: isLoadingMeals } = useQuery<MealLog[]>({
    queryKey: ["/api/meals"],
  });

  const logMealMutation = useMutation({
    mutationFn: async (data: MealFormData) => {
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meals"] });
      toast({
        title: "Success",
        description: "Meal logged successfully",
      });
      // Reset form
      setMealData({
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        data: { items: [{ name: "", portion: "", calories: 0 }] },
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

  const addFoodItem = () => {
    setMealData(prev => ({
      ...prev,
      data: {
        items: [...prev.data.items, { name: "", portion: "", calories: 0 }],
      },
    }));
  };

  const updateFoodItem = (index: number, field: string, value: string | number) => {
    const newItems = [...mealData.data.items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Calculate total calories
    const totalCalories = newItems.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);

    setMealData(prev => ({
      ...prev,
      calories: totalCalories,
      data: { items: newItems },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    logMealMutation.mutate(mealData);
  };

  if (isLoadingMeals) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Meal Log</h1>

      <Tabs defaultValue="log" className="space-y-4">
        <TabsList>
          <TabsTrigger value="log">Log Meal</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-4">
                  {mealData.data.items.map((item, index) => (
                    <div key={index} className="grid gap-4 md:grid-cols-3">
                      <div>
                        <Label htmlFor={`food-${index}`}>Food Item</Label>
                        <Input
                          id={`food-${index}`}
                          value={item.name}
                          onChange={(e) => updateFoodItem(index, "name", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor={`portion-${index}`}>Portion</Label>
                        <Input
                          id={`portion-${index}`}
                          value={item.portion}
                          onChange={(e) => updateFoodItem(index, "portion", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor={`calories-${index}`}>Calories</Label>
                        <Input
                          id={`calories-${index}`}
                          type="number"
                          value={item.calories}
                          onChange={(e) => updateFoodItem(index, "calories", Number(e.target.value))}
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={addFoodItem}
                >
                  Add Food Item
                </Button>

                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <Label>Total Calories</Label>
                    <Input
                      type="number"
                      value={mealData.calories}
                      onChange={(e) => setMealData(prev => ({ ...prev, calories: Number(e.target.value) }))}
                      required
                    />
                  </div>
                  <div>
                    <Label>Protein (g)</Label>
                    <Input
                      type="number"
                      value={mealData.protein}
                      onChange={(e) => setMealData(prev => ({ ...prev, protein: Number(e.target.value) }))}
                      required
                    />
                  </div>
                  <div>
                    <Label>Carbs (g)</Label>
                    <Input
                      type="number"
                      value={mealData.carbs}
                      onChange={(e) => setMealData(prev => ({ ...prev, carbs: Number(e.target.value) }))}
                      required
                    />
                  </div>
                  <div>
                    <Label>Fats (g)</Label>
                    <Input
                      type="number"
                      value={mealData.fats}
                      onChange={(e) => setMealData(prev => ({ ...prev, fats: Number(e.target.value) }))}
                      required
                    />
                  </div>
                </div>

                <Button 
                  type="submit"
                  disabled={logMealMutation.isPending}
                  className="w-full"
                >
                  {logMealMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Log Meal
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {mealLogs?.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {new Date(log.date!).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {log.calories} calories | {log.protein}g protein
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {log.carbs}g carbs | {log.fats}g fats
                      </p>
                    </div>
                  </div>
                ))}

                {mealLogs?.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No meal logs yet. Start by logging your first meal!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <NutritionAnalytics
            meals={mealLogs || []}
            isLoading={isLoadingMeals}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}