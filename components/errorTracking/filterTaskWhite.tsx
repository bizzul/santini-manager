import { Fragment, useState } from "react";
import { Combobox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/24/solid";
import { Task } from "@/types/supabase";

export default function TasksFilter({
  tasks,
  setSelectedTask,
  selectedTask,
}: any) {
  const [query, setQuery] = useState("");
  const filteredTasks =
    query === ""
      ? tasks
      : tasks.filter((task: Task) => {
          const fullName = `${task.title} ${task.unique_code}`;
          return fullName
            .toLowerCase()
            .replace(/\s+/g, "")
            .includes(query.toLowerCase().replace(/\s+/g, ""));
        });
  return (
    <div className="w-full">
      <Combobox value={selectedTask} onChange={setSelectedTask} name="tasks">
        <div className="relative mt-1">
          <div className="relative w-full cursor-default overflow-hidden text-black text-left border-gray-300 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm">
            <Combobox.Input
              className="w-full  py-2 pl-3 pr-10 text-sm leading-5   border-gray-300  text-black focus:ring-0"
              onChange={(event) => setQuery(event.target.value)}
              value={selectedTask?.unique_code}
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon className="h-5 w-5 white" aria-hidden="true" />
            </Combobox.Button>
          </div>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery("")}
          >
            <Combobox.Options className="absolute mt-1 max-h-90 w-full overflow-scroll rounded-md bg-slate-400 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-hidden sm:text-sm">
              {filteredTasks.length === 0 ? (
                <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                  Nessun progetto trovato.
                </div>
              ) : (
                filteredTasks.map((task: Task) => (
                  <Combobox.Option
                    key={task.id}
                    className={({ active }) =>
                      `relative cursor-default select-none py-2 pl-10 pr-4 ${
                        active ? "bg-teal-600 text-white" : "text-gray-900"
                      }`
                    }
                    value={task}
                  >
                    {({ selected, active }) => (
                      <>
                        <span
                          className={`block truncate ${
                            selected ? "font-medium" : "font-normal"
                          }`}
                        >
                          {`${task.title} - ${task.unique_code}`}
                        </span>
                        {selected ? (
                          <span
                            className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                              active ? "text-white" : "text-teal-600"
                            }`}
                          >
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        ) : null}
                      </>
                    )}
                  </Combobox.Option>
                ))
              )}
            </Combobox.Options>
          </Transition>
        </div>
      </Combobox>
    </div>
  );
}
