import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PosingPlan {
  bio: string;
  details: string;
  communicationPreference: string;
}

export default function CreatePosingProgram() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [program, setProgram] = useState({
    name: "",
    description: "",
    type: "posing",
    price: 0,
    posingPlan: {
      bio: "",
      details: "",
      communicationPreference: "email",
    } as PosingPlan,
  });

  const handleSubmit = async () => {
    if (!program.name) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Program name is required",
      });
      return;
    }

    if (!program.posingPlan.bio || !program.posingPlan.details) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Bio and details are required",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/programs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(program),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      toast({
        title: "Success",
        description: "Program created successfully",
      });

      setLocation("/programs");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Create Posing Program</h1>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Program
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Program Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Program Name</Label>
              <Input
                id="name"
                value={program.name}
                onChange={(e) => setProgram({ ...program, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={program.description}
                onChange={(e) => setProgram({ ...program, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={program.price}
                onChange={(e) => setProgram({ ...program, price: parseFloat(e.target.value) })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Posing Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea
                value={program.posingPlan.bio}
                onChange={(e) => {
                  setProgram({
                    ...program,
                    posingPlan: {
                      ...program.posingPlan,
                      bio: e.target.value,
                    },
                  });
                }}
                placeholder="Enter client's bio and background"
              />
            </div>
            <div className="space-y-2">
              <Label>Additional Details</Label>
              <Textarea
                value={program.posingPlan.details}
                onChange={(e) => {
                  setProgram({
                    ...program,
                    posingPlan: {
                      ...program.posingPlan,
                      details: e.target.value,
                    },
                  });
                }}
                placeholder="Enter posing instructions and details"
              />
            </div>
            <div className="space-y-2">
              <Label>Communication Preference</Label>
              <Select
                value={program.posingPlan.communicationPreference}
                onValueChange={(value) => {
                  setProgram({
                    ...program,
                    posingPlan: {
                      ...program.posingPlan,
                      communicationPreference: value,
                    },
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select communication preference" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="chat">In-App Chat</SelectItem>
                  <SelectItem value="video">Video Call</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
