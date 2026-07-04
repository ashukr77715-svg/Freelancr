import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GuestRoute, ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LoginPage } from "@/pages/auth/Login";
import { SignupPage } from "@/pages/auth/Signup";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPassword";
import { ResetPasswordPage } from "@/pages/auth/ResetPassword";
import { LandingPage } from "@/pages/Landing";
import { DashboardPage } from "@/pages/Dashboard";
import { ClientsPage } from "@/pages/Clients";
import { ClientDetailPage } from "@/pages/ClientDetail";
import { ProposalsPage } from "@/pages/Proposals";
import { ProposalNewPage } from "@/pages/ProposalNew";
import { ProposalDetailPage } from "@/pages/ProposalDetail";
import { InvoicesPage } from "@/pages/Invoices";
import { InvoiceFormPage } from "@/pages/InvoiceForm";
import { InvoiceDetailPage } from "@/pages/InvoiceDetail";
import { SettingsPage } from "@/pages/Settings";
import { BillingPage } from "@/pages/Billing";

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />

            <Route element={<GuestRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/clients" element={<ClientsPage />} />
                <Route path="/clients/:id" element={<ClientDetailPage />} />
                <Route path="/proposals" element={<ProposalsPage />} />
                <Route path="/proposals/new" element={<ProposalNewPage />} />
                <Route path="/proposals/:id" element={<ProposalDetailPage />} />
                <Route path="/invoices" element={<InvoicesPage />} />
                <Route path="/invoices/new" element={<InvoiceFormPage />} />
                <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
                <Route path="/invoices/:id/edit" element={<InvoiceFormPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/billing" element={<BillingPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </ErrorBoundary>
  );
}
