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
      className={`flex items-center justify-start rounded-2xl border border-[hsl(var(--sidebar-border)/0.8)] bg-[hsl(var(--background)/0.9)] p-2 shadow-[0_10px_24px_hsl(var(--page-shadow)/0.12)] transition-colors hover:cursor-pointer hover:bg-[hsl(var(--background))] dark:border-white/10 dark:bg-white/[0.05] dark:shadow-none dark:hover:bg-white/10 ${
        isCollapsed ? "w-[40px]" : "w-full"
      }`}
    >
      <div className="flex h-[40px] w-[40px] items-center justify-center rounded-xl bg-[hsl(var(--page-glow)/0.95)] dark:bg-white/10">
        {isOn ? (
          <RiSunFill className="h-6 w-6 text-yellow-300" />
        ) : (
          <RiMoonClearFill className="h-6 w-6 text-slate-200" />
        )}
      </div>
    </div>
  );
}
