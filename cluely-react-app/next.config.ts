// Ensure Next.js (Turbopack) treats this folder as the project root
// to avoid it accidentally inferring a higher-level workspace root
// when multiple lockfiles are present on the machine.
const nextConfig = {
  turbopack: {
    // Use the directory of this config file as the root
    root: __dirname,
  },
};

export default nextConfig;
