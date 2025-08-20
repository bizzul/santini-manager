"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/components/ui/use-toast";
import { createItem } from "./actions/create-item.action";
import { validation } from "@/validation/clients/create";
import { useParams } from "next/navigation";
// Components
import { MainClientForm } from "@/components/clients/forms/main-client-form";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";

type FormData = z.infer<typeof validation>;

type CreateItemResult =
  | { success: true; data: any }
  | { message: string; error?: string }
  | { message: string; error: string }
  | void;

const CreateClientForm = ({ handleClose }: { handleClose: () => void }) => {
  const { toast } = useToast();
  const params = useParams();
  const domain = params?.domain as string;

  const form = useForm<FormData>({
    resolver: zodResolver(validation),
    defaultValues: {
      // Main client info
      clientType: "BUSINESS",
      businessName: "",
      individualTitle: "",
      individualFirstName: "",
      individualLastName: "",
      clientLanguage: "",
      email: "",
      phone: "",

      // Main address
      address: "",
      city: "",
      countryCode: "CH",
      zipCode: undefined,
    },
  });

  const { isSubmitting } = form.formState;
  const watchClientType = form.watch("clientType") || "BUSINESS";

  const onSubmit = async (data: FormData) => {
    if (!domain) {
      toast({
        variant: "destructive",
        description: "Errore: dominio non trovato",
      });
      return;
    }

    try {
      const result = (await createItem(data, domain)) as CreateItemResult;

      console.log("result", result);

      if (result && "success" in result && result.success) {
        handleClose();
        toast({
          description: `Cliente ${
            data.businessName ||
            `${data.individualFirstName} ${data.individualLastName}`
          } creato con successo!`,
        });
      } else if (result && "error" in result) {
        throw new Error(result.error);
      } else {
        throw new Error("Errore sconosciuto durante la creazione");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        description: `Errore durante la creazione del cliente: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 ">
        {/* Main client form section */}
        <MainClientForm
          form={form}
          watchClientType={watchClientType}
          isSubmitting={isSubmitting}
        />

        {/* Submit button */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full border dark:border-white hover:bg-white hover:text-black"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Salvataggio in corso...</span>
            </div>
          ) : (
            "Salva Cliente"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default CreateClientForm;
