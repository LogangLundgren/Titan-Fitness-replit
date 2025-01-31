import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { WorkoutLog } from "@db/schema";

interface WorkoutAnalyticsProps {
  workouts: WorkoutLog[];
  isLoading: boolean;
}

export function WorkoutAnalytics({ workouts, isLoading }: WorkoutAnalyticsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  // Process workout data for charts, ensuring type safety
  const processedData = workouts.map(workout => ({
    date: workout.date ? new Date(workout.date).toLocaleDateString() : "Unknown",
    volume: workout.data && typeof workout.data === "object" && "volume" in workout.data 
      ? Number(workout.data.volume) || 0 
      : 0,
    intensity: workout.data && typeof workout.data === "object" && "intensity" in workout.data 
      ? Number(workout.data.intensity) || 0 
      : 0,
  })).reverse();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Workout Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="volume" 
                stroke="hsl(var(--primary))" 
                name="Volume"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="intensity" 
                stroke="hsl(var(--destructive))" 
                name="Intensity"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}