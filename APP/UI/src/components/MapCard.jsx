import React, { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Navigation } from "lucide-react";
import MapAssistant from "./MapAssistant";

export default function MapCard() {
  const [open, setOpen] = useState(false);
  return (
    <>
      



























      
      <MapAssistant open={open} onClose={() => setOpen(false)} />
    </>);

}