import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@maxtrone/db";
import { Button, EmptyState } from "@maxtrone/ui";
import { createInstitutionOnboarding, saveOnboardingGroups } from "@/actions/onboarding";
import { advanceOnboarding } from "@/actions/onboarding-advance";
import { requireSession } from "@/lib/tenant";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  const step = sp.step ?? "profile";

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, isActive: true },
    include: { institution: true },
  });
  const institution = membership?.institution ?? null;

  if (institution?.onboardingStep === "complete" && institution.status === "ACTIVE") {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <div>
        <p className="font-display text-3xl font-semibold">Maxtrone</p>
        <h1 className="mt-2 text-xl text-[var(--muted-foreground)]">
          Get live in under 10 minutes
        </h1>
      </div>

      <ol className="flex flex-wrap gap-2 text-xs">
        {["profile", "groups", "import", "fees", "whatsapp", "staff", "complete"].map((s) => (
          <li
            key={s}
            className={`rounded-full px-3 py-1 ${
              step === s
                ? "bg-[var(--ink)] text-[var(--ivory)]"
                : "bg-[var(--muted)] text-[var(--muted-foreground)]"
            }`}
          >
            {s}
          </li>
        ))}
      </ol>

      {step === "profile" && !institution ? (
        <form action={createInstitutionOnboarding} className="space-y-4 rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-6">
          <Field label="Institution name" name="name" required />
          <label className="block space-y-1 text-sm">
            <span>Type</span>
            <select name="type" className="h-10 w-full rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3">
              <option value="SCHOOL">School</option>
              <option value="COACHING_ACADEMY">Coaching academy</option>
              <option value="TRAINING_CENTER">Training center</option>
            </select>
          </label>
          <Field label="City" name="city" placeholder="Lahore" />
          <Field label="Primary branch" name="branchName" placeholder="Main Campus" />
          <Button type="submit">Continue</Button>
        </form>
      ) : null}

      {step === "groups" && institution ? (
        <form action={saveOnboardingGroups} className="space-y-4 rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-6">
          <p className="text-sm text-[var(--muted-foreground)]">
            One per line: <code>Class 8: A, B</code> (uses your terminology for {institution.type})
          </p>
          <textarea
            name="groups"
            rows={6}
            defaultValue={"Class 6: A, B\nClass 7: A, B\nClass 8: A, B"}
            className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--card)] p-3 text-sm"
          />
          <Button type="submit">Save & continue</Button>
        </form>
      ) : null}

      {step === "import" && institution ? (
        <div className="space-y-4 rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-6">
          <p className="text-sm text-[var(--muted-foreground)]">
            Upload a CSV now, or skip and import later from Students.
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/imports">Open import</Link>
            </Button>
            <form action={advanceOnboarding}>
              <input type="hidden" name="next" value="fees" />
              <Button type="submit">Skip for now</Button>
            </form>
          </div>
        </div>
      ) : null}

      {step === "fees" && institution ? (
        <div className="space-y-4 rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-6">
          <p className="text-sm">Create fee structures in the Fees module (tuition, admission, etc.).</p>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/fees">Open fees</Link>
            </Button>
            <form action={advanceOnboarding}>
              <input type="hidden" name="next" value="whatsapp" />
              <Button type="submit">Continue</Button>
            </form>
          </div>
        </div>
      ) : null}

      {step === "whatsapp" && institution ? (
        <div className="space-y-4 rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-6">
          <EmptyState
            title="Sandbox WhatsApp connected"
            description="Phase 1 starts in sandbox mode on the shared Maxtrone test number. Meta embedded signup can be connected later from Settings."
          />
          <form action={advanceOnboarding}>
            <input type="hidden" name="next" value="staff" />
            <Button type="submit">Continue</Button>
          </form>
        </div>
      ) : null}

      {step === "staff" && institution ? (
        <div className="space-y-4 rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-6">
          <p className="text-sm text-[var(--muted-foreground)]">
            Invite staff from Settings → Staff. You can finish onboarding now.
          </p>
          <form action={advanceOnboarding}>
            <input type="hidden" name="next" value="complete" />
            <Button type="submit" variant="accent">
              Finish setup
            </Button>
          </form>
        </div>
      ) : null}

      {institution && step === "profile" ? (
        <Button asChild>
          <Link href="/onboarding?step=groups">Resume setup</Link>
        </Button>
      ) : null}
    </div>
  );
}

function Field(props: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span>{props.label}</span>
      <input
        name={props.name}
        required={props.required}
        placeholder={props.placeholder}
        className="h-10 w-full rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3"
      />
    </label>
  );
}
