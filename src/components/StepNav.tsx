import { useEffect, useRef } from 'react';

export interface NavStep {
  id: string;
  label: string;
}

interface Props {
  steps: NavStep[];
  current: number;
  onSelect: (index: number) => void;
}

export default function StepNav({ steps, current, onSelect }: Props) {
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Keep the active tab in view within the horizontal strip (mobile), without
  // nudging the page vertically — only scroll the nav's own overflow.
  useEffect(() => {
    const nav = navRef.current;
    const item = itemRefs.current[current];
    if (!nav || !item || nav.scrollWidth <= nav.clientWidth) return;
    const target = item.offsetLeft - nav.clientWidth / 2 + item.clientWidth / 2;
    nav.scrollTo({ left: target, behavior: 'smooth' });
  }, [current]);

  return (
    <nav className="stepnav" aria-label="Configuration steps" ref={navRef}>
      {steps.map((step, i) => {
        const isActive = i === current;
        return (
          <button
            key={step.id}
            type="button"
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            className={`stepnav__item${isActive ? ' stepnav__item--active' : ''}`}
            onClick={() => onSelect(i)}
            aria-current={isActive ? 'step' : undefined}
          >
            <ol start={i + 1}>
              <li>{step.label}</li>
            </ol>
          </button>
        );
      })}
    </nav>
  );
}
