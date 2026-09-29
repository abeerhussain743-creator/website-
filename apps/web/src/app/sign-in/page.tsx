import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { ThemeToggle } from "@/components/theme-toggle";

const devLoginEnabled =
  process.env.AUTH_DEV_LOGIN === "true" &&
  process.env.NODE_ENV !== "production";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/app");
  const params = await searchParams;

  return (
    <div className="min-h-screen bg-app-grain">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="font-display text-2xl">
            PostPilot
          </Link>
          <ThemeToggle />
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-soft">
          <h1 className="font-display text-3xl tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Magic link email, Google, or local demo login.
          </p>

          {params.error ? (
            <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">
              Sign-in failed. Try again.
            </p>
          ) : null}

          <form
            className="mt-6 space-y-3"
            action={async (formData) => {
              "use server";
              const email = String(formData.get("email") ?? "");
              await signIn("resend", {
                email,
                redirectTo: "/app",
              });
            }}
          >
            <div>
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@brand.com"
                defaultValue={devLoginEnabled ? "demo@postpilot.ai" : undefined}
              />
            </div>
            <Button type="submit" className="w-full">
              Email magic link
            </Button>
          </form>

          {process.env.AUTH_GOOGLE_ID ? (
            <form
              className="mt-3"
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/app" });
              }}
            >
              <Button type="submit" variant="secondary" className="w-full">
                Continue with Google
              </Button>
            </form>
          ) : null}

          {devLoginEnabled ? (
            <form
              className="mt-6 space-y-3 border-t border-[var(--border)] pt-6"
              action={async (formData) => {
                "use server";
                await signIn("dev-login", {
                  email: String(formData.get("email") ?? "demo@postpilot.ai"),
                  name: String(formData.get("name") ?? "Demo Owner"),
                  redirectTo: "/app",
                });
              }}
            >
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                Dev login (local only)
              </p>
              <Input
                name="email"
                type="email"
                defaultValue="demo@postpilot.ai"
                required
              />
              <Input name="name" type="text" defaultValue="Demo Owner" />
              <Button type="submit" variant="secondary" className="w-full">
                Enter as demo user
              </Button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
