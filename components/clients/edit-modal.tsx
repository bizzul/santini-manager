"use client";

import { Dispatch, FC, SetStateAction } from "react";
import { Modal } from "../../package/components/modal";
import { EditModalForm } from "./edit-modal-form";
import { useClient } from "@/hooks/use-api";
import { Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  resourceId: number | null;
  setOpenModal: Dispatch<SetStateAction<boolean>>;
};

export const EditModal: FC<Props> = ({
  open,
  setOpen,
  setOpenModal,
  resourceId,
}) => {
  // Use React Query hook instead of manual fetch
  const { data, isLoading, error } = useClient(resourceId);

  return (
    <Modal
      className="h-screen"
      open={open}
      setOpen={setOpen}
      setOpenModal={setOpenModal}
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-32 text-red-500">
          Errore nel caricamento del cliente
        </div>
      ) : data ? (
        <EditModalForm
          preloadedValues={data}
          setOpen={setOpen}
          open={open}
          setOpenModal={setOpenModal}
        />
      ) : null}
    </Modal>
  );
};
