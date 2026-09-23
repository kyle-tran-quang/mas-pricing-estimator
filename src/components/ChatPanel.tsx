import { useEffect, useRef, useState } from 'react';
import { Button, IconButton } from '@carbon/react';
import { Close, Menu, Microphone, Send, Book, ArrowRight } from '@carbon/icons-react';
import { QUICK_ACTIONS, getAssistantReply, type ChatSource } from './chatResponder';
import {
  advanceQuoteBuilder,
  applyRefinement,
  refinementReply,
  type QuoteCtx,
} from './quoteBuilder';
import type { FormData } from '../types';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  confidence?: number | null;
  sources?: ChatSource[];
  quoteConfig?: FormData;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onApplyConfig?: (fd: FormData) => void;
}

const watsonxGlyph = '/assets/watsonx-glyph.svg';

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function ChatPanel({ open, onClose, onApplyConfig }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [quoteCtx, setQuoteCtx] = useState<QuoteCtx>({ stage: 'idle' });
  const endRef = useRef<HTMLDivElement>(null);
  const startedAt = useRef(nowLabel());

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text || thinking) return;
    setInput('');
    // Capture the most recent applied quote (if any) for inline refinement.
    const lastQuote = [...messages].reverse().find((m) => m.quoteConfig)?.quoteConfig;
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setThinking(true);
    // Simulate assistant latency for a live feel.
    window.setTimeout(() => {
      // (a) Refinement of an existing quote.
      if (lastQuote) {
        const refined = applyRefinement(text, lastQuote);
        if (refined) {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: refinementReply(refined), confidence: 92, quoteConfig: refined },
          ]);
          setThinking(false);
          return;
        }
      }
      // (b) Conversational quote-builder state machine.
      const step = advanceQuoteBuilder(quoteCtx, text);
      if (step) {
        setQuoteCtx(step.nextCtx);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: step.reply, quoteConfig: step.formData },
        ]);
        setThinking(false);
        return;
      }
      // (c) Fall back to the deterministic keyword responder.
      const reply = getAssistantReply(text);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: reply.answer, confidence: reply.confidence, sources: reply.sources },
      ]);
      setThinking(false);
    }, 550);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <aside
      className={`chatp${open ? ' chatp--open' : ''}`}
      aria-label="Maximo AI assistant"
      aria-hidden={!open}
      role="complementary"
    >
      <div className="chatp__aura" aria-hidden="true" />

      <header className="chatp__header">
        <div className="chatp__ai-label" aria-hidden="true">AI</div>
        <IconButton kind="ghost" size="sm" label="Close assistant" align="bottom-right" onClick={onClose}>
          <Close size={16} />
        </IconButton>
      </header>

      <div className="chatp__scroll">
        {/* Cold-start welcome — always shown first, mirroring the design. */}
        <div className="chatp__welcome">
          <span
            className="chatp__avatar"
            style={{ maskImage: `url(${watsonxGlyph})`, WebkitMaskImage: `url(${watsonxGlyph})` }}
            aria-hidden="true"
          />
          <div className="chatp__meta">
            <span>watsonx</span>
            <span>{startedAt.current}</span>
          </div>
        </div>
        <p className="chatp__lead">
          Welcome! I&apos;m here to help you sell Maximo. Ask me anything — product questions, licensing
          rules, competitive positioning, or help structuring a deal.
        </p>

        <div className="chatp__block">
          <h3 className="chatp__block-title">Build a quote with chat</h3>
          <p className="chatp__block-body">
            Describe your deal in plain language — customer industry, their needs, user count, and any
            special requirements.
          </p>
          <p className="chatp__block-example">
            Example: &quot;Large oil and gas company needs asset management with IoT monitoring on their
            rigs. About 200 maintenance staff. Quote for 3 years.&quot;
          </p>
          <h4 className="chatp__block-subtitle">Or explore first:</h4>
          <div className="chatp__chips">
            {QUICK_ACTIONS.map((prompt) => (
              <button key={prompt} type="button" className="chatp__chip" onClick={() => send(prompt)}>
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {messages.map((m, i) => (
          <div key={i} className={`chatp__msg chatp__msg--${m.role}`}>
            {m.role === 'assistant' && (
              <span
                className="chatp__avatar chatp__avatar--sm"
                style={{ maskImage: `url(${watsonxGlyph})`, WebkitMaskImage: `url(${watsonxGlyph})` }}
                aria-hidden="true"
              />
            )}
            <div className="chatp__bubble">
              <p className="chatp__bubble-text">{m.content}</p>
              {m.sources && m.sources.length > 0 && (
                <div className="chatp__sources">
                  <div className="chatp__sources-title">
                    <Book size={16} />
                    <span>Sources</span>
                  </div>
                  {m.sources.map((s) => (
                    <div key={s.doc} className="chatp__source">
                      <span className="chatp__source-doc">{s.doc}</span>
                      <span className="chatp__source-section">{s.section}</span>
                      <span className="chatp__source-conf">{Math.round(s.confidence)}%</span>
                    </div>
                  ))}
                </div>
              )}
              {m.quoteConfig && onApplyConfig && (
                <div className="chatp__estimate-actions">
                  <Button
                    size="sm"
                    kind="primary"
                    renderIcon={ArrowRight}
                    onClick={() => onApplyConfig(m.quoteConfig!)}
                  >
                    Open in estimator
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}

        {thinking && (
          <div className="chatp__msg chatp__msg--assistant">
            <span
              className="chatp__avatar chatp__avatar--sm"
              style={{ maskImage: `url(${watsonxGlyph})`, WebkitMaskImage: `url(${watsonxGlyph})` }}
              aria-hidden="true"
            />
            <div className="chatp__bubble">
              <span className="chatp__typing" aria-label="Assistant is typing">
                <i /><i /><i />
              </span>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      <div className="chatp__composer">
        <IconButton kind="ghost" size="sm" label="Menu" align="top-left">
          <Menu size={16} />
        </IconButton>
        <textarea
          className="chatp__input"
          placeholder="Type something…"
          value={input}
          rows={1}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Message the assistant"
        />
        <IconButton kind="ghost" size="sm" label="Voice input" align="top-right">
          <Microphone size={16} />
        </IconButton>
        <IconButton
          kind="ghost"
          size="sm"
          label="Send"
          align="top-right"
          onClick={() => send(input)}
          disabled={!input.trim() || thinking}
        >
          <Send size={16} />
        </IconButton>
      </div>
    </aside>
  );
}
