import {
  faTimes,
  faUserPlus,
  faSignIn,
  faIdBadge,
  faSave,
  faWarning,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Menu, Transition } from "@headlessui/react";
import { Dispatch, FC, Fragment, useEffect, useState } from "react";
import { Modal } from "../../package/components/modal";
import { countries } from "./countries";
import { ClientAddresses } from "./create-addresses";
import { ClientAddressType } from "./client-type-definitions";
import { validation } from "../../validation/clients/create";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ClientAddressesEdit } from "./edit-addresses";
import { preload } from "swr";

type Props = {
  preloadedValues: any;
  open: boolean;
  setOpen: any;
  setOpenModal: any;
};

export const EditModalForm: FC<Props> = ({
  preloadedValues,
  setOpen,
  setOpenModal,
  open,
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
    defaultValues: preloadedValues,
  });

  const languages = [
    {
      id: 1,
      name: "Italiano",
    },
    {
      id: 2,
      name: "Tedesco",
    },
    {
      id: 3,
      name: "Francese",
    },
    {
      id: 4,
      name: "Inglese",
    },
  ];

  const watchClientType = watch("clientType", preloadedValues.clientType); // you can supply default value as second argument

  useEffect(() => {
    let defaultValues = {};
    //@ts-ignore
    defaultValues.clientType = preloadedValues.clientType;
    reset({ ...defaultValues });
  }, []);

  /**
   * Api update call
   * @param data
   */

  const onSubmit = (data: any) => {
    setError(null);
    setLoading(true);
    fetch(`/api/clients/${preloadedValues.id}`, {
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
        }
      });
  };

  return (
    <>
      <div className="p-4 flex">
        <div className="w-3/4">
          <h1 className="text-xl font-bold">
            <FontAwesomeIcon icon={faUserPlus} className="mr-2" />
            Modifica cliente #{preloadedValues.id} -{" "}
            {preloadedValues.individualFirstName}
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
          <div className=" px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="p-4 rounded-lg shadow-lg flex-row mb-3 bg-white">
              <h1 className="text-lg font-bold flex-row text-slate-500">
                <FontAwesomeIcon icon={faSignIn} className="mr-2 " />
                Informazioni principali
              </h1>
              <div className="flex flex-row gap-8 ">
                <p>Tipologia</p>
                <div className="radio flex flex-row gap-2">
                  <input
                    className="form-input flex w-1 rounded-full"
                    type="radio"
                    value="INDIVIDUAL"
                    disabled={loading || isSubmitting}
                    {...register("clientType")}
                  />
                  <p className="flex">Privato</p>
                </div>
                <div className="radio flex flex-row gap-2">
                  <input
                    className="form-input flex w-1 rounded-full"
                    type="radio"
                    value="BUSINESS"
                    disabled={loading || isSubmitting}
                    {...register("clientType")}
                  />
                  <p>Azienda</p>
                </div>
              </div>

              <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-4 pt-4">
                {watchClientType === "INDIVIDUAL" && (
                  <div>
                    <select
                      className="form-input block py-2.5 px-2 w-full text-md text-gray-500 bg-transparent  border-b-2 border-gray-200 appearance-none dark:text-gray-400 dark:border-gray-700 focus:outline-hidden focus:ring-0 focus:border-gray-200 peer"
                      {...register("individualTitle")}
                    >
                      <option value="Sig.">Sig.</option>
                      <option value="Sig.ra">Sig.ra</option>
                    </select>
                    {errors.individualTitle && <span>Campo necessario</span>}
                  </div>
                )}
                {watchClientType === "BUSINESS" && (
                  <div>
                    <input
                      type="text"
                      className="form-input"
                      
                      disabled={loading || isSubmitting}
                      {...register("businessName", { required: false })}
                    />
                    {errors.businessName && <span>Campo necessario</span>}
                  </div>
                )}
                <div>
                  <input
                    type="text"
                    className="form-input block py-2.5 px-2 w-full text-md text-gray-500 bg-transparent  border-b-2 border-gray-200 appearance-none dark:text-gray-400 dark:border-gray-700 focus:outline-hidden focus:ring-0 focus:border-gray-200 peer"
                    
                    disabled={loading || isSubmitting}
                    {...register("individualFirstName", {
                      required: false,
                    })}
                  />
                  {errors.individualFirstName && <span>Campo necessario</span>}
                </div>
                <div>
                  <input
                    type="text"
                    className="form-input block py-2.5 px-2 w-full text-md text-gray-500 bg-transparent  border-b-2 border-gray-200 appearance-none dark:text-gray-400 dark:border-gray-700 focus:outline-hidden focus:ring-0 focus:border-gray-200 peer"
                    
                    disabled={loading || isSubmitting}
                    {...register("individualLastName", { required: false })}
                  />
                  {errors.individualLastName && <span>Campo necessario</span>}
                </div>
                <div>
                  <input
                    type="number"
                    className="form-input block py-2.5 px-2 w-full text-md text-gray-500 bg-transparent  border-b-2 border-gray-200 appearance-none dark:text-gray-400 dark:border-gray-700 focus:outline-hidden focus:ring-0 focus:border-gray-200 peer"
                    
                    disabled={loading || isSubmitting}
                    {...register("mobilePhone", { required: false })}
                  />
                  {errors.mobilePhone && <span>Campo necessario</span>}
                </div>
                <div>
                  <input
                    type="number"
                    className="form-input block py-2.5 px-2 w-full text-md text-gray-500 bg-transparent  border-b-2 border-gray-200 appearance-none dark:text-gray-400 dark:border-gray-700 focus:outline-hidden focus:ring-0 focus:border-gray-200 peer"
                    
                    disabled={loading || isSubmitting}
                    {...register("landlinePhone", { required: false })}
                  />
                  {errors.landlinePhone && <span>Campo richiesto</span>}
                </div>
                <div>
                  <select
                    {...register("countryCode", { required: true })}
                    className="form-input block py-2.5 px-2 w-full text-md text-gray-500 bg-transparent  border-b-2 border-gray-200 appearance-none dark:text-gray-400 dark:border-gray-700 focus:outline-hidden focus:ring-0 focus:border-gray-200 peer"
                  >
                    {countries.map((country) => {
                      return (
                        <option
                          key={country.code}
                          value={country.code}
                          className={`bg-[url(https://flagcdn.com/w20/${country.code.toLowerCase()}.png)] bg-auto bg-yellow-200`}
                        >
                          {country.label}
                        </option>
                      );
                    })}
                  </select>
                  {errors.countryCode && <span>Campo necessario</span>}
                </div>

                <div>
                  <input
                    type="number"
                    className="form-input block py-2.5 px-2 w-full text-md text-gray-500 bg-transparent  border-b-2 border-gray-200 appearance-none dark:text-gray-400 dark:border-gray-700 focus:outline-hidden focus:ring-0 focus:border-gray-200 peer"
                    
                    disabled={loading || isSubmitting}
                    {...register("zipCode", { required: true })}
                  />
                  {errors.zipCode && <span>Campo necessario</span>}
                </div>
                <div>
                  <input
                    type="text"
                    className="form-input block py-2.5 px-2 w-full text-md text-gray-500 bg-transparent  border-b-2 border-gray-200 appearance-none dark:text-gray-400 dark:border-gray-700 focus:outline-hidden focus:ring-0 focus:border-gray-200 peer"
                    
                    disabled={loading || isSubmitting}
                    {...register("city", { required: true })}
                  />
                  {errors.city && <span>Campo necessario</span>}
                </div>
                <div>
                  <input
                    type="text"
                    className="form-input block py-2.5 px-2 w-full text-md text-gray-500 bg-transparent  border-b-2 border-gray-200 appearance-none dark:text-gray-400 dark:border-gray-700 focus:outline-hidden focus:ring-0 focus:border-gray-200 peer"
                    
                    disabled={loading || isSubmitting}
                    {...register("address", { required: true })}
                  />
                  {errors.address && <span>Campo necessario</span>}
                </div>
                <div>
                  <input
                    type="text"
                    className="form-input block py-2.5 px-2 w-full text-md text-gray-500 bg-transparent  border-b-2 border-gray-200 appearance-none dark:text-gray-400 dark:border-gray-700 focus:outline-hidden focus:ring-0 focus:border-gray-200 peer"
                    
                    disabled={loading || isSubmitting}
                    {...register("addressExtra", { required: false })}
                  />
                  {errors.addressExtra && <span>Campo necessario</span>}
                </div>
                <div>
                  <input
                    type="email"
                    className="form-input block py-2.5 px-2 w-full text-md text-gray-500 bg-transparent  border-b-2 border-gray-200 appearance-none dark:text-gray-400 dark:border-gray-700 focus:outline-hidden focus:ring-0 focus:border-gray-200 peer"
                    
                    disabled={loading || isSubmitting}
                    {...register("email", { required: false })}
                  />
                  {errors.email && <span>Campo necessario</span>}
                </div>

                <div>
                  <select
                    {...register("clientLanguage", { required: true })}
                    className="form-input block py-2.5 px-2 w-full text-md text-gray-500 bg-transparent  border-b-2 border-gray-200 appearance-none dark:text-gray-400 dark:border-gray-700 focus:outline-hidden focus:ring-0 focus:border-gray-200 peer"
                  >
                    {languages.map((language) => {
                      return (
                        <option key={language.id} value={language.name}>
                          {language.name}
                        </option>
                      );
                    })}
                  </select>
                  {errors.clientLanguage && <span>Campo necessario</span>}
                </div>
              </div>
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

        <div className="p-4 rounded-lg shadow-xl flex-row bg-white mb-3">
          <h1 className="text-lg font-bold flex-row text-slate-500">
            <FontAwesomeIcon icon={faIdBadge} className="mr-2 " />
            Indirizzi
          </h1>
          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4">
            <div>
              <ClientAddressesEdit
                type={ClientAddressType.CONSTRUCTION_SITE}
                preloadedValues={preloadedValues.addresses[0]}
                loading={loading}
              />
            </div>
            <div>
              <ClientAddressesEdit
                showSameAsMainOption
                type={ClientAddressType.OTHER}
                preloadedValues={preloadedValues.addresses[1]}
                loading={loading}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
