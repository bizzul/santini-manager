import {
  faDatabase,
  faEllipsis,
  faTimes,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Menu, Transition } from "@headlessui/react";
import { Dispatch, FC, Fragment, useEffect, useState } from "react";
import { Modal } from "../../package/components/modal";
import { DeleteModal } from "./delete-modal";
import { AddressCard } from "./addresses-card";

type Props = {
  open: boolean;
  setOpen: Dispatch<React.SetStateAction<boolean>>;
  resourceId: number | null;
  setOpenModal: any;
};

function classNames(...classes: any) {
  return classes.filter(Boolean).join(" ");
}
export const DetailModal: FC<Props> = ({
  open,
  setOpen,
  resourceId,
  setOpenModal,
}) => {
  const [data, setData] = useState<any>();
  const [loading, setLoading] = useState<boolean>(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  // const [forceListRefresh, setForceListRefresh] = useState<boolean>(false);

  const get = (id: number) => {
    setLoading(true);
    fetch(`/api/clients/${id}`)
      .then((r) => r.json())
      .then((d: any) => {
        setData(d);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!loading && resourceId) get(resourceId);
  }, [resourceId]);

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
              Dettaglio cliente #{resourceId} - {data.individualFirstName}{" "}
              {data.individualLastName}
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
                <FontAwesomeIcon icon={faDatabase} className="mr-2" /> Indirizzo
                principale
              </h2>
            </div>
          </div>

          <div className="w-full grid grid-cols-5 px-4 pt-2 gap-2 ">
            {data.clientType === "INDIVIDUAL" ? (
              <div>
                <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                  Titolo
                </div>
                {data.individualTitle}
              </div>
            ) : (
              <div>
                <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                  Azienda
                </div>
                {data.businessName}
              </div>
            )}
            <div>
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                Nome
              </div>
              {data.individualFirstName}
            </div>
            <div>
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                Cognome
              </div>

              {data.individualLastName}
            </div>
            <div>
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                CAP
              </div>
              {data.zipCode}
            </div>
            <div>
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                Citta
              </div>
              {data.city}
            </div>

            <div>
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                Paese
              </div>

              {data.countryCode}
            </div>
            <div>
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                email
              </div>

              {data.email}
            </div>

            <div>
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                Lingua
              </div>
              <div>{data.clientLanguage}</div>
            </div>
            <div>
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                Telefono fisso
              </div>
              <div className="text-lg ">{data.landlinePhone}</div>
            </div>
            <div>
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                Telefono mobile
              </div>
              <div className="text-lg ">{data.mobilePhone}</div>
            </div>
            <div>
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                Indirizzo
              </div>
              <div className="text-lg ">{data.address}</div>
            </div>
            <div>
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                Indirizzo extra
              </div>
              <div className="text-lg ">{data.addressExtra}</div>
            </div>
          </div>
          <div className="w-full px-4 py-2 border flex">
            <div className="w-1/2">
              <h2 className="uppercase font-semibold text-slate-600">
                <FontAwesomeIcon icon={faDatabase} className="mr-2" /> Indirizzi
                secondari
              </h2>
            </div>
          </div>
          {data.addresses[0] && (
            <div className="p-4 flex flex-row">
              {data.addresses[0].name === data.addresses[1].name &&
              data.addresses[0].lastName === data.addresses[1].lastName &&
              data.addresses[0].address === data.addresses[1].address ? (
                <AddressCard
                  key={data.addresses[0].id}
                  address={data.addresses[0]}
                />
              ) : (
                data.addresses.map((address: any) => {
                  return <AddressCard key={address.id} address={address} />;
                })
              )}
            </div>
          )}

          <DeleteModal
            setOpen={setDeleteModalOpen}
            setDetailModalOpen={setOpen}
            setOpenModal={setOpenModal}
            open={deleteModalOpen}
            resourceId={resourceId}
          />
        </div>
      )}
    </Modal>
  );
};
