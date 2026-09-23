import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[25px] font-semibold tracking-tight text-[#183042]">{title}</h1>
        <p className="mt-1 text-sm text-[#6b7d89]">{description}</p>
      </header>
      <Card className="border-[#dce7ee] shadow-[0_3px_12px_#15384b0b]">
        <CardHeader>
          <CardTitle className="text-lg text-[#183042]">Segera hadir</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-[#6b7d89]">
          <p>
            Modul ini termasuk ruang lingkup produk, tetapi belum dibangun pada rilis
            MVP layar 1–2. Navigasi tetap tersedia agar alur kerja laboratorium
            terlihat utuh.
          </p>
          <p>
            Data operasional, formulir, dan integrasi Supabase akan menyusul setelah
            otentikasi dan dasbor stabil.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
