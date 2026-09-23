"use client";

import { useMemo } from "react";
import { useLims } from "@/lib/store/lims-provider";

const ACTIVE_JOB = new Set([
  "draft",
  "scheduled",
  "sampling",
  "received",
  "testing",
  "verification",
  "approval",
  "lhu_ready",
]);

export function useDashboardStats() {
  const { data } = useLims();

  return useMemo(() => {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
    const weekFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const activeJobs = data.jobs.filter((j) => ACTIVE_JOB.has(j.status));
    const dueThisWeek = activeJobs.filter((j) => new Date(`${j.dueDate}T00:00:00`).getTime() <= weekFromNow).length;
    const samplingToday = data.samplingEvents.filter((e) => e.date === today && e.status === "scheduled");
    const sites = new Set(samplingToday.map((e) => e.siteId));
    const inTesting = data.samples.filter((s) => s.status === "in_testing").length;
    const awaitingResults = data.samples.filter((s) => s.status === "received").length;
    const awaitingApproval = data.samples.filter(
      (s) => s.status === "pending_verify" || s.status === "pending_approve",
    ).length;

    const recentJobs = [...data.jobs]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6)
      .map((job) => {
        const customer = data.customers.find((c) => c.id === job.customerId);
        const matrix = data.matrices.find((m) => m.id === job.matrixId);
        return {
          jobNo: job.jobNo,
          customer: customer?.companyName ?? "—",
          sampleType: matrix?.name ?? "—",
          dueDate: job.dueDate,
          status: job.status,
        };
      });

    return {
      stats: {
        activeJobs: activeJobs.length,
        dueThisWeek,
        samplingToday: samplingToday.length,
        samplingSites: sites.size,
        inTesting,
        awaitingResults,
        awaitingApproval,
        lhuPending: data.jobs.filter((j) => j.status === "lhu_ready").length,
      },
      recentJobs,
      isLoading: false,
    };
  }, [data]);
}
