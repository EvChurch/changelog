"use client"

import "@/vendor/tiptap/components/tiptap-ui-primitive/input/input.scss"

import { cn } from "@/vendor/tiptap/lib/tiptap-utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="tiptap-input"
      className={cn("tiptap-input", className)}
      {...props}
    />
  )
}

export { Input }
