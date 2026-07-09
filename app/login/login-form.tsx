"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "./actions";

const initialState: AuthState = { error: null };

export default function LoginForm({ checkEmail }: { checkEmail: boolean }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const action = mode === "signin" ? signIn : signUp;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={mode === "signin" ? "font-semibold underline" : "text-zinc-500"}
        >
          Sign in
        </button>
        <span className="text-zinc-300">/</span>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={mode === "signup" ? "font-semibold underline" : "text-zinc-500"}
        >
          Create account
        </button>
      </div>

      {checkEmail && (
        <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Check your email for a confirmation link before signing in.
        </p>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            name="email"
            type="email"
            required
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-black px-5 py-2.5 text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
        >
          {pending ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
    </div>
  );
}
