import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Lock, Key, Eye, AlertTriangle, CheckCircle, Database, Server, Globe, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function SecurityDocumentation() {
  const securityFeatures = [
    {
      icon: Lock,
      title: "Authentication & Authorization",
      items: [
        "Role-based access control (RBAC) - Admin and User roles",
        "Per-module permission system (view, create, edit, delete)",
        "Session management with automatic timeout",
        "Permission guards on all sensitive operations",
        "User activation/deactivation controls"
      ],
      status: "Implemented"
    },
    {
      icon: Eye,
      title: "Audit Logging",
      items: [
        "Comprehensive logging of all critical actions",
        "User identification (who, what, when)",
        "Immutable audit trail stored in database",
        "Track employee changes, payroll processing, declarations",
        "User agent and timestamp recording"
      ],
      status: "Implemented"
    },
    {
      icon: Shield,
      title: "Data Protection",
      items: [
        "HTTPS enforced for all communications",
        "Input validation on all forms",
        "SQL injection protection via ORM",
        "XSS protection through React escaping",
        "Secure file upload with validation"
      ],
      status: "Implemented"
    },
    {
      icon: Database,
      title: "Data Security",
      items: [
        "Database encryption at rest",
        "Secure credential storage",
        "Automated backups",
        "Data isolation per organization",
        "Secure deletion policies"
      ],
      status: "Platform-Managed"
    }
  ];

  const auditedActions = [
    { category: "Employee Management", actions: ["Create", "Update", "Delete", "Suspend", "Reactivate"] },
    { category: "Payroll", actions: ["Create Cycle", "Process Payment", "Generate Payslip", "Email Payslip"] },
    { category: "Declarations", actions: ["Create Declaration", "Payment", "Delete"] },
    { category: "Holidays", actions: ["Request", "Approve", "Reject", "Cancel"] },
    { category: "User Management", actions: ["Permission Changes", "Activation", "Deactivation"] },
    { category: "Exports", actions: ["Report Export", "Data Export"] }
  ];

  const migrationPhases = [
    {
      phase: "Phase 1: Enhanced Security (Current)",
      timeline: "Completed",
      items: [
        "✅ RBAC implementation",
        "✅ Audit logging system",
        "✅ Permission guards",
        "✅ SMS/Email notifications for sensitive actions"
      ]
    },
    {
      phase: "Phase 2: External Authentication (Recommended)",
      timeline: "3-6 months",
      items: [
        "🔄 Integrate OIDC provider (Auth0, Okta, or Keycloak)",
        "🔄 Implement MFA for admin users",
        "🔄 Short-lived JWT tokens with refresh mechanism",
        "🔄 HttpOnly cookies for token storage"
      ]
    },
    {
      phase: "Phase 3: API Gateway & Microservices",
      timeline: "6-12 months",
      items: [
        "🔄 Deploy API Gateway (Kong, AWS API Gateway)",
        "🔄 Separate microservices: Payroll, HR, Declarations, Reporting",
        "🔄 Service-to-service authentication",
        "🔄 Rate limiting and throttling"
      ]
    },
    {
      phase: "Phase 4: Advanced Security",
      timeline: "12+ months",
      items: [
        "🔄 Web Application Firewall (WAF)",
        "🔄 SIEM integration (Splunk, ELK)",
        "🔄 Penetration testing",
        "🔄 SOC 2 / ISO 27001 compliance"
      ]
    }
  ];

  const bestPractices = [
    {
      category: "Access Control",
      practices: [
        "Always use PermissionGuard component for sensitive features",
        "Check permissions both in UI and backend",
        "Implement least privilege principle",
        "Regular permission audits",
        "Immediate revocation on user deactivation"
      ]
    },
    {
      category: "Data Handling",
      practices: [
        "Validate all user inputs server-side",
        "Sanitize data before display",
        "Use parameterized queries",
        "Never expose sensitive data in logs",
        "Encrypt sensitive data at rest"
      ]
    },
    {
      category: "Audit & Monitoring",
      practices: [
        "Log all state-changing operations",
        "Include context in audit logs (who, what, when, why)",
        "Regular audit log reviews",
        "Set up alerts for suspicious activities",
        "Retain logs for compliance period"
      ]
    },
    {
      category: "Incident Response",
      practices: [
        "Document incident response procedures",
        "Regular security drills",
        "Maintain contact list for security team",
        "Backup and disaster recovery plans",
        "Post-incident reviews and improvements"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="icon" className="border-[#D3DCE6]">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-[#0A2540]">Security Documentation</h1>
            <p className="text-[#697586] mt-1">Comprehensive security architecture and best practices</p>
          </div>
        </motion.div>

        {/* Security Overview */}
        <Card className="mb-6 border-2 border-[#6366F1]">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-[#0F172A] mb-2">Security First Approach</h2>
                <p className="text-[#64748B] leading-relaxed">
                  Paie360 implements enterprise-grade security controls to protect your sensitive HR and payroll data. 
                  This document outlines our current security implementation, audit capabilities, and roadmap for achieving 
                  bank-grade security standards.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Security Features */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#0F172A] mb-4 flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-500" />
            Current Security Implementation
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {securityFeatures.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="h-full border-2 border-[#E5E7EB] hover:border-[#6366F1] hover:shadow-lg transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-lg flex items-center justify-center">
                        <feature.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-[#0F172A]">{feature.title}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          feature.status === 'Implemented' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {feature.status}
                        </span>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {feature.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[#64748B]">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Audited Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#0F172A] mb-4 flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#6366F1]" />
            Audited Actions
          </h2>
          <Card className="border-2 border-[#E5E7EB]">
            <CardContent className="p-6">
              <p className="text-[#64748B] mb-6">
                All critical system actions are logged with user identification, timestamp, and action details. 
                Logs are immutable and stored permanently for compliance and security analysis.
              </p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {auditedActions.map((category, idx) => (
                  <div key={idx} className="bg-[#F7F9FC] rounded-lg p-4">
                    <h4 className="font-semibold text-[#0F172A] mb-3">{category.category}</h4>
                    <div className="space-y-2">
                      {category.actions.map((action, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-[#64748B]">
                          <div className="w-1.5 h-1.5 bg-[#6366F1] rounded-full"></div>
                          <span>{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                <p className="text-sm text-blue-900">
                  <strong>💡 Tip:</strong> Access audit logs from <Link to={createPageUrl('AuditLogs')} className="underline font-semibold">Settings → Audit Logs</Link> to review all system activities.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Migration Roadmap */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#0F172A] mb-4 flex items-center gap-2">
            <Server className="w-6 h-6 text-[#6366F1]" />
            Migration to Bank-Grade Security
          </h2>
          <div className="space-y-4">
            {migrationPhases.map((phase, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="border-2 border-[#E5E7EB] hover:shadow-lg transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        idx === 0 ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        <span className="font-bold">{idx + 1}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-bold text-[#0F172A]">{phase.phase}</h3>
                          <span className="text-sm text-[#64748B] font-medium">{phase.timeline}</span>
                        </div>
                        <ul className="space-y-2">
                          {phase.items.map((item, i) => (
                            <li key={i} className="text-sm text-[#64748B]">{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Best Practices */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#0F172A] mb-4 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-[#F59E0B]" />
            Security Best Practices
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {bestPractices.map((category, idx) => (
              <Card key={idx} className="border-2 border-[#E5E7EB]">
                <CardContent className="p-6">
                  <h3 className="font-bold text-[#0F172A] mb-4">{category.category}</h3>
                  <ul className="space-y-3">
                    {category.practices.map((practice, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-[#64748B]">
                        <CheckCircle className="w-4 h-4 text-[#6366F1] flex-shrink-0 mt-0.5" />
                        <span>{practice}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Security Contacts */}
        <Card className="border-2 border-[#EF4444]">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-[#0F172A] mb-2">Security Incident Reporting</h3>
                <p className="text-[#64748B] mb-4">
                  If you discover a security vulnerability or suspicious activity, please report it immediately:
                </p>
                <div className="space-y-2 text-sm">
                  <p><strong>Email:</strong> security@paie360.com</p>
                  <p><strong>Phone:</strong> +253 XX XX XX XX (24/7 Security Hotline)</p>
                  <p><strong>Response Time:</strong> Critical issues &lt; 1 hour, High priority &lt; 4 hours</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}