"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { RiMoonClearFill, RiSunFill } from "react-icons/ri";
export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const [isOn, setIsOn] = useState(() => {
    if (theme === "light") {
      return true;
    } else {
      return false;
    }
  });

  const toggleSwitch = () => {
    setIsOn(!isOn);
    if (theme === "light") {
      setTheme("dark");
    } else {
      setTheme("light");
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div
      onClick={toggleSwitch}
      className={`flex-start flex h-[50px] w-[100px]   p-[8px]  hover:cursor-pointer  ${
        isOn && "place-content-end"
      }`}
    >
      <div className="flex h-[40px] w-[40px] items-center justify-center  ">
        {isOn ? (
          <RiSunFill className="h-6 w-6 text-yellow-300" />
        ) : (
          <RiMoonClearFill className="h-6 w-6 text-slate-200" />
        )}
      </div>
    </div>
  );
}
