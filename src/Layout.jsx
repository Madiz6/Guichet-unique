import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { meras } from "@/components/core/MerasClient";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Home, FileText, Globe, Building2, Shield } from "lucide-react";
import BottomNavBar from "@/components/layout/BottomNavBar";
import AdminCompanyBanner from "@/components/layout/AdminCompanyBanner";
import MobileBackButton from "@/components/layout/MobileBackButton";
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
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => meras.auth.me(),
  });

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try { await meras.auth.logout(); } finally { setIsDeletingAccount(false); }
  };
  
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
  
  const navigationGroups = [
    {
      label: null,
      items: [
        { title: "Accueil", url: createPageUrl("Home"), icon: Home },
        { title: "Mes Dossiers", url: "/MesDossiers", icon: FileText },
      ]
    },
    ...(isAdmin ? [{
      label: "Administration ANPI",
      items: [
        { title: "Portail Admin ANPI", url: "/AdminPortal", icon: Globe },
        { title: "Vue Globale Admin", url: "/AdminOverview", icon: Building2 },
        { title: "Sécurité", url: createPageUrl("SecurityDocumentation"), icon: Shield },
      ]
    }] : []),
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#FAFAFA] dark:bg-gray-950">
        <Sidebar className="border-r border-[#E5E7EB] bg-white">
          <SidebarHeader className="border-b border-[#F0F0F0] p-6">
            <Link to={createPageUrl("Home")} className="flex items-center gap-3">
                <img 
                  src="https://media.base44.com/images/public/69db89e14e315ad78c6a394b/c259d5408_Untitled-design-1.png" 
                  alt="Guichet UN Logo" 
                  className="w-10 h-10 object-contain"
                />
                <div>
                  <h2 className="font-semibold text-[#1A1A1A] text-lg tracking-tight">Guichet UN</h2>
                  <p className="text-xs text-[#6B6B6B] font-normal">Powered by Meras PSP</p>
                </div>
              </Link>
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            {navigationGroups.map((group, gi) => (
              <SidebarGroup key={gi}>
                {group.label && (
                  <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#9B9B9B] mt-2">
                    {group.label}
                  </p>
                )}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          className={`mb-0.5 rounded-lg transition-all duration-200 ${
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
            ))}
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col" style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <header className="bg-white border-b border-[#F0F0F0] px-4 md:px-6 py-3 md:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:hidden">
                <MobileBackButton />
                <SidebarTrigger className="hover:bg-[#F5F5F5] p-2 rounded-lg transition-colors duration-200 touch-target" />
                <Link to={createPageUrl("Home")} className="flex items-center gap-2 select-none">
                  <img 
                    src="https://media.base44.com/images/public/69db89e14e315ad78c6a394b/c259d5408_Untitled-design-1.png" 
                    alt="Guichet UN Logo" 
                    className="w-8 h-8 object-contain"
                  />
                  <div>
                    <h1 className="text-lg font-semibold text-[#1A1A1A] tracking-tight">Guichet UN</h1>
                    <p className="text-[10px] text-[#6B6B6B] -mt-1 font-normal">Powered by Meras PSP</p>
                  </div>
                </Link>
              </div>
              
              <div className="hidden md:block flex-1" />
              
              <div className="flex items-center gap-4">
                <NotificationCenter />
                
                <div className="flex items-center gap-3 pl-4 border-l border-[#F0F0F0]">
                  <div className="relative group">
                    <div className="flex items-center gap-3 cursor-pointer select-none">
                      <div className="text-right">
                        <p className="text-sm font-medium text-[#1A1A1A]">{user?.full_name}</p>
                        <p className="text-xs text-[#6B6B6B] font-normal">{user?.role === 'admin' ? 'Administrateur' : 'Utilisateur'}</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center text-white font-medium">
                        {user?.full_name?.[0] || 'U'}
                      </div>
                    </div>
                    
                    {/* Dropdown Menu */}
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg border border-[#E5E7EB] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 swan-shadow-lg">
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
                        <div className="border-t border-[#F0F0F0] mt-1 pt-1">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-normal">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Supprimer le compte
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer votre compte ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cette action est irréversible. Votre session sera terminée immédiatement.
                                  Tapez <strong>SUPPRIMER</strong> pour confirmer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <Input
                                value={deleteConfirm}
                                onChange={(e) => setDeleteConfirm(e.target.value)}
                                placeholder="Tapez SUPPRIMER"
                                className="my-2"
                              />
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setDeleteConfirm('')}>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  disabled={deleteConfirm !== 'SUPPRIMER' || isDeletingAccount}
                                  onClick={handleDeleteAccount}
                                  className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                                >
                                  {isDeletingAccount ? 'Suppression…' : 'Confirmer'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <AdminCompanyBanner />
          {/* Extra bottom padding on mobile for bottom nav bar */}
          <div className="flex-1 pb-16 md:pb-0">
              {children}
            </div>
            <AICopilot currentPage={currentPageName} />
        {/* Footer — hidden on mobile (replaced by bottom nav) */}
        <footer className="hidden md:block bg-white border-t border-[#F0F0F0] px-6 py-3 text-center">
          <p className="text-xs text-[#6B6B6B] font-normal">© 2024 Paie360 • Powered by <span className="font-medium text-[#1A1A1A]">Meras PSP</span></p>
        </footer>
        </main>
        <BottomNavBar />
        </div>
        </SidebarProvider>
        );
        }