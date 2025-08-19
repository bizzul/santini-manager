import {
  faEye,
  faEyeSlash,
  faIdBadge,
  faMedal,
  faQuestion,
  faRefresh,
  faSave,
  faSign,
  faSignIn,
  faTimes,
  faUserPlus,
  faUsers,
  faWarning,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Dispatch, FC, SetStateAction, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "../../package/components/modal";
import PasswordStrengthBar from "react-password-strength-bar";
import { zodResolver } from "@hookform/resolvers/zod";
import { validation } from "../../validation/users/create";
import { Roles } from "@/types/supabase";
import { Dropdown } from "flowbite-react";

const generator = require("generate-password");

type Props = {
  open: boolean;
  setOpen: Dispatch<React.SetStateAction<boolean>>;
  roles: any;
  setOpenModal: any;
  employeeRoles: any;
  setShowUserCreated: any;
};

export const CreateModal: FC<Props> = ({
  open,
  setOpen,
  roles,
  setOpenModal,
  employeeRoles,
  setShowUserCreated,
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

  const [passwordVisible, setPasswordVisible] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const watchPassword = watch("password", "");
  const [selectedRoles, setSelectedRoles] = useState<any>([]);

  /**
   * Generates a new password and sets the value in the input field
   */
  const generatePassword = () => {
    setValue(
      "password",
      generator.generate({
        length: 12,
        numbers: true,
        uppercase: true,
      })
    );
  };

  /**
   * Api save call
   * @param data
   */

  const onSubmit = (data: any) => {
    setError(null);
    setLoading(true);
    // console.log(data);
    fetch("/api/users/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((response) => response.json())
      .then((data) => {
        setLoading(false);
        if (data.error) {
          setError(data.error);
        } else if (data.issues) {
          setError(`Invalid data found`);
          // console.log(data.issues);
        } else {
          setShowUserCreated(true);
          setOpen(false);
          setOpenModal(false);
        }
      });
  };

  //Initial render
  useEffect(() => {
    generatePassword();
  }, []);

  // console.log(watch("incarichi"));
  // console.log(errors);

  return (
    <Modal open={open} setOpen={setOpen} setOpenModal={setOpenModal}>
      <div className="p-4 flex">
        <div className="w-3/4">
          <h1 className="text-xl font-bold">
            <FontAwesomeIcon icon={faUserPlus} className="mr-2" />
            Creazione di un nuovo utente
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
          <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
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
                <div>
                  <label className="form-label" htmlFor="email">
                    Password
                  </label>
                  <div className="w-full -mt-4">
                    <FontAwesomeIcon
                      icon={passwordVisible ? faEye : faEyeSlash}
                      className="relative float-right right-3 top-7 text-gray-500 cursor-pointer"
                      onClick={() => setPasswordVisible(!passwordVisible)}
                    ></FontAwesomeIcon>
                    <FontAwesomeIcon
                      icon={faRefresh}
                      className="relative float-right right-5 top-7 text-gray-500  cursor-pointer"
                      onClick={() => generatePassword()}
                    ></FontAwesomeIcon>
                    <input
                      type={passwordVisible ? "text" : "password"}
                      className="form-input"
                      disabled={loading || isSubmitting}
                      {...register("password", { required: true })}
                    />
                    {/*@ts-ignore*/}
                    {errors.password && <span>{errors.password.message}</span>}

                    <PasswordStrengthBar
                      password={watchPassword}
                      scoreWords={[
                        "Debole",
                        "Debole",
                        "Accettabile",
                        "Buona",
                        "Forte",
                      ]}
                    />
                  </div>
                </div>
              </div>
            </div>

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
                    label="Seleziona i ruoli"
                  >
                    {employeeRoles?.map((role: Roles) => (
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
                              {...register("incarichi")}
                            />
                            <span className="ml-2">{role.name}</span>
                          </label>
                        </div>
                      </Dropdown.Item>
                    ))}
                  </Dropdown>
                </div>
                {errors.incarico && <span>Campo necessario</span>}
              </div>
            </div>

            <div className="p-4 rounded-lg shadow-xl flex-row bg-white">
              <div className="w-full  p-4 rounded-sm text-center font-bold mt-2">
                <h1>Accesso gestionale</h1>
                <select
                  className="form-input"
                  id="roles"
                  defaultValue="MODERATORE"
                  disabled={loading || isSubmitting}
                  {...register("role")}
                >
                  {roles?.map((role: any) => (
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
    </Modal>
  );
};
