"use client";
import React, { useEffect, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitHandler, useForm } from "react-hook-form";
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
import { validation } from "@/validation/timeTracking/editManual";
import { useToast } from "@/components/ui/use-toast";
import { SearchSelect } from "@/components/ui/search-select";
import { editItem } from "./actions/edit-item.action";
import { Roles, Task, User, Timetracking } from "@/types/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams } from "next/navigation";
import { logger } from "@/lib/logger";

interface RoleEntry {
  role: {
    id: number;
    name: string;
  };
}

interface EditFormValues {
  date: string;
  description: string;
  hours: number;
  minutes: number;
  roles: string;
  task: string;
  userId: string;
}

function formatDate(date: Date) {
  // Padding function to add leading zeros if necessary
  const pad = (num: number) => (num < 10 ? "0" + num : num);

  // Constructing each part of the date
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1); // getMonth() returns 0-11
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  // Constructing the format
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

const EditForm = ({
  handleClose,
  data,
  users: propUsers = [],
  roles: propRoles = [],
  tasks: propTasks = [],
}: {
  handleClose: any;
  data: Timetracking & { roles: RoleEntry[] };
  users?: User[];
  roles?: Roles[];
  tasks?: Task[];
}) => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>(propTasks);
  const [users, setUsers] = useState<User[]>(propUsers);
  const [roles, setRoles] = useState<Roles[]>(propRoles);
  const [userAssignedRoles, setUserAssignedRoles] = useState<Roles[]>([]);
  const [loadingUserRoles, setLoadingUserRoles] = useState(false);

  const form = useForm<EditFormValues>({
    resolver: zodResolver(validation),
    defaultValues: {
      date: "",
      description: "",
      hours: 0,
      minutes: 0,
      roles: "",
      task: "",
      userId: "",
    },
  });

  const { setValue } = form;

  // Update state when props change
  useEffect(() => {
    setTasks(propTasks);
    setUsers(propUsers);
    setRoles(propRoles);
  }, [propTasks, propUsers, propRoles]);

  useEffect(() => {
    setValue(
      "date",
      data.created_at
        ? formatDate(new Date(data.created_at))
        : formatDate(new Date())
    );
    setValue("description", data.description ?? "");
    setValue("hours", data.hours!);
    setValue("minutes", data.minutes!);

    // Roles will be set after userAssignedRoles are loaded

    logger.debug("Edit form data structure:", {
      id: data.id,
      employee_id: data.employee_id,
      roles: data.roles,
      task_id: data.task_id,
    });

    setValue("task", data.task_id ? data.task_id.toString() : "");
    setValue("userId", data.employee_id ? data.employee_id.toString() : "");

    // Load assigned roles for the current user
    if (data.employee_id) {
      fetchUserAssignedRoles(data.employee_id.toString(), true);
    }
  }, [data, setValue]);

  const { isSubmitting, errors } = form.formState;
  const params = useParams();
  const domain = params.domain as string;

  // Watch the selected user
  const selectedUserId = form.watch("userId");

  // Function to fetch user's assigned roles
  const fetchUserAssignedRoles = async (
    userId: string,
    preserveCurrentRole = false
  ) => {
    if (!userId) {
      setUserAssignedRoles([]);
      return;
    }

    setLoadingUserRoles(true);
    try {
      const response = await fetch(`/api/users/${userId}/assigned-roles`);
      const apiResponse = await response.json();

      if (apiResponse.error) {
        logger.error("Error fetching user roles:", apiResponse.error);
        setUserAssignedRoles([]);
        return;
      }

      // Transform the assigned roles to match the Roles interface
      const assignedRoles =
        apiResponse.assignedRoles?.map((ar: any) => ({
          id: ar.roleId,
          name: ar.roleName,
        })) || [];

      setUserAssignedRoles(assignedRoles);

      // If this is the initial load, set the current role after roles are loaded
      if (preserveCurrentRole) {
        const currentRole = form.getValues("roles");
        logger.debug("Setting role after loading assigned roles:", {
          currentRole,
          timetrackingRoles: data.roles,
          assignedRoles: assignedRoles.map((r: any) => ({
            id: r.id,
            name: r.name,
          })),
        });

        // Handle case where timetracking has no roles assigned
        if (
          !data.roles ||
          !Array.isArray(data.roles) ||
          data.roles.length === 0
        ) {
          // Don't set any role if the timetracking doesn't have roles
          return;
        }

        if (!currentRole) {
          // Check if the role exists in the assigned roles
          const roleId = data.roles[0].role?.id.toString();
          const roleExists = assignedRoles.some(
            (role: any) => role.id.toString() === roleId
          );
          logger.debug("Role check:", {
            roleId,
            roleExists,
            assignedRolesIds: assignedRoles.map((r: any) => r.id.toString()),
            dataRoleStructure: data.roles[0],
          });

          if (roleExists) {
            form.setValue("roles", roleId);
            logger.debug("✅ Role set to:", roleId);
          } else {
            logger.debug("❌ Role not found in assigned roles, leaving empty");
          }
        } else {
          logger.debug("✅ Current role already set:", currentRole);
        }
      }
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
      // Only reset roles if this is a different user than the initial data
      const shouldResetRoles = data.employee_id?.toString() !== selectedUserId;
      fetchUserAssignedRoles(selectedUserId);

      if (shouldResetRoles) {
        form.setValue("roles", "");
      }
    } else {
      setUserAssignedRoles([]);
      form.setValue("roles", "");
    }
  }, [selectedUserId]);

  const onSubmit: SubmitHandler<EditFormValues> = async (d) => {
    try {
      //@ts-ignore
      const timetracking = await editItem(d, data.id, domain);
      if (timetracking && timetracking.id) {
        handleClose(false);
        toast({
          //@ts-ignore
          description: `Elemento ${timetracking.id} aggiornato correttamente!`,
        });
        form.reset();
      } else if (timetracking && timetracking.message) {
        // Handle validation or server errors
        toast({
          description: timetracking.message,
          variant: "destructive",
        });
      }
    } catch (e) {
      logger.error("Error updating timetracking:", e);
      toast({
        description: `Errore nel aggiornare l'elemento! ${e}`,
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-4 " onSubmit={form.handleSubmit(onSubmit, (errors) => {
          logger.error("Edit form validation failed:", errors);
        })}>
        <FormField
          disabled={isSubmitting}
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data registrazione</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              {/* <FormDescription>Tipologia</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />
        {users.length ? (
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
                    options={
                      Array.isArray(users)
                        ? users.map((u: User) => ({
                            value: u.id.toString(),
                            label:
                              (u.given_name || "") +
                              " " +
                              (u.family_name || ""),
                          }))
                        : []
                    }
                    placeholder="Seleziona dipendente..."
                  />
                </FormControl>
                {/* <FormDescription>Categoria del prodotto</FormDescription> */}
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <Skeleton className="w-32 h-8" />
        )}

        <FormField
          disabled={isSubmitting || loadingUserRoles}
          control={form.control}
          name="roles"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ruolo</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isSubmitting || loadingUserRoles || !selectedUserId}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !selectedUserId
                          ? "Seleziona prima un dipendente"
                          : loadingUserRoles
                          ? "Caricamento ruoli..."
                          : "Seleziona un ruolo"
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
        {tasks.length ? (
          <FormField
            disabled={isSubmitting}
            control={form.control}
            name="task"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Progetto</FormLabel>
                <FormControl>
                  <SearchSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                    options={
                      Array.isArray(tasks)
                        ? tasks.map((t: Task) => ({
                            value: t.id.toString(),
                            label: t.unique_code!,
                          }))
                        : []
                    }
                    placeholder="Seleziona progetto..."
                  />
                </FormControl>
                {/* <FormDescription>Numero articolo</FormDescription> */}
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <Skeleton className="w-32 h-8" />
        )}
        <FormField
          disabled={isSubmitting}
          control={form.control}
          name="hours"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ore</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              {/* <FormDescription>Tipologia</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          disabled={isSubmitting}
          control={form.control}
          name="minutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Minuti</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              {/* <FormDescription>Numero articolo</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />
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

export default EditForm;
