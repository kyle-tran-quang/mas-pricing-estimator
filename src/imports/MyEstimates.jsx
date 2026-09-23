import React, { useState } from 'react';
import {
  DataTable,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableSelectAll,
  TableSelectRow,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  Button,
  Tag
} from '@carbon/react';
import { TrashCan, Compare } from '@carbon/icons-react';

// Demo data for estimates with full technical configuration
const DEMO_ESTIMATES = [
  {
    id: '1',
    name: 'Acme Corp — Full APM + Visual Inspection',
    date: '2026-04-15',
    amount: 285000,
    industry: 'Manufacturing',
    users: 150,
    modules: ['Manage', 'Health', 'Monitor', 'Predict', 'Visual Inspection'],
    // Technical Configuration
    deployment: {
      edition: 'Premium',
      model: 'SaaS',
      architecture: 'Dedicated'
    },
    environments: {
      prod: { size: 'Large', count: 1 },
      nonProd: { size: 'Medium', count: 2 }
    },
    userMix: {
      premium: { concurrent: 50, authorized: 75 },
      base: { concurrent: 40, authorized: 50 },
      limited: { concurrent: 35, authorized: 25 }
    },
    appPoints: 12500,
    contractTerm: 3,
    database: 'DB2',
    addons: ['IoT', 'AI Vision']
  },
  {
    id: '2',
    name: 'Global Energy — Asset Management Starter',
    date: '2026-04-12',
    amount: 125000,
    industry: 'Utilities',
    users: 75,
    modules: ['Manage', 'Health'],
    deployment: {
      edition: 'Standard',
      model: 'SaaS',
      architecture: 'Shared'
    },
    environments: {
      prod: { size: 'Medium', count: 1 },
      nonProd: { size: 'Small', count: 1 }
    },
    userMix: {
      premium: { concurrent: 20, authorized: 30 },
      base: { concurrent: 30, authorized: 35 },
      limited: { concurrent: 25, authorized: 10 }
    },
    appPoints: 5800,
    contractTerm: 3,
    database: 'DB2',
    addons: []
  },
  {
    id: '3',
    name: 'Metro Transit — Fleet Management',
    date: '2026-04-10',
    amount: 195000,
    industry: 'Transportation',
    users: 120,
    modules: ['Manage', 'Monitor', 'Mobile'],
    deployment: {
      edition: 'Standard',
      model: 'SaaS',
      architecture: 'Shared'
    },
    environments: {
      prod: { size: 'Large', count: 1 },
      nonProd: { size: 'Medium', count: 1 }
    },
    userMix: {
      premium: { concurrent: 30, authorized: 40 },
      base: { concurrent: 50, authorized: 60 },
      limited: { concurrent: 40, authorized: 20 }
    },
    appPoints: 8200,
    contractTerm: 5,
    database: 'DB2',
    addons: ['Mobile']
  },
  {
    id: '4',
    name: 'AeroTech — Aviation Maintenance Suite',
    date: '2026-04-08',
    amount: 340000,
    industry: 'Aviation',
    users: 200,
    modules: ['Manage', 'Health', 'Monitor', 'Predict', 'Safety'],
    deployment: {
      edition: 'Premium',
      model: 'SaaS',
      architecture: 'Dedicated'
    },
    environments: {
      prod: { size: 'XLarge', count: 1 },
      nonProd: { size: 'Large', count: 2 }
    },
    userMix: {
      premium: { concurrent: 60, authorized: 80 },
      base: { concurrent: 70, authorized: 80 },
      limited: { concurrent: 70, authorized: 40 }
    },
    appPoints: 15200,
    contractTerm: 3,
    database: 'Oracle',
    addons: ['Safety', 'Compliance']
  },
  {
    id: '5',
    name: 'PowerGen Nuclear — Compliance & Safety',
    date: '2026-04-05',
    amount: 425000,
    industry: 'Nuclear',
    users: 180,
    modules: ['Manage', 'Health', 'Monitor', 'Safety', 'Assist'],
    deployment: {
      edition: 'Premium',
      model: 'SaaS',
      architecture: 'Dedicated'
    },
    environments: {
      prod: { size: 'XLarge', count: 1 },
      nonProd: { size: 'Large', count: 3 }
    },
    userMix: {
      premium: { concurrent: 50, authorized: 70 },
      base: { concurrent: 60, authorized: 70 },
      limited: { concurrent: 70, authorized: 40 }
    },
    appPoints: 17800,
    contractTerm: 5,
    database: 'DB2',
    addons: ['Safety', 'Assist', 'Compliance']
  }
];

const headers = [
  { key: 'name', header: 'Estimate Name' },
  { key: 'date', header: 'Date Created' },
  { key: 'industry', header: 'Industry' },
  { key: 'users', header: 'Users' },
  { key: 'appPoints', header: 'Total AppPoints' },
  { key: 'amount', header: 'Annual Cost' }
];

function MyEstimates({ onCompare, onLoadEstimate }) {
  const [internalSelectedRows, setInternalSelectedRows] = useState([]);

  const handleCompare = () => {
    const estimatesToCompare = DEMO_ESTIMATES.filter(est =>
      internalSelectedRows.includes(est.id)
    );
    onCompare(estimatesToCompare);
  };

  const handleDelete = () => {
    // In a real app, this would delete the selected estimates
    console.log('Delete estimates:', internalSelectedRows);
    alert(`Would delete ${internalSelectedRows.length} estimate(s)`);
  };

  const handleRowClick = (estimateId) => {
    const estimate = DEMO_ESTIMATES.find(est => est.id === estimateId);
    if (estimate && onLoadEstimate) {
      onLoadEstimate(estimate);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const rows = DEMO_ESTIMATES.map(estimate => ({
    id: estimate.id,
    name: estimate.name,
    date: formatDate(estimate.date),
    industry: estimate.industry,
    users: estimate.users.toLocaleString(),
    appPoints: estimate.appPoints.toLocaleString(),
    amount: formatCurrency(estimate.amount)
  }));

  return (
    <div className="my-estimates-container">
      <div className="my-estimates-header">
        <h2 className="my-estimates-title">My Estimates</h2>
        <p className="my-estimates-subtitle">
          View and manage your saved Maximo estimates. Select 2-3 estimates to compare side-by-side.
        </p>
      </div>

      <DataTable
        rows={rows}
        headers={headers}
        radio={false}
        isSortable
      >
        {({
          rows,
          headers,
          getHeaderProps,
          getRowProps,
          getSelectionProps,
          getTableProps,
          getTableContainerProps,
          selectAll,
          selectRow,
          selectedRows
        }) => {
          // Update internal state when selection changes
          const selectedIds = selectedRows.map(row => row.id);
          if (JSON.stringify(selectedIds) !== JSON.stringify(internalSelectedRows)) {
            setInternalSelectedRows(selectedIds);
          }

          return (
            <TableContainer
              {...getTableContainerProps()}
              className="estimates-table-container"
            >
              <TableToolbar>
                <TableToolbarContent>
                  <TableToolbarSearch
                    placeholder="Search estimates..."
                    persistent
                  />
                  <Button
                    kind="danger--tertiary"
                    renderIcon={TrashCan}
                    disabled={selectedRows.length === 0}
                    onClick={handleDelete}
                  >
                    Delete ({selectedRows.length})
                  </Button>
                  <Button
                    kind="primary"
                    renderIcon={Compare}
                    disabled={selectedRows.length < 2 || selectedRows.length > 3}
                    onClick={handleCompare}
                  >
                    Compare ({selectedRows.length})
                  </Button>
                </TableToolbarContent>
              </TableToolbar>
              <Table {...getTableProps()}>
                <TableHead>
                  <TableRow>
                    <TableSelectAll {...getSelectionProps()} />
                    {headers.map((header) => (
                      <TableHeader
                        key={header.key}
                        {...getHeaderProps({ header })}
                      >
                        {header.header}
                      </TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={row.id}
                      {...getRowProps({ row })}
                    >
                      <TableSelectRow {...getSelectionProps({ row })} />
                      {row.cells.map((cell) => (
                        <TableCell
                          key={cell.id}
                          onClick={(e) => {
                            // Don't trigger row click if clicking on interactive elements
                            if (!e.target.closest('input, button, a')) {
                              handleRowClick(row.id);
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                          className={cell.info.header === 'name' ? 'estimate-name-cell' : ''}
                        >
                          {cell.info.header === 'name' ? (
                            <span className="estimate-name-link">{cell.value}</span>
                          ) : (
                            cell.value
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          );
        }}
      </DataTable>
    </div>
  );
}

export default MyEstimates;

// Made with Bob
