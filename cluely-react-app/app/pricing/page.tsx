'use client';

import React from 'react';
import Link from 'next/link';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/images/bg-purple-dark.jpg)' }}>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24 lg:py-32">
        {/* Hero Section */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium text-white tracking-tight">
            Start{' '}
            <span className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 lg:w-[72px] lg:h-[72px] rounded-[16px] md:rounded-[18px] lg:rounded-[20px] bg-gradient-to-b from-[#5B8FF9] to-[#4A7FE8] shadow-[0_4px_20px_rgba(74,127,232,0.3)] mx-2 align-middle">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-7 h-7 md:w-8 md:h-8 lg:w-9 lg:h-9">
                <path fillRule="evenodd" clipRule="evenodd" d="M11.9497 2.05026C9.21608 -0.683418 4.78393 -0.683418 2.05026 2.05026C-0.683418 4.78393 -0.683418 9.21608 2.05026 11.9497C4.78393 14.6834 9.21608 14.6834 11.9497 11.9497C14.6834 9.21608 14.6834 4.78393 11.9497 2.05026ZM3.17804 3.17804C5.28885 1.06723 8.71116 1.06723 10.822 3.17804C12.9328 5.28885 12.9328 8.71116 10.822 10.822C10.5853 11.0586 10.3323 11.2687 10.0664 11.4522L10.0701 11.4485C8.30532 9.68373 8.30532 6.82247 10.0701 5.05769L10.3207 4.80707L9.19293 3.67929L8.94232 3.92991C7.17754 5.69469 4.31627 5.69469 2.55149 3.92991L2.54779 3.93361C2.73135 3.66773 2.94144 3.41465 3.17804 3.17804ZM3.78324 11.3445C5.18177 12.3827 6.96794 12.6587 8.57252 12.1724C7.56099 10.964 7.08953 9.4567 7.15811 7.96969L3.78324 11.3445ZM1.82764 5.42748C3.03602 6.43901 4.54330 6.91047 6.03031 6.84189L2.65546 10.2168C1.61726 8.81823 1.34132 7.03206 1.82764 5.42748Z" />
              </svg>
            </span>{' '}
            for free.
          </h1>
          <p className="mt-4 text-lg md:text-xl text-white/80 max-w-2xl mx-auto">
            Choose the plan that fits your interview preparation timeline. All plans include full access to Interview Copilot features.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="mt-16 grid gap-8 md:grid-cols-3 lg:gap-10">
          {/* Starter Card */}
          <div className="relative rounded-2xl bg-white p-8 shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-200">
            <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">Weekly</div>
            <div className="mt-4 flex items-baseline">
              <span className="text-5xl font-medium text-gray-900">$12</span>
              <span className="ml-2 text-lg text-gray-600">/ week</span>
            </div>
            <Link 
              href={process.env.NEXT_PUBLIC_STRIPE_WEEKLY_LINK || '#'}
              className="mt-6 w-full rounded-lg bg-gray-900 px-4 py-3 text-base font-medium text-white hover:bg-gray-800 transition-colors flex items-center justify-center"
            >
              <span>Subscribe</span>
            </Link>
            <p className="mt-6 text-sm text-gray-600">Perfect for prepping a panel sprint or powering through last-mile interviews.</p>
            <ul className="mt-6 space-y-3">
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gray-900 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-900">Unlimited mock interviews</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gray-900 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-900">Real-time code solutions</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gray-900 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-900">Audio + screen capture</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gray-900 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-900">Undetectable shortcuts</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gray-900 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-900">System design blueprints</span>
              </li>
            </ul>
          </div>

          {/* Pro Card - Monthly */}
          <div className="relative rounded-2xl bg-white p-8 shadow-[0_8px_24px_rgba(74,127,232,0.2)] border-2 border-blue-500">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-4 py-1.5 text-xs font-semibold text-white">
              MOST POPULAR
            </div>
            <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">Monthly</div>
            <div className="mt-4 flex items-baseline">
              <span className="text-5xl font-medium text-gray-900">$30</span>
              <span className="ml-2 text-lg text-gray-600">/ month</span>
            </div>
            <Link 
              href={process.env.NEXT_PUBLIC_STRIPE_MONTHLY_LINK || '#'}
              className="mt-6 w-full rounded-lg bg-gray-900 px-4 py-3 text-base font-medium text-white hover:bg-gray-800 transition-colors flex items-center justify-center"
            >
              Subscribe
            </Link>
            <p className="mt-6 text-sm text-gray-600">Stay interview-ready year-round with coaching insights and shared workspace history.</p>
            <div className="mt-6 mb-4 text-sm font-medium text-gray-900">Everything in Weekly, plus...</div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gray-900 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-900">Companion device mode</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gray-900 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-900">Interview timeline & analytics</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gray-900 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-900">Advanced prompt templates</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gray-900 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-900">Priority product support</span>
              </li>
            </ul>
          </div>

          {/* Free Trial / Sandbox Card */}
          <div className="relative rounded-2xl bg-white p-8 shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-200">
            <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">Free Trial</div>
            <div className="mt-4 flex items-baseline">
              <span className="text-5xl font-medium text-gray-900">Free</span>
            </div>
            <Link 
              href="/signup"
              className="mt-6 w-full rounded-lg bg-blue-500 px-4 py-3 text-base font-medium text-white hover:bg-blue-600 transition-colors flex items-center justify-center"
            >
              Get Started
            </Link>
            <p className="mt-6 text-sm text-gray-600">Try Interview Copilot free to get a feel for the platform.</p>
            <ul className="mt-6 space-y-3">
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gray-900 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-900">Full desktop app access</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gray-900 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-900">Limited AI responses</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gray-900 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-900">Basic interview assistance</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gray-900 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-900">No credit card required</span>
              </li>
            </ul>
          </div>
        </div>
      </main>

      {/* Footer provided globally by layout */}
    </div>
  );
}

