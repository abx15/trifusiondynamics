import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export default function SettingsIndexPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & Workspace"
        breadcrumbs={[{ label: "Settings" }]}
      />

      <Card className="bg-white dark:bg-zinc-900 border border-border shadow-xs">
        <CardHeader>
          <CardTitle>Organization Settings</CardTitle>
          <CardDescription>
            Configure profile, default locations, and tenant configurations (Coming Soon)
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-500">
          Organization metadata fields and workspace branding parameters will be configurable here in later phases.
        </CardContent>
      </Card>
    </div>
  );
}
