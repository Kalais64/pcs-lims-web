import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Panel({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`border-[#d5e4da] shadow-[0_3px_12px_#14301c0b] ${className ?? ""}`}>
      {title ? (
        <CardHeader className="pb-2">
          <CardTitle className="text-[17px]">{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className={title ? "" : "pt-6"}>{children}</CardContent>
    </Card>
  );
}
