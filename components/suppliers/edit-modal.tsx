import {
  faBox,
  faEye,
  faEyeSlash,
  faIdBadge,
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
import { zodResolver } from "@hookform/resolvers/zod";
import { validation } from "../../validation/supplier/edit";
import ImageUploader from "../uploaders/ImageUploader";
import Image from "next/image";
import { Product_category } from "@prisma/client";
type Props = {
  open: boolean;
  setOpen: any;
  setOpenModal: any;
  resourceId: number | undefined;
  categories: Product_category[];
};

export const EditModal: FC<Props> = ({
  open,
  setOpen,
  setOpenModal,
  resourceId,
  categories,
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

  const [resource, setResource] = useState<any>(null);

  const get = async (id: number) => {
    await fetch(`/api/suppliers/${id}`)
      .then((r) => r.json())
      .then((d: any) => {
        setResource(d);
        setPreview(d.supplier_image);
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

  useEffect(() => {
    if (resource) {
      setValue("name", resource.name);
      setValue("address", resource.address);
      setValue("cap", resource.cap);
      setValue("location", resource.location);
      setValue("website", resource.website);
      setValue("email", resource.email);
      setValue("phone", resource.phone);
      setValue("contact", resource.contact);
      setValue("category", resource.category);
    }
  }, [resource]);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<any | null>(null);
  const [preview, setPreview] = useState<any | null>(null);
  /**
   * Api save call
   * @param data
   */
  const onSubmit = (data: any) => {
    setError(null);
    setLoading(true);
    // console.log(data);
    fetch(`/api/suppliers/${resource.id}`, {
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
          if (file !== null) {
            uploadPictureHandler(data);
          } else {
            setOpen(false);
            setOpenModal(null);
          }
        }
      });
  };

  const handleFileChange = (file: any) => {
    setFile(file);
  };

  const uploadPictureHandler = async (data: any) => {
    const pictureData = new FormData();
    pictureData.append("image", file);
    pictureData.append("id", resource.id);
    try {
      const response = await fetch("/api/local-upload/supplier", {
        method: "POST",
        body: pictureData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw data;
      }
      setFile(null);
      setOpen(false);
      setOpenModal(null);
    } catch (error: any) {
      // console.log(error.message);
    }
  };

  if (resource === null || resource === undefined) {
    return <div></div>;
  }
  // console.log(errors);
  return (
    <Modal open={open} setOpen={setOpen} setOpenModal={setOpenModal}>
      <div className="p-4 flex">
        <div className="w-3/4">
          <h1 className="text-xl font-bold">
            <FontAwesomeIcon icon={faBox} className="mr-2" />
            Modifica Prodotto - #{resource.id} - {resource.name}
          </h1>
        </div>
        <div className="w-1/4 text-right">
          <FontAwesomeIcon
            icon={faTimes}
            className="text-2xl text-slate-400 cursor-pointer"
            onClick={() => {
              setOpen(false);
              setOpenModal(null);
            }}
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
                Dati fornitore
              </h1>
              <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4">
                <div>
                  <label className="form-label" htmlFor="name">
                    Categoria
                  </label>

                  <select
                    className="form-input"
                    disabled={loading || isSubmitting}
                    {...register("category", { required: true })}
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {errors.category && <span>This field is required</span>}
                </div>

                <div>
                  <label className="form-label" htmlFor="name">
                    Nome
                  </label>
                  <div></div>
                  <input
                    type="text"
                    className="form-input"
                    
                    disabled={loading || isSubmitting}
                    {...register("name", { required: true })}
                  />
                  {errors.name && <span>This field is required</span>}
                </div>
                <div>
                  <label className="form-label" htmlFor="name">
                    Indirizzo
                  </label>
                  <div></div>
                  <input
                    type="text"
                    className="form-input"
                    
                    disabled={loading || isSubmitting}
                    {...register("address", { required: true })}
                  />
                  {errors.address && <span>This field is required</span>}
                </div>
                <div>
                  <label className="form-label" htmlFor="name">
                    CAP
                  </label>
                  <div></div>
                  <input
                    type="text"
                    className="form-input"
                    
                    disabled={loading || isSubmitting}
                    {...register("cap", { required: true })}
                  />
                  {errors.cap && <span>This field is required</span>}
                </div>
                <div>
                  <label className="form-label" htmlFor="name">
                    Località
                  </label>
                  <div></div>
                  <input
                    type="text"
                    className="form-input"
                    
                    disabled={loading || isSubmitting}
                    {...register("location", { required: true })}
                  />
                  {errors.name && <span>This field is required</span>}
                </div>
                <div>
                  <label className="form-label" htmlFor="name">
                    Website
                  </label>
                  <div></div>
                  <input
                    type="text"
                    className="form-input"
                    
                    disabled={loading || isSubmitting}
                    {...register("website", { required: true })}
                  />
                  {errors.website && <span>This field is required</span>}
                </div>
                <div>
                  <label className="form-label" htmlFor="name">
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
                  <label className="form-label" htmlFor="name">
                    phone
                  </label>
                  <div></div>
                  <input
                    type="number"
                    className="form-input"
                    
                    disabled={loading || isSubmitting}
                    {...register("phone", { required: true })}
                  />
                  {errors.phone && <span>This field is required</span>}
                </div>
                <div>
                  <label className="form-label" htmlFor="name">
                    P. di contatto
                  </label>
                  <div></div>
                  <input
                    type="text"
                    className="form-input"
                    
                    disabled={loading || isSubmitting}
                    {...register("contact", { required: true })}
                  />
                  {errors.contact && <span>This field is required</span>}
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
                    <Image src={preview} width={100} height={100} alt={file} />
                  )}
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
      </div>
    </Modal>
  );
};
