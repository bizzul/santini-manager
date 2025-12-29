import { ReactNode } from "react";

export default function TimeTrackingCreateLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-background overflow-auto">
      {children}
    </div>
  );
}

