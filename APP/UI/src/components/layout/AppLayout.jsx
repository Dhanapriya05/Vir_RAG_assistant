import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";

export default function AppLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden h-full md:block">
        <Sidebar />
      </div>
      {/* Main content */}
      <main className="flex h-full flex-1 flex-col overflow-hidden pb-14 md:pb-0">
        <Outlet />
      </main>
      {/* Mobile nav */}
      <MobileNav />
    </div>
  );
}
