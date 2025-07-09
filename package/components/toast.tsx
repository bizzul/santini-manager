import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Transition } from "@headlessui/react";
import { useEffect, useState } from "react";

function Toast({ show, icon, text }: { show: any; icon: any; text: string }) {
  const [showAlert, setShowAlert] = useState(false);
  useEffect(() => {
    if (show === true) {
      setShowAlert(true);
      setTimeout(() => {
        setShowAlert(false);
      }, 10000);
    }
  }, [show]);
  return (
    <div className="fixed bottom-5 right-5">
      <Transition
        show={showAlert}
        enter="transition-all duration-500"
        enterFrom="translate-x-full"
        enterTo=" translate-x-0"
        leave="transition-all duration-500"
        leaveFrom="translate-x-0"
        leaveTo="translate-x-full"
      >
        <div
          id="toast-simple"
          className="flex translate-x- items-center w-full max-w-xs p-4 space-x-4 text-gray-500 bg-white divide-x divide-gray-200 rounded-lg shadow dark:text-gray-400 dark:divide-gray-700 space-x dark:bg-gray-800"
          role="alert"
        >
          <FontAwesomeIcon
            icon={icon}
            className=" w-5 h-5  text-blue-600 dark:text-blue-500"
          />

          <div className="pl-4 text-sm font-normal">{text}</div>
        </div>
      </Transition>
    </div>
  );
}

export default Toast;
