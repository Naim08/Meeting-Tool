export const metadata = {
  title: "Contact Us | Interview Copilot",
  description: "Contact page for Interview Copilot.",
};

export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-12 md:px-8">
      <h1 className="text-2xl font-semibold tracking-tight">Contact Us</h1>
      <p className="mt-4 text-gray-700">
        Reach us at <a className="text-blue-600 hover:underline" href="mailto:help@cluely.com">help@cluely.com</a>.
      </p>
    </main>
  );
}
