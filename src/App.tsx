import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import PendingApproval from "./pages/PendingApproval";
import AdminApprovals from "./pages/AdminApprovals";
import AdminUserManagement from "./pages/AdminUserManagement";
import AdminGivingReports from "./pages/AdminGivingReports";
import AdminCampaigns from "./pages/AdminCampaigns";
import AdminCampaignAnalytics from "./pages/AdminCampaignAnalytics";
import Giving from "./pages/Giving";
import GivingHistory from "./pages/GivingHistory";
import GivingCampaigns from "./pages/GivingCampaigns";
import CampaignDetails from "./pages/CampaignDetails";
import ManageSubscriptions from "./pages/ManageSubscriptions";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import GuestLanding from "./pages/GuestLanding";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  usePushNotifications();
  
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/guest" element={<GuestLanding />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/home" element={<Home />} />
      <Route path="/pending-approval" element={<PendingApproval />} />
      <Route path="/admin/approvals" element={<AdminApprovals />} />
      <Route path="/admin/users" element={<AdminUserManagement />} />
      <Route path="/admin/giving" element={<AdminGivingReports />} />
      <Route path="/admin/campaigns" element={<AdminCampaigns />} />
      <Route path="/admin/campaigns/analytics" element={<AdminCampaignAnalytics />} />
      <Route path="/giving" element={<Giving />} />
      <Route path="/giving-history" element={<GivingHistory />} />
      <Route path="/campaigns" element={<GivingCampaigns />} />
      <Route path="/campaign/:id" element={<CampaignDetails />} />
      <Route path="/manage-subscriptions" element={<ManageSubscriptions />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
