import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-6 py-24 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8"><strong>Effective Date:</strong> 1 January 2026</p>
        
        <div className="prose prose-lg dark:prose-invert max-w-none space-y-8">
          <p>
            Yassu ("we", "our", or "us") respects your privacy. This Privacy Policy explains how we collect, use, and protect information when you use the Yassu platform.
          </p>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Information We Collect</h2>
            
            <h3 className="text-xl font-medium mt-6 mb-3">Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Name, email address, and profile details</li>
              <li>University or affiliation information</li>
              <li>Content you submit (ideas, messages, documents, uploads)</li>
              <li>Verification materials, where applicable</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">Information Collected Automatically</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>IP address and device information</li>
              <li>Browser type and usage data</li>
              <li>Pages viewed, actions taken, and interaction data</li>
              <li>Cookies and similar technologies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">2. How We Use Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Operate and improve the Services</li>
              <li>Verify eligibility and affiliations</li>
              <li>Enable collaboration and communication</li>
              <li>Provide support and respond to inquiries</li>
              <li>Maintain security and prevent misuse</li>
              <li>Comply with legal and regulatory obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">3. AI Processing</h2>
            <p>
              Some user content may be processed using AI services to generate summaries, workflows, or recommendations.
            </p>
            <p className="mt-4">
              We do <strong>not</strong> sell personal data.<br />
              We do <strong>not</strong> use private user content to train public AI models without authorization.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Sharing of Information</h2>
            <p>We may share information with:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Service providers (hosting, analytics, AI infrastructure)</li>
              <li>Legal authorities if required by law</li>
              <li>Parties necessary to protect Yassu's rights, users, or platform integrity</li>
            </ul>
            <p className="mt-4">We do <strong>not</strong> sell or rent personal information.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Data Retention</h2>
            <p>We retain personal information only as long as necessary to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide the Services</li>
              <li>Meet legal, accounting, or compliance requirements</li>
            </ul>
            <p className="mt-4">Users may request account deletion, subject to lawful retention obligations.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Data Security</h2>
            <p>
              We use reasonable administrative, technical, and organizational measures to protect information. However, no system is completely secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Your Rights</h2>
            <p>Depending on applicable law, you may have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your data</li>
              <li>Object to certain data processing activities</li>
            </ul>
            <p className="mt-4">
              Requests may be submitted to <a href="mailto:hello@yassu.ai" className="text-primary hover:underline">hello@yassu.ai</a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">8. Children's Privacy</h2>
            <p>
              Yassu is not intended for children under the age of 13. We do not knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">9. International Users</h2>
            <p>
              Your information may be processed in the United States or other jurisdictions. By using Yassu, you consent to such processing.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">10. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy periodically. Updates will be posted on this page with a revised effective date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">11. Contact</h2>
            <p>
              If you have questions or concerns about this Privacy Policy, contact us at <a href="mailto:hello@yassu.ai" className="text-primary hover:underline">hello@yassu.ai</a>
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
