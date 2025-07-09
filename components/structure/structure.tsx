"use client";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FC, useState } from "react";
import { Drawer } from "./drawer/drawer";
import { Navbar } from "./navbar/navbar";

type Props = {
  user?: any;
  titleIcon?: IconProp;
  titleText?: string;
  bgColor?: string;
  children?: React.ReactNode;
};

export const Structure: FC<Props> = ({
  children,
  titleIcon,
  titleText,
  user,
  bgColor,
}) => {
  const [slim, setSlim] = useState<boolean>(false);
  return (
    <div className="w-auto h-auto  bg-slate-500 flex ">
      <Drawer slim={slim} setSlim={setSlim} />
      <div className={`w-full h-auto ${bgColor ? bgColor : "bg-white"} `}>
        <Navbar
          titleIcon={titleIcon}
          titleText={titleText}
          slim={slim}
          user={user}
        />
        <div className={`h-auto pt-12 ${slim ? `pl-10` : `pl-56`}`}>
          {children}
        </div>
      </div>
    </div>
  );
};
