import getSessionWithCheckProfile from "@/hooks/getSessionWithCheckProfile";
import { ReportService } from "@/services/reports";
import ReportsTable from "@/components/pages/admin/reports/ReportsTable";

export default async function ReportsPage() {
  const session = await getSessionWithCheckProfile();
  const reports = await ReportService.getAll();
  return (
    <ReportsTable
      reports={reports}
      isAdmin={session?.user.role === "ADMIN"}
      isManager={session?.user.role === "MANAGER"}
    />
  );
}
