import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Marketplace from "@/pages/marketplace";
import Programs from "@/pages/programs";
import Profile from "@/pages/profile";
import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";
import { Navbar } from "@/components/navigation/navbar";
import CreateProgram from "@/pages/program-create";
import CreateLiftingProgram from "@/pages/program-create/lifting";
import CreateDietProgram from "@/pages/program-create/diet";
import CreatePosingProgram from "@/pages/program-create/posing";
import ManageProgram from "@/pages/program-manage/[id]";
import ProgramLog from "@/pages/program-log/[id]";

function Router() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/landing" component={Landing} />
        <Route component={AuthPage} />
      </Switch>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/marketplace" component={Marketplace} />
          <Route path="/programs" component={Programs} />
          <Route path="/programs/create" component={CreateProgram} />
          <Route path="/programs/create/lifting" component={CreateLiftingProgram} />
          <Route path="/programs/create/diet" component={CreateDietProgram} />
          <Route path="/programs/create/posing" component={CreatePosingProgram} />
          <Route path="/programs/:id/manage" component={ManageProgram} />
          <Route path="/programs/:id/log" component={ProgramLog} />
          <Route path="/profile" component={Profile} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;