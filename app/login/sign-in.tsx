"use client"

import { signIn } from "next-auth/react"

export default function SignIn() {
  return (
    <button
      type="button"
      onClick={() => signIn("pco", { callbackUrl: "/dashboard" })}
      className="changelog-btn-primary w-full"
    >
      Sign in with Planning Center
    </button>
  )
}
