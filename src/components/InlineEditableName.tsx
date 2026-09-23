import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { IconButton } from '@carbon/react';
import { Edit, Checkmark } from '@carbon/icons-react';

interface Props {
  value: string;
  onSave: (name: string) => void;
  placeholder?: string;
  /** Optional Plex Sans eyebrow label rendered above the name (used by the form caller). */
  label?: string;
  className?: string;
}

// Seamless inline-editable estimate name: serif text + ghost pencil that swaps
// the name itself into a borderless serif input, saved by Enter or a tick button.
export default function InlineEditableName({
  value,
  onSave,
  placeholder = 'Untitled estimate',
  label,
  className,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function startEditing() {
    setDraft(value);
    setEditing(true);
  }

  function save() {
    const trimmed = draft.trim();
    if (trimmed) onSave(trimmed);
    setEditing(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditing(false);
    }
  }

  return (
    <div className={`inline-name${className ? ` ${className}` : ''}`}>
      {label && <span className="inline-name__label">{label}</span>}
      <div className="inline-name__row">
        {editing ? (
          <>
            <input
              ref={inputRef}
              className="inline-name__input"
              value={draft}
              placeholder={placeholder}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              aria-label="Estimate name"
            />
            <IconButton kind="ghost" size="sm" label="Save name" align="bottom" onClick={save}>
              <Checkmark size={16} />
            </IconButton>
          </>
        ) : (
          <>
            <span className="inline-name__text">{value || placeholder}</span>
            <IconButton
              kind="ghost"
              size="sm"
              label="Rename estimate"
              align="bottom"
              onClick={startEditing}
            >
              <Edit size={16} />
            </IconButton>
          </>
        )}
      </div>
    </div>
  );
}
