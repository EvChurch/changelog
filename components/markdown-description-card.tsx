"use client"

import type { Editor } from "@tiptap/core"
import { useCallback, useEffect, useState } from "react"

import { SimpleEditor } from "@/vendor/tiptap/components/tiptap-templates/simple/simple-editor"

export default function MarkdownDescriptionCard({
  content,
  canEdit,
  onSave,
  emptyPlaceholder = "No content yet.",
}: {
  content: string | null
  canEdit: boolean
  onSave: (markdown: string) => Promise<void>
  emptyPlaceholder?: string
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [displayedMarkdown, setDisplayedMarkdown] = useState(content ?? "")
  const [editor, setEditor] = useState<Editor | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isEditing && content !== null) {
      setDisplayedMarkdown(content)
    }
  }, [content, isEditing])

  const handleSave = useCallback(async () => {
    if (!editor) return
    setSaving(true)
    try {
      const markdown = editor.getMarkdown()
      await onSave(markdown)
      setDisplayedMarkdown(markdown)
      setIsEditing(false)
    } finally {
      setSaving(false)
    }
  }, [editor, onSave])

  const handleCancel = useCallback(() => {
    if (editor) {
      editor.commands.setContent(displayedMarkdown, { contentType: "markdown" })
    }
    setIsEditing(false)
  }, [displayedMarkdown, editor])

  const showPlaceholder = !displayedMarkdown.trim() && !isEditing

  return (
    <>
      <div className="-mt-15 flex justify-end gap-2 mb-2">
        {canEdit &&
          (isEditing ? (
            <>
              <button
                type="button"
                onClick={handleCancel}
                className="changelog-btn-secondary text-sm py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!editor || saving}
                className="changelog-btn-primary text-sm py-1.5 px-3 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="changelog-btn-secondary text-sm py-1.5 px-3"
            >
              Edit
            </button>
          ))}
      </div>
      {showPlaceholder ? (
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
          {emptyPlaceholder}
        </p>
      ) : (
        <SimpleEditor
          content={displayedMarkdown}
          contentType="markdown"
          editable={isEditing}
          onEditorReady={setEditor}
          contentClassName={`prose prose-zinc dark:prose-invert max-w-none text-sm ${
            isEditing ? "changelog-tiptap-editor" : "changelog-tiptap-readonly"
          }`}
        />
      )}
    </>
  )
}
