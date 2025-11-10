import AssistantMessage from "./assistant-message";
import UserMessage from "./user-message";

function Message({ message }) {
  switch (message.role) {
    case "user":
      return (
        <UserMessage>
          {message.content}
          {message?.data?.imageUrl && (
            <img className="p-4" src={message?.data?.imageUrl} />
          )}
        </UserMessage>
      );
    case "assistant":
      return (
        <AssistantMessage data={message.data}>
          {message.content}
        </AssistantMessage>
      );
    default:
      throw new Error(`Unknown message role: ${message.role}`);
  }
}

export default Message;
