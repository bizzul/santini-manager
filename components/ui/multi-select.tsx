"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";

interface MultiSelectProps {
  value?: string[];
  onValueChange?: (value: string[]) => void;
  disabled?: boolean;
  children: React.ReactNode;
  placeholder?: string;
  className?: string;
}

const MultiSelect = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  MultiSelectProps
>(
  (
    {
      value = [],
      onValueChange,
      disabled,
      children,
      placeholder = "Select items...",
      className,
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState("");

    const handleUnselect = (item: string) => {
      if (onValueChange) {
        onValueChange(value.filter((i) => i !== item));
      }
    };

    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        const input = e.target as HTMLInputElement;
        if (input.value === "" && e.key === "Backspace" && value.length > 0) {
          handleUnselect(value[value.length - 1]);
        }
      },
      [value]
    );

    const selectables = React.Children.toArray(children).filter(
      (child) => React.isValidElement(child) && child.type === MultiSelectItem
    );

    return (
      <Command
        ref={ref}
        onKeyDown={handleKeyDown}
        className={`overflow-visible bg-transparent ${className}`}
        {...props}
      >
        <div className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
          <div className="flex gap-1 flex-wrap">
            {value.map((item) => {
              const selectedItem = selectables.find(
                (selectable) =>
                  React.isValidElement(selectable) &&
                  selectable.props.value === item
              );
              return (
                <div
                  key={item}
                  className="flex items-center gap-1 bg-secondary text-secondary-foreground rounded-sm px-2 py-1 text-xs"
                >
                  <span>
                    {React.isValidElement(selectedItem)
                      ? selectedItem.props.children
                      : item}
                  </span>
                  <button
                    className="ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUnselect(item);
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={() => handleUnselect(item)}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
              );
            })}
            <CommandPrimitive.Input
              placeholder={placeholder}
              value={inputValue}
              onValueChange={setInputValue}
              disabled={disabled}
              className="ml-2 bg-transparent outline-none placeholder:text-muted-foreground flex-1"
            />
          </div>
        </div>
        <div className="relative mt-2">
          {open && (
            <div className="absolute w-full z-10 top-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
              <CommandGroup className="h-full overflow-auto">
                {children}
              </CommandGroup>
            </div>
          )}
        </div>
      </Command>
    );
  }
);
MultiSelect.displayName = "MultiSelect";

interface MultiSelectItemProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
}

const MultiSelectItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  MultiSelectItemProps
>(({ value, children, disabled, ...props }, ref) => {
  return (
    <CommandItem
      ref={ref}
      value={value}
      disabled={disabled}
      className="cursor-pointer"
      {...props}
    >
      {children}
    </CommandItem>
  );
});
MultiSelectItem.displayName = "MultiSelectItem";

export { MultiSelect, MultiSelectItem };
