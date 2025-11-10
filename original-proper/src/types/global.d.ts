import type Store from "electron-store";

declare global {
  var store: Store | undefined;
  var transcriptionsEnabled: boolean | undefined;
}

export {};
