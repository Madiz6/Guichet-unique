import Home from './pages/Home';
import SecurityDocumentation from './pages/SecurityDocumentation';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancelled from './pages/PaymentCancelled';
import PaymentFailure from './pages/PaymentFailure';
import __Layout from './Layout.jsx';

export const PAGES = {
    "Home": Home,
    "SecurityDocumentation": SecurityDocumentation,
    "PaymentSuccess": PaymentSuccess,
    "PaymentCancelled": PaymentCancelled,
    "PaymentFailure": PaymentFailure,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};