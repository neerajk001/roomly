import { AppShell } from "@/components/app/app-shell";

export default function WizardLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
