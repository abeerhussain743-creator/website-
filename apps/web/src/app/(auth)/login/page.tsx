"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@maxtrone/ui";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("owner@greenfield.edu.pk");
  const [password, setPassword] = React.useState("password123");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await authClient.signIn.email({
      email,
      password,
    });
    setLoading(false);
    if (err) {
      setError(err.message ?? "Sign-in failed");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(201,162,74,0.18),_transparent_55%),linear-gradient(160deg,#F6F3EC_0%,#EFE8DA_45%,#D9E2EC_100%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(201,162,74,0.12),_transparent_50%),linear-gradient(160deg,#0A1420,#122033)]"
      />
      <Card className="relative z-10 w-full max-w-md">
        <CardHeader>
          <p className="font-display text-2xl font-semibold">Maxtrone</p>
          <CardTitle className="text-base font-normal text-[var(--muted-foreground)]">
            Sign in to your campus workspace
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error ? (
              <p className="text-sm text-[var(--danger)]" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-[var(--muted-foreground)]">
            Demo: owner@greenfield.edu.pk / password123 ·{" "}
            <Link href="/" className="underline">
              Back home
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
