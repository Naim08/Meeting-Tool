/**
 * SpeakerMapper - Intelligent speaker mapping for unified recording
 *
 * Analyzes transcript segments from both microphone and system audio streams
 * to identify and map speakers to consistent labels (interviewer/interviewee).
 */

export interface TranscriptSegment {
  speaker: string | null;
  text: string;
  start_time: number | null;
  end_time: number | null;
  confidence: number | null;
}

export interface SpeakerMapping {
  // Maps original speaker labels to normalized roles
  [originalLabel: string]: "interviewer" | "interviewee" | "unknown";
}

export interface SpeakerMappingResult {
  microphoneMapping: SpeakerMapping;
  systemAudioMapping: SpeakerMapping;
  confidence: number;
  analysisDetails: {
    microphoneSpeakers: string[];
    systemAudioSpeakers: string[];
    overlapDetected: boolean;
    echoDetected: boolean;
    totalSegments: number;
  };
}

interface SpeakerStats {
  label: string;
  source: "microphone" | "system";
  totalDuration: number;
  segmentCount: number;
  averageConfidence: number;
  firstAppearance: number;
  lastAppearance: number;
  phrases: string[];
}

export class SpeakerMapper {
  private readonly OVERLAP_THRESHOLD_MS = 500; // Max overlap to consider same speaker
  private readonly TEXT_SIMILARITY_THRESHOLD = 0.6; // Minimum similarity score
  private readonly ECHO_DELAY_MS = 200; // Typical echo delay

  mapSpeakers(
    micSegments: TranscriptSegment[],
    systemSegments: TranscriptSegment[]
  ): SpeakerMappingResult {
    console.log(
      `[SpeakerMapper] Analyzing ${micSegments.length} mic segments and ${systemSegments.length} system segments`
    );

    // Extract unique speakers from each stream
    const micSpeakers = this.extractUniqueSpeakers(micSegments, "microphone");
    const systemSpeakers = this.extractUniqueSpeakers(systemSegments, "system");

    console.log(
      `[SpeakerMapper] Found speakers - Mic: [${Object.keys(micSpeakers).join(", ")}], System: [${Object.keys(systemSpeakers).join(", ")}]`
    );

    // Detect echo patterns (same text appearing in both streams)
    const echoDetected = this.detectEchoPatterns(micSegments, systemSegments);

    // Detect timing overlaps
    const overlapDetected = this.detectTimingOverlaps(micSegments, systemSegments);

    // Build speaker mapping based on analysis
    const microphoneMapping = this.buildMicrophoneMapping(micSpeakers, micSegments);
    const systemAudioMapping = this.buildSystemAudioMapping(
      systemSpeakers,
      systemSegments,
      microphoneMapping
    );

    // Calculate confidence based on analysis quality
    const confidence = this.calculateMappingConfidence(
      micSpeakers,
      systemSpeakers,
      micSegments.length + systemSegments.length,
      echoDetected,
      overlapDetected
    );

    return {
      microphoneMapping,
      systemAudioMapping,
      confidence,
      analysisDetails: {
        microphoneSpeakers: Object.keys(micSpeakers),
        systemAudioSpeakers: Object.keys(systemSpeakers),
        overlapDetected,
        echoDetected,
        totalSegments: micSegments.length + systemSegments.length,
      },
    };
  }

  private extractUniqueSpeakers(
    segments: TranscriptSegment[],
    source: "microphone" | "system"
  ): Record<string, SpeakerStats> {
    const speakers: Record<string, SpeakerStats> = {};

    for (const segment of segments) {
      const label = segment.speaker || "Unknown";

      if (!speakers[label]) {
        speakers[label] = {
          label,
          source,
          totalDuration: 0,
          segmentCount: 0,
          averageConfidence: 0,
          firstAppearance: segment.start_time || Date.now(),
          lastAppearance: segment.end_time || Date.now(),
          phrases: [],
        };
      }

      const stats = speakers[label];
      stats.segmentCount++;

      if (segment.start_time && segment.end_time) {
        stats.totalDuration += segment.end_time - segment.start_time;
      }

      if (segment.confidence) {
        stats.averageConfidence =
          (stats.averageConfidence * (stats.segmentCount - 1) + segment.confidence) /
          stats.segmentCount;
      }

      if (segment.start_time && segment.start_time < stats.firstAppearance) {
        stats.firstAppearance = segment.start_time;
      }

      if (segment.end_time && segment.end_time > stats.lastAppearance) {
        stats.lastAppearance = segment.end_time;
      }

      // Store phrases for similarity analysis
      if (segment.text.length > 10) {
        stats.phrases.push(segment.text.toLowerCase().trim());
      }
    }

    return speakers;
  }

  private detectEchoPatterns(
    micSegments: TranscriptSegment[],
    systemSegments: TranscriptSegment[]
  ): boolean {
    let echoCount = 0;

    for (const micSeg of micSegments) {
      for (const sysSeg of systemSegments) {
        // Check if texts are similar
        const similarity = this.calculateTextSimilarity(micSeg.text, sysSeg.text);
        if (similarity < this.TEXT_SIMILARITY_THRESHOLD) continue;

        // Check if timing suggests echo (system slightly delayed)
        if (micSeg.start_time && sysSeg.start_time) {
          const delay = sysSeg.start_time - micSeg.start_time;
          if (delay > 0 && delay < this.ECHO_DELAY_MS) {
            echoCount++;
          }
        }
      }
    }

    // Consider echo detected if more than 20% of segments show echo pattern
    return echoCount > Math.min(micSegments.length, systemSegments.length) * 0.2;
  }

  private detectTimingOverlaps(
    micSegments: TranscriptSegment[],
    systemSegments: TranscriptSegment[]
  ): boolean {
    let overlapCount = 0;

    for (const micSeg of micSegments) {
      if (!micSeg.start_time || !micSeg.end_time) continue;

      for (const sysSeg of systemSegments) {
        if (!sysSeg.start_time || !sysSeg.end_time) continue;

        // Check for significant overlap
        const overlapStart = Math.max(micSeg.start_time, sysSeg.start_time);
        const overlapEnd = Math.min(micSeg.end_time, sysSeg.end_time);
        const overlap = overlapEnd - overlapStart;

        if (overlap > this.OVERLAP_THRESHOLD_MS) {
          overlapCount++;
        }
      }
    }

    // Significant overlap detected
    return overlapCount > 5;
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    const s1 = text1.toLowerCase().trim();
    const s2 = text2.toLowerCase().trim();

    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    // Simple word overlap similarity
    const words1 = new Set(s1.split(/\s+/));
    const words2 = new Set(s2.split(/\s+/));

    let intersection = 0;
    for (const word of words1) {
      if (words2.has(word)) intersection++;
    }

    const union = words1.size + words2.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  private buildMicrophoneMapping(
    speakers: Record<string, SpeakerStats>,
    segments: TranscriptSegment[]
  ): SpeakerMapping {
    const mapping: SpeakerMapping = {};

    // Microphone typically captures the interviewer (user)
    // Speaker with most segments/duration is likely the interviewer
    const sortedSpeakers = Object.values(speakers).sort(
      (a, b) => b.totalDuration - a.totalDuration || b.segmentCount - a.segmentCount
    );

    if (sortedSpeakers.length >= 1) {
      mapping[sortedSpeakers[0].label] = "interviewer";
    }

    if (sortedSpeakers.length >= 2) {
      mapping[sortedSpeakers[1].label] = "interviewee";
    }

    // Mark any remaining speakers as unknown
    for (let i = 2; i < sortedSpeakers.length; i++) {
      mapping[sortedSpeakers[i].label] = "unknown";
    }

    // Handle case where no speakers detected
    if (Object.keys(mapping).length === 0 && segments.length > 0) {
      mapping["Unknown"] = "interviewer";
    }

    return mapping;
  }

  private buildSystemAudioMapping(
    speakers: Record<string, SpeakerStats>,
    segments: TranscriptSegment[],
    microphoneMapping: SpeakerMapping
  ): SpeakerMapping {
    const mapping: SpeakerMapping = {};

    // System audio typically captures the interviewee (remote participant)
    // Speaker with most segments/duration is likely the interviewee
    const sortedSpeakers = Object.values(speakers).sort(
      (a, b) => b.totalDuration - a.totalDuration || b.segmentCount - a.segmentCount
    );

    if (sortedSpeakers.length >= 1) {
      mapping[sortedSpeakers[0].label] = "interviewee";
    }

    if (sortedSpeakers.length >= 2) {
      mapping[sortedSpeakers[1].label] = "interviewer";
    }

    // Mark any remaining speakers as unknown
    for (let i = 2; i < sortedSpeakers.length; i++) {
      mapping[sortedSpeakers[i].label] = "unknown";
    }

    // Handle case where no speakers detected
    if (Object.keys(mapping).length === 0 && segments.length > 0) {
      mapping["Unknown"] = "interviewee";
    }

    return mapping;
  }

  private calculateMappingConfidence(
    micSpeakers: Record<string, SpeakerStats>,
    systemSpeakers: Record<string, SpeakerStats>,
    totalSegments: number,
    echoDetected: boolean,
    overlapDetected: boolean
  ): number {
    let confidence = 0.5; // Base confidence

    // More segments = higher confidence
    if (totalSegments >= 20) confidence += 0.15;
    else if (totalSegments >= 10) confidence += 0.1;
    else if (totalSegments >= 5) confidence += 0.05;

    // Clear speaker distinction = higher confidence
    const micSpeakerCount = Object.keys(micSpeakers).length;
    const systemSpeakerCount = Object.keys(systemSpeakers).length;

    if (micSpeakerCount >= 1 && systemSpeakerCount >= 1) {
      confidence += 0.15;
    }

    // Two speakers in each stream = ideal scenario
    if (micSpeakerCount === 2 && systemSpeakerCount === 2) {
      confidence += 0.1;
    }

    // Echo detection reduces confidence (harder to map)
    if (echoDetected) {
      confidence -= 0.1;
    }

    // Overlap detection affects confidence
    if (overlapDetected) {
      confidence -= 0.05;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  // Utility method to normalize speaker labels
  normalizeSpeakerLabel(
    label: string,
    source: "microphone" | "system",
    mapping: SpeakerMappingResult
  ): string {
    const sourceMapping =
      source === "microphone" ? mapping.microphoneMapping : mapping.systemAudioMapping;

    return sourceMapping[label] || "unknown";
  }
}
