import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { 
  HomeIcon, 
  ShoppingBagIcon, 
  LayoutDashboardIcon,
  UtensilsIcon,
  LogOutIcon
} from "lucide-react";

export function Navbar() {
  const { user, logout } = useUser();

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold text-primary">
              Titan Fitness
            </Link>

            <div className="flex gap-4">
              <Link href="/" className="flex items-center gap-2 text-sm font-medium">
                <HomeIcon className="h-4 w-4" />
                Dashboard
              </Link>
              <Link href="/marketplace" className="flex items-center gap-2 text-sm font-medium">
                <ShoppingBagIcon className="h-4 w-4" />
                Marketplace
              </Link>
              <Link href="/programs" className="flex items-center gap-2 text-sm font-medium">
                <LayoutDashboardIcon className="h-4 w-4" />
                Programs
              </Link>
              <Link href="/meal-log" className="flex items-center gap-2 text-sm font-medium">
                <UtensilsIcon className="h-4 w-4" />
                Meal Log
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {user?.username}
            </span>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => logout()}
            >
              <LogOutIcon className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}