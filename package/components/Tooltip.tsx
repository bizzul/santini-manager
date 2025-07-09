import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";

function Tooltip({ text }: any) {
  return (
    <span
      className="k before:content-[title] before:absolute before:left-full before:top-[50%] before:translate-x-0 before:translate-y-[-50%] before:padding-1 before:bg-slate-500 before:opacity-0 before:transition-all ease-in-out duration-200 before:hover:opacity-100  text-gray-500"
      title={text}
    >
      <FontAwesomeIcon
        icon={faInfoCircle}
        className="inline-block align-middle mr-1 text-xl"
      />
    </span>
  );
}

export default Tooltip;
