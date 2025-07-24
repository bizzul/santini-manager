import { FC, useEffect } from "react";
import { Fragment, useState } from "react";
import { FontawesomeObject, IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { User } from "@supabase/supabase-js";
import { faBell } from "@fortawesome/free-solid-svg-icons";
import { NotificationDrawer } from "./notification-drawer";
import { Task } from "@prisma/client";
import { onlyTaskLateWithDaysRemaining } from "../../../package/utils/various/calculateTaskRemaining";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export interface UserDrawerType extends User {
  picture?: string;
}
type Props = {
  user?: UserDrawerType | null;
  titleIcon?: IconProp | null;
  titleText?: string | null;
  slim?: boolean;
};

export interface TaskWithDays extends Task {
  daysUntilDue?: number;
}

export const Navbar: FC<Props> = ({
  titleText = null,
  titleIcon = null,
  user,
  slim,
}) => {
  const [tasks, setTasks] = useState<TaskWithDays[] | undefined>(undefined);
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [readNotifications, setReadNotifications] = useState<string[]>([]);

  useEffect(() => {
    const getTask = async () => {
      await fetch(`/api/tasks/notifications`)
        .then((r) => r.json())
        .then((d: any) => {
          const data = onlyTaskLateWithDaysRemaining(d);
          setTasks(data);
        });
    };
    getTask();
  }, []);

  return (
    <div
      className={`h-12 z-50 fixed w-screen transition-all duration-500  dark:bg-dark-tremor-background-muted bg-tremor-background-muted   flex justify-between align-middle items-center text-slate-400 border-b-2  border-opacity-20 ${
        !slim ? "ml-2 pr-68" : "ml-0 pr-24"
      } "overflow-hidden"`}
    >
      <div className="  flex items-center pl-8 text-lg font-bold">
        {titleIcon && <FontAwesomeIcon icon={titleIcon} className="pr-2" />}
        {titleText && titleText}
      </div>
      {user && (
        <>
          <div
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className=" relative h-full px-5 hover:bg-slate-200 hover:cursor-pointer flex items-center"
          >
            <FontAwesomeIcon icon={faBell} />
            {tasks &&
              tasks.length > 0 &&
              readNotifications.length !== tasks.length && (
                <span className="absolute top-6 right-4 w-2 h-2 bg-red-600 rounded-full"></span>
              )}
          </div>
        </>
      )}
      <div className="mb-2">
        <ThemeSwitcher />
      </div>

      {user && (
        <>
          <NotificationDrawer
            open={notificationsOpen}
            setOpen={setNotificationsOpen}
            data={tasks}
            readNotifications={readNotifications}
            setReadNotifications={setReadNotifications}
          />
        </>
      )}
    </div>
  );
};
