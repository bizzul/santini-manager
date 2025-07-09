import { faCalendar, faClock } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC, useEffect, useState, Fragment } from "react";
import { SkeletonRows } from "../../package/components/loaders/skeleton-rows";
import { Pagination } from "../../package/components/pagination";
import {
  faIdBadge,
  faTrash,
  IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { Dialog, Menu, Transition } from "@headlessui/react";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import Image from "next/image";
import { Tooltip } from "react-tooltip";

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
    label: "Modifica prodotto",
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
  return (
    <div className="w-full">
      {data && (
        <div className="mb-2 flex">
          <div className="w-3/4 text-xs pt-4 pl-1">
            {data.pagination?.items_total} Prodotti totali - Pagina {page} di{" "}
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
          <tr className="h-14 bg-[#334155] text-white text-left">
            <th className="p-2">Id Inv</th>
            <th className="p-2">Categoria</th>
            <th className="p-2">Nome</th>
            <th className="p-2">Cod. art.</th>
            <th className="p-2">Fornitore</th>
            <th className="p-2">Misure</th>
            <th className="p-2">Qta.</th>
            <th className="p-2">Prezzo unit.</th>
            <th className="p-2">Prezzo Tot.</th>
            <th className="p-2">Ult.Edit</th>
            <th className="p-2">Azioni</th>
          </tr>
        </thead>
        <tbody className="text-md text-left">
          {data &&
            data.items?.length > 0 &&
            data.items.map((i: any) => {
              // round total price
              const roundedPrice = Math.round(i.total_price * 100) / 100;
              return (
                <tr
                  key={i.id}
                  onClick={() => {
                    handleRowClick(i.id);
                  }}
                >
                  <td className="border-1 p-2 h-14">{i.inventoryId}</td>
                  <td className="border-1 p-2 h-14">
                    {i.product_category?.name}
                  </td>
                  <td className="border-1 p-2 h-14">{i.name}</td>
                  <td className="border-1 p-2 h-14">{i.description}</td>
                  <td className="border-1 p-2 h-14">{i.supplierInfo?.name}</td>
                  <td className="border-1 p-2 h-14">
                    {i.width}x{i.height}x{i.length}
                  </td>
                  <td className="border-1 p-2 h-14">{i.quantity}</td>
                  <td className="border-1 p-2 h-14">{i.unit_price}</td>
                  <td className="border-1 p-2 h-14">{roundedPrice}</td>
                  <td className="border-1 p-2 h-14">
                    {(() => {
                      const mostRecentItem = [...i.Action].sort((a, b) => {
                        // @ts-ignore
                        return new Date(b.createdAt) - new Date(a.createdAt);
                      })[0];
                      // // console.log(mostRecentItem);

                      return (
                        <>
                          {mostRecentItem?.User?.picture ? (
                            <>
                              {" "}
                              <Image
                                data-tooltip-id="user-tooltip"
                                data-tooltip-content={
                                  mostRecentItem?.User?.given_name
                                }
                                src={mostRecentItem?.User?.picture}
                                alt={mostRecentItem?.User?.authId}
                                width={40}
                                height={40}
                              />
                              <Tooltip id="user-tooltip" />
                            </>
                          ) : (
                            "-"
                          )}
                        </>
                      );
                    })()}
                  </td>

                  <td onClick={(e) => e.stopPropagation()}>
                    <Menu as="div" className="relative inline-block text-left">
                      <div>
                        <Menu.Button className="justify-center w-full flex  rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500">
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
                        <Menu.Items className="origin-top-right absolute z-30 right-0 mt-2 w-96 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
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
                                    i.separatorBefore && `border-t-[1px]`
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
            {data.pagination?.items_total} Prodotti totali - Pagina {page} di{" "}
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
