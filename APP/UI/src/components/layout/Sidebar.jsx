import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  FileText,
  HelpCircle,
  Settings,
  HardDrive,
  FileUp,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import Logo, { Wordmark } from "@/components/brand/Logo";
import StatusBadge from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/chat", label: "AI Chat", icon: Sparkles, emoji: "✨" },
  { to: "/documents", label: "Documents", icon: FileText, emoji: "📚" },
  { to: "/faq", label: "Frequently Asked", icon: HelpCircle, emoji: "❓" },
];

export default function Sidebar({ onNavigate }) {
  const { activeDoc, documents, setCommandOpen } = useApp();
  const navigate = useNavigate();

  const totalSize = documents.reduce((sum, d) => sum + d.size, 0);
  const storageUsed = Math.round(totalSize);
  const storageMax = 500;
  const storagePct = Math.min(100, (storageUsed / storageMax) * 100);

  return (
    <aside className="flex h-full w-[260px] flex-col glass border-r border-white/5">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <Logo size={42} />
        <Wordmark />
      </div>

      {/* Navigation */}
      <nav className="px-3 py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive ? "text-white" : "text-slate-400 hover:text-slate-200"
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="navActive"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-500/15 to-amber-500/10 border border-red-500/20"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <item.icon
                  className={cn(
                    "relative z-10 h-4 w-4 shrink-0",
                    isActive ? "text-red-400" : "text-slate-500 group-hover:text-slate-300"
                  )}
                />
                <span className="relative z-10">{item.label}</span>
                {isActive && (
                  <span className="relative z-10 ml-auto h-1.5 w-1.5 rounded-full bg-red-400" />
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* Settings — visual only */}
        <button
          className="group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-300"
        >
          <Settings className="h-4 w-4 shrink-0" />
          <span>Settings</span>
          <span className="ml-auto font-mono-tech text-[9px] uppercase tracking-wider text-slate-600">Soon</span>
        </button>
      </nav>

      {/* Active Knowledge */}
      <div className="px-4 pt-4">
        <div className="mb-2 font-mono-tech text-[9px] uppercase tracking-[0.2em] text-slate-600">
          Active Knowledge
        </div>
        {activeDoc ? (
          <div className="rounded-xl glass-light p-3">
            <div className="flex items-start gap-2">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-slate-200">{activeDoc.name}</div>
                <div className="mt-1.5">
                  <StatusBadge status="indexed">Indexed</StatusBadge>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl glass-light p-3 text-xs text-slate-500">
            No active knowledge. Upload a document.
          </div>
        )}
      </div>

      {/* Storage indicator */}
      <div className="mt-auto px-4 pb-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-mono-tech text-[9px] uppercase tracking-[0.2em] text-slate-600">
            <HardDrive className="h-3 w-3" /> Knowledge Storage
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="font-mono-tech">{storageUsed} MB</span>
          <span className="font-mono-tech text-slate-600">{storageMax} MB</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-red-500 to-amber-500"
            initial={{ width: 0 }}
            animate={{ width: `${storagePct}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>

        <button
          onClick={() => {
            navigate("/documents");
            onNavigate?.();
          }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10"
        >
          <FileUp className="h-3.5 w-3.5" /> Upload Document
        </button>

        <button
          onClick={() => setCommandOpen(true)}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-white/5 py-1.5 text-[10px] font-mono-tech uppercase tracking-wider text-slate-600 transition-colors hover:text-slate-400"
        >
          ⌘K Command
        </button>
      </div>
    </aside>
  );
}
