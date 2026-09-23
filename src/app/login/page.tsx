"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE_LABELS, ROLES, type Role } from "@/lib/auth/types";
import { DEMO_PASSWORD, DEMO_USERS } from "@/lib/fixtures/users";
import { useAuth } from "@/lib/hooks/use-auth";

export default function LoginPage() {
  const { login, loginAsRole, mode } = useAuth();
  const [role, setRole] = useState<Role>("admin");
  const [email, setEmail] = useState(DEMO_USERS[0].email);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState<string | null>(null);

  const hint = useMemo(
    () => DEMO_USERS.find((user) => user.role === role)?.email ?? "",
    [role],
  );

  function applyRole(next: Role) {
    setRole(next);
    const demo = DEMO_USERS.find((user) => user.role === next);
    if (demo) {
      setEmail(demo.email);
      setPassword(DEMO_PASSWORD);
    }
    setError(null);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = await login(email, password, role);
    if (!result.ok) setError(result.message);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#0c3d2c,#1a7a45)] px-4 py-10">
      <Card className="w-full max-w-md border-0 shadow-xl">
        <CardHeader className="space-y-1">
          <p className="text-xs font-semibold tracking-wide text-[#1f8a4c]">PCS LABORATORY</p>
          <CardTitle className="text-2xl text-[#146338]">Masuk ke PCS LIMS</CardTitle>
          <CardDescription>
            {mode === "live"
              ? "Masuk dengan Supabase Auth. Peran diambil dari tabel profiles (id = auth.uid()), bukan dari pilihan di bawah."
              : mode === "empty"
                ? "Env Supabase belum ada. Anda dapat membuka pratinjau UI kosong, atau set NEXT_PUBLIC_USE_FIXTURES=true."
                : <>
                    Otentikasi mock (mode fixture). Kata sandi semua akun:{" "}
                    <span className="font-medium text-[#12281c]">{DEMO_PASSWORD}</span>
                  </>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="role">Peran</Label>
              <Select value={role} onValueChange={(value) => applyRole(value as Role)}>
                <SelectTrigger id="role" className="w-full">
                  <SelectValue placeholder="Pilih peran" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {ROLE_LABELS[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-[#5d7266]">Akun demo: {hint}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Kata sandi</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button type="submit" className="w-full bg-[#1f8a4c] hover:bg-[#146338]">
              Masuk
            </Button>
          </form>
          {mode === "fixtures" ? (
            <div className="mt-6 border-t border-[#d5e4da] pt-4">
              <p className="mb-2 text-xs text-[#5d7266]">Atau masuk langsung sebagai peran</p>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((item) => (
                  <Button
                    key={item}
                    type="button"
                    variant="outline"
                    className="justify-start text-xs"
                    onClick={() => loginAsRole(item)}
                  >
                    {ROLE_LABELS[item]}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
