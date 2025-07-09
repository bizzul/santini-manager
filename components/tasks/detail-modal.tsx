import {
  faCheckSquare,
  faCross,
  faDatabase,
  faDeleteLeft,
  faEllipsis,
  faTimes,
  faTrash,
  faX,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Menu, Transition } from "@headlessui/react";
import { Dispatch, FC, Fragment, useEffect, useState } from "react";
import { Modal } from "../../package/components/modal";
import { DeleteModal } from "./delete-modal";
import { Client, Prisma, Task } from "@prisma/client";
import Image from "next/image";
import { calculateCurrentValue } from "../../package/utils/various/calculateCurrentValue";

type Props = {
  open: boolean;
  setOpen: Dispatch<React.SetStateAction<boolean>>;
  resourceId: number | null;
  setOpenModal: any;
  setSuccess: any;
};

type ExtendedTask = Task & Client;

function classNames(...classes: any) {
  return classes.filter(Boolean).join(" ");
}
export const DetailModal: FC<Props> = ({
  open,
  setOpen,
  resourceId,
  setOpenModal,
  setSuccess,
}) => {
  const [data, setData] = useState<ExtendedTask | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  // const [forceListRefresh, setForceListRefresh] = useState<boolean>(false);
  const [timeState, setTimeState] = useState("normal");
  const get = (id: number) => {
    setLoading(true);
    fetch(`/api/tasks/${id}`)
      .then((r) => r.json())
      .then((d: any) => {
        setData(d);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!loading && resourceId) get(resourceId);
  }, [resourceId]);

  useEffect(() => {
    // get the time in the variable (assuming it's in the format of "hh:mm:ss")
    if (data?.deliveryDate) {
      // get the current time
      const currentTime = new Date();
      const targetTime = new Date(data.deliveryDate); // Change this to your variable name.
      // compare the times
      if (currentTime.getTime() > targetTime.getTime()) {
        setTimeState("late");
      } else {
        setTimeState("normal");
      }
    }
  }, []);

  console.log(data);
  return (
    <Modal
      open={open}
      setOpen={setOpen}
      setOpenModal={setOpenModal}
      className="w-5/6 py-4"
    >
      <div className="w-full flex">
        <div className="flex-1">
          {data && (
            <h1 className="text-xl uppercase font-semibold tracking-wide mb-2 px-4 py-2">
              Dettaglio progetto # {data.unique_code}
            </h1>
          )}
        </div>
        <div className="pr-4 pt-2">
          <Menu as="div" className="relative inline-block text-left">
            <div>
              <Menu.Button className="inline-flex w-full justify-center align-baseline rounded-md bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-100">
                <FontAwesomeIcon
                  icon={faEllipsis}
                  className="text-gray-300 text-3xl cursor-pointer "
                />
              </Menu.Button>
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
              <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="py-1">
                  <Menu.Item>
                    {({ active }) => (
                      <a
                        href="#"
                        onClick={() => {
                          setDeleteModalOpen(true);
                        }}
                        className={classNames(
                          active
                            ? "bg-gray-100 text-gray-900"
                            : "text-gray-700",
                          "block px-4 py-2 text-sm"
                        )}
                      >
                        <FontAwesomeIcon icon={faTrash} className="mr-2" />
                        Elimina
                      </a>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
          <FontAwesomeIcon
            icon={faTimes}
            className="text-gray-300 text-3xl cursor-pointer"
            onClick={() => setOpen(false)}
          />
        </div>
      </div>
      {data && (
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
              {/* @ts-ignore */}
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
                className={`${
                  timeState === "normal" ? "" : "border-red-500 border p-2"
                }`}
              >
                {/* @ts-ignore */}
                {new Date(data.deliveryDate).toLocaleDateString()}
              </span>
            </div>
            <div>
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                Vendita
              </div>
              {/* @ts-ignore */}
              {data.sellPrice}
            </div>
            <div>
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                Val. Attuale
              </div>
              {/* @ts-ignore */}
              {calculateCurrentValue(data, data.column?.position)}
            </div>
            <div>
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                Altro
              </div>
              {/* @ts-ignore */}
              {data.other}
            </div>
            <div>
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                Archiviato
              </div>
              {/* @ts-ignore */}
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
            {/* @ts-ignore */}
            {data.client?.clientType === "INDIVIDUAL" ? (
              <>
                <div>
                  <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                    Titolo
                  </div>
                  {/* @ts-ignore */}
                  {data.client?.individualTitle}
                </div>
                <div>
                  <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                    Nome
                  </div>
                  {/* @ts-ignore */}
                  {data.client?.individualFirstName}
                </div>
                <div>
                  <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                    Cognome
                  </div>
                  {/* @ts-ignore */}
                  {data.client?.individualLastName}
                </div>
              </>
            ) : (
              <div>
                <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                  Azienda
                </div>
                {/* @ts-ignore */}
                {data.client?.businessName}
              </div>
            )}

            <div>
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                CAP
              </div>
              {/* @ts-ignore */}
              {data.client?.zipCode}
            </div>
            <div>
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                Citta
              </div>
              {/* @ts-ignore */}
              {data.client?.city}
            </div>

            <div>
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                Paese
              </div>
              {/* @ts-ignore */}
              {data.client?.countryCode}
            </div>
            <div>
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                email
              </div>
              {/* @ts-ignore */}
              {data.client?.email}
            </div>

            <div>
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                Lingua
              </div>
              {/* @ts-ignore */}
              <div>{data.client?.clientLanguage}</div>
            </div>
            <div>
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                Telefono fisso
              </div>
              {/* @ts-ignore */}
              <div className="text-lg ">{data.client?.landlinePhone}</div>
            </div>
            <div>
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                Telefono mobile
              </div>
              {/* @ts-ignore */}
              <div className="text-lg ">{data.client?.mobilePhone}</div>
            </div>
            <div>
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                Indirizzo
              </div>
              {/* @ts-ignore */}
              <div className="text-lg ">{data.client?.address}</div>
            </div>
            <div>
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                Indirizzo extra
              </div>
              {/* @ts-ignore */}
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
              {new Date(data.created_at).toLocaleDateString()}
            </div>
            <div>
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                Ultima modifica
              </div>
              {new Date(data.updated_at).toLocaleDateString()}
            </div>

            <div className="flex flex-col justify-center items-center">
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                Creatore
              </div>

              <Image
                //@ts-ignore
                src={data.Action[0]?.User?.picture}
                width={50}
                height={50}
                //@ts-ignore
                alt={data.Action[0]?.User?.given_name}
              />
            </div>

            <div>
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                Posizione
              </div>

              {/* @ts-ignore */}
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
      )}
    </Modal>
  );
};
