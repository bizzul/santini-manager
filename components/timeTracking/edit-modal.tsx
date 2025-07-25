import {
  faBox,
  faSave,
  faSignIn,
  faTimes,
  faWarning,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "../../package/components/modal";
import { zodResolver } from "@hookform/resolvers/zod";
import { validation } from "../../validation/timeTracking/editManual";
import TasksFilter from "./filterTaskWhite";
import { Roles, Task } from "@prisma/client";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "../../components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { cn } from "../../lib/utils";

type Props = {
  open: boolean;
  setOpen: any;
  setOpenModal: any;
  resourceId: number | undefined | null;
  setSuccess: any;
  tasks: any;
  roles: any;
};

export const EditModal: FC<Props> = ({
  open,
  setOpen,
  setOpenModal,
  resourceId,
  roles,
  tasks,
  setSuccess,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(validation),
  });

  const [resource, setResource] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task>();
  const [selectedRoles, setSelectedRoles] = useState<Roles[]>([]);

  const get = async (id: number) => {
    await fetch(`/api/time-tracking/${id}`)
      .then((r) => r.json())
      .then((d: any) => {
        setResource(d);
      });
  };

  const handleTaskSelection = (task: Task) => {
    setSelectedTask(task);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (resourceId) {
        await get(resourceId);
      }
    };

    fetchData();
  }, [resourceId]);

  useEffect(() => {
    if (resource) {
      setValue("description", resource.description);
      setValue("descriptionCat", resource.description_type);
      setValue("hours", Number(resource.hours));
      setValue("minutes", Number(resource.minutes));
      setValue("task", resource.task.id.toString());
      setValue("userId", resource.user?.id.toString());
      // setValue("roles", resource.roles);
      setSelectedTask(resource.task);
      setSelectedRoles(resource.roles.map((role: Roles) => role.id));
    }
  }, [resource, setValue, setSelectedTask]);

  const handleRoleChange = (role: Roles) => {
    if (selectedRoles.some((r) => r.id === role.id)) {
      setSelectedRoles(selectedRoles.filter((r) => r.id !== role.id));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  console.log("selected Roles", selectedRoles);

  /**
   * Api save call
   * @param data
   */
  const onSubmit = (data: any) => {
    setError(null);
    setLoading(true);
    // include selectedRoles in the data
    data.roles = selectedRoles;
    fetch(`/api/time-tracking/${resource.id}`, {
      method: "PATCH",
      headers: new Headers({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(data),
    })
      .then((response) => response.json())
      .then((data) => {
        setLoading(false);
        if (data.error) {
          setError(data.message);
        } else if (data.issues) {
          setError("Invalid data found.");
        } else {
          setOpen(false);
          setOpenModal(null);
          setSuccess(true);
        }
      });
  };

  const adjustedRoles = roles?.map((role: Roles) => ({
    label: role.name,
    value: role.id,
  }));

  const formattedSelectedRoles = selectedRoles.map((roleId) => ({
    label: roles.find((role: any) => role.id === roleId)?.name,
    value: roleId,
  }));

  if (resource === null || resource === undefined) {
    return <div>Nessuna risorsa selezionata</div>;
  } else
    return (
      <Modal open={open} setOpen={setOpen} setOpenModal={setOpenModal}>
        <div className="p-4 flex">
          <div className="w-3/4">
            <h1 className="text-xl font-bold">
              <FontAwesomeIcon icon={faBox} className="mr-2" />
              Modifica TimeTracking - #{resource.id} -{" "}
              {resource.task?.unique_code}
            </h1>
          </div>
          <div className="w-1/4 text-right">
            <FontAwesomeIcon
              icon={faTimes}
              className="text-2xl text-slate-400 cursor-pointer"
              onClick={() => {
                setOpen(false);
                setOpenModal(null);
              }}
            />
          </div>
        </div>
        <div className="p-4 pt-0">
          <form onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="px-6 pt-5">
                <div className="w-full p-4 rounded-sm bg-red-500 text-white flex-row items-middle">
                  <FontAwesomeIcon icon={faWarning} className="mr-2" />
                  {error}
                </div>
              </div>
            )}
            <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="p-4 rounded-lg shadow-lg flex-row mb-3 bg-white">
                <h1 className="text-lg font-bold flex-row text-slate-500">
                  <FontAwesomeIcon icon={faSignIn} className="mr-2 " />
                  Dati rapporto
                </h1>
                <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4">
                  <div className="flex flex-row gap-4">
                    <div className="flex w-full flex-col items-center pt-2">
                      <label>Dipendente</label>
                      <div className="p-4  flex-row  bg-white">
                        <div className="w-full flex gap-4  justify-center">
                          <p>
                            {resource.user?.family_name +
                              " " +
                              resource.user?.given_name}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex w-full flex-col items-center pt-2">
                      <label>Reparto/i</label>
                      <div className="p-4 flex-row bg-white">
                        <div className="w-full flex gap-4 justify-center">
                          <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={open}
                                className="w-[200px] justify-between"
                              >
                                {selectedRoles.length > 0
                                  ? `${selectedRoles.length} reparti selezionati`
                                  : "Seleziona reparti..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-0">
                              <Command>
                                <CommandInput  />
                                <CommandEmpty>
                                  Nessun reparto trovato.
                                </CommandEmpty>
                                <CommandGroup>
                                  {roles?.map((role: Roles) => (
                                    <CommandItem
                                      key={role.id}
                                      onSelect={() => handleRoleChange(role)}
                                    >
                                      <div className="flex items-center gap-2">
                                        <div
                                          className={cn(
                                            "h-4 w-4 rounded-sm border border-primary",
                                            selectedRoles.some(
                                              (r) => r.id === role.id
                                            )
                                              ? "bg-primary text-primary-foreground"
                                              : "opacity-50"
                                          )}
                                        >
                                          {selectedRoles.some(
                                            (r) => r.id === role.id
                                          ) && <Check className="h-4 w-4" />}
                                        </div>
                                        {role.name}
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center max-w-1/2">
                    <label>Progetto</label>
                    <TasksFilter
                      tasks={tasks}
                      setSelectedTask={handleTaskSelection}
                      selectedTask={selectedTask}
                    />
                  </div>

                  <div className="flex flex-row gap-2 pt-4">
                    <div className="flex flex-col items-center">
                      <label>Ore</label>
                      <input type="number" {...register("hours")} />
                      {errors.hours && <span>Campo necessario</span>}
                    </div>
                    <div className="flex flex-col items-center ">
                      <label>Minuti</label>
                      <input type="number" {...register("minutes")} />
                      {errors.minutes && <span>Campo necessario</span>}
                    </div>
                    <div className="flex flex-col items-center ">
                      <label>Commento</label>
                      <input type="text" {...register("description")} />
                    </div>
                    <div className="flex flex-col items-center">
                      <label>Desc. Tipo</label>
                      <select {...register("descriptionCat")}>
                        <option value="">Nessuna</option>
                        <option value="logistica">Logistica</option>
                        <option value="speciale">Speciale</option>
                        <option value="errore">Errore</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              {!loading && (
                <button
                  type="submit"
                  className=" justify-center rounded-md border border-transparent shadow-xs px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-green-500 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-green-600 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  <FontAwesomeIcon icon={faSave} className="mr-2" /> Salva
                </button>
              )}

              {loading && (
                <div className="rounded-md border shadow-xs flex gap-1 px-4 py-2 text-slate-500 text-base font-medium">
                  <div
                    className="w-5 h-5 
            border-4
            border-t-slate-500
            mt-0.5  
            mr-2
            rounded-full 
            animate-spin"
                  ></div>
                  Salvataggio in corso...
                </div>
              )}
            </div>
          </form>
        </div>
      </Modal>
    );
};
