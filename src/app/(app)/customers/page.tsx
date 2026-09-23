"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/lims/page-header";
import { Panel } from "@/components/lims/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/hooks/use-auth";
import { useLims } from "@/lib/store/lims-provider";

export default function CustomersPage() {
  const { user } = useAuth();
  const { data, isLoading, loadError } = useLims();
  const canWrite = user?.role === "admin" || user?.role === "sales";
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("active");

  const customers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.customers.filter((c) => {
      if (status === "active" && !c.isActive) return false;
      if (status === "inactive" && c.isActive) return false;
      if (!q) return true;
      return `${c.companyName} ${c.code} ${c.pic}`.toLowerCase().includes(q);
    });
  }, [data.customers, query, status]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customer"
        description="Perusahaan, site sampling, dan kontak. Nonaktifkan — tanpa hapus permanen."
        actions={
          canWrite ? (
            <Button asChild className="bg-[#16A34A] hover:bg-[#14532D]">
              <Link href="/customers/new">Customer baru</Link>
            </Button>
          ) : null
        }
      />
      <div className="flex flex-wrap gap-2">
        <Input
          className="max-w-sm bg-white"
          placeholder="Cari nama atau kode"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-[200px] bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Nonaktif</SelectItem>
            <SelectItem value="all">Semua</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Panel title="Daftar customer">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Perusahaan</TableHead>
              <TableHead>Kontak utama</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-[#5d7266]">
                  {isLoading
                    ? "Memuat customer…"
                    : loadError
                      ? `Gagal memuat daftar: ${loadError}`
                      : "Tidak ada customer."}
                </TableCell>
              </TableRow>
            ) : (
              customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.code || "—"}</TableCell>
                  <TableCell>{c.companyName}</TableCell>
                  <TableCell>
                    {c.pic || "—"}
                    <div className="text-xs text-[#5d7266]">{c.email || c.phone}</div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        c.isActive
                          ? "border-[#16A34A] text-[#14532D]"
                          : "border-[#d5e4da] text-[#5d7266]"
                      }
                    >
                      {c.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/customers/${c.id}`} className="text-sm text-[#16A34A] underline">
                      Detail
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Panel>
    </div>
  );
}
