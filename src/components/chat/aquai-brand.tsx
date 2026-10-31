import Image from "next/image";
import aquaiLogo from "../../../public/images/aquai-logo.png";

type AquaiMarkProps = {
  large?: boolean;
};

export function AquaiMark({ large = false }: AquaiMarkProps) {
  return (
    <span
      className={large ? "aquai-mark aquai-mark-large" : "aquai-mark"}
      aria-hidden="true"
    >
      <Image
        src={aquaiLogo}
        alt=""
        width={128}
        height={128}
        sizes={large ? "128px" : "80px"}
        preload
      />
    </span>
  );
}

export function AquaiAvatar() {
  return (
    <span className="aquai-avatar" aria-hidden="true">
      <Image src={aquaiLogo} alt="" width={64} height={64} sizes="40px" />
    </span>
  );
}

export function AquaiBrand() {
  return (
    <div className="flex items-center gap-3.5" aria-label="AquAI">
      <AquaiMark />
      <span className="text-[32px] font-semibold tracking-[-0.055em]">
        Aqu<span className="aquai-accent">AI</span>
      </span>
    </div>
  );
}
