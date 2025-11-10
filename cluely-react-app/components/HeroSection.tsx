'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function HeroSection() {
  const [isClient, setIsClient] = useState(false);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Detect if user is on Mac
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isMacOS = /mac|macintosh|macos/.test(userAgent);
    setIsMac(isMacOS);
  }, []);

  return (
    <section className="flex h-full items-start justify-center pt-20 lg:pt-28">
      <div className="flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-4 lg:gap-3">
            <h1 
              className="text-center text-[56px] leading-[102%] font-medium tracking-[-1px] text-white lg:text-[80px] animate-fade-in-up" 
              style={{fontFamily:"'EB Garamond', 'EB Garamond Fallback'"}}
            >
              <span className="block h-[57px] overflow-hidden lg:h-[76px]">
                <span className="inline-block animate-slide-up" style={{animationDelay: '0.1s'}}>Your</span>
                <span className="inline-block animate-slide-up mx-3 lg:mx-4" style={{animationDelay: '0.2s'}}>AI</span>
                <span className="inline-block animate-slide-up" style={{animationDelay: '0.3s'}}>assistant</span>
              </span>
              <span className="block h-[70px] overflow-hidden lg:h-[94px]">
                <span className="inline-block animate-slide-up" style={{animationDelay: '0.4s'}}>for</span>
                <span className="inline-block animate-slide-up ml-3 lg:ml-4" style={{animationDelay: '0.5s'}}>interviews</span>
              </span>
            </h1>
            <hr className="hidden h-px w-96 border-none lg:block" />
            <h2 className="text-center leading-[140%] font-medium tracking-[-0.02em] text-white lg:text-[19px] animate-fade-in" style={{animationDelay: '0.6s'}}>
              Get instant answers, code examples,
              <br className="md:hidden" />
              and interview tips
              <br className="hidden md:block" />
              in real-time<br className="md:hidden" />
              <span className="hidden md:inline">—</span> ace every technical interview.
            </h2>
          </div>
        </div>
        <div className="h-10 animate-fade-in" id="download-button" style={{animationDelay: '0.8s'}}>
          <Link 
            href="/signup"
            className="purple-gradient-button rounded-[10px] flex items-center gap-2 w-fit text-white font-medium text-[16px] tracking-[-0.13px] p-[10px_20px] relative overflow-hidden"
          >
            <span className="absolute top-0 left-0 z-20 h-full w-full blur-[1px]" aria-hidden="true">
              <span className="blurred-border absolute -top-px -left-px z-20 h-full w-full"></span>
            </span>
            <div className="absolute -top-4 -left-12 h-32 w-4 rotate-6 bg-white/80 blur-md" />
            <span>Start Free Trial</span>
            {isClient && (
              isMac ? (
                // Apple icon
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                </svg>
              ) : (
                // Windows icon
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 5.5L9.5 4.6V11.5H3V5.5M10.5 4.4L21 3V11.5H10.5V4.4M21 12.5V21L10.5 19.6V12.5H21M9.5 19.8L3 19V12.5H9.5V19.8Z" />
                </svg>
              )
            )}
          </Link>
        </div>
      </div>
    </section>
  );
}
