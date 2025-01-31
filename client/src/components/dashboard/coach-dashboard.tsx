import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatsCard } from "./stats-card";
import { Users, Target, MessageSquare } from "lucide-react";
import { ProgramAnalytics } from "../analytics/program-analytics";
import { useUser } from "@/hooks/use-user";

interface ClientData {
  id: number;
  name: string;
  email: string;
  programName: string;
  lastActive: string;
  progress: {
    totalWorkouts: number;
    lastActive: string;
    programCompletion: number;
  };
}

interface DashboardData {
  clients: ClientData[];
  stats: {
    totalClients: number;
    activePrograms: number;
    totalWorkouts: number;
  };
  programTypes: {
    lifting: number;
    diet: number;
    posing: number;
  };
}

export function CoachDashboard() {
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const { user } = useUser();
  const queryClient = useQueryClient();

  // Reset state when component unmounts or user changes
  useEffect(() => {
    return () => {
      setSelectedClient(null);
    };
  }, [user?.id]);

  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ["coach-dashboard", user?.id],
    queryFn: async () => {
      const response = await fetch("/api/coach/dashboard");
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }
      return response.json();
    },
    enabled: !!user?.id,
    staleTime: 30000, // Consider data fresh for 30 seconds
    cacheTime: 60000, // Keep data in cache for 1 minute
  });

  // Reset query cache when user changes
  useEffect(() => {
    return () => {
      queryClient.removeQueries({ queryKey: ["coach-dashboard"] });
    };
  }, [queryClient, user?.id]);

  if (isLoading || !dashboardData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Total Clients"
          value={dashboardData.stats.totalClients}
          icon={Users}
          description="Active client count"
        />
        <StatsCard
          title="Active Programs"
          value={dashboardData.stats.activePrograms}
          icon={Target}
          description="Programs in progress"
        />
        <StatsCard
          title="Total Workouts"
          value={dashboardData.stats.totalWorkouts}
          icon={MessageSquare}
          description="All client workouts"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {dashboardData.clients.map((client) => (
          <Card
            key={client.id}
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setSelectedClient(client.id)}
          >
            <CardHeader>
              <CardTitle className="text-lg">{client.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">Program: </span>
                  {client.programName}
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Total Workouts: </span>
                  {client.progress.totalWorkouts}
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Last Active: </span>
                  {new Date(client.lastActive).toLocaleDateString()}
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Program Completion: </span>
                  {client.progress.programCompletion}%
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedClient && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Client Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="analytics">
              <TabsList>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="progress">Progress</TabsTrigger>
              </TabsList>
              <TabsContent value="analytics">
                <ProgramAnalytics clientId={selectedClient} />
              </TabsContent>
              <TabsContent value="progress">
                <div className="space-y-6">
                  <div className="py-4">
                    <h3 className="text-lg font-medium">Progress Overview</h3>
                    {dashboardData.clients.map(client => {
                      if (client.id === selectedClient) {
                        return (
                          <div key={client.id} className="mt-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 border rounded-lg">
                                <p className="text-sm text-muted-foreground">Program Completion</p>
                                <p className="text-2xl font-semibold">{client.progress.programCompletion}%</p>
                              </div>
                              <div className="p-4 border rounded-lg">
                                <p className="text-sm text-muted-foreground">Total Workouts</p>
                                <p className="text-2xl font-semibold">{client.progress.totalWorkouts}</p>
                              </div>
                            </div>
                            <div className="p-4 border rounded-lg">
                              <p className="text-sm text-muted-foreground">Last Active</p>
                              <p className="text-lg">{new Date(client.progress.lastActive).toLocaleDateString()}</p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}