declare module "screenshot-desktop" {
  interface Display {
    id: number | string;
    name?: string;
    width?: number;
    height?: number;
  }

  interface ScreenshotOptions {
    filename?: string;
    format?: "png" | "jpg" | "jpeg";
    quality?: number;
    screen?: number | string;
  }

  interface Screenshot {
    (options?: ScreenshotOptions): Promise<Buffer>;
    listDisplays(): Promise<Display[]>;
  }

  const screenshot: Screenshot;
  export = screenshot;
}
