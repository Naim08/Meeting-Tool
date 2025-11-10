import Link from "next/link";
import Image from "next/image";

export default function SiteFooter() {
  return (
    <footer className="relative bg-[#DDE2EE] pt-10 pb-5">
      <div className="mx-auto w-full max-w-7xl px-5 md:px-8">
        <div className="flex flex-col lg:flex-row lg:justify-between">
          <div>
            <Link className="inline-flex rounded-md" href="/">
              <Image alt="Interview Copilot" width={240} height={72} src="/interview_copilot_logo_dark_transparent.png" className="h-12 md:h-14 w-auto" />
              <span className="sr-only">Interview Copilot</span>
            </Link>
          </div>
          <nav className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8 md:mt-[50px] md:grid-cols-[repeat(5,fit-content(240px))] md:gap-11 lg:mt-0 lg:gap-[58px] xl:gap-[66px]">
            <div>
              <h3 className="font-medium tracking-tight text-black">Support</h3>
              <ul className="mt-3 flex flex-col gap-y-2">
                <li>
                  <a className="inline-flex items-center gap-x-1.5 rounded tracking-tight leading-snug font-normal text-gray-600 transition-colors duration-200 hover:text-blue-600" href="/help">Help Center</a>
                </li>
                <li>
                  <a className="inline-flex items-center gap-x-1.5 rounded tracking-tight leading-snug font-normal text-gray-600 transition-colors duration-200 hover:text-blue-600" href="/contact">Contact Us</a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium tracking-tight text-black">Legal</h3>
              <ul className="mt-3 flex flex-col gap-y-2">
                <li><a className="inline-flex items-center gap-x-1.5 rounded tracking-tight leading-snug font-normal text-gray-600 transition-colors duration-200 hover:text-blue-600" href="/privacy-policy">Privacy Policy</a></li>
                <li><a className="inline-flex items-center gap-x-1.5 rounded tracking-tight leading-snug font-normal text-gray-600 transition-colors duration-200 hover:text-blue-600" href="/terms">Terms of Service</a></li>
                <li><a className="inline-flex items-center gap-x-1.5 rounded tracking-tight leading-snug font-normal text-gray-600 transition-colors duration-200 hover:text-blue-600" href="/dpa">Data Processing Agreement</a></li>
                <li><a className="inline-flex items-center gap-x-1.5 rounded tracking-tight leading-snug font-normal text-gray-600 transition-colors duration-200 hover:text-blue-600" href="/subprocessors">Subprocessors</a></li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="mt-11 md:mt-[30px]">
          <a className="font-medium tracking-tight transition-colors duration-300 inline-flex h-[34px] items-center justify-center gap-x-1.5 rounded-[6px] border border-[rgba(201,208,228,0.50)] bg-[rgba(211,217,233,0.50)] px-3 text-sm leading-none text-gray-700 hover:bg-[rgba(211,217,233,0.90)]" href="#">
            <span className="size-1.5 rounded-full bg-[#2CB463]"></span>
            All systems operational
          </a>
          <div className="mt-[18px] md:mt-[26px] lg:mt-8">
            <div className="flex flex-wrap gap-2.5 md:gap-3.5">
              <Image alt="SOC 2 Type 1" width={52} height={52} className="size-11 md:size-[52px]" src="/soc-2-type-1.ab9b1c68.svg" />
              <Image alt="SOC 2 Type 2" width={52} height={52} className="size-11 md:size-[52px]" src="/soc-2-type-2.a30a0a69.svg" />
              <Image alt="ISO 27001" width={52} height={52} className="size-11 md:size-[52px]" src="/iso.2c796f40.svg" />
              <Image alt="GDPR" width={52} height={52} className="size-11 md:size-[52px]" src="/gdpr.1dd801e6.svg" />
              <Image alt="CCPA" width={52} height={52} className="size-11 md:size-[52px]" src="/ccpa.57aabeab.svg" />
              <Image alt="HIPAA" width={52} height={52} className="size-11 md:size-[52px]" src="/hipaa.0273026e.svg" />
            </div>
            <div className="mt-2.5 text-xs font-medium tracking-tight text-gray-600">
              List of <a className="inline-flex items-center gap-x-1.5 rounded font-medium tracking-tight transition-colors duration-300 text-blue-600 hover:text-blue-700" href="/subprocessors">subprocessors</a>.
            </div>
          </div>
        </div>

        <div className="relative mt-[30px] flex flex-col pt-[30px] md:mt-5 md:flex-row md:items-center md:justify-between md:pt-5">
          <div className="absolute left-0 top-0 h-[3px] w-full bg-[linear-gradient(180deg,#E5E9F2_0%,#D0D7E7_100%)]" />
          <p className="order-2 mt-7 text-sm tracking-tight text-gray-600 md:order-1 md:mt-0">© 2025 Interview Copilot. All rights reserved.</p>
          <div className="order-1 flex items-center gap-4 md:order-2">
            <a className="rounded-lg text-gray-900 transition-colors duration-300 hover:text-gray-600" target="_blank" rel="noopener noreferrer" href="https://x.com/cluely">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor" className="size-5"><path d="M14.6009 2H17.0544L11.6943 8.35385L18 17H13.0627L9.19566 11.7562L4.77087 17H2.31595L8.04904 10.2038L2 2H7.06262L10.5581 6.79308L14.6009 2ZM13.7399 15.4769H15.0993L6.32392 3.44308H4.86506L13.7399 15.4769Z"></path></svg>
              <span className="sr-only">Twitter</span>
            </a>
            <a className="rounded-lg text-gray-900 transition-colors duration-300 hover:text-gray-600" target="_blank" rel="noopener noreferrer" href="https://discord.gg/cluely">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor" className="size-5"><path d="M16.93 4.12C15.62 3.53 14.22 3.11 12.77 2.89C12.75 2.89 12.73 2.9 12.72 2.92C12.55 3.24 12.37 3.65 12.24 3.98C10.68 3.78 9.13 3.78 7.6 3.98C7.47 3.64 7.28 3.24 7.11 2.92C7.1 2.9 7.08 2.89 7.06 2.89C5.61 3.11 4.21 3.53 2.9 4.12C2.89 4.12 2.87 4.13 2.86 4.14C0.42 7.63 -0.25 11.04 0.08 14.41C0.08 14.43 0.09 14.45 0.11 14.46C1.92 15.76 3.68 16.53 5.41 17.03C5.43 17.04 5.45 17.03 5.46 17.01C5.85 16.49 6.2 15.94 6.5 15.36C6.51 15.34 6.5 15.31 6.48 15.31C5.94 15.11 5.43 14.87 4.94 14.59C4.92 14.58 4.92 14.55 4.93 14.53C5.04 14.45 5.15 14.37 5.25 14.28C5.26 14.27 5.28 14.27 5.29 14.28C8.36 15.68 11.68 15.68 14.71 14.28C14.72 14.27 14.74 14.27 14.75 14.28C14.85 14.37 14.96 14.45 15.07 14.54C15.08 14.56 15.08 14.58 15.06 14.59C14.57 14.88 14.06 15.11 13.52 15.31C13.5 15.32 13.49 15.35 13.5 15.36C13.81 15.94 14.15 16.49 14.54 17.01C14.55 17.03 14.57 17.04 14.59 17.03C16.32 16.53 18.08 15.76 19.89 14.46C19.91 14.45 19.92 14.43 19.92 14.41C20.32 10.54 19.31 7.16 16.95 4.14C16.94 4.13 16.93 4.12 16.93 4.12ZM6.68 12.26C5.69 12.26 4.88 11.35 4.88 10.22C4.88 9.09 5.67 8.18 6.68 8.18C7.7 8.18 8.49 9.1 8.48 10.22C8.48 11.35 7.69 12.26 6.68 12.26ZM13.32 12.26C12.33 12.26 11.52 11.35 11.52 10.22C11.52 9.09 12.31 8.18 13.32 8.18C14.34 8.18 15.13 9.1 15.12 10.22C15.12 11.35 14.34 12.26 13.32 12.26Z"></path></svg>
              <span className="sr-only">Discord</span>
            </a>
            <a className="rounded-lg text-gray-900 transition-colors duration-300 hover:text-gray-600" target="_blank" rel="noopener noreferrer" href="https://github.com/cluely">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor" className="size-5"><path fillRule="evenodd" clipRule="evenodd" d="M10 0.257812C4.5 0.257812 0 4.75781 0 10.2578C0 14.6328 2.875 18.3828 6.875 19.7578C7.375 19.8828 7.5 19.5078 7.5 19.2578C7.5 19.0078 7.5 18.3828 7.5 17.5078C4.75 18.1328 4.125 16.2578 4.125 16.2578C3.625 15.1328 3 14.7578 3 14.7578C2.125 14.1328 3.125 14.1328 3.125 14.1328C4.125 14.2578 4.625 15.1328 4.625 15.1328C5.5 16.7578 7 16.2578 7.5 16.0078C7.625 15.3828 7.875 14.8828 8.125 14.6328C5.875 14.3828 3.625 13.5078 3.625 9.63281C3.625 8.50781 4 7.63281 4.625 7.00781C4.5 6.75781 4.125 5.75781 4.75 4.38281C4.75 4.38281 5.625 4.13281 7.5 5.38281C8.25 5.13281 9.125 5.00781 10 5.00781C10.875 5.00781 11.75 5.13281 12.5 5.38281C14.375 4.13281 15.25 4.38281 15.25 4.38281C15.75 5.75781 15.5 6.75781 15.375 7.00781C16 7.75781 16.375 8.63281 16.375 9.63281C16.375 13.5078 14 14.2578 11.75 14.5078C12.125 15.0078 12.5 15.6328 12.5 16.5078C12.5 17.8828 12.5 18.8828 12.5 19.2578C12.5 19.5078 12.625 19.8828 13.25 19.7578C17.25 18.3828 20.125 14.6328 20.125 10.2578C20 4.75781 15.5 0.257812 10 0.257812Z"></path></svg>
              <span className="sr-only">GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
