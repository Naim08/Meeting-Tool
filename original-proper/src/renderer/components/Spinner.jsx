export default function Spinner({ message = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      <p className="mt-4 text-white">{message}</p>
    </div>
  );
}
