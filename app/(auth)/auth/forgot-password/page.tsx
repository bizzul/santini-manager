import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="glass-gradient-bg  absolute inset-0 z-0" />
      <div className="w-full max-w-sm backdrop-blur-lg bg-white/20 dark:bg-black/20 border border-white/30 dark:border-black/30 rounded-2xl shadow-lg p-10 flex flex-col justify-center items-center">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
