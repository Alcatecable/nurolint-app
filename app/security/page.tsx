import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Security & Compliance | NeuroLint",
  description: "Learn about NeuroLint's security practices, data protection, and compliance certifications.",
};

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-12">
          <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">
            &larr; Back to Home
          </Link>
        </div>
        
        <h1 className="text-4xl font-bold text-white mb-8">Security & Compliance</h1>
        
        <div className="space-y-12">
          <section className="bg-slate-800/50 rounded-xl p-8 border border-slate-700">
            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-3">
              <span className="text-green-400">&#128274;</span>
              Data Encryption
            </h2>
            <ul className="space-y-3 text-slate-300">
              <li className="flex items-start gap-3">
                <span className="text-green-400 mt-1">&#10003;</span>
                <span><strong>In Transit:</strong> All data is encrypted using TLS 1.3 with strong cipher suites</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 mt-1">&#10003;</span>
                <span><strong>At Rest:</strong> AES-256-GCM encryption for all stored data</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 mt-1">&#10003;</span>
                <span><strong>Secrets:</strong> API keys and tokens are hashed using bcrypt with work factor 12</span>
              </li>
            </ul>
          </section>
          
          <section className="bg-slate-800/50 rounded-xl p-8 border border-slate-700">
            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-3">
              <span className="text-blue-400">&#9729;</span>
              Infrastructure Security
            </h2>
            <ul className="space-y-3 text-slate-300">
              <li className="flex items-start gap-3">
                <span className="text-green-400 mt-1">&#10003;</span>
                <span><strong>Cloud Provider:</strong> Hosted on Supabase (SOC 2 Type II certified)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 mt-1">&#10003;</span>
                <span><strong>Database:</strong> PostgreSQL with Row-Level Security (RLS) policies</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 mt-1">&#10003;</span>
                <span><strong>Backups:</strong> Automated daily backups with point-in-time recovery</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 mt-1">&#10003;</span>
                <span><strong>Monitoring:</strong> 24/7 infrastructure monitoring and alerting</span>
              </li>
            </ul>
          </section>
          
          <section className="bg-slate-800/50 rounded-xl p-8 border border-slate-700">
            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-3">
              <span className="text-purple-400">&#128100;</span>
              Authentication & Access Control
            </h2>
            <ul className="space-y-3 text-slate-300">
              <li className="flex items-start gap-3">
                <span className="text-green-400 mt-1">&#10003;</span>
                <span><strong>Password Security:</strong> bcrypt hashing with adaptive work factors</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 mt-1">&#10003;</span>
                <span><strong>Session Management:</strong> Secure JWT tokens with short expiry</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 mt-1">&#10003;</span>
                <span><strong>OAuth 2.0:</strong> GitHub and other provider integrations</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 mt-1">&#10003;</span>
                <span><strong>RBAC:</strong> Role-Based Access Control with granular permissions</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 mt-1">&#10003;</span>
                <span><strong>Audit Logs:</strong> Complete activity logging for compliance</span>
              </li>
            </ul>
          </section>
          
          <section className="bg-slate-800/50 rounded-xl p-8 border border-slate-700">
            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-3">
              <span className="text-yellow-400">&#9888;</span>
              Compliance
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-2">GDPR Compliance</h3>
                <p className="text-slate-300">
                  We process personal data in accordance with the General Data Protection Regulation (GDPR). 
                  Users have the right to access, rectify, and delete their personal data at any time.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-white mb-2">SOC 2 Progress</h3>
                <p className="text-slate-300">
                  We are actively working toward SOC 2 Type II certification. Our infrastructure 
                  partners (Supabase) are already SOC 2 Type II certified.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-white mb-2">Data Retention</h3>
                <p className="text-slate-300">
                  Analysis data is retained for the duration of your subscription. Upon account 
                  deletion, all personal data is permanently removed within 30 days.
                </p>
              </div>
            </div>
          </section>
          
          <section className="bg-slate-800/50 rounded-xl p-8 border border-slate-700">
            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-3">
              <span className="text-red-400">&#128681;</span>
              Vulnerability Disclosure
            </h2>
            <p className="text-slate-300 mb-4">
              If you discover a security vulnerability, please report it responsibly:
            </p>
            <ul className="space-y-2 text-slate-300">
              <li>Email: <a href="mailto:security@neurolint.dev" className="text-blue-400 hover:underline">security@neurolint.dev</a></li>
              <li>PGP Key: Available at <code className="bg-slate-700 px-2 py-1 rounded">/.well-known/security.txt</code></li>
            </ul>
            <p className="text-slate-400 mt-4 text-sm">
              We aim to respond to security reports within 24 hours and will work with researchers 
              to address vulnerabilities promptly.
            </p>
          </section>
          
          <section className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-xl p-8 border border-blue-700/50">
            <h2 className="text-2xl font-semibold text-white mb-4">Enterprise Security</h2>
            <p className="text-slate-300 mb-6">
              Need custom security requirements, dedicated infrastructure, or a signed DPA 
              (Data Processing Agreement)? Contact our enterprise team.
            </p>
            <a 
              href="mailto:enterprise@neurolint.dev" 
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Contact Enterprise Sales
            </a>
          </section>
        </div>
        
        <div className="mt-12 pt-8 border-t border-slate-700 text-center text-slate-400 text-sm">
          <p>Last updated: December 2024</p>
          <p className="mt-2">
            <Link href="/privacy" className="hover:text-blue-400">Privacy Policy</Link>
            {" | "}
            <Link href="/terms" className="hover:text-blue-400">Terms of Service</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
