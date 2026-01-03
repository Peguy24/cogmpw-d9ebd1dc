import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, Phone, MapPin, MessageCircle, HelpCircle, UserX, FileText, Shield } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

const Support = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Support & Help</h1>
            <p className="text-muted-foreground">
              We're here to help! Find answers to common questions or contact us directly.
            </p>
          </div>

          {/* Contact Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Contact Us
              </CardTitle>
              <CardDescription>
                Reach out to us for any questions or support needs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Email</p>
                  <a href="mailto:contact@cogmpw.org" className="text-primary underline">
                    contact@cogmpw.org
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Phone</p>
                  <p className="text-muted-foreground">Contact us via email for phone support</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Church</p>
                  <p className="text-muted-foreground">Church of God Ministries of Prayer and the Word</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FAQ Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Frequently Asked Questions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">How do I reset my password?</h4>
                <p className="text-muted-foreground text-sm">
                  On the login screen, tap "Forgot Password" and enter your email. You'll receive a link to reset your password.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">How do I manage my notifications?</h4>
                <p className="text-muted-foreground text-sm">
                  Go to your Profile settings and scroll to "Notification Preferences" to customize which notifications you receive.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">How do I cancel a recurring donation?</h4>
                <p className="text-muted-foreground text-sm">
                  Navigate to Giving → Manage Subscriptions to view and cancel any active recurring donations.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">How do I RSVP to an event?</h4>
                <p className="text-muted-foreground text-sm">
                  Open the event details and tap the "RSVP" button. You'll receive a confirmation and reminders before the event.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Is my payment information secure?</h4>
                <p className="text-muted-foreground text-sm">
                  Yes! All payments are processed securely through Stripe. We never store your complete credit card information.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Account Management */}
          <Card id="delete-account">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserX className="h-5 w-5" />
                Account Management
              </CardTitle>
              <CardDescription>
                Manage your account settings and data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Delete My Account</h4>
                <p className="text-muted-foreground text-sm">
                  To request deletion of your account and all associated data, please send an email to{" "}
                  <a href="mailto:contact@cogmpw.org?subject=Account%20Deletion%20Request&body=Please%20delete%20my%20account%20and%20all%20associated%20data.%0A%0AMy%20registered%20email%3A%20%5Benter%20your%20email%5D" className="text-primary underline">
                    contact@cogmpw.org
                  </a>
                </p>
                <p className="text-muted-foreground text-sm">
                  We will process your request within 30 days and confirm once completed.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                asChild
              >
                <a href="mailto:contact@cogmpw.org?subject=Account%20Deletion%20Request&body=Please%20delete%20my%20account%20and%20all%20associated%20data.%0A%0AMy%20registered%20email%3A%20%5Benter%20your%20email%5D">
                  <UserX className="mr-2 h-4 w-4" />
                  Request Account Deletion
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Legal Links */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Legal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/privacy-policy" className="flex items-center gap-2 text-primary hover:underline">
                <Shield className="h-4 w-4" />
                Privacy Policy
              </Link>
              <Link to="/terms-of-service" className="flex items-center gap-2 text-primary hover:underline">
                <FileText className="h-4 w-4" />
                Terms of Service
              </Link>
            </CardContent>
          </Card>

          {/* App Info */}
          <div className="text-center text-sm text-muted-foreground pt-4">
            <p>COGMPW App Version 1.0</p>
            <p>© {new Date().getFullYear()} Church of God Ministries of Prayer and the Word</p>
            <p>All rights reserved</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
