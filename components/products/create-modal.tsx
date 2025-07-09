import {
  faBox,
  faSave,
  faSignIn,
  faTimes,
  faWarning,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Dispatch, FC, useState } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "../../package/components/modal";
import { zodResolver } from "@hookform/resolvers/zod";
import { validation } from "../../validation/products/create";
import { Product_category, Supplier } from "@prisma/client";
type Props = {
  open: boolean;
  setOpen: Dispatch<React.SetStateAction<boolean>>;
  category: Product_category[];
  supplier: Supplier[];
};

export const CreateModal: FC<Props> = ({
  open,
  setOpen,
  category,
  supplier,
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

  /**
   * Api save call
   * @param data
   */
  const onSubmit = (data: any) => {
    setError(null);
    setLoading(true);
    // console.log(data);
    fetch("/api/products/create", {
      method: "post",
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
        }
      });
  };

  // console.log(errors);

  return (
    <Modal open={open} setOpen={setOpen} setOpenModal={setOpen}>
      <div className="p-4 flex">
        <div className="w-3/4">
          <h1 className="text-xl font-bold">
            <FontAwesomeIcon icon={faBox} className="mr-2" />
            Nuovo prodotto
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
              <div className="w-full p-4 rounded bg-red-500 text-white flex-row items-middle">
                <FontAwesomeIcon icon={faWarning} className="mr-2" />
                {error}
              </div>
            </div>
          )}
          <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="p-4 rounded-lg shadow-lg flex-row mb-3 bg-white">
              <h1 className="text-lg font-bold flex-row text-slate-500">
                <FontAwesomeIcon icon={faSignIn} className="mr-2 " />
                Dati prodotto
              </h1>
              <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4">
                {category && (
                  <div>
                    <label className="form-label" htmlFor="email">
                      Categoria
                    </label>

                    <div>
                      <select
                        {...register("productCategoryId", { required: true })}
                        className="form-input block py-2.5 px-2 w-full text-md text-gray-500 bg-transparent  border-b-2 border-gray-200 appearance-none dark:text-gray-400 dark:border-gray-700 focus:outline-none focus:ring-0 focus:border-gray-200 peer"
                        disabled={loading || isSubmitting}
                      >
                        {category?.map((category: any) => {
                          return (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          );
                        })}
                      </select>
                      {errors.productCategoryId && (
                        <span>Campo necessario</span>
                      )}
                    </div>
                  </div>
                )}
                {supplier && (
                  <div>
                    <label className="form-label" htmlFor="types">
                      Fornitore
                    </label>
                    <div className="w-1/2 mt-2"> </div>
                    <select
                      {...register(`supplierId`, { required: true })}
                      className="form-input block py-2.5 px-2 w-full text-md text-gray-500 bg-transparent  border-b-2 border-gray-200 appearance-none dark:text-gray-400 dark:border-gray-700 focus:outline-none focus:ring-0 focus:border-gray-200 peer"
                      disabled={loading || isSubmitting}
                    >
                      {supplier?.map((supplier: Supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                    {errors.supplier && <span>Campo necessario</span>}
                  </div>
                )}
                <div>
                  <label className="form-label" htmlFor="name">
                    Nome
                  </label>
                  <div className="w-1/2 mt-2"> </div>
                  <input
                    disabled={loading || isSubmitting}
                    id="name"
                    type="text"
                    className="form-input"
                    
                    {...register("name", { required: true })}
                  />
                  {errors.name && <span>Campo necessario</span>}
                </div>
                <div>
                  <label className="form-label" htmlFor="sigla">
                    Tipo
                  </label>
                  <div className="w-1/2 mt-2"> </div>
                  <input
                    disabled={loading || isSubmitting}
                    id="code"
                    type="text"
                    className="form-input"
                    
                    {...register("type")}
                  />
                  {errors.type && <span>Campo necessario</span>}
                </div>
                <div>
                  <label className="form-label" htmlFor="sigla">
                    Numero Articolo
                  </label>
                  <div className="w-1/2 mt-2"> </div>
                  <input
                    disabled={loading || isSubmitting}
                    id="type"
                    type="text"
                    className="form-input"
                    
                    {...register("description")}
                  />
                  {errors.description && <span>Campo necessario</span>}
                </div>
                <div>
                  <label className="form-label" htmlFor="sigla">
                    Misure
                  </label>

                  <input
                    disabled={loading || isSubmitting}
                    id="length"
                    type="text"
                    className="form-input w-1/3"
                    
                    {...register("length")}
                  />
                  {errors.length && <span>Campo necessario</span>}
                  <input
                    disabled={loading || isSubmitting}
                    id="width"
                    type="text"
                    className="form-input w-1/3"
                    
                    {...register("width")}
                  />
                  {errors.width && <span>Campo necessario</span>}
                  <input
                    disabled={loading || isSubmitting}
                    id="height"
                    type="text"
                    className="form-input w-1/3"
                    
                    {...register("height")}
                  />
                  {errors.height && <span>Campo necessario</span>}
                </div>
                <div>
                  <label className="form-label" htmlFor="sigla">
                    Quantità
                  </label>
                  <div className="w-1/2 mt-2"> </div>
                  <input
                    disabled={loading || isSubmitting}
                    id="quantity"
                    type="text"
                    className="form-input"
                    
                    {...register("quantity")}
                  />
                  {errors.quantity && <span>Campo necessario</span>}
                </div>
                <div>
                  <label className="form-label" htmlFor="sigla">
                    Valore
                  </label>
                  <input
                    disabled={loading || isSubmitting}
                    id="price"
                    type="text"
                    className="form-input w-1/2"
                    
                    {...register("unit_price")}
                  />
                  {errors.unit_price && <span>Campo necessario</span>}
                  <input
                    disabled={loading || isSubmitting}
                    id="unit"
                    type="text"
                    className="form-input w-1/2"
                    
                    {...register("unit")}
                  />
                  {errors.unit && <span>Campo necessario</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            {!loading && (
              <button
                type="submit"
                className=" justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 sm:ml-3 sm:w-auto sm:text-sm"
              >
                <FontAwesomeIcon icon={faSave} className="mr-2" /> Salva
              </button>
            )}

            {loading && (
              <div className="rounded-md border shadow-sm flex gap-1 px-4 py-2 text-slate-500 text-base font-medium">
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
