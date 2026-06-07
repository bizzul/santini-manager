import { Badge } from "@/components/ui/badge";
import { FC } from "react";

type Props = {
  value: string;
  size?: string;
};

const STATUS_MAP: Record<
  string,
  { label: string; variant: "warning" | "success" | "secondary" | "outline" }
> = {
  CREATED: { label: "CREATA", variant: "warning" },
  ONGOING: { label: "IN CORSO", variant: "warning" },
  COMPLETED: { label: "COMPLETATA", variant: "success" },
  REPLACED: { label: "SOVRASCRITTA", variant: "secondary" },
};

export const ImportStatusLabel: FC<Props> = ({ value, size = "normal" }) => {
  const config = STATUS_MAP[value] ?? { label: value, variant: "outline" as const };

  return (
    <Badge
      variant={config.variant}
      className={size === "small" ? "px-1.5 py-0.5 text-xs uppercase" : "uppercase"}
    >
      {config.label}
    </Badge>
  );
};
