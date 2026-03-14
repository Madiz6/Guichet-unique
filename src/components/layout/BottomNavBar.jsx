import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LayoutDashboard, Users, DollarSign, Settings } from "lucide-react";

const tabs = [
  { label: "Tableau de bord", icon: LayoutDashboard, url: createPageUrl("Dashboard") },
  { label: "Employés",        icon: Users,           url: createPageUrl("Employes") },
  { label: "Paie",            icon: DollarSign,      url: createPageUrl("Paie") },
  { label: "Paramètres",      icon: Settings,        url: createPageUrl("Parametres") },
];

export default function BottomNavBar() {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white dark:bg-gray-900 border-t border-[#E5E7EB] dark:border-gray-700"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.url;
          return (
            <Link
              key={tab.label}
              to={tab.url}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-1 select-none"
              style={{ minHeight: 56 }}
            >
              <tab.icon
                className={`w-5 h-5 transition-colors ${
                  isActive ? "text-[#1A1A1A] dark:text-white" : "text-[#9CA3AF]"
                }`}
              />
              <span
                className={`text-[10px] font-medium transition-colors leading-tight text-center ${
                  isActive ? "text-[#1A1A1A] dark:text-white" : "text-[#9CA3AF]"
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 w-8 h-0.5 bg-[#1A1A1A] dark:bg-white rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}