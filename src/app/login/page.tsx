import Link from "next/link";

export default function LoginPage() {
  const googleReady = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand auth-brand"><span className="brand-mark">✦</span><span>orbit</span></div>
        <p>One calm place for your work and AI.</p>
        {googleReady ? <Link className="google-login" href="/api/auth/signin/google">Continue with Google</Link> : (
          <div className="setup-notice">Google OAuth is not configured yet. Add the two <code>AUTH_GOOGLE_*</code> values to <code>.env</code>.</div>
        )}
        <Link href="/">Continue to local demo</Link>
      </section>
    </main>
  );
}
