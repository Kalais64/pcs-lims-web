"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { canAccessPath } from "@/lib/auth/nav";
import { ROLE_LABELS } from "@/lib/auth/types";
import { WORKFLOW_STEPS } from "@/lib/fixtures/dashboard";
import { useAuth } from "@/lib/hooks/use-auth";
import { useDashboardStats } from "@/lib/hooks/use-dashboard-stats";

function formatDueDate(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${iso}T00:00:00`));
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { stats, recentJobs } = useDashboardStats();

  if (!user) return null;

  const actions = [
    { href: "/jobs", label: "＋ Buat Job Order" },
    { href: "/sampling", label: "＋ Jadwalkan Sampling" },
    { href: "/testing", label: "＋ Input Hasil Uji" },
    { href: "/lhu", label: "▧ Terbitkan LHU" },
  ].filter((action) => canAccessPath(user.role, action.href));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[25px] font-semibold text-[#12281c]">Dashboard PCS LIMS</h1>
          <p className="mt-1 text-sm text-[#5d7266]">
            Ringkasan operasional laboratorium lingkungan
          </p>
        </div>
        <div className="rounded-[10px] border border-[#d5e4da] bg-white px-3.5 py-2 text-sm lg:hidden">
          {user.name} · {ROLE_LABELS[user.role]}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Job Aktif"
          value={stats.activeJobs}
          hint={`${stats.dueThisWeek} jatuh tempo minggu ini`}
        />
        <KpiCard
          label="Sampling Hari Ini"
          value={stats.samplingToday}
          hint={`${stats.samplingSites} lokasi customer`}
        />
        <KpiCard
          label="Dalam Pengujian"
          value={stats.inTesting}
          hint={`${stats.awaitingResults} menunggu hasil`}
        />
        <KpiCard
          label="Menunggu Approval"
          value={stats.awaitingApproval}
          hint="LHU belum diterbitkan"
        />
      </div>

      <div className="grid gap-[18px] xl:grid-cols-[2fr_1fr]">
        <Card className="border-[#d5e4da] shadow-[0_3px_12px_#14301c0b]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[17px]">Job Terbaru</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job No.</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Jenis Sampel</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentJobs.map((job) => (
                  <TableRow key={job.jobNo}>
                    <TableCell className="font-medium">
                      <Link href="/jobs" className="text-[#146338] hover:underline">
                        {job.jobNo}
                      </Link>
                    </TableCell>
                    <TableCell>{job.customer}</TableCell>
                    <TableCell>{job.sampleType}</TableCell>
                    <TableCell>{formatDueDate(job.dueDate)}</TableCell>
                    <TableCell>
                      <StatusBadge entity="job" status={job.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-[#d5e4da] shadow-[0_3px_12px_#14301c0b]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[17px]">Quick Action</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2.5">
            {actions.length === 0 ? (
              <p className="text-sm text-[#5d7266]">
                Tidak ada aksi cepat untuk peran {ROLE_LABELS[user.role]}.
              </p>
            ) : (
              actions.map((action) => (
                <Button
                  key={action.href}
                  asChild
                  variant="outline"
                  className="h-auto justify-start border-[#d5e4da] py-3"
                >
                  <Link href={action.href}>{action.label}</Link>
                </Button>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-[#d5e4da] shadow-[0_3px_12px_#14301c0b]">
        <CardHeader className="pb-2">
          <CardTitle className="text-[17px]">Workflow PCS Laboratory</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          {WORKFLOW_STEPS.map((step, index) => (
            <span key={step} className="flex items-center gap-2">
              <span className="rounded-lg border border-[#c4ddce] bg-[#e7f4ec] px-2.5 py-2 text-xs text-[#146338]">
                {step}
              </span>
              {index < WORKFLOW_STEPS.length - 1 ? (
                <span className="text-xs text-[#5d7266]">→</span>
              ) : null}
            </span>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <Card className="border-[#d5e4da] shadow-[0_3px_12px_#14301c0b]">
      <CardContent className="pt-5">
        <small className="text-[#5d7266]">{label}</small>
        <div className="my-1 text-[27px] font-bold text-[#146338]">{value}</div>
        <small className="text-[#5d7266]">{hint}</small>
      </CardContent>
    </Card>
  );
}
