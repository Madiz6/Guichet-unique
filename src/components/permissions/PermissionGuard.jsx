import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { meras } from "@/components/core/MerasClient";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldOff, Loader2 } from 'lucide-react';

export default function PermissionGuard({ permission, children, fallback = null }) {
  const { data: user, isLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => meras.auth.me(),
  });
  
  // Show loading while fetching user
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-[#0066FF]" />
      </div>
    );
  }
  
  // If no user data yet, allow access (will be handled by auth)
  if (!user) {
    return <>{children}</>;
  }
  
  // Admin has all permissions
  if (user?.role === 'admin') {
    return <>{children}</>;
  }
  
  // If no specific permission required, allow access
  if (!permission) {
    return <>{children}</>;
  }
  
  // Check if user has the required permission
  // If permissions object doesn't exist, allow access by default
  const hasPermission = !user?.permissions || user?.permissions?.[permission] === true;
  
  if (!hasPermission) {
    if (fallback) {
      return fallback;
    }
    
    return (
      <Alert variant="destructive" className="my-4">
        <ShieldOff className="h-4 w-4" />
        <AlertDescription>
          Vous n'avez pas la permission d'accéder à cette fonctionnalité. Contactez votre administrateur.
        </AlertDescription>
      </Alert>
    );
  }
  
  return <>{children}</>;
}

export function usePermission(permission) {
  const { data: user, isLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => meras.auth.me(),
  });
  
  // While loading, return true to avoid blocking
  if (isLoading) return true;
  
  // If no user, allow access
  if (!user) return true;
  
  // Admin has all permissions
  if (user?.role === 'admin') return true;
  
  // If no specific permission required, allow
  if (!permission) return true;
  
  // If permissions object doesn't exist, allow by default
  if (!user?.permissions) return true;
  
  return user?.permissions?.[permission] === true;
}