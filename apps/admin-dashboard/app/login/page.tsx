import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 overflow-hidden font-sans">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-32 w-96 h-96 bg-cyan-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl mx-auto flex flex-col items-center">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800/60 border border-slate-700/80 rounded-full text-xs text-purple-300">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            System Status: Online
          </div>
        </div>

        <LoginForm />

        <p className="mt-6 text-center text-xs text-slate-500 max-w-md">
          By signing in you agree to the Trifusion-Dynamics Acceptable Use Policy.
          Contact your system administrator for account access or password resets.
        </p>
      </div>
    </main>
  );
}
