'use client';

import { useState, useEffect, useRef } from 'react';

export default function InvisibleSlider() {
  const [sliderPosition, setSliderPosition] = useState(30); // start closer to original demo (30%)
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging || !containerRef.current) return;

  const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.closest('[data-slider-container]')) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setSliderPosition(prev => Math.max(0, prev - 5));
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setSliderPosition(prev => Math.min(100, prev + 5));
        }
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
  }

  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('touchmove', handleTouchMove, { passive: false });
  document.addEventListener('touchend', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div>
      <div className="card-styles flex flex-col justify-between p-[18px] md:p-[19px] lg:p-[17px] xl:p-[22px] 2xl:p-6">
        <div
          ref={containerRef}
          data-slider-container
          className="pointer-events-auto relative min-h-[260px] rounded-[6px] bg-[linear-gradient(180deg,rgba(255,255,255,0.7)_0%,#F9FAFB_100%)] p-3.5 md:min-h-[300px] md:rounded-[10px] lg:min-h-[320px] lg:rounded-[9px] xl:min-h-[360px] xl:rounded-xl xl:p-4.5 overflow-hidden cursor-ew-resize"
          tabIndex={0}
          role="slider"
          aria-label="Screen share visibility slider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={sliderPosition}
          onMouseDown={(e) => {
            if (!containerRef.current) return;
            e.preventDefault();
            const rect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
            setSliderPosition(percentage);
            setIsDragging(true);
          }}
          onTouchStart={(e) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const x = e.touches[0].clientX - rect.left;
            const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
            setSliderPosition(percentage);
            setIsDragging(true);
          }}
        >
          {/* Base image (screen everyone sees) */}
          <div className="card1 absolute inset-0 bg-[radial-gradient(92.09%_126.39%_at_50%_100%,_#DDE2EE_58.91%,_#BBC5DD_100%)]">
            <span className="absolute top-[18px] right-[18px] flex h-[22px] items-center justify-center rounded-[4px] bg-[#676B74] px-[6px] text-[9px] leading-tight font-semibold tracking-tight text-white xl:top-6 xl:right-6 xl:h-[29px] xl:rounded-[6px] xl:px-[8px] xl:text-[12px]">Invisible to others</span>
            <img src="/invisible-tool.452f4abe.png" alt="Invisible tool" className="absolute inset-0 z-0 h-full w-full object-cover select-none" />
          </div>

          {/* Overlay image (visible only to you) */}
          <div className="card2 absolute inset-0 bg-[radial-gradient(92.09%_126.39%_at_50%_100%,_#DDE2EE_58.91%,_#BBC5DD_100%)] select-none" style={{ clipPath: `inset(0% ${100 - sliderPosition}% 0% 0%)` }}>
            <div className="absolute inset-0 z-20 m-[7px] rounded-xl border-[2px] border-[#00FF26] lg:rounded-[16px] xl:m-2.5"></div>
            <span className="absolute top-[18px] left-[18px] z-10 flex h-[22px] items-center justify-center rounded-[4px] bg-[#676B74] px-[6px] text-[9px] leading-tight font-semibold tracking-tight text-white xl:top-6 xl:left-6 xl:h-[29px] xl:rounded-[6px] xl:px-[8px] xl:text-[12px]">Visible to you</span>
            <span className="absolute top-[18px] right-[18px] z-10 flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-[9px] font-semibold text-[#47506A] shadow-sm xl:top-6 xl:right-6 xl:text-[11px]">
              <span className="text-[#5B69FF]">+</span> AI Response
            </span>
            <div className="absolute top-[50px] left-[18px] z-20 w-full max-w-[calc(100%-36px)] rounded-[9px] bg-[linear-gradient(180deg,rgba(255,255,255,0.5)_0%,#F9FAFB_100%)] px-[14px] pt-[10px] pb-[6px] lg:top-12 xl:top-[66px] xl:left-6 xl:max-w-[calc(100%-48px)] 2xl:rounded-xl 2xl:px-[18px] 2xl:pt-[15px] 2xl:pb-[9px]">
              <div className="flex items-center gap-1 text-[10px] leading-tight font-semibold tracking-tight text-gray-12 lg:text-[9px] xl:text-[11px] 2xl:text-[13px]">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-[10px] xl:size-3.5"><path d="M8.43652 5.31348L12.5908 7.00098L8.43652 8.68848L6.74902 12.8428L5.06152 8.68848L0.90625 7.00098L5.06152 5.31348L6.74902 1.1582L8.43652 5.31348ZM3.12207 2.19043L4.5 2.78125L3.12207 3.37207L2.53125 4.75L1.94043 3.37207L0.5625 2.78125L1.94043 2.19043L2.53125 0.8125L3.12207 2.19043Z" fill="url(#paint0_linear_slider)" /></svg>
                AI Response
              </div>
              <div className="mt-[7px] inline-block text-[10px] leading-normal tracking-tight text-[#15192B] lg:text-[9px] xl:mt-[9px] xl:text-[11px] 2xl:text-[13px]">
                Add a check for missing <span className="relative mr-[5px] ml-[5px] font-mono text-[8px] leading-none text-[#4984FD] before:absolute before:top-1/2 before:left-1/2 before:z-[-1] before:h-[calc(100%+4px)] before:w-[calc(100%+6px)] before:-translate-x-1/2 before:-translate-y-1/2 before:rounded-[4px] before:bg-[#4984FD1A] xl:mr-[7px] xl:ml-[7px] xl:text-[10px] 2xl:text-[11px]">userId</span> before calling the API.<br />Also handle <span className="relative mr-[5px] ml-[5px] font-mono text-[8px] leading-none text-[#4984FD] before:absolute before:top-1/2 before:left-1/2 before:z-[-1] before:h-[calc(100%+4px)] before:w-[calc(100%+6px)] before:-translate-x-1/2 before:-translate-y-1/2 before:rounded-[4px] before:bg-[#4984FD1A] xl:mr-[7px] xl:ml-[7px] xl:text-[10px] 2xl:text-[11px]">data.name</span> safely to avoid undefined.
              </div>
            </div>
            <img src="/invisible-tool.452f4abe.png" alt="Before" className="absolute top-0 left-0 h-full object-cover object-left" />
          </div>

          {/* Divider / handle line */}
          <div
            className="absolute top-0 bottom-0 z-40 w-[2px] bg-[#1C2033] shadow-[0_0_16px_rgba(13,16,28,0.6)] select-none"
            style={{ left: `${sliderPosition}%` }}
            onMouseDown={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onTouchStart={() => setIsDragging(true)}
          />

          {/* Drag Handle */}
          <div
            className="absolute top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize"
            style={{ left: `${sliderPosition}%` }}
            onMouseDown={() => setIsDragging(true)}
          >
            <div className="pointer-events-auto flex size-[32px] items-center justify-center rounded-full border border-white/20 bg-[#0D101C] text-white shadow-[0px_12px_24px_rgba(8,10,20,0.55)] ring-1 ring-[#181C2C]/70 transition-transform hover:scale-105 xl:size-9">
              <svg width="18" height="10" viewBox="0 0 16 9" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-[14px] xl:size-[16px]" aria-hidden="true"><path d="M4.5 7.375L1.5 4.375L4.5 1.375" stroke="currentColor" strokeLinecap="square" /><path d="M11.5 7.375L14.5 4.375L11.5 1.375" stroke="currentColor" strokeLinecap="square" /></svg>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-[19px] max-w-[600px] text-base leading-snug tracking-tight text-[#0B0E19] sm:text-18 md:mt-5 xl:mt-[18px] xl:text-20 2xl:mt-[26px]">
        <p>
          <strong className="mr-1 font-medium text-[#0B0E19]">Invisible to screen share.</strong>
          Cluely never shows up in shared screens, recordings, or external meeting tools.
        </p>
      </div>
    </div>
  );
}
