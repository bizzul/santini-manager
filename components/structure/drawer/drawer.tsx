"use client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  FC,
  Fragment,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  faWaveSquare,
  faUsers,
  IconDefinition,
  faHelmetSafety,
  faUser,
  faBox,
  faTable,
  faAngleUp,
  faAngleDown,
  faWrench,
  faExclamation,
  faClock,
  faSquarePollVertical,
  faSignOut,
  faCheckSquare,
} from "@fortawesome/free-solid-svg-icons";
import Image from "next/image";
import Logo from "../../../public/logo_short.svg";
import { UserDrawerType } from "../navbar/navbar";
import { ChevronFirst, ChevronLast, MoreVertical } from "lucide-react";
import { Button } from "@tremor/react";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUserStore } from "../../../store/zustand";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";

type Props = {
  slim: boolean;
  setSlim: React.Dispatch<React.SetStateAction<boolean>>;
  user?: UserDrawerType | null;
};

type menuItem = {
  label: string;
  icon: IconDefinition;
  href: string;
  alert: boolean;
  items?: menuItem[];
};

const defaultItems: menuItem[] = [
  {
    label: "Dashboard",
    icon: faWaveSquare,
    alert: true,
    href: "/",
  },
];

const operatorItems: menuItem[] = [
  {
    label: "Kan. Produzione",
    icon: faWrench,
    href: "/kanban?name=PRODUCTION",
    alert: true,
  },
  {
    label: "Progetti",
    icon: faTable,
    href: "/projects",
    alert: false,
  },
  {
    label: "Calendario",
    icon: faClock,
    href: "/calendar",
    alert: false,
  },
  {
    label: "Clienti",
    icon: faUser,
    href: "/clients",
    alert: false,
  },
  {
    label: "Errori",
    icon: faExclamation,
    href: "/errortracking",
    alert: false,
  },
  {
    label: "Ore",
    icon: faClock,
    href: "/timetracking",
    alert: false,
  },
  {
    label: "Reports",
    icon: faSquarePollVertical,
    href: "/reports",
    alert: false,
    items: [
      {
        label: "Quality Control",
        icon: faCheckSquare,
        href: "/qualityControl",
        alert: false,
      },
      {
        label: "Effettua QC",
        icon: faCheckSquare,
        href: "/qualityControl/edit",
        alert: false,
      },
      {
        label: "Imballaggio",
        icon: faBox,
        href: "/boxing",
        alert: false,
      },
      {
        label: "Effettua imballaggio",
        icon: faBox,
        href: "/boxing/edit",
        alert: false,
      },
    ],
  },

  {
    label: "Inventario",
    icon: faBox,
    href: "/inventory",
    alert: false,
  },
  {
    label: "Prodotti",
    icon: faBox,
    href: "/products",
    alert: false,
  },
  {
    label: "Fornitori",
    icon: faHelmetSafety,
    href: "/suppliers",
    alert: false,
  },
  {
    label: "Categorie",
    icon: faTable,
    href: "/categories",
    alert: false,
  },
];

const masterItems: menuItem[] = [
  {
    label: "Utenti",
    icon: faUsers,
    href: "/users",
    alert: false,
  },
];

export function SideBarItem({
  icon,
  label,
  href,
  alert,
  active,
}: {
  icon: IconProp;
  label: string;
  href: string;
  alert: boolean;
  active: boolean;
}) {
  //@ts-ignore
  const { slim } = useContext(sideBarContext);
  // const active = router. === href;
  return (
    <Link href={href}>
      <li
        className={`relative overflow-hidden max-h-screen flex items-center py-2 px-3 my-1 font-medium rounded-md cursor-pointer transition-colors 
        group
        ${
          active ? "bg-tremor-brand-subtle" : "hover:bg-tremor-content-emphasis"
        }`}
      >
        <FontAwesomeIcon icon={icon} className="pr-2" fixedWidth />
        <span
          className={`${
            slim ? "w-0" : "w-40 ml-3"
          } overflow-hidden duration-500 transition-all`}
        >
          {label}
        </span>
        {alert && (
          <div
            className={`absolute right-2 w-2 h-2 rounded bg-tremor-brand-emphasis ${
              slim ? "top-2" : ""
            }`}
          ></div>
        )}
        {slim && (
          <div
            className={`absolute left-full rounded-md px-2 py-1 ml-6 bg-tremor-background dark:bg-dark-tremor-background text-tremor-content-emphasis dark:text-dark-tremor-content-emphasis text-sm invisible opacity-20 -translate-x-3 transition-all
            group-hover:visible group-hover:opacity-100 group-hover:translate-x-0`}
          >
            {label}
          </div>
        )}
      </li>
    </Link>
  );
}

//@ts-ignore
const sideBarContext = createContext();

export const Drawer: FC<Props> = ({ slim = false, setSlim, user }) => {
  const [collapsed, setCollapsed] = useState<boolean[]>([]);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const { setUser, user: userWithLocal } = useUserStore();

  const get = async (id: string) => {
    await fetch(`/api/users?user=${id}`)
      .then((r) => r.json())
      .then((d: any) => {
        setUser(d.user);
      });
  };

  useEffect(() => {
    const fetchData = async () => {
      if (user && userWithLocal === undefined) {
        await get(user.id);
      }
    };
    fetchData();
  }, [user]);

  return (
    <>
      <aside className="h-screen fixed z-20 bg-tremor-background dark:bg-dark-tremor-background">
        <nav className="h-full flex flex-col border-r shadow-sm overflow-y-scroll overflow-x-hidden">
          <div className="p-4 pb-2 flex justify-between items-center">
            <Image
              src={Logo}
              className={` h-auto invert dark:invert-0 transition-all duration-500 overflow-hidden ${
                slim ? "w-0" : "w-24"
              }`}
              alt="logo"
            />
            <Button
              onClick={() => setSlim((curr) => !curr)}
              variant="secondary"
              size="xs"
              className="rounded-none"
            >
              {slim ? <ChevronLast /> : <ChevronFirst />}
            </Button>
          </div>
          <sideBarContext.Provider value={{ slim }}>
            <ul className="flex-1 px-3">
              {defaultItems.map((i) => (
                <SideBarItem
                  key={`${i.label.replace(" ", "-").toLowerCase()}`}
                  alert={i.alert}
                  href={i.href}
                  icon={i.icon}
                  label={i.label}
                  active={pathname === i.href ? true : false}
                />
              ))}
              {operatorItems.map((i, index) => (
                <Fragment key={`${i.label.replace(" ", "-").toLowerCase()}`}>
                  <div className="relative">
                    <SideBarItem
                      alert={i.alert}
                      href={i.href}
                      icon={i.icon}
                      label={i.label}
                      active={pathname === i.href ? true : false}
                    />
                    {i.items && i.items.length > 0 && (
                      <FontAwesomeIcon
                        icon={collapsed[index] ? faAngleUp : faAngleDown}
                        className="text-xs cursor-pointer absolute right-3 top-3"
                      />
                    )}
                  </div>
                  {i.items && i.items.length > 0 && (
                    <div
                      className={`${collapsed[index] ? `hidden` : `block`} ${
                        slim ? "" : "pl-4"
                      }`}
                    >
                      {i.items.map((subItem, subIndex) => (
                        <SideBarItem
                          key={`${subItem.label}-${subIndex}`}
                          label={subItem.label}
                          alert={subItem.alert}
                          href={subItem.href}
                          icon={subItem.icon}
                          active={pathname === subItem.href ? true : false}
                        />
                      ))}
                    </div>
                  )}
                </Fragment>
              ))}

              {/* TODO - FILTER ONLY FOR ADMINISTRATOR ROLES */}
              {masterItems.map((i) => (
                <SideBarItem
                  key={`${i.label.replace(" ", "-").toLowerCase()}`}
                  alert={i.alert}
                  href={i.href}
                  icon={i.icon}
                  label={i.label}
                  active={pathname === i.href ? true : false}
                />
              ))}
            </ul>
          </sideBarContext.Provider>

          <div
            className="border-t flex p-3"
            onClick={() => {
              setOpen(!open);
            }}
          >
            {userWithLocal !== null && userWithLocal !== undefined && (
              <Image
                src={userWithLocal.picture || ""}
                alt={
                  userWithLocal?.user_metadata?.full_name ||
                  userWithLocal?.email ||
                  ""
                }
                width={20}
                height={20}
                className="rounded-md h-10 w-10"
              />
            )}
            <div
              className={`${
                slim ? "w-0" : "w-44 ml-3"
              }  overflow-hidden transition-all duration-500  hover:cursor-pointer flex items-center justify-between`}
            >
              <div className="leading-4">
                <h4 className="font-semibold">
                  {user?.user_metadata?.full_name || user?.email}
                </h4>
                <span className="text-xs">{user?.email && user.email}</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger>
                  {" "}
                  <MoreVertical size={20} />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Il mio Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {/* <DropdownMenuItem>Profile</DropdownMenuItem> */}
                  {/* <DropdownMenuItem>Billing</DropdownMenuItem>
    <DropdownMenuItem>Team</DropdownMenuItem> */}

                  <DropdownMenuItem>
                    {" "}
                    <div className="w-full">
                      <a
                        href="api/auth/logout"
                        className="w-full py-3 pl-4  hover:bg-slate-100 hover:cursor-pointer flex h-full justify-center items-center"
                      >
                        <FontAwesomeIcon icon={faSignOut} className="mr-2" />
                        <div className="w-full ">Scollegati</div>
                      </a>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </nav>
      </aside>
    </>
  );
};
