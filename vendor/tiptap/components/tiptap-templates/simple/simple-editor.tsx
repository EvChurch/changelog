"use client"

import "@/vendor/tiptap/components/tiptap-node/blockquote-node/blockquote-node.scss"
import "@/vendor/tiptap/components/tiptap-node/code-block-node/code-block-node.scss"
import "@/vendor/tiptap/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss"
import "@/vendor/tiptap/components/tiptap-node/list-node/list-node.scss"
import "@/vendor/tiptap/components/tiptap-node/image-node/image-node.scss"
import "@/vendor/tiptap/components/tiptap-node/heading-node/heading-node.scss"
import "@/vendor/tiptap/components/tiptap-node/paragraph-node/paragraph-node.scss"
// --- Styles ---
import "@/vendor/tiptap/components/tiptap-templates/simple/simple-editor.scss"

import { Highlight } from "@tiptap/extension-highlight"
import { Image } from "@tiptap/extension-image"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { Subscript } from "@tiptap/extension-subscript"
import { Superscript } from "@tiptap/extension-superscript"
import { TextAlign } from "@tiptap/extension-text-align"
import { Typography } from "@tiptap/extension-typography"
import { Selection } from "@tiptap/extensions"
import { Markdown } from "@tiptap/markdown"
import type { Editor } from "@tiptap/react"
import { EditorContent, EditorContext, useEditor } from "@tiptap/react"
// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit"
import { useEffect, useRef, useState } from "react"

// --- Icons ---
import { ArrowLeftIcon } from "@/vendor/tiptap/components/tiptap-icons/arrow-left-icon"
import { HighlighterIcon } from "@/vendor/tiptap/components/tiptap-icons/highlighter-icon"
import { LinkIcon } from "@/vendor/tiptap/components/tiptap-icons/link-icon"
import { HorizontalRule } from "@/vendor/tiptap/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension"
// --- Tiptap Node ---
import { ImageUploadNode } from "@/vendor/tiptap/components/tiptap-node/image-upload-node/image-upload-node-extension"
import defaultContent from "@/vendor/tiptap/components/tiptap-templates/simple/data/content.json"
// --- Components ---
import { BlockquoteButton } from "@/vendor/tiptap/components/tiptap-ui/blockquote-button"
import { CodeBlockButton } from "@/vendor/tiptap/components/tiptap-ui/code-block-button"
import {
  ColorHighlightPopover,
  ColorHighlightPopoverButton,
  ColorHighlightPopoverContent,
} from "@/vendor/tiptap/components/tiptap-ui/color-highlight-popover"
// --- Tiptap UI ---
import { HeadingDropdownMenu } from "@/vendor/tiptap/components/tiptap-ui/heading-dropdown-menu"
import { ImageUploadButton } from "@/vendor/tiptap/components/tiptap-ui/image-upload-button"
import {
  LinkButton,
  LinkContent,
  LinkPopover,
} from "@/vendor/tiptap/components/tiptap-ui/link-popover"
import { ListDropdownMenu } from "@/vendor/tiptap/components/tiptap-ui/list-dropdown-menu"
import { MarkButton } from "@/vendor/tiptap/components/tiptap-ui/mark-button"
import { TextAlignButton } from "@/vendor/tiptap/components/tiptap-ui/text-align-button"
import { UndoRedoButton } from "@/vendor/tiptap/components/tiptap-ui/undo-redo-button"
// --- UI Primitives ---
import { Button } from "@/vendor/tiptap/components/tiptap-ui-primitive/button"
import { Spacer } from "@/vendor/tiptap/components/tiptap-ui-primitive/spacer"
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/vendor/tiptap/components/tiptap-ui-primitive/toolbar"
import { useCursorVisibility } from "@/vendor/tiptap/hooks/use-cursor-visibility"
// --- Hooks ---
import { useIsBreakpoint } from "@/vendor/tiptap/hooks/use-is-breakpoint"
import { useWindowSize } from "@/vendor/tiptap/hooks/use-window-size"
// --- Lib ---
import {
  handleImageUpload,
  MAX_FILE_SIZE,
} from "@/vendor/tiptap/lib/tiptap-utils"

const MainToolbarContent = ({
  onHighlighterClick,
  onLinkClick,
  isMobile,
}: {
  onHighlighterClick: () => void
  onLinkClick: () => void
  isMobile: boolean
}) => {
  return (
    <>
      <Spacer />

      <ToolbarGroup>
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <HeadingDropdownMenu modal={false} levels={[1, 2, 3, 4]} />
        <ListDropdownMenu
          modal={false}
          types={["bulletList", "orderedList", "taskList"]}
        />
        <BlockquoteButton />
        <CodeBlockButton />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="bold" />
        <MarkButton type="italic" />
        <MarkButton type="strike" />
        <MarkButton type="code" />
        <MarkButton type="underline" />
        {!isMobile ? (
          <ColorHighlightPopover />
        ) : (
          <ColorHighlightPopoverButton onClick={onHighlighterClick} />
        )}
        {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="superscript" />
        <MarkButton type="subscript" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <TextAlignButton align="left" />
        <TextAlignButton align="center" />
        <TextAlignButton align="right" />
        <TextAlignButton align="justify" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <ImageUploadButton text="Add" />
      </ToolbarGroup>

      <Spacer />
    </>
  )
}

const MobileToolbarContent = ({
  type,
  onBack,
}: {
  type: "highlighter" | "link"
  onBack: () => void
}) => (
  <>
    <ToolbarGroup>
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === "highlighter" ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />

    {type === "highlighter" ? (
      <ColorHighlightPopoverContent />
    ) : (
      <LinkContent />
    )}
  </>
)

export function SimpleEditor({
  content = defaultContent,
  contentType,
  editable = true,
  onEditorReady,
  contentClassName,
}: {
  content?: Record<string, unknown> | string
  contentType?: "json" | "markdown"
  editable?: boolean
  onEditorReady?: (editor: Editor | null) => void
  contentClassName?: string
}) {
  const isMobile = useIsBreakpoint()
  const { height } = useWindowSize()
  const [mobileView, setMobileView] = useState<"main" | "highlighter" | "link">(
    "main"
  )
  const toolbarRef = useRef<HTMLDivElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Main content area, start typing to enter text.",
        class: "simple-editor",
      },
    },
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        link: {
          openOnClick: false,
          enableClickSelection: true,
        },
      }),
      HorizontalRule,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image,
      Typography,
      Superscript,
      Subscript,
      Selection,
      Markdown.configure({ markedOptions: { gfm: true } }),
      ImageUploadNode.configure({
        accept: "image/*",
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: handleImageUpload,
        onError: (error) => console.error("Upload failed:", error),
      }),
    ],
    content,
    ...(contentType ? { contentType } : {}),
    editable,
  })

  const rect = useCursorVisibility({
    editor,
    overlayHeight: 0,
  })
  const activeMobileView = isMobile ? mobileView : "main"

  useEffect(() => {
    if (!editor) return
    editor.setEditable(editable)
  }, [editor, editable])

  useEffect(() => {
    if (!editor) return
    if (contentType === "markdown" && typeof content === "string") {
      const next = content
      const current = editor.getMarkdown()
      if (current !== next) {
        editor.commands.setContent(next, { contentType: "markdown" })
      }
      return
    }

    if (contentType === "json" && typeof content === "object") {
      const next = JSON.stringify(content)
      const current = JSON.stringify(editor.getJSON())
      if (current !== next) {
        editor.commands.setContent(content)
      }
    }
  }, [content, contentType, editor])

  useEffect(() => {
    onEditorReady?.(editor)
  }, [editor, onEditorReady])

  return (
    <div className="simple-editor-wrapper">
      <EditorContext.Provider value={{ editor }}>
        {editable ? (
          <Toolbar
            ref={toolbarRef}
            style={{
              ...(isMobile
                ? {
                    bottom: `calc(100% - ${height - rect.y}px)`,
                  }
                : {}),
            }}
          >
            {activeMobileView === "main" ? (
              <MainToolbarContent
                onHighlighterClick={() => setMobileView("highlighter")}
                onLinkClick={() => setMobileView("link")}
                isMobile={isMobile}
              />
            ) : (
              <MobileToolbarContent
                type={
                  activeMobileView === "highlighter" ? "highlighter" : "link"
                }
                onBack={() => setMobileView("main")}
              />
            )}
          </Toolbar>
        ) : null}

        <EditorContent
          editor={editor}
          role="presentation"
          className={
            contentClassName
              ? `simple-editor-content ${contentClassName}`
              : "simple-editor-content"
          }
        />
      </EditorContext.Provider>
    </div>
  )
}
