import { useEffect, useRef, useState } from "react";
import { Input } from "./ui/input";

// A debounced input react component
export function DebouncedInput({
  value: initialValue,
  onChange,
  debounce = 500,
  ...props
}: {
  value: string | number;
  onChange: (value: string | number) => void;
  debounce?: number;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">) {
  const [value, setValue] = useState(initialValue);
  const inputRef: any = useRef(null);
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value);
      // Check if the input is still mounted and refocus
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, debounce);

    return () => clearTimeout(timeout);
  }, [value, debounce, onChange]);

  return (
    <Input
      {...props}
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}
