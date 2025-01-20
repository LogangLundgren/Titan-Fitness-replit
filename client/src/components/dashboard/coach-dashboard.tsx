import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatsCard } from "./stats-card";
import { Users, Target, MessageSquare } from "lucide-react";
import type { User } from "@db/schema";

interface ClientData {
  id: number;
  username: string;
  progress: {
    totalWorkouts: number;
    lastActive: string;
    programCompletion: number;
  };
}

export function CoachDashboard() {
  const [selectedClient, setSelectedClient] = useState<number | null>(null);

  const { data: clientsData, isLoading } = useQuery<{
    clients: ClientData[];
    stats: {
      totalClients: number;
      activePrograms: number;
      messageCount: number;
    };
  }>({
    queryKey: ["/api/coach/dashboard"],
  });

  if (isLoading || !clientsData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Total Clients"
          value={clientsData.stats.totalClients}
          icon={Users}
          description="Active client count"
        />
        <StatsCard
          title="Active Programs"
          value={clientsData.stats.activePrograms}
          icon={Target}
          description="Programs in progress"
        />
        <StatsCard
          title="Messages"
          value={clientsData.stats.messageCount}
          icon={MessageSquare}
          description="Unread messages"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {clientsData.clients.map((client) => (
          <Card
            key={client.id}
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setSelectedClient(client.id)}
          >
            <CardHeader>
              <CardTitle className="text-lg">{client.username}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">Total Workouts: </span>
                  {client.progress.totalWorkouts}
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Last Active: </span>
                  {new Date(client.progress.lastActive).toLocaleDateString()}
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
            <Tabs defaultValue="progress">
              <TabsList>
                <TabsTrigger value="progress">Progress</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="messages">Messages</TabsTrigger>
              </TabsList>
              {/* Tab contents will be implemented in the next iteration */}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
