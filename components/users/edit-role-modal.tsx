import {
  faIdBadge,
  faSave,
  faSignIn,
  faTimes,
  faUserPlus,
  faWarning,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Dispatch, FC, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "../../package/components/modal";
import { zodResolver } from "@hookform/resolvers/zod";
import { validation } from "../../validation/users/editRole";

// Define types based on Supabase schema
interface Roles {
  id: number;
  name: string;
}

interface Role {
  id: number;
  name: string;
}

type Props = {
  open: boolean;
  setOpen: Dispatch<React.SetStateAction<boolean>>;
  setOpenModal: any;
  focusedUser: any;
  setShowRoleDone: any;
  mutateUser: any;
  roles: any;
};

export const EditRoleModal: FC<Props> = ({
  open,
  setOpen,
  setOpenModal,
  focusedUser,
  setShowRoleDone,
  mutateUser,
  roles,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(validation),
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<Array<any> | null>(null);
  /**
   * Api save call
   * @param data
   */
  // console.log(focusedUser);
  // console.log(errors);
  const onSubmit = (data: any) => {
    setError(null);
    setLoading(true);
    fetch(`/api/users/roles/${focusedUser.user_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((response) => response.json())
      .then((data) => {
        setLoading(false);
        if (data.error) {
          setError(data.message);
          // console.log("errore", data);
        } else if (data.issues) {
          setError(`Invalid data found`);
          // console.log(data.issues);
        } else {
          setOpen(false);
          setOpenModal(false);
          setShowRoleDone(true);
          mutateUser();
        }
      });
  };

  async function fetchRoles(userId: string) {
    const roles = await fetch(`api/users/roles/${userId}`, {
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.message);
          return null; // return null when there's an error
        } else if (data.issues) {
          setError("Invalid Data Found");
          return null; // return null when there's an error
        } else {
          console.log("data", data);
          setUserRoles(data.roles);
          return data; // return roles when there's no error
        }
      });
    return roles;
  }
  //Initial render
  useEffect(() => {
    if (focusedUser?.user_id) {
      fetchRoles(focusedUser.user_id).then((roles) => {
        console.log(roles);
        //@ts-ignore
        if (roles.length && focusedUser !== null) {
          //@ts-ignore
          setValue("roleId", userRoles?.roles[0]);
        }
      });
    }
  }, [focusedUser, setValue, roles]);

  return (
    <Modal open={open} setOpen={setOpen} setOpenModal={setOpenModal}>
      {focusedUser !== null && (
        <>
          <div className="p-4 flex">
            <div className="w-3/4">
              <h1 className="text-xl font-bold">
                <FontAwesomeIcon icon={faUserPlus} className="mr-2" />
                Modifica ruolo applicatione utente # {
                  focusedUser.given_name
                }{" "}
                {focusedUser.family_name}
              </h1>
            </div>
            <div className="w-1/4 text-right">
              <FontAwesomeIcon
                icon={faTimes}
                className="text-2xl text-slate-400 cursor-pointer"
                onClick={() => setOpen(false)}
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

              <div className="p-4 rounded-lg shadow-lg flex-row mb-3 bg-white">
                <h1 className="text-lg font-bold flex-row text-slate-500">
                  <FontAwesomeIcon icon={faSignIn} className="mr-2 " />
                  Ruolo
                </h1>
                <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4">
                  <div>
                    <label className="form-label" htmlFor="email">
                      Ruolo applicazione
                    </label>
                    <select
                      className="form-input"
                      id="roles"
                      defaultValue="MODERATORE"
                      disabled={loading || isSubmitting}
                      {...register("roleId")}
                    >
                      {roles?.map((role: Role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                {!loading && (
                  <button
                    type="submit"
                    className=" justify-center rounded-md border border-transparent shadow-xs px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-green-500 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-green-600 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    <FontAwesomeIcon icon={faSave} className="mr-2" /> Salva
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
      )}
    </Modal>
  );
};
