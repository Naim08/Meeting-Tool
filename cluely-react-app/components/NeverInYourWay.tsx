const CONTROL_BUTTONS = [
  { label: '⌘', sublabel: 'command' },
  { label: '+', sublabel: undefined },
  { label: '↑', sublabel: undefined },
  { label: '↓', sublabel: undefined },
  { label: '→', sublabel: undefined },
];

export default function NeverInYourWay() {
  return (
    <div>
      <div className="card-styles flex flex-col justify-between p-[18px] md:p-[19px] lg:p-[17px] xl:p-[22px] 2xl:p-6">
        <div className="relative overflow-hidden rounded-[6px] bg-white md:rounded-[10px] lg:rounded-[9px] xl:rounded-xl min-h-[360px] md:min-h-[420px] xl:min-h-[500px]">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#A65BFF_0%,#5B61FF_43%,#7F29FF_85%)]" />
          <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.6), transparent 55%)' }} />

          <div className="relative flex h-full flex-col px-5 pb-6 pt-6 md:px-7 md:pb-7 xl:px-9">
            <div className="flex justify-center">
              <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-1 shadow-[0px_12px_30px_rgba(20,15,44,0.25)]">
                <span className="size-2 rounded-full bg-white/50" />
                <span className="size-2 rounded-full bg-white/50" />
                <span className="size-2 rounded-full bg-[#4B65FF]" />
              </div>
            </div>
            <div className="relative mt-6 flex flex-1 items-center justify-center">
              <div className="relative w-full max-w-[360px] overflow-hidden rounded-[32px] border border-white/50 bg-white/10 shadow-[0px_40px_90px_rgba(17,20,43,0.45)] backdrop-blur-[8px]">
                <img src="/video-player-card.9b7a7f86afc7.png" alt="AI overlay window" className="h-full w-full object-cover" loading="lazy" />

                <div className="absolute inset-0">
                  <div className="absolute left-6 top-10 flex flex-col gap-3 text-white/70">
                    <span className="h-3 w-32 rounded-full bg-white/50" />
                    <span className="h-3 w-40 rounded-full bg-white/30" />
                  </div>
                  <div className="absolute bottom-8 left-1/2 w-[230px] -translate-x-1/2 rounded-[20px] border border-white/60 bg-white/95 px-4 py-3 text-left shadow-[0px_25px_45px_rgba(10,12,30,0.35)]">
                    <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.32em] text-[#495170] uppercase">
                      <span className="text-[#5F6BFF]">★</span> AI Response
                    </p>
                    <div className="mt-3 space-y-2 text-[#8790B4]">
                      <span className="block h-2 rounded-full bg-[#E0E5FF]" />
                      <span className="block h-2 rounded-full bg-[#EDF1FF]" />
                      <span className="block h-2 w-1/2 rounded-full bg-[#EDF1FF]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex w-full items-center gap-2 rounded-[32px] border border-white/40 bg-white/90 px-3 py-3 shadow-[0px_22px_45px_rgba(12,16,40,0.18)] backdrop-blur sm:gap-3">
              {CONTROL_BUTTONS.map((button) => {
                const isCommand = Boolean(button.sublabel);
                return (
                  <button
                    key={button.label}
                    type="button"
                    className={`flex items-center justify-center rounded-[18px] border border-white/70 bg-white px-4 py-2 text-sm font-semibold text-[#101534] shadow-[0px_12px_24px_rgba(18,16,40,0.15)] transition-colors hover:bg-white/90 ${
                      isCommand ? 'flex-[1.4] min-w-[140px] gap-2 uppercase tracking-[0.15em]' : 'flex-1 min-w-[48px] aspect-square px-0 text-base'
                    }`}
                    aria-label={button.sublabel || button.label}
                  >
                    <span>{button.label}</span>
                    {isCommand && <span className="text-[11px] font-semibold">{button.sublabel}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-[19px] max-w-[600px] text-base leading-snug tracking-tight text-[#0B0E19] sm:text-18 md:mt-5 xl:mt-[18px] xl:text-20 2xl:mt-[26px]">
        <p>
          <strong className="mr-1 font-medium text-[#0B0E19]">Never in your way.</strong>
          Cluely appears as a translucent and hideable window over all your other applications.
        </p>
      </div>
    </div>
  );
}
