import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { meras } from "@/components/core/MerasClient";
import { LayoutDashboard, Users, Calendar, Building2, Settings, DollarSign, FileText, FileSpreadsheet, Home, Shield, Mailbox, Headphones, Plane, BarChart3 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import AICopilot from "@/components/ai/AICopilot";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => meras.auth.me(),
  });
  
  const isAdmin = user?.role === 'admin';
  
  // Show full app layout only if NOT on Home page
  const isHomePage = currentPageName === 'Home' || location.pathname === createPageUrl('Home') || location.pathname === '/';
  
  if (isHomePage) {
    // Homepage has its own navigation, render children only
    return <>{children}</>;
  }
  
  const handleLogout = () => {
    meras.auth.logout();
  };
  
  const navigationItems = [
    {
      title: "Accueil",
      url: createPageUrl("Home"),
      icon: Home,
    },
    {
      title: "Tableau de bord",
      url: createPageUrl("Dashboard"),
      icon: LayoutDashboard,
    },
    {
      title: "Employés",
      url: createPageUrl("Employes"),
      icon: Users,
    },
    {
      title: "Paie",
      url: createPageUrl("Paie"),
      icon: DollarSign,
    },
    {
      title: "Déclarations",
      url: createPageUrl("Declarations"),
      icon: FileText,
    },
    {
      title: "Congés",
      url: createPageUrl("Conges"),
      icon: Calendar,
    },
    {
      title: "Transactions",
      url: createPageUrl("Transactions"),
      icon: DollarSign,
    },
    {
      title: "Gestion Budgétaire",
      url: createPageUrl("BudgetManagement"),
      icon: DollarSign,
    },
    {
      title: "Demandes d'Achat",
      url: createPageUrl("PurchaseRequests"),
      icon: FileSpreadsheet,
    },
    {
      title: "Paiements Dettes",
      url: createPageUrl("SupplierDebtPayment"),
      icon: DollarSign,
    },
    {
      title: "Contacts",
      url: createPageUrl("Contacts"),
      icon: Users,
    },

    {
      title: "Comptabilité",
      url: createPageUrl("Comptabilite"),
      icon: BarChart3,
    },
    {
      title: "Prévisions IA",
      url: createPageUrl("FinancialForecasting"),
      icon: BarChart3,
    },

    {
      title: "Gestion de Location",
      url: createPageUrl("Leasing"),
      icon: Building2,
    },
    {
      title: "Autres Services",
      url: createPageUrl("AutresServices"),
      icon: Headphones,
    },
    {
      title: "Portail d'Entreprise",
      url: createPageUrl("CompanySetup"),
      icon: Building2,
    },
    ...(isAdmin ? [
      {
        title: "Sécurité",
        url: createPageUrl("SecurityDocumentation"),
        icon: Shield,
      }
    ] : []),
    {
      title: "Paramètres",
      url: createPageUrl("Parametres"),
      icon: Settings,
    },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#FAFAFA]">
        <Sidebar className="border-r border-[#E5E7EB] bg-white">
          <SidebarHeader className="border-b border-[#F0F0F0] p-6">
            <Link to={createPageUrl("Home")} className="flex items-center gap-3">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f0ad9dc27bcf0743295786/b5d1a4740_brandmark-design-26.png" 
                  alt="Paie360 Logo" 
                  className="w-10 h-10 object-contain"
                />
                <div>
                  <h2 className="font-semibold text-[#1A1A1A] text-lg tracking-tight">Paie360</h2>
                  <p className="text-xs text-[#6B6B6B] font-normal">Powered by Meras PSP</p>
                </div>
              </Link>
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`mb-1 rounded-lg transition-all duration-200 ${
                          location.pathname === item.url 
                            ? 'bg-[#1A1A1A] text-white' 
                            : 'hover:bg-[#F5F5F5] text-[#6B6B6B] hover:text-[#1A1A1A]'
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-4 py-2.5">
                          <item.icon className="w-4 h-4" />
                          <span className="font-normal text-sm">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white border-b border-[#F0F0F0] px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 md:hidden">
                <SidebarTrigger className="hover:bg-[#F5F5F5] p-2 rounded-lg transition-colors duration-200" />
                <Link to={createPageUrl("Home")} className="flex items-center gap-2">
                  <img 
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f0ad9dc27bcf0743295786/b5d1a4740_brandmark-design-26.png" 
                    alt="Paie360 Logo" 
                    className="w-8 h-8 object-contain"
                  />
                  <div>
                    <h1 className="text-lg font-semibold text-[#1A1A1A] tracking-tight">Paie360</h1>
                    <p className="text-[10px] text-[#6B6B6B] -mt-1 font-normal">Powered by Meras PSP</p>
                  </div>
                </Link>
              </div>
              
              <div className="hidden md:block flex-1" />
              
              <div className="flex items-center gap-4">
                <NotificationCenter />
                
                <div className="flex items-center gap-3 pl-4 border-l border-[#F0F0F0]">
                  <div className="relative group">
                    <div className="flex items-center gap-3 cursor-pointer">
                      <div className="text-right">
                        <p className="text-sm font-medium text-[#1A1A1A]">{user?.full_name}</p>
                        <p className="text-xs text-[#6B6B6B] font-normal">{user?.role === 'admin' ? 'Administrateur' : 'Utilisateur'}</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center text-white font-medium">
                        {user?.full_name?.[0] || 'U'}
                      </div>
                    </div>
                    
                    {/* Dropdown Menu */}
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg border border-[#E5E7EB] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 swan-shadow-lg">
                      <div className="p-2">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#1A1A1A] hover:bg-[#F5F5F5] rounded-lg transition-colors font-normal"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Se déconnecter
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1">
              {children}
            </div>
            <AICopilot currentPage={currentPageName} />
        {/* Footer */}
        <footer className="bg-white border-t border-[#F0F0F0] px-6 py-3 text-center">
          <p className="text-xs text-[#6B6B6B] font-normal">© 2024 Paie360 • Powered by <span className="font-medium text-[#1A1A1A]">Meras PSP</span></p>
        </footer>
        </main>
        </div>
        </SidebarProvider>
        );
        }