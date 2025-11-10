import ChatDemo from '@/components/ChatDemo';
import InvisibleSlider from '@/components/InvisibleSlider';
import NeverInYourWay from '@/components/NeverInYourWay';
import DashboardView from '@/components/DashboardView';
import Link from 'next/link';
import HeroSection from '@/components/HeroSection';

const MEETING_PARTICIPANTS = [
  {
    name: 'Gina Huels',
    email: 'ginahue65@cluely.com',
    role: 'Owner',
    avatar: '/gina-huels.b14409cf5903.png',
    isSelf: true,
  },
  {
    name: 'Todd Cremin',
    email: 'todd.cremin@cluely.com',
    role: 'Speaker',
    avatar: '/todd-cremin.9cbbdf9c840d.png',
  },
  {
    name: 'Holly Gleason',
    email: 'holly_gleason1972@cluely.com',
    role: 'Speaker',
    avatar: '/holly-gleason.528905fb4086.png',
  },
  {
    name: 'Tomas Hansen',
    email: 'tomas_hansen@cluely.com',
    role: 'Speaker',
    avatar: '/tomas-hansen.5f58da3e5d0f.png',
  },
];

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col">
      <div className="grow bg-white">
        <main className="relative overflow-hidden md:overflow-visible">
          <div className="hero-v2 flex flex-col items-center gap-8 lg:gap-16">
            <div className="relative w-full">
              <HeroSection />
            </div>
            <div className="relative hidden h-fit w-full items-start justify-center px-12 perspective-midrange md:flex">
              <div className="relative h-[32rem] w-full max-w-6xl rounded-[13px] lg:aspect-[1.7] lg:h-auto">
                <img alt="Demo" loading="lazy" width="975" height="544" className="absolute inset-0 hidden aspect-[1.7] w-full max-w-6xl rounded-[13px] object-cover object-center blur-xl lg:block" src="/images/wallpaper.png" />
                <img alt="Demo" loading="lazy" width="975" height="544" className="relative hidden aspect-[1.7] w-full max-w-6xl rounded-[13px] object-cover object-center lg:block" src="/images/wallpaper.png" />
                <div className="absolute inset-0 flex items-center justify-center rounded-[13px] perspective-midrange lg:overflow-hidden">
                  <div className="absolute top-0 right-0 left-0 hidden h-fit w-full items-center justify-between bg-black/10 px-3 pt-2 pb-1 text-white lg:flex">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="size-4">
                      <path fillRule="evenodd" clipRule="evenodd" d="M11.9497 2.05026C9.21608 -0.683418 4.78393 -0.683418 2.05026 2.05026C-0.683418 4.78393 -0.683418 9.21608 2.05026 11.9497C4.78393 14.6834 9.21608 14.6834 11.9497 11.9497C14.6834 9.21608 14.6834 4.78393 11.9497 2.05026ZM3.17804 3.17804C5.28885 1.06723 8.71116 1.06723 10.822 3.17804C12.9328 5.28885 12.9328 8.71116 10.822 10.822C10.5853 11.0586 10.3323 11.2687 10.0664 11.4522L10.0701 11.4485C8.30532 9.68373 8.30532 6.82247 10.0701 5.05769L10.3207 4.80707L9.19293 3.67929L8.94232 3.92991C7.17754 5.69469 4.31627 5.69469 2.55149 3.92991L2.54779 3.93361C2.73135 3.66773 2.94144 3.41465 3.17804 3.17804ZM3.78324 11.3445C5.18177 12.3827 6.96794 12.6587 8.57252 12.1724C7.56099 10.964 7.08953 9.4567 7.15811 7.96969L3.78324 11.3445ZM1.82764 5.42748C3.03602 6.43901 4.5433 6.91047 6.03031 6.84189L2.65546 10.2168C1.61726 8.81823 1.34132 7.03206 1.82764 5.42748Z" fill="currentColor" />
                    </svg>
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="size-4 shrink-0">
                        <path d="M7.74918 11.7788C7.67266 11.7788 7.59614 11.7578 7.51963 11.7157C7.44694 11.6736 7.3532 11.5952 7.23843 11.4804L5.82096 10.1203C5.7674 10.0668 5.73296 10.0094 5.71766 9.94816C5.70618 9.88312 5.71766 9.82191 5.75209 9.76452C5.96251 9.48524 6.24371 9.25186 6.59569 9.0644C6.95149 8.87311 7.33599 8.77746 7.74918 8.77746C8.15089 8.77746 8.52582 8.86737 8.87397 9.04718C9.22212 9.22699 9.50141 9.44889 9.71183 9.71288C9.76539 9.77791 9.78643 9.84869 9.77495 9.92521C9.7673 10.0017 9.73478 10.0668 9.67739 10.1203L8.25992 11.4804C8.14515 11.5952 8.0495 11.6736 7.97299 11.7157C7.9003 11.7578 7.82569 11.7788 7.74918 11.7788Z" fill="currentColor" />
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="size-4 shrink-0">
                        <path d="M5.09965 13.8972C4.61377 13.8972 4.1738 13.79 3.77974 13.5758C3.38951 13.3654 3.0777 13.0727 2.84432 12.6978C2.61477 12.3228 2.5 11.8886 2.5 11.3951C2.5 10.9015 2.61477 10.4673 2.84432 10.0924C3.0777 9.71743 3.38951 9.42475 3.77974 9.21433C4.1738 9.00009 4.61377 8.89296 5.09965 8.89296H11.0737C11.5596 8.89296 11.9976 9.00009 12.3879 9.21433C12.7819 9.42475 13.0937 9.71743 13.3233 10.0924C13.5567 10.4673 13.6733 10.9015 13.6733 11.3951C13.6733 11.8886 13.5567 12.3228 13.3233 12.6978C13.0937 13.0727 12.7819 13.3654 12.3879 13.5758C11.9976 13.79 11.5596 13.8972 11.0737 13.8972H5.09965Z" fill="currentColor" />
                      </svg>
                    </div>
                  </div>
                  <div className="absolute right-0 bottom-2 left-0 hidden items-center justify-center lg:flex">
                    <div className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-white/10 px-1 pt-1 pb-1 backdrop-blur-lg perspective-midrange">
                      <div className="size-fit"><img alt="Launchpad" loading="lazy" width="44" height="44" src="/images/launchpad-icon.png" /></div>
                      <div className="size-fit"><img alt="Safari" loading="lazy" width="44" height="44" src="/images/safari-icon.png" /></div>
                      <div className="size-fit"><img alt="Settings" loading="lazy" width="44" height="44" src="/images/settings-icon.png" /></div>
                      <div className="size-fit"><img alt="Zoom" loading="lazy" width="44" height="44" src="/images/zoom-icon.png" /></div>
                      <div className="size-fit"><img alt="Interview Copilot" loading="lazy" width="44" height="44" src="/images/cluely-icon.png" /></div>
                      <div className="mx-2 h-9 min-w-px rounded-full bg-white/30"></div>
                      <div className="size-fit"><img alt="Trash" loading="lazy" width="44" height="44" src="/images/trash-icon.png" /></div>
                    </div>
                  </div>
                  <video className="aspect-[1.6] h-[80%] fix-safari-autoplay" autoPlay muted playsInline loop>
                    <source src="/videos/home/hero-v2/pro-res-hevc-safari.mp4" type="video/mp4; codecs='hvc1'" />
                    <source src="/videos/home/hero-v2/pro-res-hevc-safari.mp4" type="video/webm" />
                  </video>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative size-fit">
                      <div id="what-do-i-say-next">
                        <button className="purple-gradient-button rounded-[6px] flex items-center gap-1.5 w-fit text-white font-medium text-[14px] lg:text-base tracking-[-0.02em] p-[10px_16px] relative overflow-hidden pointer-events-none" type="button">
                          <span className="absolute top-0 left-0 z-20 h-full w-full blur-[1px]" aria-hidden="true">
                            <span className="blurred-border absolute -top-px -left-px z-20 h-full w-full"></span>
                          </span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="size-4">
                            <path fillRule="evenodd" clipRule="evenodd" d="M11.9497 2.05026C9.21608 -0.683418 4.78393 -0.683418 2.05026 2.05026C-0.683418 4.78393 -0.683418 9.21608 2.05026 11.9497C4.78393 14.6834 9.21608 14.6834 11.9497 11.9497C14.6834 9.21608 14.6834 4.78393 11.9497 2.05026ZM3.17804 3.17804C5.28885 1.06723 8.71116 1.06723 10.822 3.17804C12.9328 5.28885 12.9328 8.71116 10.822 10.822C10.5853 11.0586 10.3323 11.2687 10.0664 11.4522L10.0701 11.4485C8.30532 9.68373 8.30532 6.82247 10.0701 5.05769L10.3207 4.80707L9.19293 3.67929L8.94232 3.92991C7.17754 5.69469 4.31627 5.69469 2.55149 3.92991L2.54779 3.93361C2.73135 3.66773 2.94144 3.41465 3.17804 3.17804ZM3.78324 11.3445C5.18177 12.3827 6.96794 12.6587 8.57252 12.1724C7.56099 10.964 7.08953 9.4567 7.15811 7.96969L3.78324 11.3445ZM1.82764 5.42748C3.03602 6.43901 4.5433 6.91047 6.03031 6.84189L2.65546 10.2168C1.61726 8.81823 1.34132 7.03206 1.82764 5.42748Z" fill="currentColor" />
                          </svg>
                          <span>What should I say?</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  <ChatDemo />
                </div>
              </div>
            </div>
            <div className="relative flex w-full items-center justify-center py-2 md:hidden">
              <video className="aspect-[1] w-[300px] object-cover fix-safari-autoplay" autoPlay muted playsInline loop>
                <source src="/videos/home/hero-v2/roy-hevc-safari.mp4" type="video/mp4; codecs='hvc1'" />
                <source src="/videos/home/hero-v2/roy-vp9-chrome.webm" type="video/webm" />
              </video>
              <ChatDemo />
            </div>
          </div>

          {/* Features: People search & Follow-up email */}
          <section className="features relative z-10 w-full pt-12 md:pt-16 lg:pt-24">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-y-11 px-5 md:flex-row md:gap-x-[28px] md:px-8 lg:gap-x-16">
              <div className="mx-auto flex max-w-[500px] basis-1/2 flex-col xl:max-w-full">
                <h2 className="text-20 leading-snug font-medium tracking-tight text-foreground lg:text-28">People search</h2>
                <p className="mt-2 max-w-[484px] text-base leading-snug tracking-tight text-gray-40 md:mt-2.5 md:mb-6 lg:mt-3 lg:mb-0 lg:text-xl">Before every meeting, Interview Copilot gives you background on attendees and your past conversations.</p>
                <div className="relative mt-5 md:mt-auto lg:mt-10 xl:mt-12">
                  <div className="group relative aspect-[16/9] w-full overflow-hidden rounded-2xl">
                    <div className="absolute inset-0">
                      <video 
                        className="w-full h-full object-cover fix-safari-autoplay" 
                        autoPlay 
                        muted 
                        playsInline 
                        loop
                      >
                        <source src="/videos/FeatureCard1.mp4" type="video/mp4" />
                      </video>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mx-auto flex max-w-[500px] basis-1/2 flex-col xl:max-w-full">
                <h2 className="text-20 leading-snug font-medium tracking-tight text-foreground lg:text-28">Follow-up email</h2>
                <p className="mt-2 max-w-[484px] text-base leading-snug tracking-tight text-gray-40 md:mt-2.5 md:mb-6 lg:mt-3 lg:mb-0 lg:text-xl">After every meeting, Interview Copilot generates a follow-up email and notes based on the conversation.</p>
                <div className="relative mt-5 md:mt-auto lg:mt-10 xl:mt-12">
                  <div className="group relative aspect-[16/9] w-full overflow-hidden rounded-2xl">
                    <div className="absolute inset-0">
                      <video 
                        className="w-full h-full object-cover fix-safari-autoplay" 
                        autoPlay 
                        muted 
                        playsInline 
                        loop
                      >
                        <source src="/videos/FeatureCard2.mp4" type="video/mp4" />
                      </video>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
            {/* Interviews / marquee section */}
            <section className="interviews relative pt-[130px] pb-5 md:pt-[210px] md:pb-[65px] lg:pt-56 lg:pb-[34px] xl:pt-[288px] xl:pb-[70px]">
              <div className="pointer-events-none absolute inset-x-0 top-1/2 mt-[184px] h-[calc(100%+910px)] w-full -translate-y-1/2 bg-[linear-gradient(0deg,#FFF_0%,#DDE2EE_47.12%,#FFF_95.67%)]" aria-hidden="true"></div>
              <div className="relative mx-auto w-full max-w-7xl px-5 md:block md:px-8">
                <div className="max-w-7xl">
                  <span className="block text-2xl leading-[1.75] font-medium -tracking-[0.04em] md:text-[28px] lg:text-4xl xl:text-[40px]">You don&apos;t need help after the call is over.</span>
                  <h2 className="relative block font-forma text-[50px] leading-tightest font-medium text-gray-80 md:text-[72px] lg:text-[96px] xl:text-[104px]">
                    <svg className="pointer-events-none invisible absolute inset-0 size-full">
                      <defs>
                        <filter id="text-inset-shadow" filterUnits="userSpaceOnUse">
                          <feOffset dx="2" dy="2"></feOffset>
                          <feGaussianBlur stdDeviation="2" result="blurred"></feGaussianBlur>
                          <feComposite operator="out" in="SourceGraphic" in2="blurred" result="cutout"></feComposite>
                          <feFlood floodColor="black" floodOpacity="0.5" result="shadowColor"></feFlood>
                          <feComposite in="shadowColor" in2="cutout" operator="in" result="insetShadow"></feComposite>
                        </filter>
                      </defs>
                    </svg>
                    <span className="relative inline-block transform-gpu will-change-transform">
                      <span>28 notetakers</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute inset-0 hidden size-full translate-y-2 select-none xl:block" viewBox="0 0 590 117" fill="none">
                        <defs>
                          <mask id="interviews-text-mask-xl">
                            <text className="text-[104px]" x="0" y="67" fill="#ffffff" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle">28 notetakers</text>
                          </mask>
                        </defs>
                        <text className="text-[104px]" x="0" y="67" fill="white" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle" filter="url(#text-inset-shadow)">28 notetakers</text>
                        <text className="text-[104px]" x="0" y="67" fill="rgba(0,0,0,0.1)" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle">28 notetakers</text>
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute inset-0 hidden size-full translate-y-1.25 select-none lg:block xl:hidden" viewBox="0 0 545 108" fill="none">
                        <defs>
                          <mask id="interviews-text-mask-lg">
                            <text className="text-[96px]" x="0" y="64" fill="#ffffff" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle">28 notetakers</text>
                          </mask>
                        </defs>
                        <text className="text-[96px]" x="0" y="64" fill="white" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle" filter="url(#text-inset-shadow)">28 notetakers</text>
                        <text className="text-[96px]" x="0" y="64" fill="rgba(0,0,0,0)" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle">28 notetakers</text>
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute inset-0 hidden size-full translate-y-1.25 select-none md:block lg:hidden" viewBox="0 0 409 80" fill="none">
                        <defs>
                          <mask id="interviews-text-mask-md">
                            <text className="text-[72px]" x="0" y="46" fill="#ffffff" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle">28 notetakers</text>
                          </mask>
                        </defs>
                        <text className="text-[72px]" x="0" y="46" fill="white" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle" filter="url(#text-inset-shadow)">28 notetakers</text>
                        <text className="text-[72px]" x="0" y="46" fill="rgba(0,0,0,0)" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle">28 notetakers</text>
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute inset-0 size-full translate-y-1.25 select-none md:hidden" viewBox="0 0 363 72" fill="none">
                        <defs>
                          <mask id="interviews-text-mask-sm">
                            <text className="text-[50px]" x="0" y="32" fill="#ffffff" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle">28 notetakers</text>
                          </mask>
                        </defs>
                        <text className="text-[64px]" x="0" y="41" fill="white" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle" filter="url(#text-inset-shadow)">28 notetakers</text>
                        <text className="text-[50px]" x="0" y="41" fill="rgba(0,0,0,0)" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle">28 notetakers</text>
                      </svg>
                      <video 
                        className="pointer-events-none absolute inset-0 h-full w-full translate-y-1.25 object-cover select-none xl:translate-y-2 [mask-image:url(#interviews-text-mask-sm)] md:[mask-image:url(#interviews-text-mask-md)] lg:[mask-image:url(#interviews-text-mask-lg)] xl:[mask-image:url(#interviews-text-mask-xl)] fix-safari-autoplay" 
                        autoPlay 
                        muted 
                        playsInline 
                        loop
                        style={{animation: 'fadeInOut1 8s ease-in-out infinite'}}
                      >
                        <source src="/videos/home/interviews-section/really-everything.mp4" type="video/mp4" />
                        <source src="/videos/home/interviews-section/really-everything.webm" type="video/webm" />
                      </video>
                    </span>
                    <span className="relative inline-block transform-gpu will-change-transform">
                      <span> help too late.</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute inset-0 hidden size-full translate-y-2 select-none xl:block opacity-0" viewBox="0 0 534 116" fill="none">
                        <defs>
                          <mask id="sales-calls-text-mask-xl">
                            <text className="text-[104px]" x="0" y="67" fill="#ffffff" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle">help too late.</text>
                          </mask>
                        </defs>
                        <text className="text-[104px]" x="0" y="67" fill="white" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle" filter="url(#text-inset-shadow)">help too late.</text>
                        <text className="text-[104px]" x="0" y="67" fill="rgba(0,0,0,0.1)" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle">help too late.</text>
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute inset-0 hidden size-full translate-y-1.25 select-none lg:block xl:hidden opacity-0" viewBox="0 0 493 108" fill="none">
                        <defs>
                          <mask id="sales-calls-text-mask-lg">
                            <text className="text-[96px]" x="0" y="64" fill="#ffffff" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle">help too late.</text>
                          </mask>
                        </defs>
                        <text className="text-[96px]" x="0" y="64" fill="white" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle" filter="url(#text-inset-shadow)">help too late.</text>
                        <text className="text-[96px]" x="0" y="64" fill="rgba(0,0,0,0)" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle">help too late.</text>
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute inset-0 hidden size-full translate-y-1.25 select-none md:block lg:hidden opacity-0" viewBox="0 0 370 81" fill="none">
                        <defs>
                          <mask id="sales-calls-text-mask-md">
                            <text className="text-[72px]" x="0" y="46" fill="#ffffff" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle">help too late.</text>
                          </mask>
                        </defs>
                        <text className="text-[72px]" x="0" y="46" fill="white" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle" filter="url(#text-inset-shadow)">help too late.</text>
                        <text className="text-[72px]" x="0" y="46" fill="rgba(0,0,0,0)" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle">help too late.</text>
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute inset-0 size-full translate-y-1.25 select-none md:hidden opacity-0" viewBox="0 0 329 72" fill="none">
                        <defs>
                          <mask id="sales-calls-text-mask-sm">
                            <text className="text-[50px]" x="0" y="32" fill="#ffffff" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle">help too late.</text>
                          </mask>
                        </defs>
                        <text className="text-[64px]" x="0" y="41" fill="white" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle" filter="url(#text-inset-shadow)">help too late.</text>
                        <text className="text-[50px]" x="0" y="41" fill="rgba(0,0,0,0)" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle">help too late.</text>
                      </svg>
                      <video 
                        className="pointer-events-none absolute inset-0 h-full w-full translate-y-1.25 object-cover select-none xl:translate-y-2 [mask-image:url(#sales-calls-text-mask-sm)] md:[mask-image:url(#sales-calls-text-mask-md)] lg:[mask-image:url(#sales-calls-text-mask-lg)] xl:[mask-image:url(#sales-calls-text-mask-xl)] fix-safari-autoplay" 
                        autoPlay 
                        muted 
                        playsInline 
                        loop
                        style={{animation: 'fadeInOut2 8s ease-in-out infinite'}}
                      >
                        <source src="/videos/home/interviews-section/really-everything.mp4" type="video/mp4" />
                        <source src="/videos/home/interviews-section/really-everything.webm" type="video/webm" />
                      </video>
                    </span>
                    <br className="hidden md:block" />
                    <span className="relative inline-block transform-gpu will-change-transform">
                      <span>Interview Copilot helps</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute inset-0 hidden size-full translate-y-2 select-none xl:block opacity-0" viewBox="0 0 516 117" fill="none">
                        <defs>
                          <mask id="homework-text-mask-xl">
                            <text className="text-[104px]" x="0" y="67" fill="#ffffff" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle">Interview Copilot helps</text>
                          </mask>
                        </defs>
                        <text className="text-[104px]" x="0" y="67" fill="white" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle" filter="url(#text-inset-shadow)">Interview Copilot helps</text>
                        <text className="text-[104px]" x="0" y="67" fill="rgba(0,0,0,0.1)" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle">Interview Copilot helps</text>
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute inset-0 hidden size-full translate-y-1.25 select-none lg:block xl:hidden opacity-0" viewBox="0 0 475 108" fill="none">
                        <defs>
                          <mask id="homework-text-mask-lg">
                            <text className="text-[96px]" x="0" y="64" fill="#ffffff" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle">Interview Copilot helps</text>
                          </mask>
                        </defs>
                        <text className="text-[96px]" x="0" y="64" fill="white" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle" filter="url(#text-inset-shadow)">Interview Copilot helps</text>
                        <text className="text-[96px]" x="0" y="64" fill="rgba(0,0,0,0)" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle">Interview Copilot helps</text>
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute inset-0 hidden size-full translate-y-1.25 select-none md:block lg:hidden opacity-0" viewBox="0 0 356 81" fill="none">
                        <defs>
                          <mask id="homework-text-mask-md">
                            <text className="text-[72px]" x="0" y="46" fill="#ffffff" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle">Interview Copilot helps</text>
                          </mask>
                        </defs>
                        <text className="text-[72px]" x="0" y="46" fill="white" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle" filter="url(#text-inset-shadow)">Interview Copilot helps</text>
                        <text className="text-[72px]" x="0" y="46" fill="rgba(0,0,0,0)" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle">Interview Copilot helps</text>
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute inset-0 size-full translate-y-1.25 select-none md:hidden opacity-0" viewBox="0 0 318 72" fill="none">
                        <defs>
                          <mask id="homework-text-mask-sm">
                            <text className="text-[50px]" x="0" y="32" fill="#ffffff" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle">Interview Copilot helps</text>
                          </mask>
                        </defs>
                        <text className="text-[64px]" x="0" y="41" fill="white" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle" filter="url(#text-inset-shadow)">Interview Copilot helps</text>
                        <text className="text-[50px]" x="0" y="41" fill="rgba(0,0,0,0)" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle">Interview Copilot helps</text>
                      </svg>
                      <video 
                        className="pointer-events-none absolute inset-0 h-full w-full translate-y-1.25 object-cover select-none xl:translate-y-2 [mask-image:url(#homework-text-mask-sm)] md:[mask-image:url(#homework-text-mask-md)] lg:[mask-image:url(#homework-text-mask-lg)] xl:[mask-image:url(#homework-text-mask-xl)] fix-safari-autoplay" 
                        autoPlay 
                        muted 
                        playsInline 
                        loop
                        style={{animation: 'fadeInOut3 8s ease-in-out infinite'}}
                      >
                        <source src="/videos/home/interviews-section/really-everything.mp4" type="video/mp4" />
                        <source src="/videos/home/interviews-section/really-everything.webm" type="video/webm" />
                      </video>
                    </span>
                    <span className="relative inline-block transform-gpu will-change-transform">
                      <span> in realtime.</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute inset-0 hidden size-full translate-y-2 select-none xl:block opacity-0" viewBox="0 0 460 117" fill="none">
                        <defs>
                          <mask id="meetings-text-mask-xl">
                            <text className="text-[104px]" x="0" y="67" fill="#ffffff" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle">in realtime.</text>
                          </mask>
                        </defs>
                        <text className="text-[104px]" x="0" y="67" fill="white" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle" filter="url(#text-inset-shadow)">in realtime.</text>
                        <text className="text-[104px]" x="0" y="67" fill="rgba(0,0,0,0.1)" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle">in realtime.</text>
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute inset-0 hidden size-full translate-y-1.25 select-none lg:block xl:hidden opacity-0" viewBox="0 0 424 108" fill="none">
                        <defs>
                          <mask id="meetings-text-mask-lg">
                            <text className="text-[96px]" x="0" y="64" fill="#ffffff" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle">in realtime.</text>
                          </mask>
                        </defs>
                        <text className="text-[96px]" x="0" y="64" fill="white" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle" filter="url(#text-inset-shadow)">in realtime.</text>
                        <text className="text-[96px]" x="0" y="64" fill="rgba(0,0,0,0)" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle">in realtime.</text>
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute inset-0 hidden size-full translate-y-1.25 select-none md:block lg:hidden opacity-0" viewBox="0 0 318 81" fill="none">
                        <defs>
                          <mask id="meetings-text-mask-md">
                            <text className="text-[72px]" x="0" y="46" fill="#ffffff" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle">in realtime.</text>
                          </mask>
                        </defs>
                        <text className="text-[72px]" x="0" y="46" fill="white" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle" filter="url(#text-inset-shadow)">in realtime.</text>
                        <text className="text-[72px]" x="0" y="46" fill="rgba(0,0,0,0)" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle">in realtime.</text>
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute inset-0 size-full translate-y-1.25 select-none md:hidden opacity-0" viewBox="0 0 282 72" fill="none">
                        <defs>
                          <mask id="meetings-text-mask-sm">
                            <text className="text-[50px]" x="0" y="32" fill="#ffffff" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle">in realtime.</text>
                          </mask>
                        </defs>
                        <text className="text-[64px]" x="0" y="41" fill="white" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle" filter="url(#text-inset-shadow)">in realtime.</text>
                        <text className="text-[50px]" x="0" y="41" fill="rgba(0,0,0,0)" letterSpacing="0" xmlSpace="preserve" dominantBaseline="middle">in realtime.</text>
                      </svg>
                      <video 
                        className="pointer-events-none absolute inset-0 h-full w-full translate-y-1.25 object-cover select-none xl:translate-y-2 [mask-image:url(#meetings-text-mask-sm)] md:[mask-image:url(#meetings-text-mask-md)] lg:[mask-image:url(#meetings-text-mask-lg)] xl:[mask-image:url(#meetings-text-mask-xl)] fix-safari-autoplay" 
                        autoPlay 
                        muted 
                        playsInline 
                        loop
                        style={{animation: 'fadeInOut4 8s ease-in-out infinite'}}
                      >
                        <source src="/videos/home/interviews-section/really-everything.mp4" type="video/mp4" />
                        <source src="/videos/home/interviews-section/really-everything.webm" type="video/webm" />
                      </video>
                    </span>
                  </h2>
                </div>
        </div>
      </section>

            {/* Completely undetectable section */}
            <section className="undetectable relative z-10 overflow-hidden pt-[113px] md:pt-[152px] lg:pt-[200px] xl:pt-[217px]">
              <div className="mx-auto px-5 md:max-w-6xl lg:max-w-[1024px] xl:max-w-[1280px] xl:px-8 2xl:max-w-[1408px]">
                <div className="2xl:pl-16">
                  <span className="font-title italic text-[19px] tracking-[-0.02em] text-[#4E6BFF] drop-shadow-[0_1px_0_rgba(255,255,255,0.35)] md:text-[21px] lg:text-[23px]">Completely undetectable</span>
                  <h2 className="font-title italic mt-3 text-[40px] leading-[1.04] text-[#020411] md:mt-3.5 md:text-[48px] lg:mt-4.5 lg:text-[56px] xl:text-[64px]">Gain an unfair advantage in every call without anyone knowing.</h2>
        </div>
                <div className="relative mt-10 grid grid-cols-1 gap-10 md:mt-11 md:grid-cols-2 md:gap-x-7 md:gap-y-10 lg:mt-12 lg:grid-cols-3 lg:gap-x-6 2xl:mt-14 2xl:gap-x-[32px]">
                  {/* Card 1: Meeting participants */}
                  <div>
                    <div className="card-styles flex flex-col justify-between p-[18px] md:p-[19px] lg:p-[17px] xl:p-[22px] 2xl:p-6">
                      <div className="rounded-[18px] bg-[linear-gradient(180deg,#FFFFFF_0%,#F2F4FF_100%)] p-4 shadow-[0px_30px_70px_rgba(34,37,70,0.14)] md:p-5">
                        <div className="flex items-center justify-between">
                          <h2 className="text-[13px] font-semibold tracking-tight text-[#0D1126] xl:text-[14px]">
                            Meeting participants <span className="text-sm font-normal text-[#8E93AD]">(4)</span>
                          </h2>
                          <div className="flex items-center gap-1 rounded-full bg-[#E9F8F0] px-2.5 py-1 text-[10px] font-semibold text-[#0A8A51] shadow-[0px_8px_20px_rgba(26,153,94,0.18)]">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 12 13" fill="none">
                              <path d="M10.5 1.99962C9.055 1.99962 7.689 1.69512 6.201 1.04162L6 0.953125L5.799 1.04162C4.311 1.69512 2.945 1.99962 1.5 1.99962H1V5.99963C1 10.8446 5.8425 11.9771 5.8915 11.9876L6 12.0116L6.1085 11.9876C6.1575 11.9771 11 10.8446 11 5.99963V1.99962H10.5ZM5.14 8.72163L3.293 6.87463L4 6.16763L5.11 7.27763L7.9705 4.16812L8.7065 4.84512L5.14 8.72163Z" fill="currentColor" />
                            </svg>
                            No bots detected
                          </div>
                        </div>
                        <div className="mt-3 space-y-1.5">
                          {MEETING_PARTICIPANTS.map((person) => (
                            <div key={person.email} className="flex items-start gap-3 rounded-[12px] border border-white/70 bg-white/85 px-3 py-2.5 shadow-[0px_10px_20px_rgba(25,30,58,0.08)]">
                              <img alt={person.name} loading="lazy" width="32" height="32" className="size-8 shrink-0 rounded-full border border-white/80 object-cover" src={person.avatar} />
                              <div className="flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-[12px] font-semibold text-[#0D1126]">
                                    {person.name}{' '}
                                    {person.isSelf && <span className="text-[10px] font-medium text-[#8F93AE]">(You)</span>}
                                  </p>
                                  <span className="flex items-center gap-1 rounded-full border border-[#E0E4F4] bg-[#F6F8FF] px-2 py-0.5 text-[10px] font-semibold text-[#5F6583]">
                                    {person.role}
                                    {person.role !== 'Owner' && (
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3 text-[#5F6583]">
                                        <path d="m6 9 6 6 6-6" />
                                      </svg>
                                    )}
                                  </span>
                                </div>
                                <p className="text-[10px] text-[#8F93AE]">{person.email}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 flex items-center justify-between rounded-[14px] border border-white/80 bg-white px-3.5 py-2.5 shadow-[0px_18px_40px_rgba(19,24,48,0.15)]">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-full bg-[#EEF2FF] shadow-inner">
                              <img alt="Cluely icon" loading="lazy" width="18" height="18" className="size-5" src="/cluely-icon985b.png" />
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold text-[#0D1126]">Cluely overlay</p>
                              <p className="text-[10px] text-[#8E93AD]">Only you can see this</p>
                            </div>
                          </div>
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#98A1C2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                            <path d="M7 17 17 7" />
                            <path d="M7 7h10v10" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="mx-auto mt-[19px] max-w-[600px] text-base leading-snug tracking-tight text-[#0B0E19] sm:text-18 md:mt-5 xl:mt-[18px] xl:text-20 2xl:mt-[26px]">
                      <p>
                        <strong className="mr-1 font-medium text-[#0B0E19]">Doesn&apos;t join meetings.</strong>
                        Cluely never joins your meetings, so there are no bots and no extra people on the guest list.
                      </p>
                    </div>
                  </div>

                  {/* Card 2: Invisible to screen share */}
                  <InvisibleSlider />

                  {/* Card 3: Never in your way */}
                  <NeverInYourWay />
                </div>
              </div>
            </section>

            {/* Platform integrations section */}
            <section className="undetectable relative z-10 overflow-hidden">
              <div className="mx-auto px-5 md:max-w-6xl lg:max-w-[1024px] xl:max-w-[1280px] xl:px-8 2xl:max-w-[1408px]">
                <div aria-hidden="true" className="mt-10 mb-8 h-px w-full bg-gray-90 md:mt-11 md:mb-8 lg:mt-14 lg:mb-9 xl:mt-16 xl:mb-10"></div>
                <div className="flex w-full flex-col justify-between gap-7 md:flex-row">
                  <span className="text-[14px] leading-tight font-semibold tracking-[0.28em] text-[#040711] uppercase md:mt-1 lg:text-[15px]">Works with every meeting platform</span>
                  <ul className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 md:gap-x-12 md:gap-y-6 md:pr-4 lg:gap-x-[60px] lg:gap-y-7 lg:pr-7">
                    <li className="flex items-center gap-2.5 opacity-80">
                      <img alt="Zoom logo" loading="lazy" width="28" height="28" className="size-7 lg:size-8" src="/zoom.0987f466.svg"/>
                      <p className="text-18 leading-none font-medium tracking-2 text-[#1A1D2C] lg:text-20">Zoom</p>
                    </li>
                    <li className="flex items-center gap-2.5 opacity-80">
                      <img alt="Slack logo" loading="lazy" width="28" height="28" className="size-7 lg:size-8" src="/slack.c74ac29a.svg"/>
                      <p className="text-18 leading-none font-medium tracking-2 text-[#1A1D2C] lg:text-20">Slack</p>
                    </li>
                    <li className="flex items-center gap-2.5 opacity-60">
                      <img alt="Webex logo" loading="lazy" width="28" height="28" className="size-7 lg:size-8" src="/webex.373a67ab.svg"/>
                      <p className="text-18 leading-none font-medium tracking-2 text-[#4C5065] lg:text-20">Webex</p>
                    </li>
                    <li className="flex items-center gap-2.5 opacity-60">
                      <img alt="Microsoft Teams logo" loading="lazy" width="28" height="28" className="size-7 lg:size-8" src="/teams.d0a5b170.svg"/>
                      <p className="text-18 leading-none font-medium tracking-2 text-[#4C5065] lg:text-20">Microsoft Teams</p>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Beautiful notes section */}
            <section className="catches-what-you-missed relative overflow-hidden pt-[280px] md:pt-[400px] lg:pt-[480px] xl:pt-[500px]">
              <div className="mx-auto max-w-[440px] px-5 md:max-w-none md:px-8 lg:max-w-[1408px] xl:max-w-[1344px] 2xl:max-w-[1408px]">
                <div className="flex flex-col items-center justify-center text-center relative z-40">
                  <span className="block text-lg leading-snug font-medium tracking-tight text-[#5C6AE6] lg:text-24">After every call...</span>
                  <div className="relative mt-3 md:mt-3.5 lg:mt-4.5">
                    <h2 className="text-32 font-semibold tracking-4 text-black md:max-w-[508px] md:text-[52px] lg:max-w-[626px] lg:text-[64px] xl:max-w-[704px] xl:text-[72px]">
                      Beautiful notes <br/>of every meeting
                    </h2>
                  </div>
                  <p className="mt-4.5 text-base leading-snug tracking-tight text-[#565C73] md:mt-6 md:max-w-[450px] md:text-lg lg:max-w-[536px] lg:text-xl xl:max-w-[540px]">After every call, Interview Copilot generates easy to share notes with instant follow-up emails, and action items.</p>
                  
                  {/* Dashboard positioned 30px below description */}
                  <div className="relative mt-8 w-full max-w-[975px]">
                    <DashboardView />
                  </div>
                  
                  <div className="relative md:hidden">
                    <img alt="" loading="lazy" width="422" height="154" className="scale-145" src="/mobile-icons.ceef8c1e73a3.png"/>
                  </div>
                  <div className="relative h-[500px] w-full sm:h-[650px] md:h-[750px] lg:h-[850px] xl:h-[950px]"></div>
                </div>
              </div>
              <div className="chat absolute xl:left-[calc(50%-658px)] xl:top-[277px] xl:w-[233px] lg:w-[188px] lg:left-[calc(50%-482px)] lg:top-[323px] md:w-[136px] md:left-[calc(50%-342px)] md:top-[250px] hidden md:block">
                <img alt="" loading="lazy" width="233" height="218" src="/chat.e30e07dfd022.png"/>
              </div>
              <div className="magnifier absolute xl:left-[calc(50%-625px)] xl:top-[517px] xl:w-[233px] lg:w-[186px] lg:left-[calc(50%-427px)] lg:top-[514px] md:w-[136px] md:left-[calc(50%-306px)] md:top-[378px] hidden md:block">
                <img alt="" loading="lazy" width="233" height="218" src="/magnifier.37cce8ab58aa.png"/>
              </div>
              <div className="notes absolute xl:left-[calc(50%-808px)] xl:top-[719px] xl:w-[233px] lg:w-[182px] lg:left-[calc(50%-691px)] lg:top-[619px] lg:block hidden">
                <img alt="" loading="lazy" width="233" height="218" src="/notes.a47d55d12af8.png"/>
              </div>
              <div className="calendar absolute xl:right-[calc(50%-716px)] xl:top-[310px] xl:w-[227px] lg:w-[182px] lg:right-[calc(50%-491px)] lg:top-[353px] md:w-[136px] md:right-[calc(50%-358px)] md:top-[266px] hidden md:block">
                <img alt="" loading="lazy" width="227" height="227" src="/calendar.c0347aad4297.png"/>
              </div>
              <div className="video absolute xl:right-[calc(50%-558px)] xl:top-[506px] xl:w-[227px] lg:w-[182px] lg:right-[calc(50%-441px)] lg:top-[507px] md:w-[132px] md:right-[calc(50%-317px)] md:top-[382px] hidden md:block">
                <img alt="" loading="lazy" width="227" height="227" src="/video.2db690ff9b67.png"/>
              </div>
              <div className="anonymous absolute xl:right-[calc(50%-819px)] xl:top-[670px] xl:w-[227px] lg:w-[182px] lg:right-[calc(50%-691px)] lg:top-[603px] lg:block hidden">
                <img alt="" loading="lazy" width="227" height="227" src="/anonymous.0207aa078494.png"/>
              </div>
              <div className="dashboard-gradient pointer-events-none absolute inset-x-0 bottom-1.5 z-0 h-[557px] w-full border-b border-b-[#E5EBF5] bg-[linear-gradient(180deg,rgba(221,226,238,0.00)_0%,rgba(221,226,238,0.14)_36.4%)] md:bottom-[-15px] md:h-[768px] lg:bottom-[-19px] lg:h-[1024px] xl:bottom-0 xl:h-[1013px]" aria-hidden="true"></div>
            </section>

            {/* FAQ */}
            <section className="faq relative z-1 w-full py-12 md:py-16 lg:py-24 pt-[105px] pb-6 md:pt-[152px] md:pb-2.5 lg:pt-[198px] lg:pb-[122px] xl:pt-[218px] xl:pb-[85px]">
              <div className="mx-auto flex w-full max-w-7xl flex-col gap-y-5 px-5 md:px-8">
                <h2 className="text-28 leading-tight font-medium tracking-4 text-foreground md:text-4xl md:text-32 lg:mb-[16px] lg:text-40 xl:mb-[24px]">Frequently asked questions</h2>
                <ul className="divide-y">
                  <li className="py-4 text-sm md:text-base">How does real-time assistance work?</li>
                  <li className="py-4 text-sm md:text-base">What types of interviews does it support?</li>
                  <li className="py-4 text-sm md:text-base">Is it detectable during video interviews?</li>
                  <li className="py-4 text-sm md:text-base">What programming languages are supported?</li>
                  <li className="py-4 text-sm md:text-base">Can it help with behavioral questions?</li>
                  <li className="py-4 text-sm md:text-base">How do I get started?</li>
                </ul>
              </div>
            </section>

            {/* Final CTA */}
            <section className="w-full py-12 md:py-16 lg:py-24">
              <div className="mx-auto w-full max-w-7xl px-5 md:px-8">
                <h3 className="text-2xl md:text-4xl font-medium text-gray-900">Meeting AI that helps during the call, not after.</h3>
                <p className="mt-2 text-base md:text-lg text-gray-500">Try Interview Copilot on your next meeting today.</p>
                <div className="mt-6">
                  <button className="purple-gradient-button rounded-[10px] flex items-center gap-2 text-white font-medium text-[16px] tracking-[-0.13px] px-5 py-3 relative overflow-hidden" type="button">
                    <span className="absolute top-0 left-0 z-20 h-full w-full blur-[1px]" aria-hidden="true">
                      <span className="blurred-border absolute -top-px -left-px z-20 h-full w-full"></span>
                    </span>
                    <div className="absolute -top-4 -left-12 h-32 w-4 rotate-6 bg-white/80 blur-md" />
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                    </svg>
                    <span>Get for Mac</span>
                  </button>
                </div>
          <h3 className="font-medium text-gray-900">Actionable follow-ups</h3>
          <p className="mt-1 text-sm text-gray-600">Auto-drafted follow-up emails and summaries right after the meeting.</p>
        </div>
      </section>
    </main>
      </div>
      {/* Footer is provided globally in layout */}
    </div>
  );
}
