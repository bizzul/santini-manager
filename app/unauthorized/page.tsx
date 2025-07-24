import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-black">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-4 bg-red-100 rounded-full dark:bg-red-900">
            <Shield className="h-12 w-12 text-red-600 dark:text-red-400" />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          Access Denied
        </h1>

        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-md">
          You don&apos;t have permission to access this page. Please contact
          your administrator if you believe this is an error.
        </p>

        <div className="flex space-x-4">
          <Link href="/dashboard">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline">Go Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
