import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Server, Globe, Shield, Database, Zap, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function MigrationStrategy() {
  const currentArchitecture = {
    title: "Current Architecture (Monolithic SaaS)",
    description: "Single application on base44 platform with integrated auth, database, and hosting",
    pros: [
      "Fast development and deployment",
      "All-in-one solution",
      "Built-in authentication and database",
      "Easy maintenance"
    ],
    cons: [
      "Limited customization of auth flow",
      "Cannot implement custom MFA",
      "Single database instance",
      "Coupled modules"
    ]
  };

  const targetArchitecture = {
    title: "Target Architecture (Microservices + API Gateway)",
    description: "Distributed system with dedicated services, API gateway, and external auth provider",
    benefits: [
      "Custom authentication (OIDC/OAuth2 + PKCE)",
      "Multi-factor authentication",
      "Independent service scaling",
      "Better security isolation",
      "Technology flexibility per service"
    ],
    challenges: [
      "Increased operational complexity",
      "Higher infrastructure costs",
      "Need for DevOps expertise",
      "More monitoring requirements"
    ]
  };

  const migrationPhases = [
    {
      phase: 1,
      title: "Foundation & Planning",
      duration: "Month 1-2",
      tasks: [
        {
          task: "Security Audit",
          details: "Comprehensive review of current security posture, identify gaps and compliance requirements"
        },
        {
          task: "Architecture Design",
          details: "Design target microservices architecture, API contracts, and data flows"
        },
        {
          task: "Tool Selection",
          details: "Choose auth provider (Auth0/Okta), API gateway, cloud provider, monitoring tools"
        },
        {
          task: "Team Training",
          details: "Train team on microservices, Kubernetes, security best practices"
        }
      ],
      deliverables: ["Security audit report", "Target architecture diagram", "Technology stack decisions", "Migration roadmap"]
    },
    {
      phase: 2,
      title: "External Authentication",
      duration: "Month 3-4",
      tasks: [
        {
          task: "Auth Provider Setup",
          details: "Configure Auth0/Okta with OIDC, set up user federation"
        },
        {
          task: "MFA Implementation",
          details: "Implement multi-factor authentication for admin users"
        },
        {
          task: "Token Management",
          details: "Implement JWT with short expiry, refresh tokens in HttpOnly cookies"
        },
        {
          task: "Frontend Integration",
          details: "Update frontend to use Authorization Code + PKCE flow"
        }
      ],
      deliverables: ["Working OIDC authentication", "MFA for admins", "Secure token management", "Updated login flow"]
    },
    {
      phase: 3,
      title: "API Gateway & Service Extraction",
      duration: "Month 5-7",
      tasks: [
        {
          task: "API Gateway Setup",
          details: "Deploy Kong/AWS API Gateway with rate limiting, authentication"
        },
        {
          task: "Extract Core Services",
          details: "Separate Payroll, HR, Declarations into independent services"
        },
        {
          task: "Service-to-Service Auth",
          details: "Implement mutual TLS or API keys for internal communication"
        },
        {
          task: "Database Migration",
          details: "Separate databases per service, implement data synchronization"
        }
      ],
      deliverables: ["API Gateway deployed", "3-4 independent microservices", "Service authentication", "Data migration strategy"]
    },
    {
      phase: 4,
      title: "Security Hardening",
      duration: "Month 8-9",
      tasks: [
        {
          task: "WAF Deployment",
          details: "Deploy Web Application Firewall (Cloudflare, AWS WAF)"
        },
        {
          task: "SIEM Integration",
          details: "Set up centralized logging and security monitoring"
        },
        {
          task: "Penetration Testing",
          details: "Hire external firm for comprehensive penetration testing"
        },
        {
          task: "Compliance Audit",
          details: "Prepare for SOC 2 / ISO 27001 certification"
        }
      ],
      deliverables: ["WAF active", "SIEM deployed", "Penetration test report", "Compliance documentation"]
    },
    {
      phase: 5,
      title: "Production Deployment & Optimization",
      duration: "Month 10-12",
      tasks: [
        {
          task: "Gradual Rollout",
          details: "Blue-green deployment, canary releases, feature flags"
        },
        {
          task: "Performance Optimization",
          details: "Load testing, caching strategies, CDN setup"
        },
        {
          task: "Monitoring & Alerting",
          details: "Set up Datadog/New Relic, alert configurations"
        },
        {
          task: "Documentation",
          details: "Update all technical and operational documentation"
        }
      ],
      deliverables: ["Production deployment", "Performance benchmarks", "Monitoring dashboards", "Complete documentation"]
    }
  ];

  const technologies = {
    authentication: [
      { name: "Auth0", pros: "Easy setup, great docs", cons: "Can be expensive at scale" },
      { name: "Keycloak", pros: "Open source, self-hosted", cons: "Requires more management" },
      { name: "Okta", pros: "Enterprise grade", cons: "Higher cost" }
    ],
    apiGateway: [
      { name: "Kong", pros: "Feature rich, plugins", cons: "Learning curve" },
      { name: "AWS API Gateway", pros: "Managed service", cons: "AWS lock-in" },
      { name: "Traefik", pros: "Cloud native", cons: "Less enterprise features" }
    ],
    hosting: [
      { name: "AWS", pros: "Most comprehensive", cons: "Complex pricing" },
      { name: "Google Cloud", pros: "Good for data/AI", cons: "Smaller ecosystem" },
      { name: "Azure", pros: "Microsoft integration", cons: "Learning curve" }
    ]
  };

  const costEstimation = [
    { category: "Infrastructure (Hosting, DB, Storage)", monthly: "$500-2000", annual: "$6K-24K", notes: "Depends on scale" },
    { category: "Authentication Service (Auth0/Okta)", monthly: "$200-800", annual: "$2.4K-9.6K", notes: "Based on MAU" },
    { category: "Monitoring & Logging", monthly: "$100-500", annual: "$1.2K-6K", notes: "Per data volume" },
    { category: "Security Tools (WAF, SIEM)", monthly: "$300-1000", annual: "$3.6K-12K", notes: "Enterprise tier" },
    { category: "Development & Migration", oneTime: "$50K-150K", notes: "6-12 months project" },
    { category: "Ongoing Operations", monthly: "$2000-5000", annual: "$24K-60K", notes: "DevOps team" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <Link to={createPageUrl('SecurityDocumentation')}>
            <Button variant="outline" size="icon" className="border-[#D3DCE6]">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-[#0A2540]">Migration to Microservices Architecture</h1>
            <p className="text-[#697586] mt-1">Complete roadmap from monolithic to bank-grade distributed system</p>
          </div>
        </motion.div>

        {/* Architecture Comparison */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="border-2 border-[#E5E7EB]">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Server className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-[#0F172A]">{currentArchitecture.title}</h3>
                  <p className="text-xs text-[#64748B]">Current State</p>
                </div>
              </div>
              <p className="text-sm text-[#64748B] mb-4">{currentArchitecture.description}</p>
              
              <div className="mb-4">
                <h4 className="font-semibold text-sm text-green-600 mb-2">Advantages:</h4>
                <ul className="space-y-1">
                  {currentArchitecture.pros.map((pro, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#64748B]">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{pro}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-sm text-orange-600 mb-2">Limitations:</h4>
                <ul className="space-y-1">
                  {currentArchitecture.cons.map((con, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#64748B]">
                      <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      <span>{con}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-[#6366F1]">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-lg flex items-center justify-center">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-[#0F172A]">{targetArchitecture.title}</h3>
                  <p className="text-xs text-[#64748B]">Target State</p>
                </div>
              </div>
              <p className="text-sm text-[#64748B] mb-4">{targetArchitecture.description}</p>
              
              <div className="mb-4">
                <h4 className="font-semibold text-sm text-green-600 mb-2">Benefits:</h4>
                <ul className="space-y-1">
                  {targetArchitecture.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#64748B]">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-sm text-orange-600 mb-2">Challenges:</h4>
                <ul className="space-y-1">
                  {targetArchitecture.challenges.map((challenge, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#64748B]">
                      <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      <span>{challenge}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Migration Phases */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#0F172A] mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-[#6366F1]" />
            12-Month Migration Roadmap
          </h2>
          <div className="space-y-6">
            {migrationPhases.map((phase, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="border-2 border-[#E5E7EB] hover:border-[#6366F1] hover:shadow-lg transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                        {phase.phase}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xl font-bold text-[#0F172A]">{phase.title}</h3>
                          <span className="text-sm font-medium text-[#64748B] px-3 py-1 bg-[#F7F9FC] rounded-full">
                            {phase.duration}
                          </span>
                        </div>
                        
                        <div className="space-y-3 mb-4">
                          {phase.tasks.map((item, i) => (
                            <div key={i} className="bg-[#F7F9FC] rounded-lg p-3">
                              <h4 className="font-semibold text-[#0F172A] mb-1">{item.task}</h4>
                              <p className="text-sm text-[#64748B]">{item.details}</p>
                            </div>
                          ))}
                        </div>
                        
                        <div>
                          <h4 className="font-semibold text-[#0F172A] mb-2 text-sm">Deliverables:</h4>
                          <div className="flex flex-wrap gap-2">
                            {phase.deliverables.map((deliverable, i) => (
                              <span key={i} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                ✓ {deliverable}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Technology Stack */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#0F172A] mb-4 flex items-center gap-2">
            <Zap className="w-6 h-6 text-[#6366F1]" />
            Technology Stack Recommendations
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {Object.entries(technologies).map(([category, options], idx) => (
              <Card key={idx} className="border-2 border-[#E5E7EB]">
                <CardContent className="p-6">
                  <h3 className="font-bold text-[#0F172A] mb-4 capitalize">
                    {category.replace(/([A-Z])/g, ' $1').trim()}
                  </h3>
                  <div className="space-y-3">
                    {options.map((tech, i) => (
                      <div key={i} className="bg-[#F7F9FC] rounded-lg p-3">
                        <h4 className="font-semibold text-[#0F172A] mb-1">{tech.name}</h4>
                        <p className="text-xs text-green-600 mb-1">✓ {tech.pros}</p>
                        <p className="text-xs text-orange-600">⚠ {tech.cons}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Cost Estimation */}
        <Card className="border-2 border-[#6366F1]">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold text-[#0F172A] mb-4 flex items-center gap-2">
              <Database className="w-6 h-6 text-[#6366F1]" />
              Cost Estimation
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-[#E5E7EB]">
                    <th className="text-left py-3 px-4 font-semibold text-[#0F172A]">Category</th>
                    <th className="text-right py-3 px-4 font-semibold text-[#0F172A]">Monthly</th>
                    <th className="text-right py-3 px-4 font-semibold text-[#0F172A]">Annual</th>
                    <th className="text-left py-3 px-4 font-semibold text-[#0F172A]">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {costEstimation.map((cost, idx) => (
                    <tr key={idx} className="border-b border-[#E5E7EB]">
                      <td className="py-3 px-4 text-[#64748B]">{cost.category}</td>
                      <td className="py-3 px-4 text-right font-medium text-[#0F172A]">
                        {cost.monthly || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-[#0F172A]">
                        {cost.annual || cost.oneTime || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-[#64748B]">{cost.notes}</td>
                    </tr>
                  ))}
                  <tr className="bg-[#F7F9FC] font-bold">
                    <td className="py-3 px-4 text-[#0F172A]">Estimated Total (Year 1)</td>
                    <td className="py-3 px-4 text-right text-[#0F172A]">-</td>
                    <td className="py-3 px-4 text-right text-[#6366F1] text-lg">$90K-180K</td>
                    <td className="py-3 px-4 text-sm text-[#64748B]">Including migration</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
              <p className="text-sm text-blue-900">
                <strong>💡 Note:</strong> These are estimates. Actual costs depend on usage, scale, and chosen vendors. 
                Consider starting with lower tiers and scaling up as needed.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}