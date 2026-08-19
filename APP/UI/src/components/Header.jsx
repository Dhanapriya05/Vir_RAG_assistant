import React from "react";
import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import CollegeLogo from "./CollegeLogo";

const navItems = [
{ label: "Home", href: "#top" },
{ label: "Ask AI", href: "#chat" },
{ label: "FAQs", href: "#faqs" },
{ label: "About College", href: "#about" }];


export default function Header() {
  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/70">
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <a href="#top" aria-label="College AI home">
          <CollegeLogo />
        </a>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) =>
          <a
            key={item.label}
            href={item.href}
            className="px-3.5 py-2 text-sm font-semibold text-slate-600 rounded-full hover:text-blue-700 hover:bg-blue-50 transition-colors">
            
              {item.label}
            </a>
          )}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          





          
          





          
          <a
            href="#chat"
            className="bg-gradient-college text-white text-sm font-semibold px-4 py-2 rounded-full shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            
            Ask AI
          </a>
        </div>
      </div>
    </motion.header>);

}
