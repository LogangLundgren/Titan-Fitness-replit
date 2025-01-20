import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { MealLog } from "@db/schema";

interface NutritionAnalyticsProps {
  meals: MealLog[];
  isLoading: boolean;
}

export function NutritionAnalytics({ meals, isLoading }: NutritionAnalyticsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  // Process meal data for charts
  const processedData = meals.map(meal => ({
    date: new Date(meal.date).toLocaleDateString(),
    calories: meal.calories || 0,
    protein: meal.protein || 0,
    carbs: meal.carbs || 0,
    fats: meal.fats || 0,
  })).reverse();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Nutrition Tracking</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="calories" fill="hsl(var(--primary))" name="Calories" />
              <Bar dataKey="protein" fill="hsl(var(--destructive))" name="Protein" />
              <Bar dataKey="carbs" fill="hsl(var(--secondary))" name="Carbs" />
              <Bar dataKey="fats" fill="hsl(var(--accent))" name="Fats" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
