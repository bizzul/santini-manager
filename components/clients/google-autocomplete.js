"use client";
import React, { useState, useEffect } from "react";
import { usePlacesWidget } from "react-google-autocomplete";

export default function GoogleAutocomplete({ setValue, type }) {
  //const [country, setCountry] = useState("ch");
  const [arrayAddress, setArrayAddress] = useState([
    {
      long_name: "",
      short_name: "",
      types: [],
    },
  ]);
  const [geometry, setGeometry] = useState({
    latitude: 0,
    longitude: 0,
  });

  const { ref: materialRef } = usePlacesWidget({
    apiKey: "AIzaSyDbHNos-Sh2ju4AD7jH3xCOik7aaDh9SgY", //process.env.APP_GOOGLE_KEY,
    language: "it",
    onPlaceSelected: (place) => {
      const latitude = place.geometry.location.lat();
      const longitude = place.geometry.location.lng();
      setArrayAddress(place.address_components);
      if (latitude && longitude) {
        setGeometry({
          latitude: latitude,
          longitude: longitude,
        });
      }
    },
    libraries: ["places", "maps"],
    inputAutocompleteValue: "country",
    options: {
      fields: [
        "address_components",
        "geometry",
        "icon",
        "name",
        "formatted_address",
        "place_id",
      ],
      types: ["address"],
      //componentRestrictions: { country },
    },
  });

  useEffect(() => {
    function setAddress(addresses) {
      let streetNum;
      let street;

      addresses.map((address) => {
        switch (address.types[0]) {
          case "street_number":
            streetNum = address.long_name;
            //setValue('address', address.long_name);
            break;
          case "route":
            street = address.long_name;
            //setValue('address', address.long_name);
            break;
          case "postal_code":
            setValue(`${type}_zipCode`, address.long_name);
            break;
          case "locality":
            setValue(`${type}_city`, address.long_name);
            break;
          case "country":
            setValue(`${type}_countryCode`, address.short_name);
            break;
          default:
            break;
        }

        if (street) {
          setValue(`${type}_address`, `${street}`);
          if (streetNum) {
            setValue(`${type}_address`, `${street} ${streetNum}`);
          }
        }
      });
    }
    setAddress(arrayAddress);
  }, [arrayAddress]);

  useEffect(() => {
    function setCoordinate() {
      if (geometry.latitude && geometry.longitude !== 0) {
        setValue(`${type}_latitude`, geometry.latitude);
        setValue(`${type}_longitude`, geometry.longitude);
      }
    }
    setCoordinate();
  }, [geometry]);

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent form submission
    }
  };

  return (
    <>
      <div>
        <input
          onKeyDown={handleKeyDown}
          className="form-input block py-2.5 px-2 w-full text-md text-gray-500 bg-transparent  border-b-2 border-gray-200 appearance-none dark:text-gray-400 dark:border-gray-700 focus:outline-none focus:ring-0 focus:border-gray-200 peer"
          type="text"
          placeholder="Cercare luogo..."
          ref={materialRef}
        />
      </div>
    </>
  );
}
