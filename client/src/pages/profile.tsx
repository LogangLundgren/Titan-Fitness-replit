import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";

export default function Profile() {
  const { user, logout } = useUser();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/profile"],
  });

  const updateProfile = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  if (profileLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    updateProfile.mutate(data);
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-2xl font-bold">Profile Settings</CardTitle>
          <Button 
            variant="destructive"
            onClick={() => logout()}
          >
            Sign Out
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label>Account Type</Label>
                <Input 
                  value={user.accountType}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div>
                <Label>Full Name</Label>
                <Input 
                  name="fullName"
                  defaultValue={profile?.fullName}
                  required
                />
              </div>

              <div>
                <Label>Email</Label>
                <Input 
                  name="email"
                  type="email"
                  defaultValue={profile?.email}
                  required
                />
              </div>

              <div>
                <Label>Bio</Label>
                <Textarea 
                  name="bio"
                  defaultValue={profile?.bio}
                  className="h-32"
                />
              </div>

              {user.accountType === "coach" && (
                <>
                  <div>
                    <Label>Phone Number</Label>
                    <Input 
                      name="phoneNumber"
                      type="tel"
                      defaultValue={profile?.phoneNumber}
                    />
                  </div>

                  <div>
                    <Label>Specialties</Label>
                    <Input 
                      name="specialties"
                      defaultValue={profile?.specialties}
                    />
                  </div>

                  <div>
                    <Label>Certifications</Label>
                    <Textarea 
                      name="certifications"
                      defaultValue={profile?.certifications}
                    />
                  </div>

                  <div>
                    <Label>Experience</Label>
                    <Textarea 
                      name="experience"
                      defaultValue={profile?.experience}
                    />
                  </div>

                  <div className="space-y-4">
                    <Label>Social Links</Label>
                    <div>
                      <Label className="text-sm">Instagram</Label>
                      <Input 
                        name="socialLinks.instagram"
                        defaultValue={profile?.socialLinks?.instagram}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Twitter</Label>
                      <Input 
                        name="socialLinks.twitter"
                        defaultValue={profile?.socialLinks?.twitter}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Website</Label>
                      <Input 
                        name="socialLinks.website"
                        defaultValue={profile?.socialLinks?.website}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      name="isPublicProfile"
                      defaultChecked={profile?.isPublicProfile}
                    />
                    <Label>Public Profile</Label>
                  </div>
                </>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={updateProfile.isPending}
            >
              {updateProfile.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
