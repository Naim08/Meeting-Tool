import { useState } from "react";
import MeetingCard from "./MeetingCard";
import { MeetingDetailViewV2 as MeetingDetailView } from "./MeetingDetailViewV2";
import { getMeetingDetails } from "./meetings-api";
import { Meeting } from "./types";

const HistoryView = ({ recentMeetings }: { recentMeetings: Meeting[] }) => {
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [meetingDetail, setMeetingDetail] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectMeeting = async (id: string) => {
    setSelectedMeetingId(id);
    setIsLoading(true);
    setError(null);
    try {
      const details = await getMeetingDetails(id);
      setMeetingDetail(details);
    } catch (err) {
      setError("Failed to load meeting details.");
    } finally {
      setIsLoading(false);
    }
  };

  if (selectedMeetingId) {
    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>{error}</div>;
    return (
      <MeetingDetailView
        meetingDetail={meetingDetail}
        onBack={() => setSelectedMeetingId(null)}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {recentMeetings.map((meeting) => (
        <MeetingCard
          key={meeting.id}
          meeting={meeting}
          onSelect={handleSelectMeeting}
          isSelected={selectedMeetingId === meeting.id}
        />
      ))}
    </div>
  );
};

export default HistoryView;