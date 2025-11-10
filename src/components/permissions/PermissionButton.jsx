import React from 'react';
import { usePermission } from './PermissionGuard';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock } from 'lucide-react';

export default function PermissionButton({ permission, children, ...props }) {
  const hasPermission = usePermission(permission);
  
  if (!hasPermission) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button {...props} disabled className="opacity-50 cursor-not-allowed">
              <Lock className="w-4 h-4 mr-2" />
              {children}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Permission requise: {permission}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return <Button {...props}>{children}</Button>;
}