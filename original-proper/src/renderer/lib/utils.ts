import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import type {
  AppendChatMessagePayload,
  ChatSessionRecord,
  ChatSessionWithMessages,
  CreateChatSessionPayload,
  ListChatSessionsParams,
} from "../../types/chat-history";

const SERVER_ROOT = "https://interviewsolver.com";

type ChatHistoryBridge = {
  createSession: (
    payload?: CreateChatSessionPayload
  ) => Promise<ChatSessionRecord>;
  appendMessage: (
    sessionId: string,
    payload: AppendChatMessagePayload
  ) => Promise<void>;
  completeSession: (sessionId: string, endedAt?: number) => Promise<void>;
  listSessions: (
    params?: ListChatSessionsParams
  ) => Promise<ChatSessionRecord[]>;
  getSession: (
    sessionId: string
  ) => Promise<ChatSessionWithMessages | null>;
  updateSessionTitle: (
    sessionId: string,
    title: string | null
  ) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<boolean>;
};

declare global {
  interface Window {
    api?: {
      chatHistory?: ChatHistoryBridge;
    } & Record<string, any>;
    env?: {
      STRIPE_PUBLISHABLE_KEY: string;
      // Add any other environment variables here
    };
  }
}

let stripePromise: Promise<Stripe | null>;
export const getStripe = () => {
  if (!stripePromise) {
    // window has an env object
    stripePromise = loadStripe(window?.env?.STRIPE_PUBLISHABLE_KEY ?? "");
  }
  return stripePromise;
};

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

export const imageCapture = async (
  mediaStreamInput: MediaStream
): Promise<string | undefined> => {
  try {
    if (!mediaStreamInput) throw Error("Video MediaStream not defined");

    const track = mediaStreamInput.getVideoTracks()[0];
    const videoElem = document.createElement("video");
    videoElem.srcObject = mediaStreamInput;
    const image = generateImageWithCanvas(track, videoElem);

    mediaStreamInput.getTracks().forEach((track) => track.stop());

    return image;
  } catch (error) {
    console.error("imageCapture error: " + error);
  }
};

export const generateImageWithCanvas = (
  track: MediaStreamTrack,
  videoElem: HTMLVideoElement
) => {
  const canvas = document.createElement("canvas");

  const { width, height } = track.getSettings();
  canvas.width = width || 100;
  canvas.height = height || 100;

  canvas.getContext("2d")?.drawImage(videoElem, 0, 0);
  const image = canvas.toDataURL("image/png");

  return image;
};

export const getServerRoot = () => {
  // const isProd = await window?.api?.isProd();
  // return "http://localhost:3200";
  return SERVER_ROOT;
};

export const formatHotkey = (hotkey) => {
  // @ts-ignore
  const isOSX = window?.api?.isOSX();

  hotkey = hotkey.replace(/\+/g, " + ");
  return hotkey.replace(/Super/g, isOSX ? "Cmd" : "Super");
};

export const HOTKEY_DESCRIPTIONS = {
  screengrab: "Take screengrab",
  transcribe: "Toggle microphone",
  cancel: "Cancel current query",
  scrollUp: "Scroll chat up",
  scrollDown: "Scroll chat down",
  resetChat: "Reset chat",
  unminimize: "Restore app visibility",
  toggleTransparency: "Toggle transparency",
  increaseOpacity: "Increase opacity",
  decreaseOpacity: "Decrease opacity",
  pasteToChat: "Paste clipboard to chat",
  moveWindowUp: "Move window up",
  moveWindowDown: "Move window down",
  moveWindowLeft: "Move window left",
  moveWindowRight: "Move window right",
  submitInput: "Submit input",
  toggleSystemAudio: "Toggle system audio",
  toggleMicrophone: "Toggle microphone",
};
