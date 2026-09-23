import { useEffect, useRef, useState } from 'react';
import {
  Button,
  TextInput,
  TextArea,
  InlineLoading,
  Tag,
} from '@carbon/react';
import { Close, CheckmarkFilled, Launch } from '@carbon/icons-react';
import type { FormData, EstimateResult } from '../types';
import { APPLICATIONS } from '../imports/constants';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

interface Props {
  open: boolean;
  onClose: () => void;
  formData: FormData;
  result: EstimateResult;
  totalUsers: number;
}

type Status = 'form' | 'sending' | 'sent';

/**
 * Narrow Carbon-style tearsheet for pushing the finished estimate into CPQ.
 * Built on Carbon primitives (the bundled @carbon/react in this project predates
 * the packaged Tearsheet), matching the narrow tearsheet spec: bottom-anchored
 * fixed panel, label + title header, scrollable body, and a split action footer.
 */
export default function CpqTearsheet({ open, onClose, formData, result, totalUsers }: Props) {
  const [status, setStatus] = useState<Status>('form');
  const [opportunityId, setOpportunityId] = useState('');
  const [notes, setNotes] = useState('');
  const timer = useRef<number | undefined>(undefined);

  // Reset to a clean form each time the tearsheet is opened.
  useEffect(() => {
    if (open) setStatus('form');
    return () => window.clearTimeout(timer.current);
  }, [open]);

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && status !== 'sending') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, status, onClose]);

  const selectedApps = APPLICATIONS.filter((a) => formData.selectedApplications.includes(a.id));

  const send = () => {
    setStatus('sending');
    timer.current = window.setTimeout(() => setStatus('sent'), 1400);
  };

  return (
    <div className={`cpq${open ? ' cpq--open' : ''}`} aria-hidden={!open}>
      <button
        type="button"
        className="cpq__scrim"
        aria-label="Close"
        tabIndex={open ? 0 : -1}
        onClick={() => status !== 'sending' && onClose()}
      />

      <div
        className="cpq__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Send estimate to CPQ"
      >
        <header className="cpq__header">
          <div className="cpq__header-text">
            <span className="cpq__label">Configure, price, quote</span>
            <h2 className="cpq__title">Send to CPQ</h2>
            <p className="cpq__desc">
              Push this Maximo configuration to CPQ to generate a formal quote for the opportunity.
            </p>
          </div>
          <Button
            kind="ghost"
            size="sm"
            hasIconOnly
            iconDescription="Close"
            renderIcon={Close}
            onClick={() => status !== 'sending' && onClose()}
            disabled={status === 'sending'}
          />
        </header>

        <div className="cpq__body">
          {status === 'sent' ? (
            <div className="cpq__success">
              <CheckmarkFilled size={32} className="cpq__success-icon" />
              <h3 className="cpq__success-title">Sent to CPQ</h3>
              <p className="cpq__success-body">
                The estimate for <strong>{formData.companyName || 'this customer'}</strong> was
                queued in CPQ{opportunityId ? <> under opportunity <strong>{opportunityId}</strong></> : null}.
                A quote draft will be available in CPQ shortly.
              </p>
            </div>
          ) : (
            <>
              {/* Estimate summary being sent */}
              <section className="cpq__summary" aria-label="Estimate summary">
                <div className="cpq__summary-head">
                  <span className="cpq__summary-name">{formData.companyName || 'Untitled estimate'}</span>
                  <span className="cpq__summary-term">
                    {formData.contractTerm}-year term
                  </span>
                </div>
                <div className="cpq__stats">
                  <div className="cpq__stat">
                    <span className="cpq__stat-value">{currency.format(result.annualCost)}</span>
                    <span className="cpq__stat-label">Annual subscription</span>
                  </div>
                  <div className="cpq__stat">
                    <span className="cpq__stat-value">{result.totalAppPoints.toLocaleString('en-US')}</span>
                    <span className="cpq__stat-label">AppPoints</span>
                  </div>
                  <div className="cpq__stat">
                    <span className="cpq__stat-value">{totalUsers.toLocaleString('en-US')}</span>
                    <span className="cpq__stat-label">Users</span>
                  </div>
                </div>
                <div className="cpq__modules">
                  {selectedApps.length === 0 ? (
                    <span className="cpq__muted">No applications selected</span>
                  ) : (
                    selectedApps.map((app) => (
                      <Tag key={app.id} type="blue" size="sm">{app.shortName}</Tag>
                    ))
                  )}
                </div>
              </section>

              <TextInput
                id="cpq-opportunity"
                className="cpq__opportunity"
                labelText="CPQ opportunity ID"
                placeholder="e.g. OPP-284193"
                value={opportunityId}
                onChange={(e) => setOpportunityId(e.target.value)}
              />
              <TextArea
                id="cpq-notes"
                labelText="Notes for the quote team (optional)"
                placeholder="Add deal context, negotiated terms, or special requirements…"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </>
          )}
        </div>

        <footer className="cpq__footer">
          {status === 'sent' ? (
            <Button kind="primary" onClick={onClose}>Done</Button>
          ) : (
            <>
              <Button kind="secondary" onClick={onClose} disabled={status === 'sending'}>
                Cancel
              </Button>
              {status === 'sending' ? (
                <Button kind="primary" disabled>
                  <InlineLoading description="Sending…" />
                </Button>
              ) : (
                <Button kind="primary" renderIcon={Launch} onClick={send}>
                  Send to CPQ
                </Button>
              )}
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
