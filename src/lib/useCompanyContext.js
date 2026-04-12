/**
 * Multi-tenant company context hook.
 * - Regular users: scoped to their own company_id
 * - Admins: can impersonate / overview any company, or see all
 */
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { meras } from '@/components/core/MerasClient';

export function useCompanyContext() {
  const [adminOverrideCompanyId, setAdminOverrideCompanyId] = useState(
    () => sessionStorage.getItem('admin_company_override') || null
  );

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => meras.auth.me(),
  });

  const isAdmin = user?.role === 'admin';

  // Effective company ID used for filtering
  const effectiveCompanyId = isAdmin
    ? (adminOverrideCompanyId || null) // null = see all
    : user?.company_id || null;

  const setAdminCompany = (id) => {
    setAdminOverrideCompanyId(id);
    if (id) {
      sessionStorage.setItem('admin_company_override', id);
    } else {
      sessionStorage.removeItem('admin_company_override');
    }
  };

  // Build filter object for entity queries
  const companyFilter = (extra = {}) => {
    if (isAdmin && !adminOverrideCompanyId) {
      // Admin sees all — no filter
      return extra;
    }
    if (effectiveCompanyId) {
      return { company_id: effectiveCompanyId, ...extra };
    }
    return extra;
  };

  return {
    user,
    isAdmin,
    effectiveCompanyId,
    adminOverrideCompanyId,
    setAdminCompany,
    companyFilter,
    isViewingAll: isAdmin && !adminOverrideCompanyId,
  };
}

export default useCompanyContext;