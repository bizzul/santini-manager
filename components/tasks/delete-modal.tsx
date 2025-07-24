import { faCross, faTimes, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, {
  Dispatch,
  FC,
  SetStateAction,
  useEffect,
  useState,
} from "react";
import { Modal } from "../../package/components/modal";
import { List } from "./list";
import Toast from "../../package/components/toast";

type Props = {
  open: boolean;
  setOpen: Dispatch<React.SetStateAction<boolean>>;
  setDetailModalOpen: Dispatch<React.SetStateAction<boolean>>;
  resourceId: number | null;
  setOpenModal: any;
  setSuccess: Dispatch<React.SetStateAction<boolean>>;
};

export const DeleteModal: FC<Props> = ({
  open,
  setOpen,
  setOpenModal,
  setDetailModalOpen,
  resourceId,
  setSuccess,
}) => {
  const [data, setData] = useState<any>();
  const [loading, setLoading] = useState<boolean>(false);
  const [removeLoading, setRemoveLoading] = useState<boolean>(false);

  const get = (id: number) => {
    setLoading(true);
    fetch(`/api/tasks/${id}`)
      .then((r) => r.json())
      .then((d: any) => {
        setData(d);
        setLoading(false);
      });
  };

  const remove = () => {
    if (data) {
      setRemoveLoading(true);
      fetch(`/api/tasks/${data.id}`, { method: "DELETE" })
        .then((r) => r.json())
        .then((d: any) => {
          setData(d);
          setRemoveLoading(false);
          //Closing delete modal
          setOpen(false);
          setOpenModal(false);
          //Closing main detail modal
          setDetailModalOpen(false);
          setSuccess(true);
          setTimeout(() => {
            setSuccess(false);
          }, 3000);
          //Updating the resource list (not necessary because useSWR update automatically)
        });
    }
  };

  useEffect(() => {
    if (!loading && resourceId) get(resourceId);
  }, [resourceId]);

  return (
    <Modal
      setOpenModal={setOpenModal}
      open={open}
      setOpen={setOpen}
      className="w-2/6 py-4"
    >
      <div className="w-full flex">
        <div className="flex-1">
          <h1 className="text-xl uppercase font-semibold tracking-wide mb-2 px-4">
            Eliminazione progetto #{resourceId}
          </h1>
        </div>
        <div className="pr-4">
          <FontAwesomeIcon
            icon={faTimes}
            className="text-gray-300 text-3xl cursor-pointer"
            onClick={() => setOpenModal(false)}
          />
        </div>
      </div>
      {data && (
        <div className="p-4">
          <h2 className="text-xl font-semibold mb-2">Sei sicuro?</h2>
          L&apos;eliminazione &egrave; definitiva - tutti i dati vengono rimossi
          completamente dal sistema.
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
              className="bg-red-500 p-2 rounded-sm text-white font-semibold "
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
              }}
              className="bg-primary-500 p-2 rounded-sm text-white font-semibold"
            >
              <FontAwesomeIcon icon={faTimes} className="mr-2" /> Annulla
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
