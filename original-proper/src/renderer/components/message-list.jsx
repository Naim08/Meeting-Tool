import { cn } from "@/lib/utils";
import Message from "./message";

function MessageList({
  messages,
  isLoading = true,
  className,
  alignEnd = false,
}) {
  return (
    <ul
      className={cn(
        "mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 pb-12 pt-12",
        alignEnd ? "justify-end" : "justify-start",
        className
      )}
    >
      {messages.map((m) => (
        <Message key={m.id} message={m} />
      ))}
    </ul>
  );
}
export default MessageList;
