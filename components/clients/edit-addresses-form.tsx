import { FC, Fragment, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { ClientAddressType } from "./client-type-definitions";
//@ts-ignore
import GoogleAutocompleteEdit from "./google-autocomplete-edit.js";
import { countries } from "./countries";
import { jobsType } from "./jobs";
import { preload } from "swr";
import { zodResolver } from "@hookform/resolvers/zod";
import { validation } from "../../validation/clients/create";
import { faSave } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
type Props = {
  type: ClientAddressType;
  showSameAsMainOption?: Boolean;
  preloadedValues: any;
};
/**
 * Client Editor Form
 * All the hooks related to CRUD operations are inside this component.
 * @returns
 */
export const ClientAddressesEditForm: FC<Props> = ({
  type,
  preloadedValues,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  // const sameAsMainOptionWatch = watch(`sameAsMain`);
  const onSubmit = (data: any) => {
    setError(null);
    setLoading(true);
    // console.log(data);
    fetch(`/api/clientsAddress/${data.id}`, {
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
        }
      });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="container shadow-xl pb-4">
        <div className="mx-2 my-2">
          <div className="flex flex-row justify-between">
            <h1 className="text-2xl pb-4">{`${
              type === "CONSTRUCTION_SITE" ? "Cantiere" : "Altro"
            }`}</h1>
          </div>

          <div className="w-full grid grid-cols-1  gap-4 pt-4">
            <div>
              <GoogleAutocompleteEdit setValue={setValue} />
            </div>
            <div>
              <input
                {...register(`typeDetail`, { required: false })}
                className="form-input block py-2.5 px-2 w-full text-md text-gray-500 bg-transparent  border-b-2 border-gray-200 appearance-none dark:text-gray-400 dark:border-gray-700 focus:outline-hidden focus:ring-0 focus:border-gray-200 peer"
                type="text"
                list="jobs"
                
              />
              {errors.typeDetail && <span>Campo necessario</span>}

              <datalist id="jobs">
                {jobsType.map((job) => (
                  <option key={job.value} value={job.value}>
                    {job.renderValue}
                  </option>
                ))}
              </datalist>
            </div>

            <div>
              <input
                className="form-input block py-2.5 px-2 w-full text-md text-gray-500 bg-transparent  border-b-2 border-gray-200 appearance-none dark:text-gray-400 dark:border-gray-700 focus:outline-hidden focus:ring-0 focus:border-gray-200 peer"
                type="text"
                
                disabled={loading || isSubmitting}
                {...register(`name`, { required: false })}
              />
              {errors.name && <span>Campo necessario</span>}
            </div>
            <div>
              <input
                className="form-input block py-2.5 px-2 w-full text-md text-gray-500 bg-transparent  border-b-2 border-gray-200 appearance-none dark:text-gray-400 dark:border-gray-700 focus:outline-hidden focus:ring-0 focus:border-gray-200 peer"
                type="text"
                
                disabled={loading || isSubmitting}
                {...register(`lastName`, { required: false })}
              />
              {errors.lastName && <span>Campo necessario</span>}
            </div>

            <div>
              <input
                className="form-input block py-2.5 px-2 w-full text-md text-gray-500 bg-transparent  border-b-2 border-gray-200 appearance-none dark:text-gray-400 dark:border-gray-700 focus:outline-hidden focus:ring-0 focus:border-gray-200 peer"
                type="text"
                
                disabled={loading || isSubmitting}
                {...register(`zipCode`, { required: false })}
              />
              {errors.zipCode && <span>Campo necessario</span>}
            </div>

            <div>
              <input
                className=" form-input  py-2.5 px-2 w-full text-md text-gray-500 bg-transparent  border-b-2 border-gray-200 appearance-none dark:text-gray-400 dark:border-gray-700 focus:outline-hidden focus:ring-0 focus:border-gray-200 peer"
                type="text"
                
                disabled={loading || isSubmitting}
                {...register(`latitude`, { required: false })}
              />
              {errors.latitude && <span>Campo necessario</span>}
            </div>

            <div>
              <input
                className=" form-input  py-2.5 px-2 w-full text-md text-gray-500 bg-transparent  border-b-2 border-gray-200 appearance-none dark:text-gray-400 dark:border-gray-700 focus:outline-hidden focus:ring-0 focus:border-gray-200 peer"
                type="text"
                
                disabled={loading || isSubmitting}
                {...register(`longitude`, { required: false })}
              />
              {errors.longitude && <span>Campo necessario</span>}
            </div>

            <div>
              <input
                className="form-input block py-2.5 px-2 w-full text-md text-gray-500 bg-transparent  border-b-2 border-gray-200 appearance-none dark:text-gray-400 dark:border-gray-700 focus:outline-hidden focus:ring-0 focus:border-gray-200 peer"
                type="text"
                
                disabled={loading || isSubmitting}
                {...register(`city`, { required: false })}
              />
              {errors.city && <span>Campo necessario</span>}
            </div>

            <div>
              <input
                className="form-input block py-2.5 px-2 w-full text-md text-gray-500 bg-transparent  border-b-2 border-gray-200 appearance-none dark:text-gray-400 dark:border-gray-700 focus:outline-hidden focus:ring-0 focus:border-gray-200 peer"
                type="text"
                
                disabled={loading || isSubmitting}
                {...register(`address`, { required: false })}
              />
              {errors.address && <span>Campo necessario</span>}
            </div>

            <div>
              <input
                className="form-input block py-2.5 px-2 w-full text-md text-gray-500 bg-transparent  border-b-2 border-gray-200 appearance-none dark:text-gray-400 dark:border-gray-700 focus:outline-hidden focus:ring-0 focus:border-gray-200 peer"
                type="text"
                
                disabled={loading || isSubmitting}
                {...register(`addressExtra`, { required: false })}
              />
              {errors.addressExtra && <span>Campo necessario</span>}
            </div>

            <div>
              <input
                className="form-input block py-2.5 px-2 w-full text-md text-gray-500 bg-transparent  border-b-2 border-gray-200 appearance-none dark:text-gray-400 dark:border-gray-700 focus:outline-hidden focus:ring-0 focus:border-gray-200 peer"
                type="number"
                
                disabled={loading || isSubmitting}
                {...register(`phone`, { required: false })}
              />
              {errors.phone && <span>Campo necessario</span>}
            </div>

            <div>
              <input
                className="form-input block py-2.5 px-2 w-full text-md text-gray-500 bg-transparent  border-b-2 border-gray-200 appearance-none dark:text-gray-400 dark:border-gray-700 focus:outline-hidden focus:ring-0 focus:border-gray-200 peer"
                type="number"
                
                disabled={loading || isSubmitting}
                {...register(`mobile`, { required: false })}
              />
              {errors.mobile && <span>Campo necessario</span>}
            </div>

            <div>
              <input
                className="form-input block py-2.5 px-2 w-full text-md text-gray-500 bg-transparent  border-b-2 border-gray-200 appearance-none dark:text-gray-400 dark:border-gray-700 focus:outline-hidden focus:ring-0 focus:border-gray-200 peer"
                type="text"
                
                disabled={loading || isSubmitting}
                {...register(`email`, { required: false })}
              />
              {errors.email && <span>Campo necessario</span>}
            </div>

            <div>
              <select
                {...register(`countryCode`, { required: true })}
                className="form-input block py-2.5 px-2 w-full text-md text-gray-500 bg-transparent  border-b-2 border-gray-200 appearance-none dark:text-gray-400 dark:border-gray-700 focus:outline-hidden focus:ring-0 focus:border-gray-200 peer"
                defaultValue={""}
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
  );
};
