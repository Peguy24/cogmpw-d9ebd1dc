import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TermsOfService = () => {
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
            <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Acceptance of Terms</h2>
            <p className="text-foreground/90 leading-relaxed">
              By downloading, installing, or using the COGMPW mobile application ("App"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the App.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. Description of Service</h2>
            <p className="text-foreground/90 leading-relaxed">
              COGMPW is a church community application that provides:
            </p>
            <ul className="list-disc list-inside space-y-2 text-foreground/90 ml-4">
              <li>Access to sermons, devotionals, and church news</li>
              <li>Event management and RSVP functionality</li>
              <li>Online donation and giving features</li>
              <li>Community chat and prayer request features</li>
              <li>Push notifications for church announcements</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. User Accounts</h2>
            <p className="text-foreground/90 leading-relaxed">
              To access certain features of the App, you must create an account. You are responsible for:
            </p>
            <ul className="list-disc list-inside space-y-2 text-foreground/90 ml-4">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Providing accurate and complete information during registration</li>
              <li>Notifying us immediately of any unauthorized use of your account</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. User Conduct</h2>
            <p className="text-foreground/90 leading-relaxed">
              When using the App, you agree not to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-foreground/90 ml-4">
              <li>Post content that is offensive, defamatory, or inappropriate</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Use the App for any illegal purposes</li>
              <li>Attempt to gain unauthorized access to the App or its systems</li>
              <li>Interfere with or disrupt the App's functionality</li>
              <li>Share misleading or false information</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Donations and Payments</h2>
            <p className="text-foreground/90 leading-relaxed">
              All donations made through the App are processed securely by Stripe. By making a donation, you acknowledge that:
            </p>
            <ul className="list-disc list-inside space-y-2 text-foreground/90 ml-4">
              <li>All donations are voluntary contributions to COGMPW</li>
              <li>Donations are non-refundable unless required by law</li>
              <li>You are authorized to use the payment method provided</li>
              <li>Recurring donations can be cancelled at any time through the App</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Intellectual Property</h2>
            <p className="text-foreground/90 leading-relaxed">
              All content in the App, including sermons, devotionals, images, and other materials, is the property of COGMPW or its content providers. You may not reproduce, distribute, or create derivative works without prior written permission.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">7. Privacy</h2>
            <p className="text-foreground/90 leading-relaxed">
              Your use of the App is also governed by our{" "}
              <a href="/privacy-policy" className="text-primary underline hover:text-primary/80">
                Privacy Policy
              </a>
              . Please review it to understand how we collect, use, and protect your information.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">8. Disclaimer of Warranties</h2>
            <p className="text-foreground/90 leading-relaxed">
              The App is provided "as is" without warranties of any kind, either express or implied. We do not warrant that the App will be uninterrupted, error-free, or free of viruses or other harmful components.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">9. Limitation of Liability</h2>
            <p className="text-foreground/90 leading-relaxed">
              To the fullest extent permitted by law, COGMPW shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the App.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">10. Termination</h2>
            <p className="text-foreground/90 leading-relaxed">
              We reserve the right to suspend or terminate your access to the App at any time for violation of these terms or for any other reason at our discretion. You may also delete your account at any time by contacting us.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">11. Changes to Terms</h2>
            <p className="text-foreground/90 leading-relaxed">
              We may update these Terms of Service from time to time. We will notify you of any significant changes through the App or via email. Your continued use of the App after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">12. Contact Us</h2>
            <p className="text-foreground/90 leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-foreground">
                <strong>Email:</strong>{" "}
                <a href="mailto:ministryofprayer2@gmail.com" className="text-primary underline">
                  ministryofprayer2@gmail.com
                </a>
              </p>
              <p className="text-foreground mt-2">
                <strong>Church:</strong> Church of God Ministries of Prayer and the Word
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
