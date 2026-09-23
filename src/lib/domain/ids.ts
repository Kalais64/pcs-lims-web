function jakartaParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [year, month, day] = fmt.format(date).split("-");
  return { year, yymmdd: `${year.slice(2)}${month}${day}` };
}

function nextSeq(existing: string[], prefix: string) {
  const nums = existing
    .filter((no) => no.startsWith(prefix))
    .map((no) => Number(no.slice(prefix.length)))
    .filter((n) => Number.isFinite(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return String(next).padStart(3, "0");
}

export function nextJobNo(jobNos: string[], date = new Date()) {
  const { yymmdd } = jakartaParts(date);
  const prefix = `PCS-${yymmdd}-`;
  return `${prefix}${nextSeq(jobNos, prefix)}`;
}

export function nextSampleNo(sampleNos: string[], date = new Date()) {
  const { yymmdd } = jakartaParts(date);
  const prefix = `PCS-S-${yymmdd}-`;
  return `${prefix}${nextSeq(sampleNos, prefix)}`;
}

export function nextLhuNo(lhuNos: string[], date = new Date()) {
  const { year } = jakartaParts(date);
  const prefix = `LHU-PCS-${year}-`;
  return `${prefix}${nextSeq(lhuNos, prefix)}`;
}

export function nextInvoiceNo(invoiceNos: string[], date = new Date()) {
  const { year } = jakartaParts(date);
  const prefix = `INV-PCS-${year}-`;
  return `${prefix}${nextSeq(invoiceNos, prefix)}`;
}

export function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function nowIso() {
  return new Date().toISOString();
}
