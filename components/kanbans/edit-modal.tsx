import {
  faTimes,
  faSave,
  faWarning,
  faTasks,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC, useState } from "react";
import { Modal } from "../../package/components/modal";
import { useForm } from "react-hook-form";
import { Task } from "@/types/supabase";
import QRCode from "qrcode.react";
import QCode from "qrcode";
import NextImage from "next/image";
import { DateManager } from "../../package/utils/dates/date-manager";
type Props = {
  open: boolean;
  setOpen: any;
  resource: Task;
  setOpenModal: any;
  setIsLocked: any;
  history: any;
};

export const EditModal: FC<Props> = ({
  open,
  setOpen,
  setOpenModal,
  resource,
  setIsLocked,
  history,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

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

  /**
   * Api update call
   * @param data
   */

  const onSubmit = (data: any) => {
    setError(null);
    setLoading(true);
    fetch(`/api/kanban/tasks/${resource.id}`, {
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
          if (data.warrantyStatus !== null && data.warrantyStatus !== "done") {
            setIsLocked(true);
          }
        }
      });
  };

  function printQRCode(data: string) {
    // Generate the QR code image
    const canvas = document.createElement("canvas");
    QCode.toCanvas(canvas, data, { width: 400 }, (error) => {
      if (error) {
        console.error(error);
        return;
      }

      // Create a new window and add the QR code image to it
      const printWindow = window.open(
        "",
        "Print Window",
        "height=400,width=400"
      );
      if (printWindow) {
        const img = new Image();
        img.src = canvas.toDataURL();
        img.onload = () => {
          printWindow.document.write(`<img src="${img.src}"/>`);

          // Wait for the image to finish rendering
          setTimeout(() => {
            // Print the new window
            printWindow.print();

            // Close the new window
            printWindow.close();
          }, 1000);
        };
      }
    });
  }

  // console.log(history);

  const filteredHistory = history.filter(
    (action: any) => action.taskId === resource.id
  );

  return (
    <Modal
      className="h-screen"
      open={open}
      setOpen={setOpen}
      setOpenModal={setOpenModal}
    >
      {resource ? (
        <>
          <div className="p-4 flex">
            <div className="w-3/4">
              <h1 className="text-xl font-bold">
                <FontAwesomeIcon icon={faTasks} className="mr-2" />
                Modifica progetto #{resource.id} - {resource.title}
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
                  <div className="w-full p-4 rounded-sm bg-red-500 text-white flex-row items-middle">
                    <FontAwesomeIcon icon={faWarning} className="mr-2" />
                    {error}
                  </div>
                </div>
              )}

              <div className="flex flex-row justify-between">
                <div>
                  <QRCode
                    value={`${process.env.NEXT_PUBLIC_URL}/progetti/${resource.unique_code}`}
                    size={128}
                    fgColor="#000000"
                    onClick={() =>
                      printQRCode(
                        `${process.env.NEXT_PUBLIC_URL}/progetti/${resource.unique_code}`
                      )
                    }
                  />
                </div>
                <div className="w-72">
                  {filteredHistory.length > 0 ? (
                    <ol className="relative border-l border-gray-200 dark:border-gray-700">
                      {filteredHistory.map((item: any) => (
                        <li className="mb-10 ml-6" key={item.id}>
                          <span className="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -left-3 ring-8 ring-white dark:ring-gray-900 dark:bg-blue-900">
                            <NextImage
                              className="rounded-full shadow-lg"
                              src={item.User?.picture}
                              width={30}
                              height={30}
                              alt={item.User?.given_name}
                            />
                          </span>
                          <div className="items-center justify-between p-2 bg-white border border-gray-200 rounded-lg shadow-xs sm:flex dark:bg-gray-700 dark:border-gray-600">
                            <time className="mb-1 text-xs font-normal text-gray-400 sm:order-last sm:mb-0">
                              {item.createdAt !== null &&
                                DateManager.formatEUDateTime(item.createdAt)}
                            </time>
                            <div className="text-sm font-normal text-gray-500 dark:text-gray-300">
                              {item.User?.given_name}{" "}
                              <span className="text-xs">
                                {" "}
                                {item.type === "move_task" && "ha mosso "}{" "}
                              </span>
                              <br />
                              <a
                                href="#"
                                className=" text-gray-600 text-xs dark:text-blue-500 "
                              >
                                {item.data?.fromColumn}
                              </a>{" "}
                              -{">"}{" "}
                              <span className=" text-gray-800 text-xs font-normal mr-2 px-2.5 py-0.5  dark:bg-gray-600 dark:text-gray-300">
                                {item.data?.toColumn}
                              </span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <ol className="relative border-l border-gray-200 dark:border-gray-700">
                      <li className="mb-10 ml-6">
                        <div className="items-center justify-between p-2 bg-white border border-gray-200 rounded-lg shadow-xs sm:flex dark:bg-gray-700 dark:border-gray-600">
                          <div className="text-sm font-normal text-gray-500 dark:text-gray-300">
                            Nessun dato storico trovato
                          </div>
                        </div>
                      </li>
                    </ol>
                  )}
                </div>
              </div>
              <div className="px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                {!loading && (
                  <button
                    type="submit"
                    className=" justify-center rounded-md border border-transparent shadow-xs px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-green-500 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-green-600 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    <FontAwesomeIcon icon={faSave} className="mr-2" /> Aggiorna
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
        </>
      ) : (
        <div>Loading...</div>
      )}
    </Modal>
  );
};
