import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useDeepLinks } from "@/hooks/useDeepLinks";
import { useClearPaymentLoadingOnResume } from "@/hooks/useClearPaymentLoadingOnResume";
import { subscribePaymentLoading } from "@/hooks/usePaymentLoading";
import { PaymentLoadingOverlay } from "@/components/PaymentLoadingOverlay";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import PendingApproval from "./pages/PendingApproval";
import AdminApprovals from "./pages/AdminApprovals";
import AdminUserManagement from "./pages/AdminUserManagement";
import AdminGivingReports from "./pages/AdminGivingReports";
import AdminCampaigns from "./pages/AdminCampaigns";
import AdminCampaignAnalytics from "./pages/AdminCampaignAnalytics";
import AdminPrayerRequests from "./pages/AdminPrayerRequests";
import Giving from "./pages/Giving";
import GivingHistory from "./pages/GivingHistory";
import GivingCampaigns from "./pages/GivingCampaigns";
import CampaignDetails from "./pages/CampaignDetails";
import ManageSubscriptions from "./pages/ManageSubscriptions";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import GuestLanding from "./pages/GuestLanding";
import GuestEvents from "./pages/GuestEvents";
import GuestSermons from "./pages/GuestSermons";
import GuestDevotionals from "./pages/GuestDevotionals";
import MyPrayerRequests from "./pages/MyPrayerRequests";
import DonationSuccess from "./pages/DonationSuccess";
import ReturnToApp from "./pages/ReturnToApp";
import CommunityChat from "./pages/CommunityChat";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  
  usePushNotifications();
  useDeepLinks(); // Handle deep links from Stripe payment redirects
  useClearPaymentLoadingOnResume(); // Clear overlay when the user returns to the app

  useEffect(() => {
    const unsubscribe = subscribePaymentLoading(setIsPaymentLoading);
    return unsubscribe;
  }, []);
  
  return (
    <>
      <PaymentLoadingOverlay isVisible={isPaymentLoading} />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/guest" element={<GuestLanding />} />
        <Route path="/guest/events" element={<GuestEvents />} />
        <Route path="/guest/sermons" element={<GuestSermons />} />
        <Route path="/guest/devotionals" element={<GuestDevotionals />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/home" element={<Home />} />
        <Route path="/pending-approval" element={<PendingApproval />} />
        <Route path="/admin/approvals" element={<AdminApprovals />} />
        <Route path="/admin/users" element={<AdminUserManagement />} />
        <Route path="/admin/giving" element={<AdminGivingReports />} />
        <Route path="/admin/campaigns" element={<AdminCampaigns />} />
        <Route path="/admin/campaigns/analytics" element={<AdminCampaignAnalytics />} />
        <Route path="/admin/prayer-requests" element={<AdminPrayerRequests />} />
        <Route path="/my-prayer-requests" element={<MyPrayerRequests />} />
        <Route path="/giving" element={<Giving />} />
        <Route path="/giving-history" element={<GivingHistory />} />
        <Route path="/campaigns" element={<GivingCampaigns />} />
        <Route path="/campaign/:id" element={<CampaignDetails />} />
        <Route path="/manage-subscriptions" element={<ManageSubscriptions />} />
        <Route path="/community-chat" element={<CommunityChat />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/donation-success" element={<DonationSuccess />} />
        <Route path="/return-to-app" element={<ReturnToApp />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};
const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          {/* Global safe area so every page sits below the status bar / camera */}
          <div
            className="app-safe-area"
            style={{ paddingTop: 'env(safe-area-inset-top, 20px)' }}
          >
            <AppContent />
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
