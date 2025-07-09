import {
  faBox,
  faSave,
  faSignIn,
  faTimes,
  faWarning,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Dispatch, FC, SetStateAction, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "../../package/components/modal";
import { zodResolver } from "@hookform/resolvers/zod";
import { validation } from "../../validation/products/create";
import TasksFilter from "./filterTaskWhite";
import { Roles, Supplier } from "@prisma/client";
import { CldUploadButton } from "next-cloudinary";
type Props = {
  open: boolean;
  setOpen: any;
  setOpenModal: any;
  resourceId: number | undefined | null;
  setSuccess: any;
  suppliers: any;
  tasks: any;
  roles: any;
};

export const EditModal: FC<Props> = ({
  open,
  setOpen,
  setOpenModal,
  resourceId,
  suppliers,
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

  const get = async (id: number) => {
    await fetch(`/api/error-tracking/${id}`)
      .then((r) => r.json())
      .then((d: any) => {
        setResource(d);
      });
  };

  useEffect(() => {
    const fetchData = async () => {
      if (resourceId) {
        await get(resourceId);
      }
    };

    fetchData();
  }, [resourceId]);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploadedFile] = useState<File[] | null | []>(
    resource?.files
  );
  const [fileIds, setFileIds] = useState<any>([]);
  const [selectedTask, setSelectedTask] = useState<any>("");

  useEffect(() => {
    if (resource) {
      setValue("description", resource.description);
      setValue("errorCategory", resource.error_category);
      setValue("errorType", resource.error_type);
      setValue("position", resource.position);
      setValue("supplier", resource.supplier_id);
      setValue("task", resource.task_id);
      setValue("user", resource.user?.given_name);
      setSelectedTask(resource.task);
    }
  }, [resource, setValue]);

  /**
   * Api save call
   * @param data
   */
  const onSubmit = (data: any) => {
    setError(null);
    setLoading(true);
    // console.log(data);
    fetch(`/api/error-tracking/${resource.id}`, {
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
          setSuccess(true);
        }
      });
  };

  const handleUpload = (result: any) => {
    if (result) {
      // console.log("risultato", result);
      setLoading(true);
      fetch("/api/files/create", {
        method: "post",
        headers: new Headers({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(result.info),
      })
        .then((response) => response.json())
        .then((data) => {
          setLoading(false);
          if (data.error) {
            setError(data.message);
          } else if (data.issues) {
            setError("Invalid data found.");
          } else {
            setUploadedFile((current: any) => [...current, data.result]);
            setFileIds((current: any) => [...current, data.result.id]);
          }
        });
    }
  };
  // console.log(errors);
  if (resource === null || resource === undefined) {
    return <div>Nessuna risorsa selezionata</div>;
  } else
    return (
      <Modal open={open} setOpen={setOpen} setOpenModal={setOpenModal}>
        <div className="p-4 flex">
          <div className="w-3/4">
            <h1 className="text-xl font-bold">
              <FontAwesomeIcon icon={faBox} className="mr-2" />
              Modifica Errore - #{resource.id} - {resource.task?.unique_code}
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
                <div className="w-full p-4 rounded bg-red-500 text-white flex-row items-middle">
                  <FontAwesomeIcon icon={faWarning} className="mr-2" />
                  {error}
                </div>
              </div>
            )}
            <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="p-4 rounded-lg shadow-lg flex-row mb-3 bg-white">
                <h1 className="text-lg font-bold flex-row text-slate-500">
                  <FontAwesomeIcon icon={faSignIn} className="mr-2 " />
                  Dati errore
                </h1>
                <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4">
                  <div>
                    <label className="form-label" htmlFor="email">
                      Categoria
                    </label>
                    <div>
                      <select
                        {...register("errorCategory")}
                        className="form-input block py-2.5 px-2 w-full text-md text-gray-500 bg-transparent  border-b-2 border-gray-200 appearance-none dark:text-gray-400 dark:border-gray-700 focus:outline-none focus:ring-0 focus:border-gray-200 peer"
                      >
                        <option value="fornitore">Fornitore</option>
                        <option value="reparto">Reparto</option>
                      </select>
                      {errors.errorCategory && <span>Campo necessario</span>}
                    </div>
                  </div>
                  <div>
                    <label className="form-label" htmlFor="email">
                      Progetto
                    </label>
                    <div>
                      <TasksFilter
                        tasks={tasks}
                        setSelectedTask={setSelectedTask}
                        selectedTask={selectedTask}
                      />

                      <input
                        type="hidden"
                        {...register("task")}
                        // value={resource.task?.unique_code}
                      />

                      {errors.task && <span>Campo necessario</span>}
                    </div>
                  </div>
                  <div>
                    <label className="form-label" htmlFor="code">
                      Tipo errore
                    </label>
                    <div className="w-1/2 mt-2"> </div>
                    <select
                      id="errorType"
                      className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-none rounded-r-md sm:text-sm border-gray-300 bg-transparent"
                      {...register("errorType")}
                      value={resource.error_type}
                    >
                      {watch("errorCategory") === "fornitore" ? (
                        <>
                          <option value="" disabled>
                            Seleziona una tipologia..
                          </option>
                          <option value="legno">Legno</option>
                          <option value="soglia">Soglia</option>
                          <option value="ferramenta">Ferramenta</option>
                          <option value="alu">Alu</option>
                          <option value="rv">RV</option>
                          <option value="vernice">Vernice</option>
                          <option value="altro">Altro</option>
                        </>
                      ) : (
                        <>
                          <option value="" disabled>
                            Seleziona un reparto..
                          </option>
                          {roles.map((role: Roles) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                    {errors.errorType && <span>Campo necessario</span>}
                  </div>

                  <div>
                    <label className="form-label" htmlFor="name">
                      Fornitore
                    </label>
                    <div className="w-1/2 mt-2"> </div>
                    <select
                      id="supplier"
                      className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-none rounded-r-md sm:text-sm border-gray-300 bg-transparent"
                      {...register("supplier", {
                        required: watch("errorCategory") == "fornitore",
                      })}
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Seleziona un fornitore..
                      </option>
                      {suppliers
                        .filter(
                          (supplier: Supplier) =>
                            supplier.category?.toLowerCase() ===
                            watch("errorType")?.toLowerCase()
                        )
                        .map((supplier: Supplier) => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </option>
                        ))}
                    </select>
                    {errors.supplier && <span>Campo necessario</span>}
                  </div>

                  <div>
                    <label className="form-label">Posizione</label>
                    <div>
                      <input
                        type="text"
                        {...register("position")}
                        className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-none rounded-r-md sm:text-sm border-gray-300 bg-transparent"
                      />
                      {errors.position && <span>Campo necessario</span>}
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Descrizione</label>
                    <div>
                      <textarea
                        {...register("description")}
                        className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-none rounded-r-md sm:text-sm border-gray-300 bg-transparent"
                      />
                      {errors.description && <span>Campo necessario</span>}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="photo"
                      className="block text-sm font-medium text-black"
                    >
                      Foto
                    </label>
                    <div className="mt-1 flex flex-row gap-4 rounded-md shadow-sm">
                      <div className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        <CldUploadButton
                          uploadPreset="uploadpdf"
                          onUpload={(result: any) => handleUpload(result)}
                          options={{
                            sources: ["local"],
                          }}
                        >
                          Sostituisci foto
                        </CldUploadButton>
                      </div>

                      {uploaded && (
                        <div>
                          <p>File caricati:</p>
                          <ul>
                            {uploaded.map((file: any) => (
                              <li
                                key={file.id}
                              >{`${file.id} - ${file.name}`}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    {errors.photo && <span>Campo necessario</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              {!loading && (
                <button
                  type="submit"
                  className=" justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  <FontAwesomeIcon icon={faSave} className="mr-2" /> Salva
                </button>
              )}

              {loading && (
                <div className="rounded-md border shadow-sm flex gap-1 px-4 py-2 text-slate-500 text-base font-medium">
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
