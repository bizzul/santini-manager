"use client";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { AppMetadata, User, UserMetadata } from "auth0";
import { FC, useState } from "react";
import { Drawer } from "./drawer/drawer";
import { Navbar } from "./navbar/navbar";
import { useSearchParams } from "next/navigation";

type Props = {
  user?: any;
  titleIcon?: IconProp;
  titleText?: string;
  children?: React.ReactNode;
};

export const StructureKanban: FC<Props> = ({
  children,
  titleIcon,
  titleText,
  user,
}) => {
  const [slim, setSlim] = useState<boolean>(true);

  const searchParams = useSearchParams();

  const menubar = searchParams.get("menubar");

  return (
    <div className="h-auto w-screen  flex z-50 ">
      <div>
        {menubar === "false" ? (
          <></>
        ) : (
          <Drawer slim={slim} setSlim={setSlim} user={user} />
        )}
      </div>
      <div
        className={`relative w-full transition-all duration-500 overflow-scroll ${
          slim ? "ml-24" : "ml-[17rem]"
        } ${menubar === "false" && "ml-0"}`}
      >
        <Navbar
          titleIcon={titleIcon}
          titleText={titleText}
          slim={slim}
          user={user}
        />
        <div className={`min-w-full min-h-screen pt-12 ml-[1.5rem] `}>
          {children}
        </div>
      </div>
    </div>
  );
};
