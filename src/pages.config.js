import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Payroll from './pages/Payroll';
import Reports from './pages/Reports';
import Employes from './pages/Employes';
import Paie from './pages/Paie';
import Declarations from './pages/Declarations';
import Conges from './pages/Conges';
import Visas from './pages/Visas';
import Entreprise from './pages/Entreprise';
import Parametres from './pages/Parametres';
import Compliance from './pages/Compliance';
import Expenses from './pages/Expenses';
import Leasing from './pages/Leasing';
import EmailTest from './pages/EmailTest';
import EmailDNSSetup from './pages/EmailDNSSetup';
import EmployeePortal from './pages/EmployeePortal';
import PerformanceReviews from './pages/PerformanceReviews';
import Training from './pages/Training';
import ContractRenewals from './pages/ContractRenewals';
import AuditLogs from './pages/AuditLogs';
import SMSTest from './pages/SMSTest';
import Home from './pages/Home';
import SecurityDocumentation from './pages/SecurityDocumentation';
import MigrationStrategy from './pages/MigrationStrategy';
import InvitationProcess from './pages/InvitationProcess';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFailure from './pages/PaymentFailure';
import PaymentCancelled from './pages/PaymentCancelled';
import MailManagement from './pages/MailManagement';
import VirtualReceptionist from './pages/VirtualReceptionist';
import TouristVisa from './pages/TouristVisa';
import CompanySetup from './pages/CompanySetup';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Employees": Employees,
    "Payroll": Payroll,
    "Reports": Reports,
    "Employes": Employes,
    "Paie": Paie,
    "Declarations": Declarations,
    "Conges": Conges,
    "Visas": Visas,
    "Entreprise": Entreprise,
    "Parametres": Parametres,
    "Compliance": Compliance,
    "Expenses": Expenses,
    "Leasing": Leasing,
    "EmailTest": EmailTest,
    "EmailDNSSetup": EmailDNSSetup,
    "EmployeePortal": EmployeePortal,
    "PerformanceReviews": PerformanceReviews,
    "Training": Training,
    "ContractRenewals": ContractRenewals,
    "AuditLogs": AuditLogs,
    "SMSTest": SMSTest,
    "Home": Home,
    "SecurityDocumentation": SecurityDocumentation,
    "MigrationStrategy": MigrationStrategy,
    "InvitationProcess": InvitationProcess,
    "PaymentSuccess": PaymentSuccess,
    "PaymentFailure": PaymentFailure,
    "PaymentCancelled": PaymentCancelled,
    "MailManagement": MailManagement,
    "VirtualReceptionist": VirtualReceptionist,
    "TouristVisa": TouristVisa,
    "CompanySetup": CompanySetup,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};