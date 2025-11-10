import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center gap-4 px-5 text-center md:gap-6">
      <p className="text-sm font-medium tracking-tight text-gray-500">404</p>
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900 md:text-3xl">Page not found</h1>
      <p className="max-w-prose text-balance text-gray-600">The page you’re looking for doesn’t exist or has moved.</p>
      <div className="mt-2">
        <Link href="/" className="purple-gradient-button relative inline-flex items-center gap-1.5 overflow-hidden rounded-[10px] px-4 py-2.5 text-sm font-medium text-white">
          <span className="absolute inset-0 z-20 blur-[1px]" aria-hidden="true">
            <span className="blurred-border absolute -inset-px z-20 h-full w-full" />
          </span>
          <span>Back to home</span>
        </Link>
      </div>
    </main>
  );
}
