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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  usePushNotifications();
  
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/home" element={<Home />} />
      <Route path="/pending-approval" element={<PendingApproval />} />
      <Route path="/admin/approvals" element={<AdminApprovals />} />
      <Route path="/admin/users" element={<AdminUserManagement />} />
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
