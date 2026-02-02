export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand/5 to-mid/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="size-20 rounded-2xl bg-gradient-to-br from-brand to-mid flex items-center justify-center shadow-lg">
            <span className="text-3xl font-bold text-white">CE</span>
          </div>
        </div>

        {/* Loading Spinner */}
        <div className="flex justify-center">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-brand/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand border-r-brand animate-spin"></div>
          </div>
        </div>

        {/* Text */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-darkest">Loading</h1>
          <p className="text-muted-foreground">Preparing your Connect-Ed experience...</p>
        </div>

        {/* Progress Indicator */}
        <div className="space-y-2">
          <div className="h-1.5 bg-brand/10 rounded-full overflow-hidden">
            <div className="h-full bg-brand rounded-full animate-pulse"></div>
          </div>
          <p className="text-xs text-muted-foreground">Just a moment</p>
        </div>
      </div>
    </div>
  );
}
