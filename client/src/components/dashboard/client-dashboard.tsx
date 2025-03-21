import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "./stats-card";
import { WorkoutAnalytics } from "../analytics/workout-analytics";
import { NutritionAnalytics } from "../analytics/nutrition-analytics";
import { Dumbbell, Apple, Trophy, Loader2 } from "lucide-react";
import type { WorkoutLog, MealLog } from "@db/schema";
import { useUser } from "@/hooks/use-user";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface DashboardData {
  stats: {
    totalWorkouts: number;
    averageCalories: number;
    programProgress: number;
  };
  workouts: WorkoutLog[];
  meals: MealLog[];
}

export function ClientDashboard() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: dashboardData, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['/api/client/dashboard', user?.id],
    queryFn: async () => {
      try {
        const response = await fetch('/api/client/dashboard');
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        return await response.json();
      } catch (error) {
        const err = error as Error;
        toast({
          variant: "destructive",
          title: "Error loading dashboard",
          description: err.message
        });
        throw err;
      }
    },
    enabled: !!user?.id,
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 3
  });

  // Reset query cache when user changes or component unmounts
  useEffect(() => {
    return () => {
      queryClient.removeQueries({ queryKey: ['/api/client/dashboard'] });
    };
  }, [queryClient, user?.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <p className="text-destructive">Failed to load dashboard</p>
          <p className="text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">No dashboard data available</p>
      </div>
    );
  }

  const { stats, workouts, meals } = dashboardData;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Total Workouts"
          value={stats.totalWorkouts || 0}
          icon={Dumbbell}
          description="Lifetime workouts completed"
        />
        <StatsCard
          title="Daily Calories"
          value={Math.round(stats.averageCalories) || 0}
          icon={Apple}
          description="Average daily intake"
        />
        <StatsCard
          title="Program Progress"
          value={`${stats.programProgress || 0}%`}
          icon={Trophy}
          description="Current program completion"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <WorkoutAnalytics
          workouts={workouts || []}
          isLoading={isLoading}
        />
        <NutritionAnalytics
          meals={meals || []}
          isLoading={isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coach Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No messages yet</p>
        </CardContent>
      </Card>
    </div>
  );
}