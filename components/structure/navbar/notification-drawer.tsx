import { FC, Fragment, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { TaskWithDays } from "./navbar";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";

type Props = {
  data: TaskWithDays[] | undefined;
  open: boolean;
  setOpen?: any;
  readNotifications: any;
  setReadNotifications: any;
};

export const NotificationDrawer: FC<Props> = ({
  open,
  setOpen,
  data,
  readNotifications,
  setReadNotifications,
}) => {
  useEffect(() => {
    // Load the read notifications from local storage
    const storedReadNotifications = localStorage.getItem("readNotifications");
    if (storedReadNotifications) {
      setReadNotifications(JSON.parse(storedReadNotifications));
    }
  }, []);

  const markAsRead = (taskCode: string) => {
    const newReadNotifications = [...readNotifications, taskCode];

    // Update local state
    setReadNotifications(newReadNotifications);

    // Update local storage
    localStorage.setItem(
      "readNotifications",
      JSON.stringify(newReadNotifications)
    );
  };

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-40" onClose={setOpen}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-500"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-500"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0  bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-500 sm:duration-700"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-500 sm:duration-700"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto relative w-screen max-w-sm">
                  {data !== undefined ? (
                    <div className="flex h-full flex-col overflow-y-scroll bg-tremor-background-subtle dark:bg-dark-tremor-background-subtle py-6 shadow-xl z-50">
                      <div className="px-4 sm:px-6 border-b-2 pb-5 ">
                        <Dialog.Title className="text-lg font-medium  flex-col">
                          NOTIFICHE
                        </Dialog.Title>
                      </div>
                      <div className="w-full ">
                        <div className="flex flex-col gap-2 pt-2 px-2 ">
                          {data
                            .filter(
                              (task: TaskWithDays) =>
                                !readNotifications.includes(task.unique_code!)
                            ) // Only show notifications not marked as read
                            .sort(
                              (a: TaskWithDays, b: TaskWithDays) =>
                                (a.daysUntilDue || Infinity) -
                                (b.daysUntilDue || Infinity)
                            )
                            .map((task: TaskWithDays, index: number) => (
                              <Card key={task.unique_code} className="text-xs">
                                <div className="flex flex-row gap-2">
                                  <div
                                    className={`${
                                      index < data.length - 1
                                        ? " border-gray-200"
                                        : ""
                                    }${
                                      readNotifications.includes(
                                        task.unique_code!
                                      )
                                        ? "bg-gray-500"
                                        : ""
                                    }`}
                                  >
                                    <span className="font-bold">
                                      {task.unique_code}
                                    </span>{" "}
                                    |{" "}
                                    <span className="font-bold">
                                      {task.daysUntilDue}
                                    </span>{" "}
                                    giorni alla consegna
                                  </div>
                                  <div>
                                    <Button
                                      className="text-xs"
                                      variant="ghost"
                                      onClick={() =>
                                        markAsRead(task.unique_code!)
                                      }
                                    >
                                      Marca come letto
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full flex-col overflow-y-scroll bg-tremor-background-subtle dark:bg-dark-tremor-background-subtle py-6 shadow-xl z-50">
                      <div className="px-4 sm:px-6 border-b-2 pb-5 ">
                        <Dialog.Title className="text-lg font-medium  flex-col">
                          NOTIFICHE
                        </Dialog.Title>
                      </div>
                      <div className="w-full mx-auto px-4">
                        <p>Nessuna notifica</p>
                      </div>
                    </div>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};
