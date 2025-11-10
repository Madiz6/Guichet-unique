import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldOff } from 'lucide-react';

export default function PermissionGuard({ permission, children, fallback = null }) {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });
  
  // Admin has all permissions
  if (user?.role === 'admin') {
    return <>{children}</>;
  }
  
  // Check if user has the required permission
  const hasPermission = user?.permissions?.[permission] === true;
  
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
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });
  
  if (user?.role === 'admin') return true;
  return user?.permissions?.[permission] === true;
}