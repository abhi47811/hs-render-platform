export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    /* h-dvh respects iOS viewport, bg-stone-100 gives subtle depth behind the card */
    <div className="h-dvh bg-stone-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
