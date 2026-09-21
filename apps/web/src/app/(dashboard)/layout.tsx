import { terminologyForType } from "@maxtrone/core";
import { AppShell } from "@/components/app-shell";
import { requireTenantContext } from "@/lib/tenant";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, institution } = await requireTenantContext();
  const terminology =
    institution.terminology ?? terminologyForType(institution.type);

  return (
    <AppShell
      institutionName={institution.name}
      terminology={terminology}
      userName={session.user.name}
    >
      {children}
    </AppShell>
  );
}
