import Image from "next/image";
import { signIn, signup } from "./actions";
import { Suspense } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="mx-5  py-10 sm:mx-auto sm:w-full sm:max-w-md ">
      <div className="glass-gradient-bg  absolute inset-0 z-0" />

      <div className="backdrop-blur-lg bg-white/20 dark:bg-black/20 border border-white/30 dark:border-black/30 rounded-2xl shadow-lg p-10 flex flex-col justify-center items-center">
        {/* <Image
        alt="Reactive manager"
        width={100}
        height={100}
        className="relative mx-auto h-12 w-auto dark:scale-110 dark:rounded-full dark:border dark:border-stone-400"
        src="/logo.png"
      /> */}
        <h1 className="mt-6 text-center font-cal text-3xl  ">
          Reactive Manager
        </h1>
        <div className="mx-auto mt-4 w-11/12 max-w-xs sm:w-full">
          <Suspense
            fallback={
              <div className="my-2 h-10 w-full rounded-md border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800" />
            }
          >
            <form className="flex flex-col gap-2 ">
              <label htmlFor="email">Email:</label>
              <Input id="email" name="email" type="email" required />
              <label htmlFor="password">Password:</label>
              <Input id="password" name="password" type="password" required />
              <Button
                className="hover:bg-white/20 mt-8 mx-auto"
                variant="outline"
                formAction={signIn}
              >
                Log in
              </Button>
              {/* <Button formAction={signup}>Sign up</Button> */}
            </form>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
