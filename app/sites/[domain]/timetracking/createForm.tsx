"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { useEffect, useState } from "react";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchSelect } from "@/components/ui/search-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { createItem } from "./actions/create-item.action";
import {
  validation,
  INTERNAL_ACTIVITIES,
} from "@/validation/timeTracking/createManual";
import { useToast } from "@/components/ui/use-toast";
import { Roles, Task, User } from "@/types/supabase";
import { useParams } from "next/navigation";
import { logger } from "@/lib/logger";
import { Briefcase, Wrench } from "lucide-react";

export interface Typology {
  name: string;
}

// Labels for internal activities
const INTERNAL_ACTIVITY_LABELS: Record<string, string> = {
  pulizie: "Pulizie",
  manutenzione: "Manutenzione",
  logistica: "Logistica",
  inventario: "Inventario",
  formazione: "Formazione",
  riunione: "Riunione",
  altro: "Altro",
};

const CreateProductForm = ({
  handleClose,
  data,
  users,
  roles,
}: {
  handleClose: any;
  data: Task[];
  users: User[];
  roles: Roles[];
}) => {
  const { toast } = useToast();
  const [userAssignedRoles, setUserAssignedRoles] = useState<Roles[]>([]);
  const [loadingUserRoles, setLoadingUserRoles] = useState(false);

  const form = useForm<z.infer<typeof validation>>({
    resolver: zodResolver(validation),
    defaultValues: {
      date: new Date().toISOString().split("T")[0], // Default to today's date (YYYY-MM-DD)
      description: "",
      descriptionCat: "",
      hours: 0,
      minutes: 0,
      roles: "",
      task: "",
      userId: "",
      activityType: "project",
      internalActivity: undefined,
    },
  });

  // Watch activity type to show/hide fields
  const activityType = form.watch("activityType");

  const typology = [
    {
      name: "Nessuna",
    },
    {
      name: "Logistica",
    },
    {
      name: "Speciale",
    },
    {
      name: "Errore",
    },
  ];

  const { isSubmitting, errors } = form.formState;
  const params = useParams();
  const domain = params.domain as string;

  // Watch the selected user
  const selectedUserId = form.watch("userId");

  // Function to fetch user's assigned roles
  const fetchUserAssignedRoles = async (userId: string) => {
    if (!userId) {
      setUserAssignedRoles([]);
      return;
    }

    setLoadingUserRoles(true);
    try {
      const response = await fetch(`/api/users/${userId}/assigned-roles`);
      const data = await response.json();

      if (data.error) {
        logger.error("Error fetching user roles:", data.error);
        setUserAssignedRoles([]);
        return;
      }

      // Transform the assigned roles to match the Roles interface
      const assignedRoles =
        data.assignedRoles?.map((ar: any) => ({
          id: ar.roleId,
          name: ar.roleName,
        })) || [];

      setUserAssignedRoles(assignedRoles);
    } catch (error) {
      logger.error("Error fetching user roles:", error);
      setUserAssignedRoles([]);
    } finally {
      setLoadingUserRoles(false);
    }
  };

  // Effect to fetch roles when user changes
  useEffect(() => {
    if (selectedUserId) {
      fetchUserAssignedRoles(selectedUserId);
      // Reset the roles field when user changes
      form.setValue("roles", "");
    } else {
      setUserAssignedRoles([]);
      form.setValue("roles", "");
    }
  }, [selectedUserId]);

  const onSubmit: SubmitHandler<z.infer<typeof validation>> = async (d) => {
    try {
      // If d is empty, get the data directly from form
      const formData = Object.keys(d).length === 0 ? form.getValues() : d;
      //@ts-ignore
      const timetracking = await createItem(formData, domain);
      if (timetracking) {
        handleClose(false);
        toast({
          //@ts-ignore
          description: `Elemento ${timetracking.id.toString()} creato correttamente!`,
        });
        form.reset();
      }
    } catch (e) {
      logger.error("Error creating timetracking:", e);
      toast({
        description: `Errore nel creare l'elemento! ${e}`,
      });
    }
  };

  return (
    <Form {...form}>
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit(onSubmit, (errors) => {
          logger.debug("Form validation failed:", errors);
        })}
      >
        <FormField
          disabled={isSubmitting}
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data registrazione</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              {/* <FormDescription>Tipologia</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          disabled={isSubmitting}
          control={form.control}
          name="userId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dipendente</FormLabel>
              <FormControl>
                <SearchSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isSubmitting}
                  options={users.map((u: User) => ({
                    value: u.id.toString(),
                    label: (u.given_name || "") + " " + (u.family_name || ""),
                  }))}
                  placeholder="Seleziona dipendente..."
                />
              </FormControl>
              {/* <FormDescription>Categoria del prodotto</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Activity Type Toggle */}
        <FormField
          control={form.control}
          name="activityType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo Attività</FormLabel>
              <FormControl>
                <RadioGroup
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    // Clear the other field when switching
                    if (value === "project") {
                      form.setValue("internalActivity", undefined);
                    } else {
                      form.setValue("task", "");
                    }
                  }}
                  className="flex gap-4"
                  disabled={isSubmitting}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="project" id="project" />
                    <Label
                      htmlFor="project"
                      className="flex items-center gap-1 cursor-pointer"
                    >
                      <Briefcase className="h-4 w-4" />
                      Progetto
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="internal" id="internal" />
                    <Label
                      htmlFor="internal"
                      className="flex items-center gap-1 cursor-pointer"
                    >
                      <Wrench className="h-4 w-4" />
                      Attività Interna
                    </Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Project Selection and Role (shown when activityType is 'project') */}
        {activityType === "project" && (
          <>
            <FormField
              disabled={isSubmitting}
              control={form.control}
              name="task"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Progetto</FormLabel>
                  <FormControl>
                    <SearchSelect
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      disabled={isSubmitting}
                      options={data.map((t: any) => ({
                        value: t.id.toString(),
                        label: t.client?.businessName
                          ? `${t.unique_code} - ${t.client.businessName}`
                          : t.unique_code || "",
                      }))}
                      placeholder="Seleziona progetto..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              disabled={isSubmitting || loadingUserRoles}
              control={form.control}
              name="roles"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reparto</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      disabled={
                        isSubmitting || loadingUserRoles || !selectedUserId
                      }
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !selectedUserId
                              ? "Seleziona prima un dipendente"
                              : loadingUserRoles
                              ? "Caricamento ruoli..."
                              : "Seleziona un reparto"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {userAssignedRoles.length === 0 &&
                        selectedUserId &&
                        !loadingUserRoles ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            Nessun ruolo assegnato
                          </div>
                        ) : (
                          userAssignedRoles.map((r: Roles) => (
                            <SelectItem key={r.id} value={r.id.toString()}>
                              {r.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {/* Internal Activity Selection (shown when activityType is 'internal') */}
        {activityType === "internal" && (
          <FormField
            disabled={isSubmitting}
            control={form.control}
            name="internalActivity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Attività Interna</FormLabel>
                <FormControl>
                  <Select
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona attività..." />
                    </SelectTrigger>
                    <SelectContent>
                      {INTERNAL_ACTIVITIES.map((activity) => (
                        <SelectItem key={activity} value={activity}>
                          {INTERNAL_ACTIVITY_LABELS[activity]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <div className="flex gap-4">
          <FormField
            disabled={isSubmitting}
            control={form.control}
            name="hours"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Ore</FormLabel>
                <FormControl>
                  <Input type="number" min="0" max="24" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            disabled={isSubmitting}
            control={form.control}
            name="minutes"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Minuti</FormLabel>
                <FormControl>
                  <Select
                    value={field.value?.toString() || "0"}
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="00" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">00</SelectItem>
                      <SelectItem value="15">15</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                      <SelectItem value="45">45</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          disabled={isSubmitting}
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrizione</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              {/* <FormDescription>Numero articolo</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          disabled={isSubmitting}
          control={form.control}
          name="descriptionCat"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipologia</FormLabel>
              <FormControl>
                <SearchSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isSubmitting}
                  options={typology.map((t: Typology, index) => ({
                    value: t.name,
                    label: t.name,
                  }))}
                  placeholder="Seleziona tipologia..."
                />
              </FormControl>
              {/* <FormDescription>Numero articolo</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {" "}
          {isSubmitting && (
            <span className="spinner-border spinner-border-sm mr-1"></span>
          )}{" "}
          Salva
        </Button>
      </form>
    </Form>
  );
};

export default CreateProductForm;
