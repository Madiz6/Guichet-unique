import React, { useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LayoutDashboard, Users, DollarSign, Settings } from "lucide-react";

const tabs = [
  { label: "Tableau de bord", icon: LayoutDashboard, url: createPageUrl("Dashboard") },
  { label: "Employés",        icon: Users,           url: createPageUrl("Employes") },
  { label: "Paie",            icon: DollarSign,      url: createPageUrl("Paie") },
  { label: "Paramètres",      icon: Settings,        url: createPageUrl("Parametres") },
];

const SCROLL_KEY = "bottomnav_scroll";

export default function BottomNavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const prevPathRef = useRef(location.pathname);

  // Save scroll position of current page before navigating away
  useEffect(() => {
    const saveScroll = () => {
      const scrollable = document.querySelector("main") || window;
      const scrollY = scrollable === window ? window.scrollY : scrollable.scrollTop;
      const saved = JSON.parse(sessionStorage.getItem(SCROLL_KEY) || "{}");
      saved[prevPathRef.current] = scrollY;
      sessionStorage.setItem(SCROLL_KEY, JSON.stringify(saved));
    };

    // Save scroll before path changes
    return () => {
      saveScroll();
      prevPathRef.current = location.pathname;
    };
  }, [location.pathname]);

  // Restore scroll position when arriving at a tab page
  useEffect(() => {
    const isTab = tabs.some((t) => t.url === location.pathname);
    if (!isTab) return;

    const saved = JSON.parse(sessionStorage.getItem(SCROLL_KEY) || "{}");
    const savedY = saved[location.pathname] ?? 0;

    // Defer until the new page has rendered
    const raf = requestAnimationFrame(() => {
      const scrollable = document.querySelector("main");
      if (scrollable) {
        scrollable.scrollTop = savedY;
      } else {
        window.scrollTo(0, savedY);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [location.pathname]);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white dark:bg-gray-900 border-t border-[#E5E7EB] dark:border-gray-700"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.url;
          return (
            <button
              key={tab.label}
              onClick={() => {
                if (isActive) {
                  // Reset scroll to top when re-tapping active tab
                  const scrollable = document.querySelector("main");
                  if (scrollable) scrollable.scrollTop = 0;
                  else window.scrollTo(0, 0);
                  // Clear saved scroll for this tab
                  const saved = JSON.parse(sessionStorage.getItem(SCROLL_KEY) || "{}");
                  delete saved[tab.url];
                  sessionStorage.setItem(SCROLL_KEY, JSON.stringify(saved));
                } else {
                  navigate(tab.url);
                }
              }}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-1 select-none relative bg-transparent border-0 cursor-pointer"
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
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#1A1A1A] dark:bg-white rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}