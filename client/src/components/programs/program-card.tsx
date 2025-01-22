import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { Program } from "@db/schema";
import { DumbbellIcon, UtensilsIcon, CameraIcon, HeartHandshakeIcon } from "lucide-react";

const PROGRAM_ICONS = {
  lifting: DumbbellIcon,
  diet: UtensilsIcon,
  posing: CameraIcon,
  coaching: HeartHandshakeIcon,
} as const;

interface ProgramCardProps {
  program: Program;
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
  const Icon = PROGRAM_ICONS[program.type as keyof typeof PROGRAM_ICONS] || DumbbellIcon;

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
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
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
      case "coaching":
        return "Comprehensive Coaching";
      default:
        return type;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <CardTitle>{program.name}</CardTitle>
          </div>
          <div className="text-sm font-medium">
            {program.price === 0 ? "Free" : `$${program.price}`}
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
              <Button onClick={handleEnroll}>
                Enroll Now
              </Button>
            )}
            {showManageButton && onManage && (
              <Button variant="outline" onClick={() => onManage(program.id)}>
                Manage
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}