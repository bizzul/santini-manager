import Image from "next/image";
import Link from "next/link";
import { Dispatch, FC, Fragment, useEffect, useState } from "react";
type Props = {
  address: any;
};

export const AddressCard: FC<Props> = ({ address }) => {
  // console.log(address);

  return (
    <div className="w-1/2 flex flex-col flex-no-wrap">
      <div className="flex-1">
        {address && (
          <div className="flex flex-row align-middle items-center">
            <h1 className="text-xl uppercase font-semibold tracking-wide mb-2 px-4 py-2">
              INDIRIZZO{" "}
              {address.type === "CONSTRUCTION_SITE" ? "CANTIERE" : "ALTRO"}
            </h1>
            <Link
              href={`https://www.google.com/maps/@${address.latitude},${address.longitude},19.71z`}
              target={"_blank"}
              passHref
            >
              <button className="mx-4 my-2 px-4 py-2 rounded-lg text-white bg-blue-500 hover:bg-slate-600 shadow-md">
                GMAPS
              </button>
            </Link>
          </div>
        )}
      </div>
      {address != undefined && (
        <div>
          <div className="w-full flex flex-col px-4 pt-2 gap-2 flex-nowrap ">
            <div className="grid grid-cols-2">
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                Tipo
              </div>
              {address.typeDetail}
            </div>

            <div className="grid grid-cols-2">
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                Nome
              </div>
              {address.name}
            </div>
            <div className="grid grid-cols-2">
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                Cognome
              </div>

              {address.lastName}
            </div>
            <div className="grid grid-cols-2">
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                ADDRESS
              </div>
              {address.address}
            </div>
            <div className="grid grid-cols-2">
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                CAP
              </div>
              {address.zipCode}
            </div>
            <div className="grid grid-cols-2">
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                Citta
              </div>
              {address.city}
            </div>

            <div className="grid grid-cols-2">
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                Paese
              </div>
              <div>
                {address.countryCode}
                <span className="px-2">
                  <Image
                    src={`https://flagcdn.com/w20/${address.countryCode.toLowerCase()}.png`}
                    alt={address.countryCode}
                    width={20}
                    height={20}
                    className="pl-24"
                  />
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2">
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                Mobile
              </div>
              {address.mobile}
            </div>
            <div className="grid grid-cols-2">
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                Fisso
              </div>
              {address.phone}
            </div>
            <div className="grid grid-cols-2">
              <div className="uppercase pb-1 font-semibold text-gray-500 text-lg">
                email
              </div>

              {address.email}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
