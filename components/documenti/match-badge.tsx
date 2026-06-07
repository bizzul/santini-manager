import { Badge } from "@/components/ui/badge";

interface MatchBadgeProps {
  isNuovo: boolean;
  label?: string;
}

export function MatchBadge({ isNuovo, label }: MatchBadgeProps) {
  if (isNuovo) {
    return (
      <Badge variant="outline" className="border-warning/50 text-warning">
        {label ?? "Nuovo"}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="border-success/50 text-success">
      {label ?? "Trovato in DB"}
    </Badge>
  );
}
