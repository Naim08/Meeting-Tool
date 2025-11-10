import { ipcMain } from "electron";
import { meetingSessionManager } from "../services/MeetingSessionManager";

export function setupMeetingHandlers() {
  ipcMain.handle(
    "meeting:start",
    async (
      _,
      config: {
        mic: boolean;
        system: boolean;
        language?: string;
        title?: string;
      }
    ) => {
      return meetingSessionManager.startMeeting(config);
    }
  );

  ipcMain.handle("meeting:stop", async () => {
    await meetingSessionManager.stopMeeting();
  });

  ipcMain.handle(
    "meeting:toggleSource",
    async (_event, source: "microphone" | "system", enabled: boolean) => {
      await meetingSessionManager.enableSource(source, enabled);
    }
  );

  ipcMain.handle("meeting:getActive", async () => {
    return meetingSessionManager.getActiveMeeting();
  });

  ipcMain.handle(
    "meeting:getRecent",
    async (_event, limit = 20, offset = 0) => {
      return meetingSessionManager.getRecentMeetings(limit, offset);
    }
  );

  ipcMain.handle("meeting:getDetails", async (_event, meetingId: string) => {
    return meetingSessionManager.getMeetingDetails(meetingId);
  });
}
