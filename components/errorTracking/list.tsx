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
    label: "Modifica errore",
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
  // console.log(data);

  const [currentImage, setCurrentImage] = useState(0);

  const handlePrevClickImages = () => {
    setCurrentImage(currentImage - 1);
  };

  const handleNextClickImages = () => {
    setCurrentImage(currentImage + 1);
  };

  return (
    <div className="w-full">
      {data && (
        <div className="mb-2 flex">
          <div className="w-3/4 text-xs pt-4 pl-1">
            {data.pagination?.items_total} Errori totali - Pagina {page} di{" "}
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
            <th className="p-2">Creato da</th>
            <th className="p-2">Tipologia</th>
            <th className="p-2">Categoria</th>
            <th className="p-2">Fornitore</th>
            <th className="p-2">Posizione</th>
            <th className="p-2">Descrizione</th>
            <th className="p-2">Immagine</th>
            <th className="p-2">Azioni</th>
          </tr>
        </thead>
        <tbody className="text-md text-center">
          {data &&
            data.items?.length > 0 &&
            data.items.map((i: any) => {
              return (
                <tr
                  key={i.id}
                  onClick={() => {
                    handleRowClick(i.id);
                  }}
                >
                  <td className="border p-2 h-14">{i.user.given_name}</td>
                  <td className="border p-2 h-14">{i.error_type}</td>
                  <td className="border p-2 h-14">{i.error_category}</td>
                  <td className="border p-2 h-14">{i.supplier?.name}</td>
                  <td className="border p-2 h-14">{i.position}</td>
                  <td className="border p-2 h-14">{i.description}</td>
                  {/* <td className="border p-2 h-14">
                    {i.files.map((file) => (
                      <img key={file.id} src={file.url} alt={file.id} />
                    ))}
                  </td> */}
                  <td className="border p-2 h-14">
                    {/* Render the images */}
                    {i.files.length > 1 ? (
                      <div>
                        {/* Render the previous button */}
                        {currentImage > 0 && (
                          <button onClick={handlePrevClickImages}>Prec.</button>
                        )}
                        <a
                          href={i.files[currentImage]?.url}
                          download={true}
                          target="_blank"
                        >
                          <Image
                            src={i.files[currentImage].url}
                            alt={i.files[currentImage].id}
                            width={300}
                            height={300}
                          />
                        </a>
                        {/* Render the next button */}
                        {currentImage < i.files.length - 1 && (
                          <button onClick={handleNextClickImages}>Pros.</button>
                        )}
                      </div>
                    ) : (
                      <a href={i.files[0]?.url} download={true} target="_blank">
                        <Image
                          src={i.files[0]?.url}
                          alt={i.files[0]?.id}
                          width={300}
                          height={300}
                        />
                      </a>
                    )}
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
