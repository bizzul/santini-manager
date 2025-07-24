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
type Props = {
  open: boolean;
  setOpen: any;
  setOpenModal: any;
  resourceId: number | undefined;
};

export const EditModal: FC<Props> = ({
  open,
  setOpen,
  setOpenModal,
  resourceId,
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
    await fetch(`/api/sell-products/${id}`)
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

  useEffect(() => {
    if (resource) {
      setValue("name", resource.name);
      setValue("type", resource.type);
    }
  }, [resource]);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Api save call
   * @param data
   */
  const onSubmit = (data: any) => {
    setError(null);
    setLoading(true);
    // console.log(data);
    fetch(`/api/sell-products/${resource.id}`, {
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
        }
      });
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
              Modifica Prodotto - #{resource.id} - {resource.name}
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
                  Dati prodotto
                </h1>
                <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4">
                  <div>
                    <label className="form-label" htmlFor="name">
                      Nome
                    </label>
                    <div className="w-1/2 mt-2"> </div>
                    <input
                      id="name"
                      type="text"
                      className="form-input"
                      {...register("name", { required: true })}
                    />
                    {errors.name && <span>Campo necessario</span>}
                  </div>

                  <div>
                    <label className="form-label" htmlFor="name">
                      Tipo
                    </label>
                    <div className="w-1/2 mt-2"> </div>
                    <input
                      id="name"
                      type="text"
                      className="form-input"
                      {...register("type", { required: true })}
                    />
                    {errors.type && <span>Campo necessario</span>}
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
