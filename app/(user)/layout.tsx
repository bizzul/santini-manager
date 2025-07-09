import { Providers } from "../Theme/providers";
import { UserProvider } from "@auth0/nextjs-auth0/client";
import { Toaster } from "@/components/ui/toaster";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { cookies } from "next/headers";

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: any;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  return (
    <Providers>
      <UserProvider>
        <SidebarProvider defaultOpen={defaultOpen}>
          <AppSidebar />
          <>
            <SidebarTrigger />
            {children}
            <Toaster />
          </>
        </SidebarProvider>
      </UserProvider>
    </Providers>
  );
}
