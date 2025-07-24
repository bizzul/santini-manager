import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SetBodyClass } from "@/components/SetBodyClass";

export default function Home() {
  return (
    <>
      <SetBodyClass className="bg-transparent" />
      <div className="relative min-h-screen  overflow-hidden">
        <div className="stripe-gradient-bg pointer-events-none absolute inset-0 z-0" />
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen bg-transparent">
          <h1 className="text-4xl font-bold mb-6  dark:text-white">
            Welcome to Reactive Manager
          </h1>
          <div className="flex space-x-4">
            <Link href="/login">
              <Button variant="outline" className=" dark:text-white">
                Login
              </Button>
            </Link>
          </div>
          <p className="mt-8 text-gray-600 dark:text-gray-300">
            This is the root home page
          </p>
          <p className="mt-8 text-gray-600 dark:text-gray-300">
            COMING SOON THE PRESENTATION OF THE MANAGER
          </p>
        </div>
      </div>
    </>
  );
}
