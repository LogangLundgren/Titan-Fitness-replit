import { useQuery } from "@tanstack/react-query";
import { StatsCard } from "@/components/dashboard/stats-card";
import { WorkoutAnalytics } from "@/components/analytics/workout-analytics";
import { NutritionAnalytics } from "@/components/analytics/nutrition-analytics";
import { Loader2, Activity, Dumbbell, Apple } from "lucide-react";

type ProgressData = {
  workouts: Array<any>;
  meals: Array<any>;
  analytics: {
    workout: {
      totalWorkouts: number;
      averageVolume: number;
      lastWeekVolume: number;
    };
    nutrition: {
      averageCalories: number;
      averageProtein: number;
      caloriesTrend: Array<{
        date: string;
        calories: number;
      }>;
    };
  };
};

export default function Dashboard() {
  const { data, isLoading } = useQuery<ProgressData>({
    queryKey: ["/api/progress"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Total Workouts"
          value={data?.analytics.workout.totalWorkouts || 0}
          icon={Dumbbell}
          description="Lifetime workouts completed"
        />
        <StatsCard
          title="Weekly Volume"
          value={Math.round(data?.analytics.workout.lastWeekVolume || 0)}
          icon={Activity}
          description="Total volume this week"
        />
        <StatsCard
          title="Avg. Daily Calories"
          value={Math.round(data?.analytics.nutrition.averageCalories || 0)}
          icon={Apple}
          description="Based on last 7 days"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <WorkoutAnalytics
          workouts={data?.workouts || []}
          isLoading={isLoading}
        />
        <NutritionAnalytics
          meals={data?.meals || []}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}