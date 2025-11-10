import { base44 } from "@/api/base44Client";

/**
 * Audit Logger - Records all critical user actions
 * Usage: await logAuditAction('payroll_processed', 'PayrollCycle', cycleId, { amount: 50000 })
 */

export const logAuditAction = async (action, entityType, entityId, changes = {}, entityName = '') => {
  try {
    const user = await base44.auth.me();
    
    if (!user) {
      console.error('Cannot log audit action: No authenticated user');
      return;
    }
    
    const auditData = {
      user_email: user.email,
      user_name: user.full_name || user.email,
      action,
      entity_type: entityType,
      entity_id: entityId || '',
      entity_name: entityName,
      changes: changes || {},
      ip_address: '', // Platform limitation - would need server-side
      user_agent: navigator.userAgent || '',
      timestamp: new Date().toISOString()
    };
    
    await base44.entities.AuditLog.create(auditData);
    console.log('✅ Audit log created:', action);
    
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    console.error('⚠️ Failed to create audit log:', error);
  }
};

/**
 * Audit action types
 */
export const AUDIT_ACTIONS = {
  // Employee actions
  EMPLOYEE_CREATED: 'employee_created',
  EMPLOYEE_UPDATED: 'employee_updated',
  EMPLOYEE_DELETED: 'employee_deleted',
  EMPLOYEE_SUSPENDED: 'employee_suspended',
  EMPLOYEE_REACTIVATED: 'employee_reactivated',
  
  // Payroll actions
  PAYROLL_CREATED: 'payroll_created',
  PAYROLL_PROCESSED: 'payroll_processed',
  PAYROLL_PAID: 'payroll_paid',
  PAYROLL_DELETED: 'payroll_deleted',
  PAYSLIP_GENERATED: 'payslip_generated',
  PAYSLIP_EMAILED: 'payslip_emailed',
  
  // Declaration actions
  DECLARATION_CREATED: 'declaration_created',
  DECLARATION_PAID: 'declaration_paid',
  DECLARATION_DELETED: 'declaration_deleted',
  
  // Holiday actions
  HOLIDAY_CREATED: 'holiday_created',
  HOLIDAY_APPROVED: 'holiday_approved',
  HOLIDAY_REJECTED: 'holiday_rejected',
  HOLIDAY_CANCELLED: 'holiday_cancelled',
  
  // Company actions
  COMPANY_UPDATED: 'company_updated',
  
  // User management
  USER_PERMISSIONS_UPDATED: 'user_permissions_updated',
  USER_DEACTIVATED: 'user_deactivated',
  USER_ACTIVATED: 'user_activated',
  
  // Security
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  PASSWORD_CHANGED: 'password_changed',
  
  // Exports
  REPORT_EXPORTED: 'report_exported',
  DATA_EXPORTED: 'data_exported'
};

export default logAuditAction;