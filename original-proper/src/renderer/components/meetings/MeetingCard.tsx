import { Calendar, Clock, Mic, Monitor, Sparkles } from "lucide-react";
import { Meeting } from "./types";

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
};

const MeetingCard = ({ meeting, onSelect, isSelected }: { meeting: Meeting, onSelect: (id: string) => void, isSelected: boolean }) => {
  const cardBaseStyle = "rounded-lg border p-4 transition-all duration-200 ease-in-out cursor-pointer";
  const cardSelectedStyle = "bg-blue-500 border-blue-500 text-white";
  const cardDefaultStyle = "bg-gray-800 border-gray-700 hover:border-blue-500";

  return (
    <div
      onClick={() => onSelect(meeting.id)}
      className={`${cardBaseStyle} ${isSelected ? cardSelectedStyle : cardDefaultStyle}`}
    >
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{meeting.title}</h3>
        <div className={`text-xs px-2 py-1 rounded-full ${isSelected ? "bg-white text-blue-500" : "bg-gray-700 text-gray-300"}`}>
          {meeting.isActive ? "Active" : "Finished"}
        </div>
      </div>
      <div className="flex items-center space-x-4 mt-2 text-sm">
        <div className="flex items-center space-x-1">
          <Calendar size={14} />
          <span>{formatDate(meeting.startedAt)}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Clock size={14} />
          <span>{formatTime(meeting.startedAt)}</span>
        </div>
      </div>
      <div className="flex items-center space-x-4 mt-2 text-sm">
        <div className="flex items-center space-x-1">
          <Sparkles size={14} />
          <span>{meeting.wordCount} words</span>
        </div>
        <div className="flex items-center space-x-2">
          {meeting.sources.includes("microphone") && <Mic size={14} />}
          {meeting.sources.includes("system") && <Monitor size={14} />}
        </div>
      </div>
    </div>
  );
};

export default MeetingCard;
