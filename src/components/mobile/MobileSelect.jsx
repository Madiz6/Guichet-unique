/**
 * MobileSelect — uses native Shadcn Select on desktop,
 * and a Drawer / bottom-sheet on mobile (< 768 px).
 *
 * Drop-in replacement for:
 *   <Select value={v} onValueChange={fn}>
 *     <SelectTrigger><SelectValue placeholder="…" /></SelectTrigger>
 *     <SelectContent>
 *       <SelectItem value="a">A</SelectItem>
 *     </SelectContent>
 *   </Select>
 *
 * Usage:
 *   <MobileSelect value={v} onValueChange={fn} placeholder="Choose…" options={[{value:'a', label:'A'}]} />
 */
import React, { useState, useEffect } from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Check, ChevronDown } from "lucide-react";

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

export default function MobileSelect({
  value,
  onValueChange,
  placeholder = "Sélectionner…",
  options = [],          // [{ value: string, label: string, disabled?: bool }]
  className = "",
  disabled = false,
  triggerClassName = "",
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const selectedLabel = options.find((o) => o.value === value)?.label;

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={triggerClassName || className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Mobile: bottom-sheet drawer
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={`flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${triggerClassName || className}`}
      >
        <span className={selectedLabel ? "text-foreground" : "text-muted-foreground"}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="text-sm font-semibold text-[#1A1A1A]">{placeholder}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto max-h-[60vh]">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                disabled={o.disabled}
                onClick={() => {
                  if (!o.disabled) {
                    onValueChange(o.value);
                    setOpen(false);
                  }
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl mb-1 text-sm transition
                  ${o.value === value
                    ? "bg-[#1A1A1A] text-white font-semibold"
                    : "bg-[#F5F5F5] text-[#1A1A1A] hover:bg-[#E5E7EB]"}
                  ${o.disabled ? "opacity-40 cursor-not-allowed" : ""}
                `}
              >
                <span>{o.label}</span>
                {o.value === value && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}