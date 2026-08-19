import React from "react";
import { NavLink } from "react-router-dom";
import { Sparkles, FileText, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/chat", label: "Chat", icon: Sparkles },
  { to: "/documents", label: "Docs", icon: FileText },
  { to: "/faq", label: "FAQ", icon: HelpCircle },
];

export default function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around glass-strong border-t border-white/10 px-2 py-2 md:hidden">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-medium transition-colors",
              isActive ? "text-red-400" : "text-slate-500"
            )
          }
        >
          <item.icon className="h-5 w-5" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
