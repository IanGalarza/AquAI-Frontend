import type { Language } from "@/types/conversations";

// Como en el texto del backend, los enteros de cuatro cifras (p. ej., años) no se agrupan.
function groupThousands(integer: string, separator: string): string {
  return integer.length < 5 ? integer : integer.replace(/\B(?=(\d{3})+$)/g, separator);
}

export function formatScientificNumber(value: string | number, language: Language = "es"): string {
  const raw = String(value);
  const match = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(raw);
  if (!match || !(match[2] || match[3]) || raw.length > 1100) return raw;
  const exponent = Number(match[4] ?? 0);
  if (!Number.isInteger(exponent) || Math.abs(exponent) > 1000) return raw;
  const digits = (match[2] + (match[3] ?? "")).replace(/^0+/, "");
  if (!digits) return "0";
  const scale = (match[3]?.length ?? 0) - exponent;
  const magnitude = digits.length - scale - 1;
  const places = magnitude < -2 ? Math.max(2, 1 - magnitude) : 2;
  const cut = scale - places;
  let rounded: string;
  if (cut > 0) {
    const kept = digits.slice(0, -cut) || "0";
    const increment = digits[digits.length - cut] >= "5" ? BigInt(1) : BigInt(0);
    rounded = (BigInt(kept) + increment).toString();
  } else {
    rounded = digits + "0".repeat(-cut);
  }
  const [decimal, thousands] = language === "es" ? [",", "."] : [".", ","];
  let text: string;
  if (magnitude < -6) {
    const mantissa = (rounded[0] + "." + rounded.slice(1)).replace(/\.?0+$/, "");
    text = `${mantissa.replace(".", decimal)}e${rounded.length - places - 1}`;
  } else {
    const padded = rounded.padStart(places + 1, "0");
    const fraction = padded.slice(-places).replace(/0+$/, "");
    text = groupThousands(padded.slice(0, -places), thousands) + (fraction ? decimal + fraction : "");
  }
  return (match[1] === "-" ? "-" : "") + text;
}
