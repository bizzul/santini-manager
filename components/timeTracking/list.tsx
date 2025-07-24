import { faCancel, faCheckCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC, Fragment } from "react";
import { SkeletonRows } from "../../package/components/loaders/skeleton-rows";
import { Pagination } from "../../package/components/pagination";
import {
  faIdBadge,
  faTrash,
  IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { Menu, Transition } from "@headlessui/react";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { Roles } from "@prisma/client";

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
    label: "Modifica rapporto",
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

  return (
    <div className="w-full">
      {data && (
        <div className="mb-2 flex">
          <div className="w-3/4 text-xs pt-4 pl-1">
            {data.pagination?.items_total} Conteggi totali - Pagina {page} di{" "}
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

      <table className="w-full shadow-xl table-default table-auto text-left">
        <thead>
          <tr className="h-14 bg-[#334155] text-white">
            <th className="p-2">Creato da</th>
            <th className="p-2">Reparto</th>
            <th className="p-2">Ore</th>
            <th className="p-2">Minuti</th>
            <th className="p-2">Inizio</th>
            <th className="p-2">Fine</th>
            <th className="p-2">Totale</th>
            <th className="p-2">CNC</th>
            <th className="p-2">Progetto</th>
            <th className="p-2">Descrizione</th>
            <th className="p-2">Tipo Desc.</th>
            <th className="p-2">Creato il</th>
            <th className="p-2">Azioni</th>
          </tr>
        </thead>
        <tbody className="text-md text-left">
          {data &&
            data.items?.length > 0 &&
            data.items.map((i: any) => {
              const createDate = new Date(i.created_at);
              // Use Swiss German ('de-CH') locale
              const options = {
                weekday: "short",
                year: "numeric",
                month: "long",
                day: "numeric",
              };
              const dateString = createDate.toLocaleDateString(
                "de-CH",
                //@ts-ignore
                options
              );

              const timeString = createDate.toLocaleTimeString("de-CH", {
                hour: "2-digit",
                minute: "2-digit",
              });

              const formattedDate = `${dateString} ${timeString}`;
              // const hours = Math.floor(i.totalTime / 3600000);
              // const minutes = Math.ceil((i.totalTime % 3600000) / 60000);
              const hours = Math.floor(i.totalTime);
              const minutes = Math.round((i.totalTime - hours) * 60);
              // Your Date objects
              const start = new Date(i.startTime);
              const end = new Date(i.endTime);

              // Extract the hours and minutes
              let startHour = start.getUTCHours();
              let startMinute = start.getUTCMinutes();
              let endHour = end.getUTCHours();
              let endMinute = end.getUTCMinutes();

              // Format the hours and minutes as strings
              let startString = `${startHour
                .toString()
                .padStart(2, "0")}:${startMinute.toString().padStart(2, "0")}`;
              let endString = `${endHour
                .toString()
                .padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`;

              return (
                <tr
                  key={i.id}
                  onClick={() => {
                    handleRowClick(i.id);
                  }}
                >
                  <td className="border p-2 h-14">
                    {i.user.family_name} {i.user.given_name}
                  </td>
                  <td className="border p-2 h-14">
                    <ul>
                      {i.roles.map((role: Roles) => (
                        <li key={role.id}>{role.name}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="border p-2 h-14">{i.hours}</td>
                  <td className="border p-2 h-14">{i.minutes}</td>
                  <td className="border p-2 h-14">{startString}</td>
                  <td className="border p-2 h-14">{endString}</td>
                  <td className="border p-2 h-14">{`${hours} ore e ${minutes} minuti`}</td>
                  <td className="border p-2 h-14">
                    {i.use_cnc ? (
                      <FontAwesomeIcon icon={faCheckCircle} />
                    ) : (
                      <FontAwesomeIcon icon={faCancel} />
                    )}
                  </td>
                  <td className="border p-2 h-14">{i.task?.unique_code}</td>
                  <td className="border p-2 h-14">{i.description}</td>
                  <td className="border p-2 h-14">{i.description_type}</td>
                  <td className="border p-2 h-14">{formattedDate}</td>

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
            {data.pagination?.items_total} Conteggi totali - Pagina {page} di{" "}
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
