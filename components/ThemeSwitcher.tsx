"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { RiMoonClearFill, RiSunFill } from "react-icons/ri";
import { useSidebar } from "@/components/ui/sidebar";

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  
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
      className={`flex items-center justify-start p-2 hover:cursor-pointer ${
        isCollapsed ? "w-[40px]" : "w-full"
      }`}
    >
      <div className="flex h-[40px] w-[40px] items-center justify-center">
        {isOn ? (
          <RiSunFill className="h-6 w-6 text-yellow-300" />
        ) : (
          <RiMoonClearFill className="h-6 w-6 text-slate-200" />
        )}
      </div>
    </div>
  );
}
