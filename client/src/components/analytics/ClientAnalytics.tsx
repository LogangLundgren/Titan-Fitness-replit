import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

export function ClientAnalytics({ clientId }: { clientId?: number }) {
  const { data, isLoading, error } = useQuery({
    queryKey: [clientId ? `/api/coach/client/${clientId}/history` : '/api/progress'],
    queryFn: async () => {
      const res = await fetch(clientId ? `/api/coach/client/${clientId}/history` : '/api/progress');
      if (!res.ok) throw new Error('Failed to fetch analytics data');
      return res.json();
    },
  });

  if (isLoading) {
    return <AnalyticsLoading />;
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Analytics</CardTitle>
          <CardDescription>Failed to load analytics data. Please try again later.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { stats, recentWorkouts, recentMeals } = data;

  return (
    <Tabs defaultValue="analytics" className="w-full space-y-4">
      <TabsList>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="progress">Progress</TabsTrigger>
      </TabsList>

      <TabsContent value="analytics" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Program Completion</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.workouts.total}%</div>
              <Progress value={stats.workouts.total} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Workouts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.workouts.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Workout</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.workouts.lastWorkout ? format(new Date(stats.workouts.lastWorkout), 'PP') : 'No workouts'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Meal Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.nutrition.lastMeal ? format(new Date(stats.nutrition.lastMeal), 'PP') : 'No meals'}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Workout Frequency</CardTitle>
              <CardDescription>Average workouts per week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.workouts.frequency.toFixed(1)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Nutrition Overview</CardTitle>
              <CardDescription>Average daily intake</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-muted-foreground">Calories:</span>{" "}
                <span className="font-bold">{stats.nutrition.averageCalories}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Protein:</span>{" "}
                <span className="font-bold">{stats.nutrition.averageProtein}g</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="progress" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Recent Workouts</CardTitle>
            <CardDescription>Last {recentWorkouts.length} workouts</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recentWorkouts.map((workout) => (
                <li key={workout.id} className="flex justify-between items-center">
                  <span>{format(new Date(workout.date), 'PP')}</span>
                  <span className="text-muted-foreground">{workout.data.routineName}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Meals</CardTitle>
            <CardDescription>Last {recentMeals.length} meal logs</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recentMeals.map((meal) => (
                <li key={meal.id} className="flex justify-between items-center">
                  <span>{format(new Date(meal.date), 'PP')}</span>
                  <span className="text-muted-foreground">{meal.calories} calories</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function AnalyticsLoading() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array(4).fill(0).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-[140px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[100px]" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array(2).fill(0).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-[200px]" />
              <Skeleton className="h-4 w-[160px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[100px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
