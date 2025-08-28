import { CompleteSignupForm } from "@/components/complete-signup";
import { Suspense } from "react";

export default function CompleteSignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome to Your Organization!
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Complete your profile to access your workspace
          </p>
        </div>

        <Suspense fallback={<div>Loading...</div>}>
          <CompleteSignupForm />
        </Suspense>
      </div>
    </div>
  );
}
