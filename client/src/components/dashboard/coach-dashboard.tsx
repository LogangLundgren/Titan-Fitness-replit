import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatsCard } from "./stats-card";
import { Users, Target, MessageSquare, Loader2 } from "lucide-react";
import { ProgramAnalytics } from "../analytics/program-analytics";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";

interface ClientProgress {
  totalWorkouts: number;
  lastActive: string;
  programCompletion: number;
}

interface ClientData {
  id: number;
  name: string;
  email: string;
  programName: string;
  lastActive: string;
  progress: ClientProgress;
}

interface DashboardStats {
  totalClients: number;
  activePrograms: number;
  totalWorkouts: number;
}

interface ProgramTypes {
  lifting: number;
  diet: number;
  posing: number;
}

interface DashboardData {
  clients: ClientData[];
  stats: DashboardStats;
  programTypes: ProgramTypes;
}

export function CoachDashboard() {
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      setSelectedClient(null);
      queryClient.removeQueries({ queryKey: ['coach-dashboard'] });
    };
  }, [queryClient, user?.id]);

  const { data: dashboardData, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['coach-dashboard'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/coach/dashboard');
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        const data = await response.json();
        return data;
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
    staleTime: 30000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 3
  });

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

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Coach Dashboard</h1>

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
        {dashboardData.clients.map((client: ClientData) => (
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
                    {dashboardData.clients.map((client: ClientData) => {
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
                              <p className="text-lg">{new Date(client.lastActive).toLocaleDateString()}</p>
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