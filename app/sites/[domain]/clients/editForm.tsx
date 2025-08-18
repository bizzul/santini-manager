"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { validation } from "@/validation/clients/create";
import { useToast } from "@/components/ui/use-toast";
import { Client } from "@prisma/client";
import { editItem } from "./actions/edit-item.action";
import { MainClientForm } from "@/components/clients/forms/main-client-form";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";

type Props = {
  handleClose: () => void;
  data: Client;
};

const EditClientForm = ({ handleClose, data }: Props) => {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof validation>>({
    resolver: zodResolver(validation),
    defaultValues: {
      // Main client info
      clientType: data.clientType,
      businessName: data.businessName || "",
      individualTitle: data.individualTitle || "",
      individualFirstName: data.individualFirstName || "",
      individualLastName: data.individualLastName || "",
      clientLanguage: data.clientLanguage || "",
      email: data.email || "",
      phone: data.phone || "",

      // Main address
      address: data.address || "",
      city: data.city || "",
      countryCode: data.countryCode || "CH",
      zipCode: data.zipCode || undefined,
    },
  });

  const { isSubmitting } = form.formState;
  const watchClientType = form.watch("clientType") || "BUSINESS";

  const onSubmit = async (formData: z.infer<typeof validation>) => {
    try {
      // Transform the form data to match the expected Client type
      const clientData = {
        ...formData,
        id: data.id,
        code: data.code,
      };

      await editItem(clientData as any, data.id);
      handleClose();
      toast({
        description: `Cliente ${
          formData.businessName ||
          `${formData.individualFirstName} ${formData.individualLastName}`
        } aggiornato con successo!`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        description: `Errore durante l'aggiornamento del cliente: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Main client form section */}
        <MainClientForm
          form={form}
          watchClientType={watchClientType}
          isSubmitting={isSubmitting}
        />

        {/* Submit button */}
        <Button type="submit" disabled={isSubmitting} className="w-full">
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

export default EditClientForm;
