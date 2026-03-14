import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft } from "lucide-react";

// Pages that are "root" — no back button needed
const ROOT_PAGES = [
  createPageUrl("Dashboard"),
  createPageUrl("Home"),
  "/",
];

export default function MobileBackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  const isRoot = ROOT_PAGES.includes(location.pathname);
  if (isRoot) return null;

  return (
    <button
      onClick={() => navigate(-1)}
      className="md:hidden touch-target flex items-center justify-center rounded-lg hover:bg-[#F5F5F5] dark:hover:bg-gray-800 transition-colors select-none"
      aria-label="Retour"
    >
      <ChevronLeft className="w-5 h-5 text-[#1A1A1A] dark:text-white" />
    </button>
  );
}