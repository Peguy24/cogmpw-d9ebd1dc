import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
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
            <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Introduction</h2>
            <p className="text-foreground/90 leading-relaxed">
              COGMPW ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Information We Collect</h2>
            
            <div className="space-y-3">
              <h3 className="text-xl font-medium">Personal Information</h3>
              <p className="text-foreground/90 leading-relaxed">
                When you register for an account, we collect:
              </p>
              <ul className="list-disc list-inside space-y-2 text-foreground/90 ml-4">
                <li>Full name</li>
                <li>Email address</li>
                <li>Phone number (optional)</li>
                <li>Church affiliation and ministry involvement</li>
                <li>Profile photo (optional)</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-xl font-medium">Donation Information</h3>
              <p className="text-foreground/90 leading-relaxed">
                When you make donations through our app, we collect payment information processed securely by Stripe. We do not store your complete credit card information on our servers.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-xl font-medium">Usage Information</h3>
              <p className="text-foreground/90 leading-relaxed">
                We collect information about your interactions with the app, including event RSVPs, content you view, and notification preferences.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">How We Use Your Information</h2>
            <p className="text-foreground/90 leading-relaxed">We use the collected information to:</p>
            <ul className="list-disc list-inside space-y-2 text-foreground/90 ml-4">
              <li>Provide and maintain our services</li>
              <li>Process your donations and maintain giving records</li>
              <li>Send you church announcements, event reminders, and notifications</li>
              <li>Manage event RSVPs and attendance tracking</li>
              <li>Improve our app's functionality and user experience</li>
              <li>Communicate with you about your account or church activities</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Push Notifications</h2>
            <p className="text-foreground/90 leading-relaxed">
              We use push notifications to send you important church announcements, event reminders, and updates. You can opt out of non-essential notifications at any time through your device settings.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Third-Party Services</h2>
            <p className="text-foreground/90 leading-relaxed">
              We use the following third-party services:
            </p>
            <ul className="list-disc list-inside space-y-2 text-foreground/90 ml-4">
              <li><strong>Stripe:</strong> For secure payment processing of donations</li>
              <li><strong>Email Service:</strong> For sending donation receipts and notifications</li>
              <li><strong>Cloud Storage:</strong> For hosting media content (sermons, event photos)</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Data Security</h2>
            <p className="text-foreground/90 leading-relaxed">
              We implement appropriate security measures to protect your personal information. All data is encrypted in transit and at rest. Payment information is handled securely through Stripe's PCI-compliant infrastructure.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Data Sharing and Disclosure</h2>
            <p className="text-foreground/90 leading-relaxed">
              We do not sell your personal information. We may share your information only:
            </p>
            <ul className="list-disc list-inside space-y-2 text-foreground/90 ml-4">
              <li>With your consent</li>
              <li>With church leadership for ministry coordination (name, contact info, ministry involvement)</li>
              <li>To comply with legal obligations</li>
              <li>With service providers who assist in operating our app (under strict confidentiality agreements)</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Your Rights</h2>
            <p className="text-foreground/90 leading-relaxed">You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 text-foreground/90 ml-4">
              <li>Access your personal information</li>
              <li>Update or correct your information through your profile settings</li>
              <li>Control your phone number visibility</li>
              <li>Delete your account and associated data</li>
              <li>Opt out of non-essential notifications</li>
              <li>Request a copy of your donation history</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Children's Privacy</h2>
            <p className="text-foreground/90 leading-relaxed">
              Our app is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Changes to This Privacy Policy</h2>
            <p className="text-foreground/90 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Contact Us</h2>
            <p className="text-foreground/90 leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-foreground/90">COGMPW Church</p>
              <p className="text-foreground/90">Email: contact@cogmpw.org</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;