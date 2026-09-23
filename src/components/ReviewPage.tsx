import {
  Button,
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  StructuredListWrapper,
  StructuredListBody,
  StructuredListRow,
  StructuredListCell,
  Tag,
} from '@carbon/react';
import { useState } from 'react';
import { ArrowLeft, Launch } from '@carbon/icons-react';
import CpqTearsheet from './CpqTearsheet';
import type { FormData, UserTierId, EstimateResult } from '../types';
import {
  USER_TIER_APPPOINTS,
  APPLICATIONS,
  ENVIRONMENT_SIZES,
  DEPLOYMENT_ARCHITECTURE,
  DATABASE_TYPES,
  ADVANCED_COMPONENTS,
  ADDONS,
} from '../imports/constants';

/* ── helpers ─────────────────────────────────────────────────────────── */

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const formatCurrency = (n: number) => currency.format(n);

const INDUSTRY_LABELS: Record<string, string> = {
  aviation: 'Aviation',
  nuclear: 'Nuclear',
  energy: 'Energy & Utilities',
  oilgas: 'Oil & Gas',
  transportation: 'Transportation',
  civil: 'Civil Infrastructure',
  manufacturing: 'Manufacturing',
  lifesciences: 'Life Sciences',
  government: 'Government / Defense',
  other: 'Other',
};

const DEPLOYMENT_LABELS: Record<string, string> = {
  saas: 'IBM Maximo Application Suite SaaS',
  onprem: 'On-Premises (customer-managed)',
};

const TAG_TYPES: Record<string, 'blue' | 'cyan' | 'teal' | 'green' | 'magenta' | 'purple' | 'gray'> = {
  blue: 'blue',
  cyan: 'cyan',
  teal: 'teal',
  green: 'green',
  magenta: 'magenta',
  purple: 'purple',
  gray: 'gray',
};

/* ── sub-components ──────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="review-detail__section-label">{children}</p>;
}

/* ── Props ───────────────────────────────────────────────────────────── */

interface Props {
  formData: FormData;
  result: EstimateResult;
  perTierPoints: Record<UserTierId, number>;
  totalUsers: number;
  onBack: () => void;
}

/* ── ReviewPage ──────────────────────────────────────────────────────── */

export default function ReviewPage({
  formData,
  result,
  perTierPoints,
  totalUsers,
  onBack,
}: Props) {
  const { annualCost, totalAppPoints, totalCost, termDiscount, breakdown } = result;
  const [cpqOpen, setCpqOpen] = useState(false);

  const selectedApps = APPLICATIONS.filter((a) =>
    formData.selectedApplications.includes(a.id),
  );

  const envLabel = ENVIRONMENT_SIZES[formData.environmentSize]?.label ?? formData.environmentSize;
  const envPoints = ENVIRONMENT_SIZES[formData.environmentSize]?.appPoints ?? 0;

  const archMeta = DEPLOYMENT_ARCHITECTURE[formData.deploymentArchitecture];
  const dbMeta = DATABASE_TYPES[formData.database.type];

  const selectedAddons = ADDONS.filter((a) => formData.selectedAddons.includes(a.id));
  const selectedAdvanced = Object.keys(ADVANCED_COMPONENTS).filter(
    (id) => formData.advancedComponents[id] === true,
  );

  const userTiers = Object.keys(USER_TIER_APPPOINTS) as UserTierId[];

  const contractLabel =
    formData.contractTerm === 1 ? '1 year' :
    formData.contractTerm === 3 ? '3 years (12% discount)' :
    formData.contractTerm === 5 ? '5 years (20% discount)' :
    `${formData.contractTerm} years`;

  /* Breakdown rows for the DataTable, derived from the estimate engine. */
  const breakdownRows = breakdown
    .filter((row) => (row.appPoints ?? 0) !== 0)
    .map((row, i) => {
      let detail = '—';
      if (row.item === 'User AppPoints') {
        detail = `${totalUsers} users across ${userTiers.filter((t) => perTierPoints[t] > 0).length} tiers`;
      } else if (typeof row.count === 'number') {
        detail = `${row.count} ×`;
      }
      return {
        id: `line-${i}`,
        item: row.item,
        detail,
        appPoints: (row.appPoints ?? 0).toLocaleString('en-US'),
      };
    });

  const breakdownHeaders = [
    { key: 'item', header: 'Line item' },
    { key: 'detail', header: 'Detail' },
    { key: 'appPoints', header: 'AppPoints' },
  ];

  return (
    <div className="review-detail">
      {/* Back */}
      <Button
        kind="ghost"
        size="sm"
        renderIcon={ArrowLeft}
        onClick={onBack}
        className="review-detail__back"
      >
        Back to configuration
      </Button>

      {/* Header */}
      <header className="review-detail__header">
        <div className="review-detail__header-top">
          <p className="review-detail__eyebrow">Review MAS configuration</p>
          <Button
            kind="primary"
            size="md"
            renderIcon={Launch}
            onClick={() => setCpqOpen(true)}
            className="review-detail__cpq-btn"
          >
            Send to CPQ
          </Button>
        </div>
        <h1 className="review-detail__title">{formData.companyName || 'Untitled estimate'}</h1>
        <div className="review-detail__modules">
          {selectedApps.length === 0 ? (
            <span className="review-detail__muted">No applications selected</span>
          ) : (
            selectedApps.map((app) => (
              <Tag key={app.id} type={TAG_TYPES[app.color] ?? 'gray'} size="md">
                {app.shortName}
              </Tag>
            ))
          )}
        </div>
      </header>

      {/* KPI row */}
      <div className="review-detail__kpis">
        <div className="review-detail__kpi">
          <span className="review-detail__kpi-value">{formatCurrency(annualCost)}</span>
          <span className="review-detail__kpi-label">Annual subscription</span>
        </div>
        <div className="review-detail__kpi">
          <span className="review-detail__kpi-value">{totalAppPoints.toLocaleString('en-US')}</span>
          <span className="review-detail__kpi-label">Total AppPoints</span>
        </div>
        <div className="review-detail__kpi">
          <span className="review-detail__kpi-value">{totalUsers.toLocaleString('en-US')}</span>
          <span className="review-detail__kpi-label">Total users</span>
        </div>
        <div className="review-detail__kpi">
          <span className="review-detail__kpi-value">{contractLabel.split(' ')[0]}</span>
          <span className="review-detail__kpi-label">
            {formData.contractTerm === 1 ? 'Year term' : 'Years term'}
          </span>
        </div>
      </div>

      {/* AppPoints breakdown table */}
      <section className="review-detail__section">
        <SectionLabel>AppPoints breakdown</SectionLabel>
        <DataTable rows={breakdownRows} headers={breakdownHeaders}>
          {({ rows, headers, getHeaderProps, getRowProps, getTableProps, getTableContainerProps }) => (
            <TableContainer
              {...getTableContainerProps()}
              className="review-detail__table"
            >
              <Table {...getTableProps()} size="md" useZebraStyles>
                <TableHead>
                  <TableRow>
                    {headers.map((header) => {
                      const props = getHeaderProps({ header });
                      const { key, ...rest } = props;
                      return (
                        <TableHeader
                          key={header.key}
                          {...rest}
                          className={header.key === 'appPoints' ? 'review-detail__num' : undefined}
                        >
                          {header.header}
                        </TableHeader>
                      );
                    })}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => {
                    const props = getRowProps({ row });
                    const { key, ...rest } = props;
                    return (
                      <TableRow key={row.id} {...rest}>
                        {row.cells.map((cell) => (
                          <TableCell
                            key={cell.id}
                            className={cell.info.header === 'appPoints' ? 'review-detail__num' : undefined}
                          >
                            {cell.value}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                  <TableRow className="review-detail__total-row">
                    <TableCell><strong>Total</strong></TableCell>
                    <TableCell />
                    <TableCell className="review-detail__num">
                      <strong>{totalAppPoints.toLocaleString('en-US')}</strong>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DataTable>
      </section>

      {/* Two-up detail groups */}
      <div className="review-detail__groups">
        {/* Deployment */}
        <section className="review-detail__section">
          <SectionLabel>Deployment</SectionLabel>
          <StructuredListWrapper isFlush aria-label="Deployment">
            <StructuredListBody>
              <StructuredListRow>
                <StructuredListCell>Industry</StructuredListCell>
                <StructuredListCell>{INDUSTRY_LABELS[formData.industry] ?? formData.industry}</StructuredListCell>
              </StructuredListRow>
              <StructuredListRow>
                <StructuredListCell>Deployment model</StructuredListCell>
                <StructuredListCell>{DEPLOYMENT_LABELS[formData.deploymentModel] ?? formData.deploymentModel}</StructuredListCell>
              </StructuredListRow>
              <StructuredListRow>
                <StructuredListCell>Architecture</StructuredListCell>
                <StructuredListCell>
                  {archMeta?.name ?? formData.deploymentArchitecture}
                  {archMeta?.appPoints > 0 && (
                    <span className="review-detail__ap-note">+{archMeta.appPoints} AP</span>
                  )}
                </StructuredListCell>
              </StructuredListRow>
              <StructuredListRow>
                <StructuredListCell>Database</StructuredListCell>
                <StructuredListCell>
                  {dbMeta?.name ?? formData.database.type}
                  {formData.database.replicas > 0 && (
                    <span className="review-detail__ap-note">
                      {formData.database.replicas} replica{formData.database.replicas > 1 ? 's' : ''}
                    </span>
                  )}
                </StructuredListCell>
              </StructuredListRow>
              <StructuredListRow>
                <StructuredListCell>Contract term</StructuredListCell>
                <StructuredListCell>{contractLabel}</StructuredListCell>
              </StructuredListRow>
            </StructuredListBody>
          </StructuredListWrapper>
        </section>

        {/* Environment & extras */}
        <section className="review-detail__section">
          <SectionLabel>Environment &amp; extras</SectionLabel>
          <StructuredListWrapper isFlush aria-label="Environment and extras">
            <StructuredListBody>
              <StructuredListRow>
                <StructuredListCell>Environment size</StructuredListCell>
                <StructuredListCell>
                  {envLabel}
                  {envPoints > 0 && <span className="review-detail__ap-note">+{envPoints} AP</span>}
                </StructuredListCell>
              </StructuredListRow>
              <StructuredListRow>
                <StructuredListCell>Add-ons</StructuredListCell>
                <StructuredListCell>
                  {selectedAddons.length === 0 ? (
                    <span className="review-detail__muted">None</span>
                  ) : (
                    <div className="review-detail__tag-row">
                      {selectedAddons.map((a) => (
                        <Tag key={a.id} type="teal" size="sm">{a.name}</Tag>
                      ))}
                    </div>
                  )}
                </StructuredListCell>
              </StructuredListRow>
              <StructuredListRow>
                <StructuredListCell>Advanced components</StructuredListCell>
                <StructuredListCell>
                  {selectedAdvanced.length === 0 ? (
                    <span className="review-detail__muted">None</span>
                  ) : (
                    <div className="review-detail__tag-row">
                      {selectedAdvanced.map((id) => (
                        <Tag key={id} type="cyan" size="sm">{ADVANCED_COMPONENTS[id].name}</Tag>
                      ))}
                    </div>
                  )}
                </StructuredListCell>
              </StructuredListRow>
            </StructuredListBody>
          </StructuredListWrapper>
        </section>
      </div>

      {/* User pool */}
      <section className="review-detail__section">
        <SectionLabel>User pool ({totalUsers} users)</SectionLabel>
        <StructuredListWrapper isFlush aria-label="User pool">
          <StructuredListBody>
            {userTiers.map((tier) => {
              const meta = USER_TIER_APPPOINTS[tier];
              const counts = formData.userMix[tier];
              const pts = perTierPoints[tier];
              return (
                <StructuredListRow key={tier}>
                  <StructuredListCell>{meta.label}</StructuredListCell>
                  <StructuredListCell className="review-detail__muted-cell">
                    {counts.concurrent > 0 && `${counts.concurrent} concurrent`}
                    {counts.concurrent > 0 && counts.authorized > 0 && '  ·  '}
                    {counts.authorized > 0 && `${counts.authorized} authorized`}
                    {counts.concurrent === 0 && counts.authorized === 0 && '—'}
                  </StructuredListCell>
                  <StructuredListCell noWrap>
                    {pts > 0 && <Tag type="blue" size="sm">{pts.toLocaleString('en-US')} AP</Tag>}
                  </StructuredListCell>
                </StructuredListRow>
              );
            })}
          </StructuredListBody>
        </StructuredListWrapper>
      </section>

      {/* Pricing summary */}
      <section className="review-detail__section">
        <SectionLabel>Pricing summary</SectionLabel>
        <StructuredListWrapper isFlush aria-label="Pricing summary">
          <StructuredListBody>
            <StructuredListRow>
              <StructuredListCell>Total AppPoints</StructuredListCell>
              <StructuredListCell><strong>{totalAppPoints.toLocaleString('en-US')} AP</strong></StructuredListCell>
            </StructuredListRow>
            <StructuredListRow>
              <StructuredListCell>Annual subscription</StructuredListCell>
              <StructuredListCell>
                <strong className="review-detail__price">{formatCurrency(annualCost)}</strong>
                <span className="review-detail__ap-note">/year</span>
              </StructuredListCell>
            </StructuredListRow>
            {formData.contractTerm > 1 && (
              <StructuredListRow>
                <StructuredListCell>{formData.contractTerm}-year total</StructuredListCell>
                <StructuredListCell>
                  <strong>{formatCurrency(totalCost)}</strong>
                  <span className="review-detail__ap-note">
                    {Math.round(termDiscount * 100)}% multi-year discount applied
                  </span>
                </StructuredListCell>
              </StructuredListRow>
            )}
          </StructuredListBody>
        </StructuredListWrapper>
      </section>

      <CpqTearsheet
        open={cpqOpen}
        onClose={() => setCpqOpen(false)}
        formData={formData}
        result={result}
        totalUsers={totalUsers}
      />
    </div>
  );
}
