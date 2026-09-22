import { redirect } from "next/navigation";
import { Button } from "@maxtrone/ui";
import { createLead } from "@/actions/campus";

export default function AdmissionsNewPage() {
  async function action(formData: FormData) {
    "use server";
    await createLead(formData);
    redirect(`/admissions`);
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="font-display text-3xl font-semibold">New lead</h1>
      <form action={action} className="space-y-3 rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-5">
        <input name="parentName" required placeholder="Parent name" className="h-10 w-full rounded-[12px] border border-[var(--border)] px-3 text-sm" />
        <input name="phone" required placeholder="0300-1234567" className="h-10 w-full rounded-[12px] border border-[var(--border)] px-3 text-sm" />
        <input name="childName" placeholder="Child name" className="h-10 w-full rounded-[12px] border border-[var(--border)] px-3 text-sm" />
        <input name="classSought" placeholder="Class sought" className="h-10 w-full rounded-[12px] border border-[var(--border)] px-3 text-sm" />
        <textarea name="notes" placeholder="Notes" className="min-h-24 w-full rounded-[12px] border border-[var(--border)] px-3 py-2 text-sm" />
        <Button type="submit">Save lead</Button>
      </form>
    </div>
  );
}
