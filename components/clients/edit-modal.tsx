import { FC, useEffect, useState } from "react";
import { Modal } from "../../package/components/modal";

import { EditModalForm } from "./edit-modal-form";

type Props = {
  open: boolean;
  setOpen: any;
  resourceId: number | null;
  setOpenModal: any;
};

export const EditModal: FC<Props> = ({
  open,
  setOpen,
  setOpenModal,
  resourceId,
}) => {
  const [data, setData] = useState<any>(null);

  const get = async (id: number) => {
    await fetch(`/api/clients/${id}`)
      .then((r) => r.json())
      .then((d: any) => {
        setData(d);
      });
  };

  useEffect(() => {
    const fetchData = async () => {
      if (resourceId) {
        await get(resourceId);
      }
    };

    fetchData();
  }, [resourceId]);

  /**
   * Api update call
   * @param data
   */

  return (
    <Modal
      className="h-screen"
      open={open}
      setOpen={setOpen}
      setOpenModal={setOpenModal}
    >
      {data ? (
        <EditModalForm
          preloadedValues={data}
          setOpen={setOpen}
          open={open}
          setOpenModal={setOpenModal}
        />
      ) : (
        <div>Loading...</div>
      )}
    </Modal>
  );
};
