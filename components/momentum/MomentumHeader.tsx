import MomentumTabs from "./MomentumTabs";

export default function MomentumHeader({
  subtitle,
}: {
  subtitle?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {/* Logo slot: real file at /public/momentum-logo.png, text fallback below */}
        <img
          src="/momentum-logo.png"
          alt="Momentum"
          className="h-10 w-10 rounded-md object-contain"
        />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Momentum
          </h1>
          {subtitle ? (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <MomentumTabs />
    </div>
  );
}
