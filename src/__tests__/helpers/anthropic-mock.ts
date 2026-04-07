import { vi } from 'vitest'

export function createAnthropicMock(responseText = 'Mock AI response') {
  const mockStream = {
    [Symbol.asyncIterator]: async function* () {
      yield { type: 'content_block_delta', delta: { type: 'text_delta', text: responseText } }
      yield { type: 'message_stop' }
    },
    finalMessage: vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: responseText }],
      usage: { input_tokens: 100, output_tokens: 50 },
    }),
  }

  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: responseText }],
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
      stream: vi.fn().mockReturnValue(mockStream),
    },
  }
}
