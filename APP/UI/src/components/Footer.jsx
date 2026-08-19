import React from "react";
import { Link } from "react-router-dom";
import { Database } from "lucide-react";
import CollegeLogo from "./CollegeLogo";
import { college } from "@/data/collegeData";

export default function Footer() {
  return (
    <footer className="mt-16 bg-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="[&_div]:text-white [&_.text-slate-400]:text-slate-400 [&_.text-slate-900]:text-white">
              <CollegeLogo />
            </div>
            <p className="text-slate-400 text-sm mt-3 max-w-xs">{college.tagline}. Ask. Learn. Discover.</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
            <a href="#top" className="text-slate-300 hover:text-white transition-colors">Home</a>
            <a href="#chat" className="text-slate-300 hover:text-white transition-colors">Ask AI</a>
            <a href="#faqs" className="text-slate-300 hover:text-white transition-colors">FAQs</a>
            <a href="#about" className="text-slate-300 hover:text-white transition-colors">About College</a>
            <a href={`https://${college.contact.website}`} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-white transition-colors">College Website</a>
          </nav>
        </div>
        <div className="border-t border-white/10 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-400">
          <p>© 2026 College AI · {college.name}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span>{college.contact.phone} · {college.contact.email}</span>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <Link
              to="/knowledge-base"
              title="Staff Knowledge Base Management"
              className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors py-0.5 px-2 rounded hover:bg-white/5"
            >
              <Database className="h-3 w-3 opacity-60" />
              <span>Knowledge Base</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

