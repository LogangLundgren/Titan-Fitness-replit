import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import type { Program } from "@db/schema";
import { DumbbellIcon, UtensilsIcon, CameraIcon } from "lucide-react";
import { useLocation } from "wouter";

const PROGRAM_ICONS = {
  lifting: DumbbellIcon,
  diet: UtensilsIcon,
  posing: CameraIcon,
} as const;

interface ClientProgram extends Program {
  enrollmentId: number;
  programId: number;
  startDate: string;
  active: boolean;
  progress?: {
    completed: string[];
    notes: string[];
  };
}

interface ProgramCardProps {
  program: Program | ClientProgram;
  showEnrollButton?: boolean;
  showManageButton?: boolean;
  onManage?: (programId: number) => void;
}

export function ProgramCard({
  program,
  showEnrollButton = false,
  showManageButton = false,
  onManage,
}: ProgramCardProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const Icon = PROGRAM_ICONS[program.type as keyof typeof PROGRAM_ICONS] || DumbbellIcon;

  // Check if program is a client program
  const isClientProgram = 'enrollmentId' in program;

  const handleEnroll = async () => {
    try {
      const response = await fetch(`/api/programs/${program.id}/enroll`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      toast({
        title: "Success",
        description: "Successfully enrolled in program",
      });

      const enrolledProgram = await response.json();
      // Redirect to the program log page after enrollment
      setLocation(`/programs/${enrolledProgram.enrollmentId}/log`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on a button
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }

    if (!user) return;

    if (user.accountType === "client" && isClientProgram) {
      // For clients, use enrollmentId for program logs
      setLocation(`/programs/${(program as ClientProgram).enrollmentId}/log`);
    } else if (user.accountType === "coach" && !isClientProgram) {
      // For coaches viewing their own programs
      setLocation(`/programs/${program.id}/manage`);
    }
  };

  const getProgramTypeLabel = (type: string) => {
    switch (type) {
      case "lifting":
        return "Strength Training";
      case "diet":
        return "Nutrition Plan";
      case "posing":
        return "Posing Coaching";
      default:
        return type;
    }
  };

  return (
    <Card 
      className={user ? "cursor-pointer hover:shadow-md transition-shadow" : undefined}
      onClick={handleCardClick}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <CardTitle>{program.name}</CardTitle>
          </div>
          <div className="text-sm font-medium">
            {typeof program.price === 'number' ? (program.price === 0 ? "Free" : `$${program.price}`) : "Free"}
          </div>
        </div>
        <CardDescription>{program.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {getProgramTypeLabel(program.type)}
          </div>
          <div className="flex gap-2">
            {showEnrollButton && (
              <Button onClick={(e) => {
                e.stopPropagation();
                handleEnroll();
              }}>
                Enroll Now
              </Button>
            )}
            {showManageButton && onManage && (
              <Button 
                variant="outline" 
                onClick={(e) => {
                  e.stopPropagation();
                  onManage(program.id);
                }}
              >
                Manage
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}