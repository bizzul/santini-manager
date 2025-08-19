import {
  faPlus,
  faSave,
  faTimes,
  faWarning,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Dispatch, FC, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "../../package/components/modal";
import { zodResolver } from "@hookform/resolvers/zod";
import { validation } from "../../validation/task/create";
import FilterClients from "./FilterClients";
import FilterProducts from "./FilterProducts";
import { Client, File, Product, User } from "@/types/supabase";
import Image from "next/image";
import { countries } from "../clients/countries";
import { Disclosure } from "@headlessui/react";
import { CldUploadButton } from "next-cloudinary";

type Props = {
  open: boolean;
  setOpen: Dispatch<React.SetStateAction<boolean>>;
  setOpenModal: Dispatch<React.SetStateAction<boolean>>;
  clients: Client[];
  products: Product[];
  setCreatedToast: (value: boolean) => void;
};

export const CreateModal: FC<Props> = ({
  open,
  setOpen,
  setOpenModal,
  clients,
  products,
  setCreatedToast,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(validation),
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);

  const [uploaded, setUploadedFile] = useState<File[]>([]);
  const [fileIds, setFileIds] = useState<string[]>([]);

  useEffect(() => {
    if (open === false) {
      setSelectedClient(null);
      setSelectedEmployee(null);
      setSelectedProduct(null);
      setUploadedFile([]);
      setFileIds([]);
      setError(null);
      reset();
    }
  }, [open, reset]);

  // useEffect(() => {
  //   if (selectedClient !== null) {
  //     setValue("uniqueCodeInitials", selectedClient.code.toUpperCase());
  //     //@ts-ignore
  //     setValue("uniqueCodeLocation", selectedClient.addresses[0]?.zipCode);
  //   }
  // }, [watch, selectedClient, setValue]);

  /**
   * Api save call
   * @param data
   */

  const onSubmit = (data: any) => {
    setError(null);
    setLoading(true);

    fetch("/api/kanban/tasks/create", {
      method: "post",
      headers: new Headers({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({ ...data, fileIds: fileIds }),
    })
      .then((response) => response.json())
      .then((data) => {
        setLoading(false);
        if (data.error) {
          setError(data.message);
        } else if (data.issues) {
          setError("Invalid data found.");
          // console.log(data.issues);
        } else {
          setOpen(false);
          setCreatedToast(true);
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
            setUploadedFile((current: File[]) => [...current, data.result]);
            setFileIds((current: string[]) => [...current, data.result.id]);
          }
        });
    }
  };

  return (
    <Modal
      className="h-screen overflow-visible"
      open={open}
      setOpen={setOpen}
      setOpenModal={setOpenModal}
    >
      <div className="p-2">
        <div className="p-4 flex ">
          <div className="w-3/4">
            <h1 className="text-xl font-bold">
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              Nuovo Progetto
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
        <div className="p-4">
          <form onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="px-6 pt-5">
                <div className="w-full p-4 rounded-sm bg-red-500 text-white flex-row items-middle">
                  <FontAwesomeIcon icon={faWarning} className="mr-2" />
                  {error}
                </div>
              </div>
            )}
            <div className="bg-white shadow-md p-4 mb-12  flex flex-row justify-between align-middle items-center">
              <div className="flex flex-col gap-4">
                <h1 className="text-slate-400 font-bold">
                  CODICE IDENTIFICATIVO
                </h1>
                <div className="text-xl text-slate-400">
                  <input
                    type="text"
                    className="w-full rounded-xs border-slate-400 text-black"
                    {...register("unique_code")}
                  />
                </div>
              </div>
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
                      <h1 className="text-slate-400 font-bold ">CLIENTE</h1>
                      <p>{selectedClient.businessName}</p>
                    </div>
                  </div>
                </>
              )}

              {selectedClient != null && (
                <Disclosure>
                  <Disclosure.Button className="py-2 my-2 bg-slate-600 w-full text-white rounded-md">
                    Apri dettagli cliente
                  </Disclosure.Button>
                  <Disclosure.Panel className="text-gray-500">
                    <div>
                      <h1 className="text-slate-400 font-bold text-xl p-4">
                        INFORMAZIONI CLIENTE
                      </h1>
                      <div className="p-4">
                        <div className="pb-4">
                          <h2 className="text-slate-400 text-sm">
                            NOME AZIENDA
                          </h2>
                          <div className="flex flex-row gap-3 pt-2">
                            <p>{selectedClient.businessName}</p>
                          </div>
                        </div>
                        {selectedClient.individualFirstName && (
                          <div className="pb-4">
                            <h2 className="text-slate-400 text-sm">NOME</h2>
                            <div className="flex flex-row gap-3 pt-2">
                              <p>{selectedClient.individualFirstName}</p>
                            </div>
                          </div>
                        )}
                        {selectedClient.individualLastName && (
                          <div className="pb-4">
                            <h2 className="text-slate-400 text-sm">COGNOME</h2>
                            <div className="flex flex-row gap-3 pt-2">
                              <p>{selectedClient.individualLastName}</p>
                            </div>
                          </div>
                        )}
                        {selectedClient.address && (
                          <div className="pb-4">
                            <h2 className="text-slate-400 text-sm">
                              INDIRIZZO
                            </h2>
                            <div className="flex flex-row gap-3 pt-2">
                              <p>{selectedClient.address}</p>
                            </div>
                          </div>
                        )}
                        {selectedClient.city && (
                          <div className="pb-4">
                            <h2 className="text-slate-400 text-sm">CITTÀ</h2>
                            <div className="flex flex-row gap-3 pt-2">
                              <p>{selectedClient.city}</p>
                            </div>
                          </div>
                        )}
                        {selectedClient.zipCode && (
                          <div className="pb-4">
                            <h2 className="text-slate-400 text-sm">CAP</h2>
                            <div className="flex flex-row gap-3 pt-2">
                              <p>{selectedClient.zipCode}</p>
                            </div>
                          </div>
                        )}
                        {selectedClient.countryCode && (
                          <div className="pb-4">
                            <h2 className="text-slate-400 text-sm">NAZIONE</h2>
                            <div className="flex flex-row gap-3 pt-2">
                              <Image
                                src={`https://flagcdn.com/w20/${selectedClient.countryCode.toLowerCase()}.png`}
                                alt={selectedClient.countryCode}
                                width={25}
                                height={20}
                              />
                              <p className="flex">
                                {countries.find(
                                  (country) =>
                                    country.code === selectedClient.countryCode
                                )?.label || selectedClient.countryCode}
                              </p>
                            </div>
                          </div>
                        )}
                        {selectedClient.phone && (
                          <div className="pb-4">
                            <h2 className="text-slate-400 text-sm">TELEFONO</h2>
                            <div className="flex flex-row gap-3 pt-2">
                              <p>{selectedClient.phone}</p>
                            </div>
                          </div>
                        )}
                        {selectedClient.mobile && (
                          <div className="pb-4">
                            <h2 className="text-slate-400 text-sm">MOBILE</h2>
                            <div className="flex flex-row gap-3 pt-2">
                              <p>{selectedClient.mobile}</p>
                            </div>
                          </div>
                        )}
                        {selectedClient.email && (
                          <div className="pb-4">
                            <h2 className="text-slate-400 text-sm">EMAIL</h2>
                            <div className="flex flex-row gap-3 pt-2">
                              <p>{selectedClient.email}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Disclosure.Panel>
                </Disclosure>
              )}
            </div>

            <div className="bg-white shadow-md p-4  flex flex-row justify-start gap-4 align-middle items-center">
              <div className="flex flex-col gap-4">
                <h1 className="text-slate-400 font-bold">
                  Data consegna prevista
                </h1>
                <div className="text-xl text-slate-400">
                  <input
                    type="datetime-local"
                    {...register("deliveryDate", { required: true })}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <h1 className="text-slate-400 font-bold">Posizioni</h1>
                <div className="text-xl text-slate-400">
                  <div className="grid grid-rows-2 grid-cols-4">
                    {Array.from({ length: 8 }, (_, i) => (
                      <input
                        key={i}
                        type="text"
                        {...register(`position${i + 1}`, { required: true })} // create an input field for each position
                      />
                    ))}
                  </div>
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
              <CldUploadButton
                uploadPreset="uploadpdf"
                onUpload={(result: any) => handleUpload(result)}
                options={{
                  sources: ["local"],
                }}
              />
              {uploaded.length > 0 && (
                <div>
                  <p>File caricati:</p>
                  <ul>
                    {uploaded.map((file) => (
                      <li key={file.id}>{`${file.id} - ${file.name}`}</li>
                    ))}
                  </ul>
                </div>
              )}
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
      </div>
    </Modal>
  );
};
