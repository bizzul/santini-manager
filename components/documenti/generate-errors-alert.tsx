import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface GenerateErrorsAlertProps {
  errors: string[];
}

export function GenerateErrorsAlert({ errors }: GenerateErrorsAlertProps) {
  if (errors.length === 0) return null;

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>
        Generazione fallita ({errors.length}{" "}
        {errors.length === 1 ? "errore" : "errori"})
      </AlertTitle>
      <AlertDescription>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm">
          {errors.map((error, index) => (
            <li key={`${index}-${error.slice(0, 24)}`} className="break-words">
              {error}
            </li>
          ))}
        </ol>
      </AlertDescription>
    </Alert>
  );
}
