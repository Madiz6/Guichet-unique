/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AuditLogs from './pages/AuditLogs';
import AutresServices from './pages/AutresServices';
import BudgetManagement from './pages/BudgetManagement';
import CompanySetup from './pages/CompanySetup';
import Compliance from './pages/Compliance';
import Comptabilite from './pages/Comptabilite';
import Conges from './pages/Conges';
import Contacts from './pages/Contacts';
import ContractRenewals from './pages/ContractRenewals';
import Dashboard from './pages/Dashboard';
import Declarations from './pages/Declarations';
import EmailDNSSetup from './pages/EmailDNSSetup';
import EmailTest from './pages/EmailTest';
import EmployeePortal from './pages/EmployeePortal';
import Employees from './pages/Employees';
import Employes from './pages/Employes';
import Entreprise from './pages/Entreprise';
import Expenses from './pages/Expenses';
import FinancialForecasting from './pages/FinancialForecasting';
import GrandLivre from './pages/GrandLivre';
import Home from './pages/Home';
import InvitationProcess from './pages/InvitationProcess';
import Leasing from './pages/Leasing';
import MailManagement from './pages/MailManagement';
import MigrationStrategy from './pages/MigrationStrategy';
import Paie from './pages/Paie';
import Parametres from './pages/Parametres';
import PaymentCancelled from './pages/PaymentCancelled';
import PaymentFailure from './pages/PaymentFailure';
import PaymentSuccess from './pages/PaymentSuccess';
import Payroll from './pages/Payroll';
import PerformanceReviews from './pages/PerformanceReviews';
import PurchaseRequests from './pages/PurchaseRequests';
import Reports from './pages/Reports';
import SMSTest from './pages/SMSTest';
import SecurityDocumentation from './pages/SecurityDocumentation';
import TouristVisa from './pages/TouristVisa';
import Training from './pages/Training';
import Transactions from './pages/Transactions';
import VirtualReceptionist from './pages/VirtualReceptionist';
import Visas from './pages/Visas';
import EtatsFinanciers from './pages/EtatsFinanciers';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AuditLogs": AuditLogs,
    "AutresServices": AutresServices,
    "BudgetManagement": BudgetManagement,
    "CompanySetup": CompanySetup,
    "Compliance": Compliance,
    "Comptabilite": Comptabilite,
    "Conges": Conges,
    "Contacts": Contacts,
    "ContractRenewals": ContractRenewals,
    "Dashboard": Dashboard,
    "Declarations": Declarations,
    "EmailDNSSetup": EmailDNSSetup,
    "EmailTest": EmailTest,
    "EmployeePortal": EmployeePortal,
    "Employees": Employees,
    "Employes": Employes,
    "Entreprise": Entreprise,
    "Expenses": Expenses,
    "FinancialForecasting": FinancialForecasting,
    "GrandLivre": GrandLivre,
    "Home": Home,
    "InvitationProcess": InvitationProcess,
    "Leasing": Leasing,
    "MailManagement": MailManagement,
    "MigrationStrategy": MigrationStrategy,
    "Paie": Paie,
    "Parametres": Parametres,
    "PaymentCancelled": PaymentCancelled,
    "PaymentFailure": PaymentFailure,
    "PaymentSuccess": PaymentSuccess,
    "Payroll": Payroll,
    "PerformanceReviews": PerformanceReviews,
    "PurchaseRequests": PurchaseRequests,
    "Reports": Reports,
    "SMSTest": SMSTest,
    "SecurityDocumentation": SecurityDocumentation,
    "TouristVisa": TouristVisa,
    "Training": Training,
    "Transactions": Transactions,
    "VirtualReceptionist": VirtualReceptionist,
    "Visas": Visas,
    "EtatsFinanciers": EtatsFinanciers,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};