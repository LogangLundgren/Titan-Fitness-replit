import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "./stats-card";
import { WorkoutAnalytics } from "../analytics/workout-analytics";
import { NutritionAnalytics } from "../analytics/nutrition-analytics";
import { Dumbbell, Apple, Trophy } from "lucide-react";
import type { WorkoutLog, MealLog } from "@db/schema";

interface ProgressData {
  workouts: WorkoutLog[];
  meals: MealLog[];
  stats: {
    totalWorkouts: number;
    averageCalories: number;
    programProgress: number;
  };
}

export function ClientDashboard() {
  const { data: progressData, isLoading } = useQuery<ProgressData>({
    queryKey: ["/api/client/dashboard"],
  });

  if (isLoading || !progressData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Total Workouts"
          value={progressData.stats.totalWorkouts}
          icon={Dumbbell}
          description="Lifetime workouts completed"
        />
        <StatsCard
          title="Daily Calories"
          value={Math.round(progressData.stats.averageCalories)}
          icon={Apple}
          description="Average daily intake"
        />
        <StatsCard
          title="Program Progress"
          value={`${progressData.stats.programProgress}%`}
          icon={Trophy}
          description="Current program completion"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <WorkoutAnalytics
          workouts={progressData.workouts}
          isLoading={isLoading}
        />
        <NutritionAnalytics
          meals={progressData.meals}
          isLoading={isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coach Messages</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Messages component will be implemented in the next iteration */}
          <p className="text-muted-foreground">No messages yet</p>
        </CardContent>
      </Card>
    </div>
  );
}
