import { ReactNode, Suspense } from "react";
import RoleBasedNav from "@/components/role-based-nav";
import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";

interface RoleBasedLayoutProps {
  children: ReactNode;
  requiredRole?: "user" | "admin" | "superadmin";
}

async function RoleBasedLayoutContent({
  children,
  requiredRole = "user",
}: RoleBasedLayoutProps) {
  const userContext = await getUserContext();

  if (!userContext) {
    redirect("/login");
  }

  // Check if user has required role
  const roleHierarchy: Record<string, number> = {
    user: 1,
    admin: 2,
    superadmin: 3,
  };

  if (roleHierarchy[userContext.role] < roleHierarchy[requiredRole]) {
    redirect("/unauthorized");
  }

  return (
    <div>
      <RoleBasedNav userRole={userContext.role}>
        <Suspense fallback={<div>Loading...</div>}>
          {/* Profile component removed - not implemented */}
        </Suspense>
      </RoleBasedNav>
      <div className="min-h-screen sm:pl-60 dark:bg-black">{children}</div>
    </div>
  );
}

export default function RoleBasedLayout(props: RoleBasedLayoutProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RoleBasedLayoutContent {...props} />
    </Suspense>
  );
}
