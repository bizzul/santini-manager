import { Badge } from "@/components/ui/badge";

interface MatchBadgeProps {
  isNuovo: boolean;
  label?: string;
}

export function MatchBadge({ isNuovo, label }: MatchBadgeProps) {
  if (isNuovo) {
    return (
      <Badge variant="outline" className="border-amber-500/50 text-amber-700">
        {label ?? "Nuovo"}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="border-emerald-500/50 text-emerald-700">
      {label ?? "Trovato in DB"}
    </Badge>
  );
}
