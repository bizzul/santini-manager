import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function Home() {
  return (
    <>
      <div className="relative min-h-screen overflow-hidden">
        <div className="glass-gradient-bg  absolute inset-0 z-0" />
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen">
          <div className="backdrop-blur-lg bg-white/20 dark:bg-black/20 border border-white/30 dark:border-black/30 rounded-2xl shadow-lg p-10 flex flex-col justify-center items-center">
            <h1 className="text-4xl font-bold mb-6 dark:text-white ">
              Reactive Manager
            </h1>
            <div className="space-x-4 ">
              <Link href="/login">
                <Button variant="outline" className="hover:bg-white/20">
                  Login
                </Button>
              </Link>
            </div>
            <p className="mt-8 ">This is the root home page</p>
            <p className="mt-8 ">COMING SOON THE PRESENTATION OF THE MANAGER</p>
          </div>
        </div>
      </div>
    </>
  );
}
