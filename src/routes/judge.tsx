import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { getCurrentSession } from '#/server/session'

type JudgeMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type GetJudgeResponseInput = {
  message: string
  messages: JudgeMessage[]
}

type JudgeChatProps = {
  getResponse: (input: GetJudgeResponseInput) => Promise<string>
}

export const Route = createFileRoute('/judge')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) {
      throw redirect({ to: '/auth' })
    }
  },
  component: JudgePage,
})

function JudgePage() {
  async function getResponse({ message }: GetJudgeResponseInput) {
    return `Stub response: ${message}`
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-8 py-8">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-2xl shadow-black/20">
        <div className="border-b border-zinc-800 pb-4">
          <h1 className="text-2xl font-semibold text-zinc-100">Judge</h1>
          <p className="mt-1 text-sm text-zinc-400">Simple chat scaffold for AI judge responses.</p>
        </div>

        <JudgeChat getResponse={getResponse} />
      </section>
    </main>
  )
}

function JudgeChat({ getResponse }: JudgeChatProps) {
  const [messages, setMessages] = useState<JudgeMessage[]>([])
  const [draft, setDraft] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const message = draft.trim()
    if (!message || isSubmitting) {
      return
    }

    const userMessage: JudgeMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
    }

    const nextMessages = [...messages, userMessage]

    setMessages(nextMessages)
    setDraft('')
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const response = await getResponse({
        message,
        messages: nextMessages,
      })

      setMessages([
        ...nextMessages,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response,
        },
      ])
    } catch (error) {
      setMessages(nextMessages)
      setErrorMessage(error instanceof Error ? error.message : 'Could not get a response right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex min-h-80 flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-zinc-500">No messages yet.</p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-xl border px-4 py-3 text-sm ${
                message.role === 'user'
                  ? 'self-end border-cyan-900/60 bg-cyan-950/30 text-cyan-100'
                  : 'border-zinc-800 bg-zinc-950 text-zinc-200'
              }`}
            >
              <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">{message.role}</p>
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          ))
        )}
      </div>

      {errorMessage ? (
        <p className="rounded-xl border border-rose-900/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">
          {errorMessage}
        </p>
      ) : null}

      <form className="space-y-3" onSubmit={handleSubmit}>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Type your message"
          rows={4}
          className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-500"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !draft.trim()}
            className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  )
}
