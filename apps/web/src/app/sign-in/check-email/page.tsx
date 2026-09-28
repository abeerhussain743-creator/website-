import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app-grain px-6">
      <div className="max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-soft">
        <h1 className="font-display text-3xl">Check your email</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          We sent a magic link. In local development without Resend, the link is
          printed in the web server console.
        </p>
        <Link
          href="/sign-in"
          className="mt-6 inline-block text-sm font-medium text-ember-600 underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
