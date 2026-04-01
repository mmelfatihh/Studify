"use client";
import { usePathname } from "next/navigation";

const NO_SIDEBAR = ["/login", "/setup", "/focus"];

export function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hasSidebar = !NO_SIDEBAR.includes(pathname);
  return (
    <div className={hasSidebar ? "md:pl-64" : ""}>
      {children}
    </div>
  );
}
