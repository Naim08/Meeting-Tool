# Integration Next Steps

## 🎯 Goal

Connect the transcription recording sessions to the actual audio transcription data so that when a user starts a recording, the transcript segments are automatically saved to the database.

---

## 📋 What's Already Done

✅ Database schema and storage  
✅ Session management (start/stop)  
✅ UI controls in Active Sessions tab  
✅ IPC handlers for all operations  
✅ TranscriptionSessionManager service  

---

## 🔧 What Needs to Be Done

### **1. Hook Up Microphone Transcription**

**File:** `src/renderer/hooks/useTranscription.tsx`

**What to do:** When transcription segments arrive from Deepgram, check if there's an active recording session and save the segments.

**Where to add code:**

Find the part where Deepgram transcription results are processed (look for `LiveTranscriptionEvents.Transcript` or similar).

Add this code:

```typescript
import { transcriptionSessionManager } from '@/services/TranscriptionSessionManager';

// In the transcript event handler:
deepgramLive.current.on(LiveTranscriptionEvents.Transcript, (data) => {
  // ... existing code ...
  
  // NEW: Save to recording session if active
  if (transcriptionSessionManager.isRecording('microphone')) {
    const alternative = data.channel.alternatives[0];
    if (alternative && alternative.transcript) {
      transcriptionSessionManager.addSegment('microphone', {
        text: alternative.transcript,
        speaker: data.channel.alternatives[0].words?.[0]?.speaker,
        confidence: alternative.confidence,
        startTime: data.start,
        endTime: data.start + data.duration,
        isFinal: data.is_final,
      });
    }
  }
  
  // ... rest of existing code ...
});
```

---

### **2. Hook Up System Audio Transcription**

**File:** `src/main/services/TranscriptionService.ts`

**What to do:** When AssemblyAI transcription results arrive, check if there's an active recording session and save the segments.

**Where to add code:**

Find where AssemblyAI real-time transcription results are sent to the renderer process.

Add this code in the main process:

```typescript
// When receiving transcription from AssemblyAI:
if (transcript.text) {
  // Check if there's an active system audio recording session
  const activeSessions = sessionManager.getActiveSessions();
  const systemSession = activeSessions.find(s => s.source === 'system');
  
  if (systemSession) {
    sessionManager.getSession(systemSession.sessionId)?.addSegment({
      id: crypto.randomUUID(),
      text: transcript.text,
      speaker: transcript.speaker,
      confidence: transcript.confidence || 0,
      startTime: Date.now(),
      endTime: Date.now(),
      isFinal: true,
    });
  }
  
  // ... existing code to send to renderer ...
}
```

---

### **3. Add Speaker Diarization (Optional but Recommended)**

Speaker diarization identifies different speakers in the audio.

#### **For Deepgram (Microphone):**

**File:** `src/renderer/config/deepgram.ts`

Update the configuration:

```typescript
export const getTranscriptionOptions = (
  language: string = "en",
  sampleRate: number = 16000,
  enableDiarization: boolean = true  // ADD THIS
) => {
  return {
    model: "nova-2",
    language,
    smart_format: true,
    interim_results: true,
    utterances: enableDiarization,    // ADD THIS
    diarize: enableDiarization,       // ADD THIS
    punctuate: true,
    sample_rate: sampleRate,
  };
};
```

Then when calling, pass `true`:
```typescript
const options = getTranscriptionOptions(language, sampleRate, true);
```

#### **For AssemblyAI (System Audio):**

**File:** `src/main/config/audio.ts`

Update the configuration:

```typescript
export const TRANSCRIPTION_CONFIG = {
  sampleRate: 16000,
  encoding: "pcm_s16le",
  speaker_labels: true,  // ADD THIS
};
```

---

### **4. Handle Speaker Segments**

If you enable speaker diarization, you should also save speaker segments:

**In useTranscription.tsx:**

```typescript
// If Deepgram provides speaker segments:
if (data.channel.alternatives[0].words) {
  const words = data.channel.alternatives[0].words;
  
  // Group words by speaker
  let currentSpeaker = null;
  let currentText = '';
  let currentStart = null;
  
  words.forEach((word, index) => {
    if (word.speaker !== currentSpeaker) {
      // Save previous speaker segment
      if (currentSpeaker !== null && currentText) {
        transcriptionSessionManager.addSpeakerSegment('microphone', {
          speaker: currentSpeaker,
          text: currentText.trim(),
          timestamp: currentStart,
          confidence: word.confidence,
          startTime: currentStart,
          endTime: word.end,
        });
      }
      
      // Start new speaker segment
      currentSpeaker = word.speaker;
      currentText = word.word + ' ';
      currentStart = word.start;
    } else {
      currentText += word.word + ' ';
    }
  });
  
  // Save last segment
  if (currentSpeaker !== null && currentText) {
    const lastWord = words[words.length - 1];
    transcriptionSessionManager.addSpeakerSegment('microphone', {
      speaker: currentSpeaker,
      text: currentText.trim(),
      timestamp: currentStart,
      confidence: lastWord.confidence,
      startTime: currentStart,
      endTime: lastWord.end,
    });
  }
}
```

---

## 🧪 Testing

After integration:

1. **Start the app:** `yarn dev`
2. **Go to Active Sessions tab**
3. **Click "Start" under Microphone**
4. **Speak into your microphone**
5. **Watch the Active Sessions tab:**
   - Duration should increase
   - Word count should increase
   - Live transcript should appear
6. **Click "Stop Recording"**
7. **Check the database:**
   ```bash
   sqlite3 ~/Library/Application\ Support/[YourAppName]/transcriptions.db
   SELECT * FROM transcriptions;
   SELECT * FROM transcription_segments;
   ```

---

## 📊 Expected Behavior

### Before Integration:
- ✅ Can start/stop recording sessions
- ❌ No transcript data appears
- ❌ Word count stays at 0
- ❌ No segments saved

### After Integration:
- ✅ Can start/stop recording sessions
- ✅ Transcript data appears in real-time
- ✅ Word count increases as you speak
- ✅ Segments saved to database
- ✅ Speaker diarization works (if enabled)

---

## 🎯 Summary

**To complete the integration:**

1. Add `transcriptionSessionManager.addSegment()` calls in:
   - `useTranscription.tsx` (microphone)
   - `TranscriptionService.ts` (system audio)

2. Optionally enable speaker diarization in:
   - `deepgram.ts` config
   - `audio.ts` config

3. Optionally add speaker segment tracking

4. Test by recording and checking the database

**That's it!** Once these connections are made, the full transcription recording system will be functional.

---

## 💡 Tips

- Start with just microphone integration (easier to test)
- Test thoroughly before adding system audio
- Enable speaker diarization after basic transcription works
- Check console logs for any errors
- Use SQLite browser to inspect saved data

---

## 🐛 Common Issues

### Segments not saving
- Check that `transcriptionSessionManager.isRecording()` returns true
- Verify the session ID exists
- Check console for errors

### Word count not increasing
- Make sure you're only saving `isFinal: true` segments
- Check that segments have text content

### Speaker diarization not working
- Verify config has `diarize: true` and `speaker_labels: true`
- Check that the transcription service supports it
- Some models may not support diarization

---

**Ready to integrate? Start with microphone transcription first!** 🚀

