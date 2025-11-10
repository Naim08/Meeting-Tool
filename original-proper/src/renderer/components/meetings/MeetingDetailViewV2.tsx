
import { ArrowLeft, Download, Share2, Mic, Monitor } from "lucide-react";
import { MeetingDetail } from "./helpers";

const ConversationBubble = ({ segment, source }: { segment: any, source: any }) => (
  <div className={`flex items-start gap-3 my-4 ${source.type === 'microphone' ? 'flex-row-reverse' : ''}`}>
    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${source.type === 'microphone' ? 'bg-blue-500' : 'bg-gray-700'}`}>
      {source.type === 'microphone' ? <Mic size={20} /> : <Monitor size={20} />}
    </div>
    <div className={`p-4 rounded-lg ${source.type === 'microphone' ? 'bg-blue-500' : 'bg-gray-700'}`}>
      <p className="text-sm">{segment.text}</p>
      <p className="text-xs text-gray-400 mt-1">{new Date(segment.startTime).toLocaleTimeString()}</p>
    </div>
  </div>
);

export function MeetingDetailViewV2({ meetingDetail, onBack }: { meetingDetail: MeetingDetail | null, onBack: () => void }) {
  if (!meetingDetail) {
    return <div>Loading...</div>;
  }

  const { title, startedAt, endedAt, transcriptions } = meetingDetail;

  return (
    <div className="bg-gray-900 text-white p-6">
      <header className="flex justify-between items-center mb-6">
        <div>
          <button onClick={onBack} className="flex items-center space-x-2 text-gray-400 hover:text-white">
            <ArrowLeft size={20} />
            <span>Back to Meetings</span>
          </button>
          <h1 className="text-3xl font-bold mt-2">{title}</h1>
          <p className="text-gray-400">
            {new Date(startedAt).toLocaleString()} - {endedAt ? new Date(endedAt).toLocaleString() : 'Ongoing'}
          </p>
        </div>
        <div className="flex space-x-2">
          <button className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700"><Download size={20} /></button>
          <button className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700"><Share2 size={20} /></button>
        </div>
      </header>

      <div>
        <h2 className="text-2xl font-bold mb-4">Transcript</h2>
        <div className="max-h-[60vh] overflow-y-auto">
          {transcriptions.map(transcription => (
            <div key={transcription.id}>
              <h3 className="text-lg font-semibold my-4">{transcription.source}</h3>
              {transcription.segments.map(segment => (
                <ConversationBubble key={segment.id} segment={segment} source={{ type: transcription.source }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
