import {
  faTimes,
  faUserPlus,
  faSignIn,
  faIdBadge,
  faSave,
  faWarning,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Menu, Transition } from "@headlessui/react";
import { Dispatch, FC, Fragment, useEffect, useState } from "react";
import { Modal } from "../../package/components/modal";
import { useForm } from "react-hook-form";
import { Client, Product, Task } from "@prisma/client";
import FilterProducts from "../kanbans/FilterProducts";
import FilterClients from "../kanbans/FilterClients";

type Props = {
  open: boolean;
  setOpen: any;
  resourceId: number | null;
  setOpenModal: any;
  clients: Client[];
  products: Product[];
};

export const EditModal: FC<Props> = ({
  open,
  setOpen,
  setOpenModal,
  resourceId,
  clients,
  products,
}) => {
  const [data, setData] = useState<Task>();

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    // resolver: zodResolver(validation),
  });

  const get = async (id: number) => {
    await fetch(`/api/tasks/${id}`)
      .then((r) => r.json())
      .then((d: any) => {
        setData(d);
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
    if (data) {
      clients.find((c) => {
        if (c.id === data.clientId) {
          setSelectedClient(c);
        }
      });
      products.find((c) => {
        if (c.id === data.sellProductId) {
          setSelectedProduct(c);
        }
      });
    }
    setValue("unique_code", data?.unique_code);
    //@ts-ignore
    setValue("deliveryDate", data?.deliveryDate?.substr(0, 16));
    setValue("other", data?.other);
    setValue("sellPrice", data?.sellPrice);
    setValue("clientId", data?.clientId);
    data?.positions.map((position: any, index: number) => {
      setValue(`position${index + 1}`, position);
    });

    console.log("positions", data?.positions);
  }, [data, clients, products, setValue]);

  /**
   * Api update call
   * @param data
   */

  useEffect(() => {
    if (selectedClient) {
      setValue("clientId", selectedClient.id);
    }
  }, [selectedClient, setValue]);

  useEffect(() => {
    if (selectedProduct) {
      setValue("productId", selectedProduct.id);
    }
  }, [selectedProduct, setValue]);

  const onSubmit = (data: any) => {
    setError(null);
    setLoading(true);
    fetch(`/api/tasks/${resourceId}`, {
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
          setOpenModal(false);
        }
      });
  };

  console.log(errors);

  return (
    <Modal
      className="h-screen"
      open={open}
      setOpen={setOpen}
      setOpenModal={setOpenModal}
    >
      {data ? (
        <>
          <div className="p-4 flex">
            <div className="w-3/4">
              <h1 className="text-xl font-bold">
                <FontAwesomeIcon icon={faUserPlus} className="mr-2" />
                Modifica Progetto #{data.id} - {data.unique_code}
              </h1>
            </div>
            <div className="w-1/4 text-right">
              <FontAwesomeIcon
                icon={faTimes}
                className="text-2xl text-slate-400 cursor-pointer"
                onClick={() => setOpenModal(false)}
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
              <div className=" px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="p-4 rounded-lg shadow-lg flex-row mb-3 bg-white">
                  <h1 className="text-lg font-bold flex-row text-slate-500">
                    <FontAwesomeIcon icon={faSignIn} className="mr-2 " />
                    Informazioni principali
                  </h1>
                  <div className="bg-white shadow-md p-4 mb-12  flex flex-row justify-between align-middle items-center">
                    <div className="flex flex-col gap-4">
                      <h1 className="text-slate-400 font-bold">
                        CODICE IDENTIFICATIVO
                      </h1>
                      <div className="text-xl text-slate-400">
                        <input
                          type="text"
                          className="w-full rounded-sm border-slate-400 text-black"
                          {...register("unique_code")}
                        />
                      </div>
                    </div>
                  </div>

                  <div className=" p-4 py-4 shadow-md w-full overflow-visible">
                    <FilterClients
                      clients={clients}
                      setSelectedClient={setSelectedClient}
                      selectedClient={selectedClient}
                    />

                    {selectedClient != null && (
                      <>
                        <input
                          type="hidden"
                          {...register("clientId")}
                          value={selectedClient.id}
                        />
                        <div className="flex flex-row justify-between items-start align-middle pt-8">
                          <div className="flex flex-col">
                            <h1 className="text-slate-400 font-bold ">
                              CLIENTE
                            </h1>
                            <p>{selectedClient.businessName}</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className=" flex gap-10 shadow-md p-4">
                    <div className=" w-full overflow-visible z-40">
                      <FilterProducts
                        products={products}
                        setSelectedProduct={setSelectedProduct}
                        selectedProduct={selectedProduct}
                      />

                      {selectedProduct != null && (
                        <>
                          <div>
                            <input
                              type="hidden"
                              {...register("productId")}
                              value={selectedProduct.id}
                            />
                            <div className="flex flex-row justify-between items-start align-middle pt-8">
                              <div className="flex flex-col">
                                <h1 className="text-slate-400 font-bold  uppercase">
                                  Prodotto
                                </h1>
                                <p>{selectedProduct.name}</p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="bg-white shadow-md p-4  flex flex-row justify-between align-middle items-center">
                    <div className="flex flex-col gap-4">
                      <h1 className="text-slate-400 font-bold">
                        Data consegna prevista
                      </h1>
                      <div className="text-xl text-slate-400">
                        <input
                          type="datetime-local"
                          {...register("deliveryDate")}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <h1 className="text-slate-400 font-bold">Posizioni</h1>
                    <div className="text-xl text-slate-400">
                      <div className="grid grid-rows-2 grid-cols-4">
                        {data?.positions.map((position, i) => (
                          <input
                            key={i}
                            type="text"
                            {...register(`position${i + 1}`)} // create an input field for each position
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white shadow-md p-4 mb-12  flex flex-row justify-between align-middle items-center">
                    <div className="flex flex-col gap-4">
                      <h1 className="text-slate-400 font-bold">Commenti</h1>
                      <div className="text-xl text-slate-400">
                        <textarea {...register("other")} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-4">
                      <h1 className="text-slate-400 font-bold">
                        Costo di produzione
                      </h1>
                      <div className="text-xl text-slate-400">
                        <input type="number" {...register("sellPrice")} />
                      </div>
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
                    <FontAwesomeIcon icon={faSave} className="mr-2" /> Aggiorna
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
        </>
      ) : (
        <div>Loading...</div>
      )}
    </Modal>
  );
};
