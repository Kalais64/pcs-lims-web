import Image from "next/image";
import { cn } from "@/lib/utils";

export function PcsIcon({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/pcs-lims-icon.png"
      alt="PCS LIMS"
      width={size}
      height={size}
      className={cn("rounded-[10px] bg-white object-contain", className)}
      priority
    />
  );
}

export function PcsWordmark({
  className,
  height = 40,
}: {
  className?: string;
  height?: number;
}) {
  return (
    <Image
      src="/pcs-lims-logo-web.png"
      alt="PCS LIMS — Laboratorium Lingkungan"
      width={Math.round(height * 4.2)}
      height={height}
      className={cn("h-auto w-auto max-h-[44px] object-contain object-left", className)}
      priority
    />
  );
}
