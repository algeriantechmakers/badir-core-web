import { Badge } from "../ui/badge";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Snowflake,
} from "lucide-react";
import { LucideIcon } from "lucide-react";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

type StatusConfig = {
  label: string;
  variant: BadgeVariant;
  icon: LucideIcon;
  className: string;
};

type StatusConfigs = {
  [key: string]: StatusConfig;
};

const STATUS_CONFIGS: Record<string, StatusConfigs> = {
  organization: {
    pending: {
      label: "قيد المراجعة",
      variant: "secondary",
      icon: AlertTriangle,
      className: "text-neutrals-600 bg-neutrals-300",
    },
    approved: {
      label: "مقبولة",
      variant: "default",
      icon: CheckCircle,
      className: "text-primary-600 bg-state-success",
    },
    rejected: {
      label: "مرفوضة",
      variant: "destructive",
      icon: XCircle,
      className: "text-neutrals-100",
    },
    FROZEN: {
      label: "مجمدة",
      variant: "outline",
      icon: Snowflake,
      className: "border-sky-300 bg-sky-50 text-sky-700",
    },
  },
  initiative: {
    draft: {
      label: "مسودة",
      variant: "secondary",
      icon: FileText,
      className: "text-neutrals-600 bg-neutrals-300",
    },
    published: {
      label: "منشور",
      variant: "default",
      icon: CheckCircle,
      className: "text-primary-600 bg-state-success",
    },
    cancelled: {
      label: "ملغي",
      variant: "destructive",
      icon: XCircle,
      className: "text-neutrals-100",
    },
  },
};

interface StatusBadgeProps {
  status: string;
  type: "organization" | "initiative";
  iconSize?: "sm" | "md" | "lg";
  className?: string;
}

export default function StatusBadge({
  status,
  type,
  iconSize = "md",
}: StatusBadgeProps) {
  const configs = STATUS_CONFIGS[type];
  const config = configs?.[status];

  if (!config) {
    return <Badge variant="outline">{status}</Badge>;
  }

  const Icon = config.icon;
  const className = config.className;

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <Badge
      variant={config.variant}
      className={`flex items-center gap-1 ${className || ""}`}
    >
      <Icon className={iconSizes[iconSize]} />
      {config.label}
    </Badge>
  );
}

export const AdminOrganizationStatusBadge = ({
  status,
}: {
  status: string;
}) => <StatusBadge status={status} type="organization" />;

export const AdminInitiativeStatusBadge = ({ status }: { status: string }) => (
  <StatusBadge status={status} type="initiative" iconSize="sm" />
);
