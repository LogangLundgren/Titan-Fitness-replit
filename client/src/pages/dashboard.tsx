import { useUser } from "@/hooks/use-user";
import { CoachDashboard } from "@/components/dashboard/coach-dashboard";
import { ClientDashboard } from "@/components/dashboard/client-dashboard";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return user.accountType === "coach" ? <CoachDashboard /> : <ClientDashboard />;
}