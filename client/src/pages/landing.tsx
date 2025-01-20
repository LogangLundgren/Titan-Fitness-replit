import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Landing() {
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
          <div className="flex flex-col sm:flex-row gap-4">
            <Input 
              placeholder="Enter your full name..." 
              className="bg-[#1A2332] border-[#2A3343] text-white"
            />
            <Input 
              placeholder="Enter your email for beta access..." 
              className="bg-[#1A2332] border-[#2A3343] text-white"
            />
            <Button className="bg-[#00BAA1] hover:bg-[#00A891] text-white">
              Get Access
            </Button>
          </div>
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
      </div>
    </div>
  );
}
