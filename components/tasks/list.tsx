import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC, useEffect, useState, Fragment } from "react";
import { SkeletonRows } from "../../package/components/loaders/skeleton-rows";
import { Pagination } from "../../package/components/pagination";
import {
  faCross,
  faIdBadge,
  faTrash,
  IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { Dialog, Menu, Transition } from "@headlessui/react";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import Toast from "../../package/components/toast";
import { Task } from "@/types/supabase";

type Props = {
  data: any;
  page: any;
  handlePageClick: (event: any) => void;
  handleRowClick: (id: number) => void;
  handleMenuClick: (id: number, modal: string) => void;
  loading: boolean;
  q?: string;
};

type actionMenuItem = {
  label: string;
  icon: IconDefinition;
  separatorBefore?: boolean;
  class?: string;
  openModal?: string;
};
const actionMenu: actionMenuItem[] = [
  {
    label: "Modifica dati progetto",
    icon: faIdBadge,
    openModal: "EditModal",
  },
  {
    label: "Elimina",
    icon: faTrash,
    separatorBefore: true,
    class: "text-red-500",
    openModal: "DeleteModal",
  },
];

export const List: FC<Props> = ({
  data,
  page,
  handlePageClick,
  handleRowClick,
  handleMenuClick,
  loading,
  q,
}) => {
  console.log("data lista progetti", data);
  return (
    <div className="w-full">
      {data && (
        <div className="mb-2 flex">
          <div className="w-3/4 text-xs pt-4 pl-1">
            {data.pagination?.items_total} Progetti totali - Pagina {page} di{" "}
            {data.pagination?.total_pages}
          </div>
          <div className="w-1/4">
            <Pagination
              page={page}
              size="sm"
              handlePageClick={handlePageClick}
              data={data}
              className="mt-2"
            />
          </div>
        </div>
      )}

      <table className="w-full shadow-xl table-default table-auto ">
        <thead>
          <tr className="h-14 bg-[#334155] text-white">
            <th className="pl-2 font-semibold ">Codice</th>
            {/* <th className="pl-2 font-semibold">Titolo</th> */}
            <th className="pl-2 font-semibold">Cliente</th>
            <th className="pl-2 font-semibold ">Pos. Attuale</th>
            <th className="pl-2 font-semibold ">Note</th>
            <th className="pl-2 font-semibold">Data di consegna</th>
            <th className="pl-2 font-semibold">Ultimo Aggiorn.</th>
            <th className="pl-2 font-semibold">Azioni</th>
          </tr>
        </thead>
        <tbody className="text-md text-center">
          {data &&
            data.items?.length > 0 &&
            data.items.map((i: any) => {
              const createDate = new Date(i.created_at);
              const updateDate = new Date(i.updated_at);
              const delivery = new Date(i.deliveryDate || "");
              return (
                <tr
                  key={i.id}
                  onClick={() => {
                    handleRowClick(i.id);
                  }}
                >
                  <td>{i.unique_code}</td>
                  {/* <td>{i.title}</td> */}

                  <td>{i.client?.businessName}</td>

                  <td>{i.kanban?.title + " -> " + i.column?.title}</td>
                  <td>{i.other}</td>

                  <td>{delivery.toDateString()}</td>
                  <td>
                    {
                      <>
                        {i.Action && (
                          <img src={i.Action?.User?.picture} alt={i.id} />
                        )}
                        {updateDate.toDateString()}
                      </>
                    }
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <Menu as="div" className="relative inline-block text-left">
                      <div>
                        <Menu.Button className="justify-center w-full flex  rounded-md border border-gray-300 shadow-xs px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500">
                          Azioni
                          <FontAwesomeIcon
                            icon={faChevronDown}
                            className="mt-0.5 ml-2"
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
                        <Menu.Items className="origin-top-right absolute z-30 right-0 mt-2 w-96 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-hidden">
                          <div className="py-1 text-slate-600">
                            {actionMenu.map((item) => (
                              <Menu.Item
                                key={`${i.id}-${item.label
                                  .replace(" ", "-")
                                  .toLowerCase()}`}
                              >
                                <a
                                  href="#"
                                  onClick={() => {
                                    if (item.openModal) {
                                      handleMenuClick(i.id, item.openModal);
                                    }
                                  }}
                                  className={`block px-4 py-2 hover:bg-gray-100  ${
                                    i.separatorBefore && `border-t`
                                  } ${item.class}`}
                                >
                                  <FontAwesomeIcon
                                    icon={item.icon}
                                    fixedWidth
                                    className="mr-2"
                                  />
                                  {item.label}
                                </a>
                              </Menu.Item>
                            ))}
                          </div>
                        </Menu.Items>
                      </Transition>
                    </Menu>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>

      {loading && (
        <div>
          <SkeletonRows lines={5} />
        </div>
      )}
      {data && (
        <div className="mb-2 flex">
          <div className="w-3/4 text-xs pt-4 pl-1">
            {data.pagination?.items_total} Progetti totali - Pagina {page} di{" "}
            {data.pagination?.total_pages}
          </div>
          <div className="w-1/4">
            <Pagination
              page={page}
              size="sm"
              handlePageClick={handlePageClick}
              data={data}
              className="mt-2"
            />
          </div>
        </div>
      )}
    </div>
  );
};
