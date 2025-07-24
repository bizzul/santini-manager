import { faKey, faTimes, faWarning } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Dispatch, FC, SetStateAction, useEffect, useState } from "react";
import { Modal } from "../../package/components/modal";

type Props = {
  open: boolean;
  setOpen: Dispatch<React.SetStateAction<boolean>>;
  focusedUser: any;
  setOpenModal: any;
  setShowEmailSend: any;
};

export const SendChangePasswordModal: FC<Props> = ({
  open,
  setOpen,
  focusedUser,
  setOpenModal,
  setShowEmailSend,
}) => {
  const [error, setError] = useState<string | null>(null);
  /**
   * Api call
   * @param data
   */

  const handleRequest = () => {
    fetch("/api/users/passChange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(focusedUser.email),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          setError(data.message);
          // console.log("errore", data);
        } else if (data.issues) {
          setError(`Invalid data found`);
          // console.log(data.issues);
        } else {
          setShowEmailSend(true);
          setOpen(false);
          setOpenModal(false);
        }
      });
  };

  return (
    <Modal open={open} setOpen={setOpen} setOpenModal={setOpen}>
      <div className="p-4 flex">
        <div className="w-3/4">
          <h1 className="text-xl font-bold">
            <FontAwesomeIcon icon={faKey} className="mr-2" />
            Inviare notifica per cambio password?
          </h1>
        </div>
        {error && (
          <div className="px-6 pt-5">
            <div className="w-full p-4 rounded-sm bg-red-500 text-white flex-row items-middle">
              <FontAwesomeIcon icon={faWarning} className="mr-2" />
              {error}
            </div>
          </div>
        )}
        <div>
          <button onClick={handleRequest}>INVIA EMAIL</button>
        </div>

        <div className="w-1/4 text-right">
          <FontAwesomeIcon
            icon={faTimes}
            className="text-2xl text-slate-400 cursor-pointer"
            onClick={() => setOpen(false)}
          />
        </div>
      </div>
      <div className="p-4 pt-0"></div>
    </Modal>
  );
};
