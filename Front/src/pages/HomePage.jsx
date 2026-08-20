import React from "react";
import { ChatProvider } from "@/context/ChatContext";
import AboutCollege from "@/components/AboutCollege";
import CampusFeatures from "@/components/CampusFeatures";
import CampusMapNavigator from "@/components/CampusMapNavigator";
import ChatWindow from "@/components/ChatWindow";
import HumanFaceDetector from "@/components/HumanFaceDetector";
import FAQPanel from "@/components/FAQPanel";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import SuggestionCards from "@/components/SuggestionCards";

export default function HomePage() {
  return (
    <ChatProvider>
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <Hero />
          <HumanFaceDetector />
          <ChatWindow />
          <SuggestionCards />
          <CampusMapNavigator />
          <CampusFeatures />
          <FAQPanel />
          <AboutCollege />
        </main>
        <Footer />
      </div>
    </ChatProvider>
  );
}