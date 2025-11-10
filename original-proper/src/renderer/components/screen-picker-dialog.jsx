import cx from "classnames";
import Skeleton from "./skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function ScreenPickerDialog({
  isOpen,
  handleOpenChange,
  screens = [],
  selectedScreen,
  setScreen,
  isLoadingScreens,
}) {
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Pick a window</DialogTitle>
          <DialogDescription>
            Choose the screen to use for screenshots.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-2">
          <fieldset className="flex-grow-0">
            <label
              className="mb-2 block font-sans text-sm font-semibold text-muted-foreground"
              htmlFor="model"
            >
              Screens
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoadingScreens && (
                <>
                  <Skeleton className="h-[145px] w-full" />
                  <Skeleton className="h-[145px] w-full" />
                  <Skeleton className="h-[145px] w-full" />
                  <Skeleton className="h-[145px] w-full" />
                  <Skeleton className="h-[145px] w-full" />
                  <Skeleton className="h-[145px] w-full" />
                </>
              )}
              {screens?.map((screen) => (
                <div
                  key={screen.id}
                  onClick={() => {
                    window.screen = screen;
                    setScreen(screen);
                    window.api.setScreenSource(screen?.id);
                    handleOpenChange(false);
                  }}
                  className={cx(
                    selectedScreen?.id === screen.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card",
                    "flex cursor-pointer flex-col rounded-lg border p-4 transition-colors hover:border-primary/40 hover:bg-muted"
                  )}
                >
                  <p className="mb-2 max-w-full truncate text-sm text-muted-foreground">
                    {screen.name}
                  </p>
                  <div className="flex h-[120px] w-full items-center justify-center overflow-hidden rounded">
                    <img
                      src={screen.thumbnailURL}
                      alt={screen.name}
                      className="object-contain max-h-full max-w-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </fieldset>
        </div>
      </DialogContent>
    </Dialog>
  );
}
