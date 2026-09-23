"use client";

import { useState } from "react";
import { PageHeader } from "@/components/lims/page-header";
import { Panel } from "@/components/lims/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLims } from "@/lib/store/lims-provider";

const TABS = [
  { key: "matrices", label: "Matriks" },
  { key: "parameters", label: "Parameter" },
  { key: "methods", label: "Metode" },
  { key: "units", label: "Satuan" },
] as const;

export default function MasterPage() {
  const { data, upsertMaster, resetDemo, mode } = useLims();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("matrices");
  const [name, setName] = useState("");

  const list = data[tab];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Master Data"
        description="CRUD matriks, parameter, metode, dan satuan untuk worksheet pengujian."
        actions={
          mode === "fixtures" ? (
            <Button variant="outline" onClick={resetDemo}>
              Reset data demo
            </Button>
          ) : null
        }
      />
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button
            key={t.key}
            variant={tab === t.key ? "default" : "outline"}
            className={tab === t.key ? "bg-[#16A34A] hover:bg-[#14532D]" : ""}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>
      <Panel title={TABS.find((t) => t.key === tab)?.label}>
        <form
          className="mb-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            upsertMaster(tab, { name: name.trim() });
            setName("");
          }}
        >
          <Input
            placeholder={`Nama ${TABS.find((t) => t.key === tab)?.label.toLowerCase()}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" className="bg-[#16A34A] hover:bg-[#14532D]">
            Tambah
          </Button>
        </form>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell className="text-xs text-[#5d7266]">{item.id}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
    </div>
  );
}
