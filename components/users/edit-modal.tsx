import {
  faIdBadge,
  faMedal,
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
import { validation } from "../../validation/users/editInfo";
import { Roles } from "@/types/supabase";
import { Dropdown } from "flowbite-react";
import ImageUploader from "../uploaders/ImageUploader";
import Image from "next/image";
type Props = {
  open: boolean;
  setOpen: Dispatch<React.SetStateAction<boolean>>;
  setOpenModal: any;
  focusedUser: any;
  employeeRoles: any;
  setShowEditDone: any;
  mutateUser: any;
};

export const EditInfoModal: FC<Props> = ({
  open,
  setOpen,
  setOpenModal,
  focusedUser,
  employeeRoles,
  setShowEditDone,
  mutateUser,
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
  const [preview, setPreview] = useState<any | null>(null);
  const [file, setFile] = useState<any | null>(null);

  /**
   * Api save call
   * @param data
   */

  const onSubmit = (data: any) => {
    setError(null);
    setLoading(true);
    console.log("user data update", data);
    fetch(`/api/users/${focusedUser.user_id}`, {
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
          if (file !== null) {
            uploadPictureHandler();
          } else {
            setOpen(false);
            setOpenModal(false);
            setShowEditDone(true);
            mutateUser();
          }
        }
      });
  };

  const handleFileChange = (file: any) => {
    setFile(file);
  };

  const uploadPictureHandler = async () => {
    const pictureData = new FormData();
    pictureData.append("image", file);
    pictureData.append("id", focusedUser.user_id);
    try {
      const response = await fetch("/api/local-upload/user", {
        method: "POST",
        body: pictureData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw data;
      }
      setOpen(false);
      setOpenModal(false);
      setShowEditDone(true);
      mutateUser();
    } catch (error: any) {
      setError(error.message);
      // console.log(error);
    }
  };

  //Initial render
  useEffect(() => {
    if (focusedUser !== null && employeeRoles) {
      setValue("email", focusedUser.email);
      setValue("given_name", focusedUser.given_name);
      setValue("family_name", focusedUser.family_name);
      setValue("color", focusedUser.user_metadata?.color);
      setValue("initials", focusedUser.user_metadata?.sigla);
      setPreview(focusedUser.picture);
      mutateUser();
    }
  }, [focusedUser, setValue, mutateUser, employeeRoles]);

  return (
    <Modal open={open} setOpen={setOpen} setOpenModal={setOpenModal}>
      {focusedUser !== null && (
        <>
          <div className="p-4 flex">
            <div className="w-3/4">
              <h1 className="text-xl font-bold">
                <FontAwesomeIcon icon={faUserPlus} className="mr-2" />
                Modifica utente # {focusedUser.given_name}{" "}
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
                  Dati di accesso
                </h1>
                <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4">
                  <div>
                    <label className="form-label" htmlFor="email">
                      Email
                    </label>
                    <div></div>
                    <input
                      type="email"
                      className="form-input"
                      
                      disabled={loading || isSubmitting}
                      {...register("email", { required: true })}
                    />
                    {errors.email && <span>This field is required</span>}
                  </div>
                </div>
              </div>

              <div>
                <div className="p-4 rounded-lg shadow-xl flex-row bg-white mb-3">
                  <h1 className="text-lg font-bold flex-row text-slate-500">
                    <FontAwesomeIcon icon={faIdBadge} className="mr-2 " />
                    Dati personali
                  </h1>
                  <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4">
                    <div>
                      <label className="form-label" htmlFor="email">
                        Nome
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        id="given_name"
                        
                        disabled={loading || isSubmitting}
                        {...register("given_name")}
                      />
                    </div>
                    <div>
                      <label className="form-label" htmlFor="email">
                        Cognome
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        id="family_name"
                        
                        disabled={loading || isSubmitting}
                        {...register("family_name")}
                      />
                    </div>
                    <div>
                      <label className="form-label" htmlFor="email">
                        Sigla
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        id="initials"
                        
                        disabled={loading || isSubmitting}
                        {...register("initials")}
                      />
                    </div>
                    <div>
                      <label className="form-label" htmlFor="email">
                        Colore
                      </label>
                      <input
                        type="color"
                        className="form-input h-10"
                        id="color"
                        disabled={loading || isSubmitting}
                        {...register("color")}
                      />
                    </div>
                    <div className="flex flex-row justify-between gap-10 align-middle items-center">
                      {" "}
                      <ImageUploader
                        onChange={handleFileChange}
                        setPreview={setPreview}
                        preview={preview}
                        file={file}
                      />
                      {preview && (
                        <Image
                          src={preview}
                          width={100}
                          height={100}
                          alt={"profile"}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="">
                <div className="p-4 rounded-lg shadow-lg flex-row mb-3 bg-white">
                  <h1 className="text-lg font-bold flex-row text-slate-500">
                    <FontAwesomeIcon icon={faMedal} className="mr-2 " />
                    Ruolo dipendente
                  </h1>
                  <div className="w-full flex gap-4 pt-4 justify-center">
                    <Dropdown
                      style={{ backgroundColor: "#565656", borderRadius: 0 }}
                      label="Modifica i ruoli"
                    >
                      {employeeRoles.map((role: Roles) => {
                        const isChecked = focusedUser?.incarichi[0]?.some(
                          (userRole: any) => userRole.id === role.id
                        );

                        return (
                          <Dropdown.Item key={role.id}>
                            <div className="flex items-center">
                              <label
                                key={role.id}
                                className="inline-flex items-center mr-4"
                              >
                                <input
                                  type="checkbox"
                                  value={role.id}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-700 dark:focus:ring-offset-gray-700 focus:ring-2 dark:bg-gray-600 dark:border-gray-500"
                                  {...register("incarico")}
                                  disabled={loading || isSubmitting}
                                  defaultChecked={isChecked}
                                />
                                <span className="ml-2">{role.name}</span>
                              </label>
                            </div>
                          </Dropdown.Item>
                        );
                      })}
                    </Dropdown>
                  </div>
                  {errors.incarico && <span>Campo necessario</span>}
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
