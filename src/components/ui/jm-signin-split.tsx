import { CheckCircle2, Layers, TrendingUp, Users } from "lucide-react";
import type { ReactNode } from "react";

interface JmSigninSplitProps {
  title: string;
  subtitle: string;
  bullets: string[];
  supportingText: string;
  children: ReactNode;
  footer?: ReactNode;
}

const iconMap = [Layers, TrendingUp, Users, CheckCircle2];

export function JmSigninSplit({
  title,
  subtitle,
  bullets,
  supportingText,
  children,
  footer,
}: JmSigninSplitProps) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#F6F7F9] via-[#EEF1F6] to-[#E5E9F1] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[840px] items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl bg-white shadow-[0_22px_60px_rgba(15,23,42,0.16)] lg:grid-cols-2">
          <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#ba4a3f] to-[#9f3328] px-9 py-9 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] lg:flex">
            <div className="relative z-10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 shadow-sm">
                  <img
                    src="/images/logo.png"
                    alt="Buses JM"
                    className="h-6 w-auto"
                  />
                </div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
                  Plataforma JM
                </div>
              </div>
              <div className="mt-10 space-y-4">
                <h1 className="text-2xl font-semibold leading-snug text-white">
                  {title}
                </h1>
                <p className="text-sm text-white/80">{subtitle}</p>
                <ul className="space-y-3 pt-2 text-sm text-white/90">
                  {bullets.map((bullet, index) => {
                    const Icon = iconMap[index] ?? CheckCircle2;
                    return (
                      <li
                        key={bullet}
                        className="flex items-start gap-3"
                      >
                        <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#8D1116] shadow-sm">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span>{bullet}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
            <p className="relative z-10 text-xs text-white/80">{supportingText}</p>
          </section>

          <section className="flex flex-col justify-center px-6 py-7 sm:px-9 sm:py-9">
            <div className="mx-auto flex w-full max-w-md flex-col gap-5">
              <div className="lg:hidden">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                    <img
                      src="/images/logo.png"
                      alt="Buses JM"
                      className="h-6 w-auto"
                    />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ba4a3f]">
                      Plataforma JM
                    </p>
                    <p className="text-base font-semibold text-[#0A0D12]">
                      {title}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-[#4B5563]">{subtitle}</p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-[0_18px_30px_rgba(15,23,42,0.14)] sm:p-6">
                {children}
              </div>
              {footer && (
                <div className="text-center text-xs text-[#6B7280]">
                  {footer}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
