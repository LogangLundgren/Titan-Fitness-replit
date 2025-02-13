import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DumbbellIcon, UtensilsIcon, CameraIcon, Users, PackageIcon } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const PROGRAM_TYPES = [
  {
    id: "lifting",
    name: "Strength Training Program",
    description: "Create a customized lifting program with exercises and routines",
    icon: DumbbellIcon,
  },
  {
    id: "diet",
    name: "Nutrition Program",
    description: "Design meal plans and nutritional guidance",
    icon: UtensilsIcon,
  },
  {
    id: "posing",
    name: "Posing Program",
    description: "Create posing routines and coaching sessions",
    icon: CameraIcon,
  },
  {
    id: "coaching",
    name: "1-on-1 Coaching",
    description: "Offer personalized coaching and mentorship",
    icon: Users,
  },
  {
    id: "all-inclusive",
    name: "All-Inclusive Package",
    description: "Combine existing programs into a comprehensive package",
    icon: PackageIcon,
  },
] as const;

export default function CreateProgram() {
  const [, setLocation] = useLocation();
  const [selectedType, setSelectedType] = useState<string>("lifting");

  const handleSubmit = () => {
    setLocation(`/programs/create/${selectedType}`);
  };

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Create New Program</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Program Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            defaultValue={selectedType}
            onValueChange={setSelectedType}
            className="grid grid-cols-2 gap-4"
          >
            {PROGRAM_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <div key={type.id}>
                  <RadioGroupItem
                    value={type.id}
                    id={type.id}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={type.id}
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <Icon className="mb-3 h-6 w-6" />
                    <div className="space-y-1 text-center">
                      <p className="text-sm font-medium leading-none">
                        {type.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {type.description}
                      </p>
                    </div>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>

          <div className="flex justify-end">
            <Button onClick={handleSubmit} size="lg">
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}