import {
  faBox,
  faSave,
  faSignIn,
  faTimes,
  faWarning,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Dispatch, FC, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "../../package/components/modal";
import { zodResolver } from "@hookform/resolvers/zod";
import { validation } from "../../validation/timeTracking/createManual";
import TasksFilter from "./filterTasksBlack";
import { Roles, Task, User } from "@/types/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
type Props = {
  open: boolean;
  setOpen: Dispatch<React.SetStateAction<boolean>>;
  tasks: Task[];
  roles: Roles[];
  employees: User[];
};

export const CreateModal: FC<Props> = ({
  open,
  setOpen,
  tasks,
  roles,
  employees,
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

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task>();

  const handleTaskSelection = (task: Task) => {
    setSelectedTask(task);
  };

  useEffect(() => {
    setValue("task", selectedTask?.id.toString());
  }, [selectedTask]);
  /**
   * Api save call
   * @param data
   */
  const onSubmit = (data: any) => {
    setError(null);
    setLoading(true);
    fetch("/api/time-tracking/createSingle", {
      method: "post",
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
        }
      });
  };

  // console.log(errors);

  return (
    <Modal open={open} setOpen={setOpen} setOpenModal={setOpen}>
      <div className="p-4 flex">
        <div className="w-3/4">
          <h1 className="text-xl font-bold">
            <FontAwesomeIcon icon={faBox} className="mr-2" />
            Nuovo Report Ore
          </h1>
        </div>
        <div className="w-1/4 text-right">
          <FontAwesomeIcon
            icon={faTimes}
            className="text-2xl text-slate-400 cursor-pointer"
            onClick={() => setOpen(false)}
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
                Dati Report
              </h1>
              <div className="flex flex-row gap-4">
                <div className="flex w-full flex-col items-center pt-2">
                  <label>Dipendente</label>
                  <div className="p-4  flex-row  bg-white">
                    <div className="w-full flex gap-4  justify-center">
                      <select {...register("userId")}>
                        {employees?.map((employee: User) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.family_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.userId && <span>Campo necessario</span>}
                  </div>
                </div>

                <div className="flex w-full flex-col items-center pt-2">
                  <label>Reparto/i</label>
                  <div className="p-4  flex-row  bg-white">
                    <div className="w-full flex gap-4  justify-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="secondary"
                            className="bg-[#565656] text-white"
                          >
                            Seleziona i reparti
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                          {roles?.map((role: Roles) => (
                            <DropdownMenuItem
                              key={role.id}
                              onSelect={(e) => e.preventDefault()}
                            >
                              <div className="flex items-center">
                                <label className="inline-flex items-center mr-4 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    value={role.id}
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500"
                                    {...register("roles")}
                                  />
                                  <span className="ml-2">{role.name}</span>
                                </label>
                              </div>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {errors.roles && <span>Campo necessario</span>}
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
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={watch("hours") === 0 ? "" : String(watch("hours"))}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "");
                      setValue("hours", v === "" ? 0 : Math.min(24, parseInt(v, 10) || 0));
                    }}
                  />
                  {errors.hours && <span>Campo necessario</span>}
                </div>
                <div className="flex flex-col items-center ">
                  <label>Minuti</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={watch("minutes") === 0 ? "" : String(watch("minutes"))}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "");
                      setValue("minutes", v === "" ? 0 : Math.min(59, parseInt(v, 10) || 0));
                    }}
                  />
                  {errors.minutes && <span>Campo necessario</span>}
                </div>
                <div className="flex flex-col items-center ">
                  <label>Commento</label>
                  <input type="text" {...register("description")} />
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
