import { Metadata } from "next";
import { ReactNode } from "react";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Login | Matris Manager",
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Image Background */}
      <Image
        src="/login-background.png"
        alt="Background"
        fill
        className="object-cover z-0"
        priority
      />
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/40 z-0" />
      
      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}
