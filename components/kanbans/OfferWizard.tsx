"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";

// TODO: Define the actual wizard steps when user provides details
// For now, this is a placeholder structure

interface WizardStep {
  id: string;
  title: string;
  description?: string;
  component: React.ComponentType<WizardStepProps>;
}

interface WizardStepProps {
  data: any;
  onDataChange: (data: any) => void;
  onValidate?: () => boolean;
}

// Placeholder step component - will be replaced with actual steps
const PlaceholderStep: React.FC<WizardStepProps> = ({ data, onDataChange }) => {
  return (
    <div className="py-8 text-center text-muted-foreground">
      <p>Questo step sarà implementato a breve.</p>
      <p className="text-sm mt-2">
        Il wizard includerà i passaggi specifici per la creazione
        dell&apos;offerta.
      </p>
    </div>
  );
};

// Default wizard steps - will be customized based on user requirements
const DEFAULT_STEPS: WizardStep[] = [
  {
    id: "client",
    title: "Cliente",
    description: "Seleziona o crea un cliente",
    component: PlaceholderStep,
  },
  {
    id: "product",
    title: "Prodotto",
    description: "Scegli il tipo di prodotto",
    component: PlaceholderStep,
  },
  {
    id: "details",
    title: "Dettagli",
    description: "Configura i dettagli dell'offerta",
    component: PlaceholderStep,
  },
  {
    id: "review",
    title: "Riepilogo",
    description: "Rivedi e conferma l'offerta",
    component: PlaceholderStep,
  },
];

interface OfferWizardProps {
  kanbanId: number;
  onComplete: (offerData: any) => Promise<void>;
  onCancel: () => void;
  steps?: WizardStep[];
  domain?: string;
}

export default function OfferWizard({
  kanbanId,
  onComplete,
  onCancel,
  steps = DEFAULT_STEPS,
  domain,
}: OfferWizardProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [wizardData, setWizardData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStep = steps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / steps.length) * 100;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const handleDataChange = (stepData: any) => {
    setWizardData((prev) => ({
      ...prev,
      [currentStep.id]: stepData,
    }));
  };

  const handleNext = () => {
    if (isLastStep) {
      handleSubmit();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onComplete({
        ...wizardData,
        kanbanId,
      });
    } catch (error) {
      console.error("Error creating offer:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const StepComponent = currentStep.component;

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <div>
            <CardTitle>{currentStep.title}</CardTitle>
            {currentStep.description && (
              <CardDescription>{currentStep.description}</CardDescription>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            Step {currentStepIndex + 1} di {steps.length}
          </div>
        </div>
        <Progress value={progress} className="h-2" />

        {/* Step indicators */}
        <div className="flex justify-between mt-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center ${
                index < steps.length - 1 ? "flex-1" : ""
              }`}
            >
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${
                    index < currentStepIndex
                      ? "bg-primary text-primary-foreground"
                      : index === currentStepIndex
                      ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                      : "bg-muted text-muted-foreground"
                  }
                `}
              >
                {index < currentStepIndex ? (
                  <Check className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`
                    flex-1 h-0.5 mx-2
                    ${index < currentStepIndex ? "bg-primary" : "bg-muted"}
                  `}
                />
              )}
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="min-h-[300px]">
        <StepComponent
          data={wizardData[currentStep.id] || {}}
          onDataChange={handleDataChange}
        />
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={isFirstStep ? onCancel : handleBack}
          disabled={isSubmitting}
        >
          {isFirstStep ? (
            "Annulla"
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Indietro
            </>
          )}
        </Button>
        <Button onClick={handleNext} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creazione...
            </>
          ) : isLastStep ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Crea Offerta
            </>
          ) : (
            <>
              Avanti
              <ChevronRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
