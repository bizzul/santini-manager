"use client";

import {
  faCheckSquare,
  faDatabase,
  faEllipsis,
  faTimes,
  faTrash,
  faX,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
} from "@headlessui/react";
import {
  Dispatch,
  FC,
  Fragment,
  SetStateAction,
  useEffect,
  useState,
} from "react";
import { Modal } from "../../package/components/modal";
import { DeleteModal } from "./delete-modal";
import Image from "next/image";
import { calculateCurrentValue } from "../../package/utils/various/calculateCurrentValue";
import { useTask } from "@/hooks/use-api";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  resourceId: number | null;
  setOpenModal: (open: boolean) => void;
  setSuccess: Dispatch<SetStateAction<boolean>>;
};

export const DetailModal: FC<Props> = ({
  open,
  setOpen,
  resourceId,
  setOpenModal,
  setSuccess,
}) => {
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [timeState, setTimeState] = useState("normal");

  // Use React Query hook instead of manual fetch
  const { data, isLoading, error } = useTask(resourceId);

  // Update time state when data changes
  useEffect(() => {
    if (data?.deliveryDate) {
      const currentTime = new Date();
      const targetTime = new Date(data.deliveryDate);
      if (currentTime.getTime() > targetTime.getTime()) {
        setTimeState("late");
      } else {
        setTimeState("normal");
      }
    }
  }, [data?.deliveryDate]);

  return (
    <Modal
      open={open}
      setOpen={setOpen}
      setOpenModal={setOpenModal}
      className="w-5/6 py-4"
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-32 text-red-500">
          Errore nel caricamento del progetto
        </div>
      ) : data ? (
        <>
          <div className="w-full flex">
            <div className="flex-1">
              <h1 className="text-xl uppercase font-semibold tracking-wide mb-2 px-4 py-2">
                Dettaglio progetto # {data.unique_code}
              </h1>
            </div>
            <div className="pr-4 pt-2">
              <Menu as="div" className="relative inline-block text-left">
                <div>
                  <MenuButton className="inline-flex w-full justify-center align-baseline rounded-md bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-100">
                    <FontAwesomeIcon
                      icon={faEllipsis}
                      className="text-gray-300 text-3xl cursor-pointer "
                    />
                  </MenuButton>
                </div>

                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <MenuItems className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-hidden">
                    <div className="py-1">
                      <MenuItem>
                        {({ focus }) => (
                          <a
                            href="#"
                            onClick={() => {
                              setDeleteModalOpen(true);
                            }}
                            className={cn(
                              focus
                                ? "bg-gray-100 text-gray-900"
                                : "text-gray-700",
                              "block px-4 py-2 text-sm"
                            )}
                          >
                            <FontAwesomeIcon icon={faTrash} className="mr-2" />
                            Elimina
                          </a>
                        )}
                      </MenuItem>
                    </div>
                  </MenuItems>
                </Transition>
              </Menu>
              <FontAwesomeIcon
                icon={faTimes}
                className="text-gray-300 text-3xl cursor-pointer"
                onClick={() => setOpen(false)}
              />
            </div>
          </div>
          <div>
            <div className="w-full px-4 py-2 border flex">
              <div className="w-1/2">
                <h2 className="uppercase font-semibold text-slate-600">
                  <FontAwesomeIcon icon={faDatabase} className="mr-2" /> Dati
                  principali
                </h2>
              </div>
            </div>
            <div className="w-full grid grid-cols-5 px-4 pt-2 gap-2 ">
              <div>
                <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                  Prodotto
                </div>
                {data.sellProduct?.name}
              </div>
              <div>
                <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                  Materiale
                </div>
                {data.material ? (
                  <FontAwesomeIcon icon={faCheckSquare} />
                ) : (
                  <FontAwesomeIcon icon={faX} />
                )}
              </div>
              <div>
                <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                  Consegna
                </div>
                <span
                  className={cn(
                    timeState === "late" && "border-red-500 border p-2"
                  )}
                >
                  {data.deliveryDate
                    ? new Date(data.deliveryDate).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
              <div>
                <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                  Vendita
                </div>
                {data.sellPrice}
              </div>
              <div>
                <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                  Val. Attuale
                </div>
                {calculateCurrentValue(data, data.column?.position)}
              </div>
              <div>
                <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                  Altro
                </div>
                {data.other}
              </div>
              <div>
                <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                  Archiviato
                </div>
                {data.archived ? (
                  <FontAwesomeIcon icon={faCheckSquare} />
                ) : (
                  <FontAwesomeIcon icon={faX} />
                )}
              </div>
            </div>

            <div className="w-full px-4 py-2 border flex">
              <div className="w-1/2">
                <h2 className="uppercase font-semibold text-slate-600">
                  <FontAwesomeIcon icon={faDatabase} className="mr-2" />
                  Cliente
                </h2>
              </div>
            </div>

            <div className="w-full grid grid-cols-5 px-4 pt-2 gap-2 ">
              {data.client?.clientType === "INDIVIDUAL" ? (
                <>
                  <div>
                    <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                      Titolo
                    </div>
                    {data.client?.individualTitle}
                  </div>
                  <div>
                    <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                      Nome
                    </div>
                    {data.client?.individualFirstName}
                  </div>
                  <div>
                    <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                      Cognome
                    </div>
                    {data.client?.individualLastName}
                  </div>
                </>
              ) : (
                <div>
                  <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                    Azienda
                  </div>
                  {data.client?.businessName}
                </div>
              )}

              <div>
                <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                  CAP
                </div>
                {data.client?.zipCode}
              </div>
              <div>
                <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                  Citta
                </div>
                {data.client?.city}
              </div>

              <div>
                <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                  Paese
                </div>
                {data.client?.countryCode}
              </div>
              <div>
                <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                  email
                </div>
                {data.client?.email}
              </div>

              <div>
                <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                  Lingua
                </div>
                <div>{data.client?.clientLanguage}</div>
              </div>
              <div>
                <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                  Telefono fisso
                </div>
                <div className="text-lg ">{data.client?.landlinePhone}</div>
              </div>
              <div>
                <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                  Telefono mobile
                </div>
                <div className="text-lg ">{data.client?.mobilePhone}</div>
              </div>
              <div>
                <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                  Indirizzo
                </div>
                <div className="text-lg ">{data.client?.address}</div>
              </div>
              <div>
                <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                  Indirizzo extra
                </div>
                <div className="text-lg ">{data.client?.addressExtra}</div>
              </div>
            </div>

            <div className="w-full px-4 py-2 border flex">
              <div className="w-1/2">
                <h2 className="uppercase font-semibold text-slate-600">
                  <FontAwesomeIcon icon={faDatabase} className="mr-2" />
                  Sistema
                </h2>
              </div>
            </div>
            <div className="w-full grid grid-cols-5 px-4 pt-2 gap-2 ">
              <div>
                <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                  Creazione
                </div>
                {data.created_at
                  ? new Date(data.created_at).toLocaleDateString()
                  : "N/A"}
              </div>
              <div>
                <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                  Ultima modifica
                </div>
                {data.updated_at
                  ? new Date(data.updated_at).toLocaleDateString()
                  : "N/A"}
              </div>

              <div className="flex flex-col justify-center items-center">
                <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                  Creatore
                </div>
                {data.Action?.[0]?.User?.picture && (
                  <Image
                    src={data.Action[0].User.picture}
                    width={50}
                    height={50}
                    alt={data.Action[0]?.User?.given_name || "User"}
                  />
                )}
              </div>

              <div>
                <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                  Posizione
                </div>
                {data.column?.title}
              </div>
            </div>

            <DeleteModal
              setOpenModal={setOpenModal}
              setOpen={setDeleteModalOpen}
              setDetailModalOpen={setOpen}
              open={deleteModalOpen}
              resourceId={resourceId}
              setSuccess={setSuccess}
            />
          </div>
        </>
      ) : null}
    </Modal>
  );
};
