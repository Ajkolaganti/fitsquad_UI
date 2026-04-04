import Image from "next/image";

type Variant = "hero" | "header" | "inline";

const variantClass: Record<Variant, string> = {
  /** Login / splash — full wordmark visible */
  hero: "h-auto w-[min(280px,88vw)] max-h-[140px]",
  /** Dashboard top bar */
  header: "h-auto w-[min(200px,55vw)] max-h-[52px]",
  /** Compact (nav / inline) */
  inline: "h-8 w-auto max-w-[120px]",
};

interface AppLogoProps {
  variant?: Variant;
  className?: string;
  priority?: boolean;
}

export function AppLogo({
  variant = "hero",
  className = "",
  priority = false,
}: AppLogoProps) {
  return (
    <Image
      src="/Logo.png"
      alt="FITSQUAD"
      width={640}
      height={240}
      priority={priority}
      sizes="(max-width: 400px) 88vw, 280px"
      className={`object-contain object-center ${variantClass[variant]} ${className}`}
    />
  );
}
