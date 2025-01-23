import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Landing() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/beta-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      toast({
        title: "Success",
        description: "Thanks for signing up! We'll be in touch soon.",
      });

      setFormData({ firstName: "", lastName: "", email: "" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1521] text-white">
      <div className="container mx-auto px-4 py-16 space-y-8">
        <h1 className="text-5xl md:text-7xl font-bold text-center">
          Professional Fitness Tools
        </h1>
        <p className="text-xl text-center text-gray-400 max-w-2xl mx-auto">
          Everything you need to manage your fitness business in one place
        </p>

        <div className="max-w-2xl mx-auto mt-8">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
            <Input 
              placeholder="Enter your first name..." 
              className="bg-[#1A2332] border-[#2A3343] text-white"
              value={formData.firstName}
              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              required
            />
            <Input 
              placeholder="Enter your last name..." 
              className="bg-[#1A2332] border-[#2A3343] text-white"
              value={formData.lastName}
              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
              required
            />
            <Input 
              placeholder="Enter your email for beta access..." 
              className="bg-[#1A2332] border-[#2A3343] text-white"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
            <Button 
              className="bg-[#00BAA1] hover:bg-[#00A891] text-white"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>Loading...</>
              ) : (
                <>Get Access</>
              )}
            </Button>
          </form>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
          <div className="bg-[#1A2332] p-6 rounded-lg">
            <div className="mb-4">
              <span className="inline-block px-2 py-1 text-sm bg-[#2A3343] rounded">Popular</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Workout Builder</h3>
            <p className="text-gray-400">Create professional workout plans with our intuitive builder</p>
          </div>
          <div className="bg-[#1A2332] p-6 rounded-lg">
            <div className="mb-4">
              <span className="inline-block px-2 py-1 text-sm bg-[#2A3343] rounded">New</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Nutrition Planner</h3>
            <p className="text-gray-400">Design balanced meal plans and track macros effortlessly</p>
          </div>
          <div className="bg-[#1A2332] p-6 rounded-lg">
            <div className="mb-4">
              <span className="inline-block px-2 py-1 text-sm bg-[#2A3343] rounded">Essential</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Client Management</h3>
            <p className="text-gray-400">Manage your clients and their progress in one place</p>
          </div>
          <div className="bg-[#1A2332] p-6 rounded-lg">
            <div className="mb-4">
              <span className="inline-block px-2 py-1 text-sm bg-[#2A3343] rounded">Analytics</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Progress Tracking</h3>
            <p className="text-gray-400">Track and visualize fitness progress with detailed analytics</p>
          </div>
        </div>

        <footer className="text-center mt-16 text-gray-400">
          <p>Contact us: <a href="mailto:titanfitnessbusinessllc@gmail.com" className="text-[#00BAA1] hover:underline">titanfitnessbusinessllc@gmail.com</a></p>
        </footer>
      </div>
    </div>
  );
}