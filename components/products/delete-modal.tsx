import {
  faTimes,
  faTrash,
  faUserPlus,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Dispatch, FC, SetStateAction, useState } from "react";
import { Modal } from "../../package/components/modal";

type Props = {
  open: boolean;
  label?: string;
  resourceId: number | undefined;
  setOpenModal: any;
  setOpen: any;
};

export const DeleteModal: FC<Props> = ({
  open,
  setOpen,
  resourceId,
  label,
  setOpenModal,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [removeLoading, setRemoveLoading] = useState<boolean>(false);
  /**
   * Api call
   * @param data
   */
  const remove = () => {
    setError(null);
    setLoading(true);
    fetch(`/api/products/${resourceId}`, {
      method: "DELETE",
      headers: new Headers({
        "Content-Type": "application/json",
      }),
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
          setOpenModal(null);
          setRemoveLoading(false);
        }
      });
  };

  return (
    <Modal
      open={open}
      setOpen={setOpen}
      setOpenModal={setOpenModal}
      className="w-1/3"
    >
      {resourceId && (
        <div>
          <div className="p-4 flex border-b-2">
            <div className="w-3/4">
              <h1 className="text-xl font-bold">
                <FontAwesomeIcon icon={faTrash} className="mr-2" />
                Eliminazione prodotto - {resourceId}
              </h1>
            </div>
            <div className="w-1/4 text-right">
              <FontAwesomeIcon
                icon={faTimes}
                className="text-2xl text-slate-400 cursor-pointer"
                onClick={() => {
                  setOpen(false);
                  setOpenModal(null);
                }}
              />
            </div>
          </div>
          <div className="p-4 pt-1 flex-col">
            <h2 className="text-xl font-semibold mb-2">Sei sicuro?</h2>
            L&apos;eliminazione &egrave; definitiva - tutti i dati vengono
            rimossi completamente dal sistema.
          </div>
        </div>
      )}
      <div className="w-full flex px-4 py-2">
        <div className="items-left flex-1">
          {!removeLoading && (
            <button
              type="button"
              onClick={() => {
                remove();
              }}
              className="bg-red-500 p-2 rounded text-white font-semibold "
            >
              <FontAwesomeIcon icon={faTrash} className="mr-2" />
              Elimina definitivamente
            </button>
          )}
        </div>
        <div className="items-end">
          {!removeLoading && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setOpenModal(null);
              }}
              className="bg-primary-500 p-2 rounded text-white font-semibold"
            >
              <FontAwesomeIcon icon={faTimes} className="mr-2" /> Annulla
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
