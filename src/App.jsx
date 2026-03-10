
import React, { useState, useEffect } from 'react';

// Centralized RBAC Configuration
const ROLES = {
  SYSTEM_ADMIN: {
    canViewDashboard: true,
    canViewContracts: true,
    canManageUsers: true,
    canCreateContract: true,
    canEditContract: true,
    canApproveContract: true,
    canViewAuditLogs: true,
    canExportData: true,
    canViewDealerships: true,
    contractActions: ['EDIT', 'APPROVE', 'REJECT', 'DELETE'],
  },
  VEHICLE_OWNER: {
    canViewDashboard: true,
    canViewContracts: true,
    canManageUsers: false,
    canCreateContract: false, // Can request, but not directly create
    canEditContract: false, // Can request changes
    canApproveContract: false,
    canViewAuditLogs: true, // Limited view
    canExportData: false,
    canViewDealerships: false,
    contractActions: [], // View only
  },
  DEALERSHIP: {
    canViewDashboard: true,
    canViewContracts: true,
    canManageUsers: false,
    canCreateContract: true,
    canEditContract: true,
    canApproveContract: false, // Can propose, not approve
    canViewAuditLogs: true, // Limited view
    canExportData: true,
    canViewDealerships: true,
    contractActions: ['EDIT', 'VIEW_SERVICE_HISTORY'],
  }
};

// --- Helper Functions (defined outside/inside component as needed) ---

const getStatusColorClass = (status) => {
  switch (status) {
    case 'Approved': return 'status-approved';
    case 'In Progress': return 'status-in-progress';
    case 'Pending': return 'status-pending';
    case 'Rejected': return 'status-rejected';
    case 'Exception': return 'status-exception';
    default: return '';
  }
};

const getWorkflowMilestones = (status) => {
  const allMilestones = [
    { name: 'Initiated', status: 'Approved' },
    { name: 'Review', status: 'In Progress' },
    { name: 'Approval', status: 'Pending' },
    { name: 'Active', status: 'Approved' },
    { name: 'Completed', status: 'Approved' },
  ];

  const currentStatusIndex = allMilestones.findIndex(m => m.name === status || m.status === status); // Simplified logic
  return allMilestones.map((milestone, index) => ({
    ...milestone,
    isCompleted: index < currentStatusIndex || milestone.status === 'Approved', // Mark as completed if before or is an 'Approved' state
    isCurrent: index === currentStatusIndex || (status === 'Pending' && milestone.name === 'Approval') // More granular current logic
  }));
};


// --- Sample Data ---
const sampleContracts = [
  {
    id: 'VSC-001',
    vehicleId: 'VIN123456789',
    owner: 'Alice Smith',
    dealership: 'Grand Motors',
    contractType: 'Premium',
    startDate: '2023-01-15',
    endDate: '2025-01-15',
    status: 'Approved',
    coverage: 'Engine, Transmission, Electrical',
    premium: 1200,
    deductible: 100,
    documents: [
      { name: 'Contract Agreement.pdf', url: '/docs/contract001.pdf', type: 'PDF' },
      { name: 'Proof of Purchase.jpg', url: '/docs/purchase001.jpg', type: 'IMG' },
    ],
    lastActivity: 'Approved by System Admin on 2023-01-10',
    riskScore: 0.15,
    trend: [10, 12, 11, 13, 15, 14, 16] // Placeholder for a sparkline
  },
  {
    id: 'VSC-002',
    vehicleId: 'VIN987654321',
    owner: 'Bob Johnson',
    dealership: 'City Auto',
    contractType: 'Basic',
    startDate: '2023-03-01',
    endDate: '2024-03-01',
    status: 'Pending',
    coverage: 'Engine, Transmission',
    premium: 800,
    deductible: 200,
    documents: [
      { name: 'Service Request.pdf', url: '/docs/service002.pdf', type: 'PDF' },
    ],
    lastActivity: 'Submitted by Bob Johnson on 2023-02-28',
    riskScore: 0.30,
    trend: [8, 9, 7, 10, 9, 11, 10]
  },
  {
    id: 'VSC-003',
    vehicleId: 'VIN112233445',
    owner: 'Charlie Brown',
    dealership: 'Luxury Cars Inc.',
    contractType: 'Extended Warranty',
    startDate: '2023-02-10',
    endDate: '2026-02-10',
    status: 'In Progress',
    coverage: 'Full Vehicle',
    premium: 2500,
    deductible: 50,
    documents: [],
    lastActivity: 'Under review by Dealership on 2023-02-15',
    riskScore: 0.08,
    trend: [15, 16, 17, 18, 19, 20, 21]
  },
  {
    id: 'VSC-004',
    vehicleId: 'VIN678901234',
    owner: 'Diana Prince',
    dealership: 'Auto World',
    contractType: 'Basic',
    startDate: '2022-11-01',
    endDate: '2023-11-01',
    status: 'Rejected',
    coverage: 'Engine',
    premium: 700,
    deductible: 250,
    documents: [],
    lastActivity: 'Rejected by System Admin on 2022-11-05',
    riskScore: 0.50,
    trend: [12, 11, 10, 9, 8, 7, 6]
  },
];

const sampleUsers = [
  { id: 'usr-001', name: 'Admin User', email: 'admin@example.com', role: 'SYSTEM_ADMIN', status: 'Active' },
  { id: 'usr-002', name: 'Alice Smith', email: 'alice@example.com', role: 'VEHICLE_OWNER', status: 'Active' },
  { id: 'usr-003', name: 'Grand Motors', email: 'grandmotors@example.com', role: 'DEALERSHIP', status: 'Active' },
  { id: 'usr-004', name: 'Bob Johnson', email: 'bob@example.com', role: 'VEHICLE_OWNER', status: 'Pending' },
];

const sampleActivities = [
  { id: 1, type: 'Contract Approved', description: 'VSC-001 for Alice Smith was approved.', timestamp: '2023-10-26T10:30:00Z', actor: 'Admin User' },
  { id: 2, type: 'New Contract Submitted', description: 'VSC-002 submitted by Bob Johnson.', timestamp: '2023-10-26T09:45:00Z', actor: 'Bob Johnson' },
  { id: 3, type: 'Contract Edited', description: 'VSC-003 updated by Luxury Cars Inc.', timestamp: '2023-10-25T16:00:00Z', actor: 'Luxury Cars Inc.' },
  { id: 4, type: 'User Logged In', description: 'Admin User logged in.', timestamp: '2023-10-26T10:20:00Z', actor: 'Admin User' },
];

const sampleAuditLogs = [
  { id: 1, timestamp: '2023-10-26T10:30:00Z', actor: 'Admin User', action: 'APPROVE', target: 'VSC-001', details: 'Contract approved. Status changed from Pending to Approved.' },
  { id: 2, timestamp: '2023-10-26T09:45:00Z', actor: 'Bob Johnson', action: 'CREATE', target: 'VSC-002', details: 'New contract created. Status set to Pending.' },
  { id: 3, timestamp: '2023-10-25T16:00:00Z', actor: 'Luxury Cars Inc.', action: 'UPDATE', target: 'VSC-003', details: 'Coverage details updated. Status remains In Progress.' },
  { id: 4, timestamp: '2023-10-25T10:00:00Z', actor: 'System Automated', action: 'SLA_BREACH', target: 'VSC-002', details: 'SLA for "Review" stage breached (48h).' },
];

// --- Simple Chart Components (placeholders) ---
const Chart = ({ type, title, data }) => (
  <div style={{ padding: 'var(--spacing-md)' }}>
    <h3 style={{ fontSize: 'var(--font-size-md)', marginBottom: 'var(--spacing-sm)' }}>{title}</h3>
    <div style={{ height: '200px', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--border-radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
      {type} Chart Placeholder
    </div>
  </div>
);

// --- App Component ---
function App() {
  const [view, setView] = useState({ screen: 'DASHBOARD', params: {} });
  const [userRole, setUserRole] = useState('SYSTEM_ADMIN'); // Default role for demo
  const [contracts, setContracts] = useState(sampleContracts);
  const [users, setUsers] = useState(sampleUsers);
  const [activities, setActivities] = useState(sampleActivities);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [isEditingInline, setIsEditingInline] = useState(null); // contract ID being inline edited
  const [editedContractData, setEditedContractData] = useState({});

  const userPermissions = ROLES[userRole];

  // Global Search functionality
  const handleGlobalSearch = (query) => {
    setSearchQuery(query);
    if (view.screen !== 'CONTRACT_LIST') {
      setView({ screen: 'CONTRACT_LIST', params: { search: query } });
    }
  };

  // Card click handler for navigation
  const handleCardClick = (screen, params = {}) => {
    setView({ screen, params });
  };

  // Status Update Handler (example for detail view)
  const updateContractStatus = (contractId, newStatus) => {
    setContracts(prevContracts =>
      prevContracts.map(contract =>
        contract.id === contractId ? { ...contract, status: newStatus } : contract
      )
    );
    // Add to audit log
    const updatedContract = contracts.find(c => c.id === contractId);
    if (updatedContract) {
      const newAuditLog = {
        id: sampleAuditLogs.length + 1,
        timestamp: new Date().toISOString(),
        actor: userRole, // Use userRole string directly
        action: 'UPDATE_STATUS',
        target: contractId,
        details: `Contract status changed from ${updatedContract.status} to ${newStatus}.`
      };
      // For a demo, directly modifying sampleAuditLogs. In a real app, manage this state.
      sampleAuditLogs.push(newAuditLog);
    }
    setView({ screen: 'CONTRACT_DETAIL', params: { id: contractId } });
  };

  // Contract data filtering for Contract List screen
  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = searchQuery
      ? Object.values(contract).some(value =>
          String(value).toLowerCase().includes(searchQuery.toLowerCase())
        )
      : true;
    const matchesStatus = filterStatus === 'All' || contract.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Inline editing handlers
  const handleInlineEditChange = (contractId, field, value) => {
    setEditedContractData(prev => ({
      ...prev,
      [contractId]: {
        ...(prev[contractId] || {}),
        [field]: value
      }
    }));
  };

  const handleSaveInlineEdit = (contractId) => {
    setContracts(prevContracts =>
      prevContracts.map(contract =>
        contract.id === contractId ? { ...contract, ...editedContractData[contractId] } : contract
      )
    );
    setIsEditingInline(null);
    setEditedContractData(prev => {
      const newEdited = { ...prev };
      delete newEdited[contractId];
      return newEdited;
    });
  };

  const handleCancelInlineEdit = () => {
    setIsEditingInline(null);
    setEditedContractData({});
  };

  // Breadcrumbs logic
  const getBreadcrumbs = () => {
    const crumbs = [{ label: 'Dashboard', screen: 'DASHBOARD' }];
    if (view.screen === 'CONTRACT_LIST') {
      crumbs.push({ label: 'Service Contracts', screen: 'CONTRACT_LIST' });
    } else if (view.screen === 'CONTRACT_DETAIL') {
      crumbs.push({ label: 'Service Contracts', screen: 'CONTRACT_LIST' });
      const contract = contracts.find(c => c.id === view.params.id);
      crumbs.push({ label: contract?.id || 'Detail', screen: 'CONTRACT_DETAIL', params: view.params });
    } else if (view.screen === 'CONTRACT_EDIT') {
      crumbs.push({ label: 'Service Contracts', screen: 'CONTRACT_LIST' });
      const contract = contracts.find(c => c.id === view.params.id);
      crumbs.push({ label: contract?.id || 'Detail', screen: 'CONTRACT_DETAIL', params: { id: view.params.id } });
      crumbs.push({ label: 'Edit', screen: 'CONTRACT_EDIT', params: view.params });
    } else if (view.screen === 'CONTRACT_CREATE') {
      crumbs.push({ label: 'Service Contracts', screen: 'CONTRACT_LIST' });
      crumbs.push({ label: 'Create New', screen: 'CONTRACT_CREATE' });
    }
    else if (view.screen === 'USER_MANAGEMENT') {
      crumbs.push({ label: 'User Management', screen: 'USER_MANAGEMENT' });
    }
    return crumbs;
  };

  const currentPageTitle = {
    DASHBOARD: 'Dashboard',
    CONTRACT_LIST: 'Vehicle Service Contracts',
    CONTRACT_DETAIL: `Contract: ${contracts.find(c => c.id === view.params.id)?.id || 'Detail'}`,
    CONTRACT_EDIT: `Edit Contract: ${contracts.find(c => c.id === view.params.id)?.id || 'Detail'}`,
    CONTRACT_CREATE: 'Create New Contract',
    USER_MANAGEMENT: 'User Management',
  }[view.screen];

  // Main UI Structure
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
      {/* App Header */}
      <header className="app-header glassmorphism">
        <div className="logo" style={{ color: 'var(--primary-accent)' }}>VSC Management</div>
        <nav className="app-nav flex gap-md">
          {userPermissions.canViewDashboard && (
            <a href="#" className={view.screen === 'DASHBOARD' ? 'active' : ''} onClick={() => handleCardClick('DASHBOARD')}>
              <span className="icon icon-dashboard" style={{ marginRight: 'var(--spacing-xs)' }}></span> Dashboard
            </a>
          )}
          {userPermissions.canViewContracts && (
            <a href="#" className={view.screen.startsWith('CONTRACT') ? 'active' : ''} onClick={() => handleCardClick('CONTRACT_LIST')}>
              <span className="icon icon-contract" style={{ marginRight: 'var(--spacing-xs)' }}></span> Contracts
            </a>
          )}
          {userPermissions.canManageUsers && (
            <a href="#" className={view.screen === 'USER_MANAGEMENT' ? 'active' : ''} onClick={() => handleCardClick('USER_MANAGEMENT')}>
              <span className="icon icon-users" style={{ marginRight: 'var(--spacing-xs)' }}></span> Users
            </a>
          )}
        </nav>
        <div className="search-bar">
          <span className="icon icon-search"></span>
          <input
            type="text"
            placeholder="Global Search (Contracts, Vehicles, Owners...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleGlobalSearch(searchQuery);
            }}
            style={{ paddingLeft: 'calc(var(--spacing-sm) + 20px)' }}
          />
        </div>
      </header>

      {/* Breadcrumbs */}
      <div className="breadcrumbs">
        {getBreadcrumbs().map((crumb, index, arr) => (
          <React.Fragment key={crumb.screen}>
            {index > 0 && <span>/</span>}
            {index < arr.length - 1 ? (
              <a href="#" onClick={() => handleCardClick(crumb.screen, crumb.params)}>
                {crumb.label}
              </a>
            ) : (
              <span className="current">{crumb.label}</span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Main Content Area */}
      <main style={{ flexGrow: 1, padding: 'var(--spacing-lg) 0' }}>
        <div className="container">
          {/* Dashboard Screen */}
          {view.screen === 'DASHBOARD' && userPermissions.canViewDashboard && (
            <section className="dashboard">
              <h2 className="dashboard-section-header" style={{ marginBottom: 'var(--spacing-xl)' }}>Welcome, {userRole.replace('_', ' ')}!</h2>

              {/* Summary Cards */}
              <div className="dashboard-grid">
                <div className="card" onClick={() => handleCardClick('CONTRACT_LIST', { status: 'All' })} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <h3 className="card-header">Total Contracts</h3>
                  <p style={{ fontSize: 'var(--font-size-xxl)', fontWeight: 'bold', color: 'var(--primary-accent)' }}>{contracts.length}</p>
                  <p className="card-meta">All active and archived contracts.</p>
                  <div style={{ height: '50px', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--border-radius-sm)', marginTop: 'var(--spacing-md)' }}>
                    {/* Placeholder for sparkline/trend */}
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>📈 Last 7 days trend</span>
                  </div>
                </div>

                <div className="card" onClick={() => handleCardClick('CONTRACT_LIST', { status: 'Pending' })}>
                  <h3 className="card-header">Pending Approvals</h3>
                  <p style={{ fontSize: 'var(--font-size-xxl)', fontWeight: 'bold', color: 'var(--warning-orange)' }}>{contracts.filter(c => c.status === 'Pending').length}</p>
                  <p className="card-meta">Contracts awaiting your review.</p>
                  {/* Dynamic Visual Hierarchy: if more pending, card might be slightly larger or have a more prominent border */}
                </div>

                <div className="card" onClick={() => handleCardClick('CONTRACT_LIST', { status: 'In Progress' })}>
                  <h3 className="card-header">In Progress Contracts</h3>
                  <p style={{ fontSize: 'var(--font-size-xxl)', fontWeight: 'bold', color: 'var(--info-blue)' }}>{contracts.filter(c => c.status === 'In Progress').length}</p>
                  <p className="card-meta">Contracts actively being processed.</p>
                </div>

                <div className="card">
                  <h3 className="card-header">Contracts Expiring Soon</h3>
                  <p style={{ fontSize: 'var(--font-size-xxl)', fontWeight: 'bold', color: 'var(--danger-red)' }}>
                    {contracts.filter(c => new Date(c.endDate) < new Date(new Date().setMonth(new Date().getMonth() + 3)) && c.status === 'Approved').length}
                  </p>
                  <p className="card-meta">Within the next 3 months.</p>
                </div>
              </div>

              {/* Charts */}
              <h2 className="dashboard-section-header">Contract Overview</h2>
              <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
                <div className="chart-container"><Chart type="Bar" title="Contracts by Type" data={[]} /></div>
                <div className="chart-container"><Chart type="Donut" title="Contract Status Distribution" data={[]} /></div>
                <div className="chart-container" style={{ gridColumn: 'span 2' }}><Chart type="Line" title="New Contracts Over Time" data={[]} /></div>
              </div>

              {/* Recent Activities */}
              <h2 className="dashboard-section-header">Recent Activities</h2>
              <div className="detail-section realtime-pulse" style={{ animationDelay: '2s' }}> {/* subtle pulse for real-time feel */}
                <div className="activity-feed">
                  {activities.slice(0, 5).map(activity => (
                    <div className="activity-item" key={activity.id}>
                      <span className="icon icon-history activity-icon"></span>
                      <p className="activity-text">
                        <strong>{activity.actor}:</strong> {activity.description}
                      </p>
                      <span className="activity-time">{new Date(activity.timestamp).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Contract List Screen */}
          {view.screen === 'CONTRACT_LIST' && userPermissions.canViewContracts && (
            <section className="contract-list">
              <h1 style={{ fontSize: 'var(--font-size-xxl)', marginBottom: 'var(--spacing-xl)' }}>{currentPageTitle}</h1>

              <div className="grid-controls">
                <div className="grid-search" style={{ position: 'relative' }}>
                  <span className="icon icon-search" style={{ position: 'absolute', left: 'var(--spacing-sm)', top: '50%', transform: 'translateY(-50%)' }}></span>
                  <input
                    type="text"
                    placeholder="Search Contracts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: 'calc(var(--spacing-sm) + 20px)' }}
                  />
                </div>
                <div className="flex gap-sm">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="btn btn-secondary"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Approved">Approved</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Pending">Pending</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Exception">Exception</option>
                  </select>
                  <button className="btn btn-secondary"><span className="icon icon-filter"></span> Filter</button>
                  <button className="btn btn-secondary"><span className="icon icon-sort"></span> Sort</button>
                  {userPermissions.canExportData && (
                    <button className="btn btn-secondary"><span className="icon icon-export"></span> Export</button>
                  )}
                  {userPermissions.canCreateContract && (
                    <button className="btn btn-primary" onClick={() => handleCardClick('CONTRACT_CREATE')}>
                      <span className="icon icon-plus"></span> New Contract
                    </button>
                  )}
                </div>
              </div>

              {filteredContracts.length === 0 ? (
                <div className="empty-state">
                  <span className="icon icon-contract empty-state-icon"></span>
                  <h3>No Contracts Found</h3>
                  <p>It looks like there are no contracts matching your current criteria. Try adjusting your search or filters.</p>
                  {userPermissions.canCreateContract && (
                    <button className="btn btn-primary" onClick={() => handleCardClick('CONTRACT_CREATE')}>
                      <span className="icon icon-plus"></span> Create New Contract
                    </button>
                  )}
                </div>
              ) : (
                <div className="data-grid">
                  {filteredContracts.map(contract => (
                    <div
                      key={contract.id}
                      className="card grid-card"
                      onClick={() => isEditingInline !== contract.id && handleCardClick('CONTRACT_DETAIL', { id: contract.id })}
                      style={{ borderLeft: `5px solid var(--${getStatusColorClass(contract.status).replace('status-', '')}-border)` }}
                    >
                      <div className="card-content">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                          <h3 className="card-header">{contract.id}</h3>
                          <span className={`status-badge ${getStatusColorClass(contract.status)}`}>{contract.status}</span>
                        </div>
                        <p className="text-sm text-secondary" style={{ marginBottom: 'var(--spacing-xs)' }}>
                          Vehicle: <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>{contract.vehicleId}</span>
                        </p>
                        <p className="text-sm text-secondary">
                          Owner: <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>{contract.owner}</span>
                        </p>
                        <p className="text-sm text-secondary">
                          Dealership: <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>{contract.dealership}</span>
                        </p>
                        <p className="text-sm text-secondary" style={{ marginTop: 'var(--spacing-xs)' }}>
                          Expires: <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>{contract.endDate}</span>
                        </p>
                        <div className="hover-actions">
                          {userPermissions.contractActions.includes('EDIT') && (
                            <>
                              {isEditingInline === contract.id ? (
                                <>
                                  <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); handleSaveInlineEdit(contract.id); }} title="Save"><span className="icon icon-save"></span></button>
                                  <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); handleCancelInlineEdit(); }} title="Cancel"><span className="icon icon-cancel"></span></button>
                                </>
                              ) : (
                                <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); setIsEditingInline(contract.id); setEditedContractData({ [contract.id]: { ...contract } }); }} title="Edit Inline"><span className="icon icon-edit"></span></button>
                              )}
                            </>
                          )}
                          {userPermissions.contractActions.includes('DELETE') && (
                            <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); /* handle delete */ }} title="Delete"><span className="icon icon-delete"></span></button>
                          )}
                        </div>
                        {isEditingInline === contract.id && (
                          <div style={{ marginTop: 'var(--spacing-md)', paddingTop: 'var(--spacing-md)', borderTop: 'var(--border-width) solid var(--border-light)' }}>
                            <div className="form-group">
                              <label>Owner</label>
                              <input
                                type="text"
                                value={editedContractData[contract.id]?.owner || ''}
                                onChange={(e) => handleInlineEditChange(contract.id, 'owner', e.target.value)}
                                className="inline-edit-field"
                              />
                            </div>
                            <div className="form-group">
                              <label>Status</label>
                              <select
                                value={editedContractData[contract.id]?.status || ''}
                                onChange={(e) => handleInlineEditChange(contract.id, 'status', e.target.value)}
                                className="inline-edit-field"
                              >
                                <option value="Approved">Approved</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Pending">Pending</option>
                                <option value="Rejected">Rejected</option>
                                <option value="Exception">Exception</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Contract Detail Screen */}
          {view.screen === 'CONTRACT_DETAIL' && userPermissions.canViewContracts && (
            <section className="contract-detail">
              {(() => {
                const contract = contracts.find(c => c.id === view.params.id);
                if (!contract) return <p>Contract not found.</p>;

                const milestones = getWorkflowMilestones(contract.status);

                return (
                  <>
                    <div className="detail-header">
                      <h1 style={{ fontSize: 'var(--font-size-xxl)' }}>{contract.id}</h1>
                      <div className="flex gap-sm">
                        {userPermissions.contractActions.includes('APPROVE') && contract.status === 'Pending' && (
                          <button className="btn btn-primary" onClick={() => updateContractStatus(contract.id, 'Approved')}>
                            <span className="icon icon-check"></span> Approve
                          </button>
                        )}
                        {userPermissions.contractActions.includes('REJECT') && contract.status === 'Pending' && (
                          <button className="btn btn-secondary" style={{ backgroundColor: 'var(--danger-red)', color: 'var(--bg-card)' }} onClick={() => updateContractStatus(contract.id, 'Rejected')}>
                            <span className="icon icon-error"></span> Reject
                          </button>
                        )}
                        {userPermissions.contractActions.includes('EDIT') && (
                          <button className="btn btn-secondary" onClick={() => handleCardClick('CONTRACT_EDIT', { id: contract.id })}>
                            <span className="icon icon-edit"></span> Edit
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Record Summary */}
                    <div className="detail-section">
                      <h2 className="detail-section-title">Summary Information</h2>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-md)' }}>
                        <div className="detail-item"><span className="detail-item-label">Status:</span> <span className={`status-badge ${getStatusColorClass(contract.status)}`}>{contract.status}</span></div>
                        <div className="detail-item"><span className="detail-item-label">Owner:</span> <span className="detail-item-value">{contract.owner}</span></div>
                        <div className="detail-item"><span className="detail-item-label">Vehicle ID:</span> <span className="detail-item-value">{contract.vehicleId}</span></div>
                        <div className="detail-item"><span className="detail-item-label">Dealership:</span> <span className="detail-item-value">{contract.dealership}</span></div>
                        <div className="detail-item"><span className="detail-item-label">Contract Type:</span> <span className="detail-item-value">{contract.contractType}</span></div>
                        <div className="detail-item"><span className="detail-item-label">Start Date:</span> <span className="detail-item-value">{contract.startDate}</span></div>
                        <div className="detail-item"><span className="detail-item-label">End Date:</span> <span className="detail-item-value">{contract.endDate}</span></div>
                        <div className="detail-item"><span className="detail-item-label">Premium:</span> <span className="detail-item-value">${contract.premium?.toLocaleString()}</span></div>
                        <div className="detail-item"><span className="detail-item-label">Deductible:</span> <span className="detail-item-value">${contract.deductible?.toLocaleString()}</span></div>
                        <div className="detail-item" style={{ gridColumn: 'span 2' }}><span className="detail-item-label">Coverage:</span> <span className="detail-item-value">{contract.coverage}</span></div>
                      </div>
                    </div>

                    {/* Milestone Tracker (Workflow Progress) */}
                    <div className="detail-section">
                      <h2 className="detail-section-title">Workflow Progress</h2>
                      <div className="milestone-tracker">
                        {milestones.map((milestone, index) => (
                          <div
                            key={index}
                            className="milestone-step"
                          >
                            <div className={`milestone-circle ${milestone.isCompleted ? 'completed' : ''} ${milestone.isCurrent ? 'current' : ''}`}>
                              {milestone.isCompleted && <span className="icon icon-check"></span>}
                              {milestone.isCurrent && <span className="icon icon-workflow"></span>}
                              {!milestone.isCompleted && !milestone.isCurrent && index + 1}
                            </div>
                            <span className="milestone-label">{milestone.name}</span>
                          </div>
                        ))}
                      </div>
                      <p style={{ marginTop: 'var(--spacing-lg)', fontSize: 'var(--font-size-sm)', color: 'var(--danger-red)', fontWeight: '600' }}>
                          <span className="icon icon-alert" style={{ marginRight: 'var(--spacing-xs)' }}></span> SLA for 'Review' stage: 1 day overdue.
                      </p>
                    </div>

                    {/* Related Records (Conceptual) */}
                    <div className="detail-section">
                      <h2 className="detail-section-title">Related Records</h2>
                      <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                        <div className="card" style={{ width: '200px', padding: 'var(--spacing-md)', border: 'var(--border-width) solid var(--border-light)' }} onClick={() => {/* navigate to vehicle detail */}}>
                          <h4 style={{ fontSize: 'var(--font-size-md)', marginBottom: 'var(--spacing-xs)' }}>Vehicle: {contract.vehicleId}</h4>
                          <p className="text-sm text-secondary">Make: Toyota, Model: Camry</p>
                        </div>
                        <div className="card" style={{ width: '200px', padding: 'var(--spacing-md)', border: 'var(--border-width) solid var(--border-light)' }} onClick={() => {/* navigate to owner detail */}}>
                          <h4 style={{ fontSize: 'var(--font-size-md)', marginBottom: 'var(--spacing-xs)' }}>Owner: {contract.owner}</h4>
                          <p className="text-sm text-secondary">Email: alice@example.com</p>
                        </div>
                      </div>
                    </div>

                    {/* Documents */}
                    <div className="detail-section">
                      <h2 className="detail-section-title">Documents</h2>
                      {contract.documents?.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
                          {contract.documents.map((doc, index) => (
                            <div
                              key={index}
                              className="card"
                              style={{ width: '150px', height: '150px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
                              onClick={() => window.open(doc.url, '_blank')}
                            >
                              <span style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--spacing-sm)' }}>{doc.type === 'PDF' ? '📄' : '🖼️'}</span>
                              <p className="text-sm" style={{ fontWeight: '500', lineHeight: '1.2' }}>{doc.name}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-secondary">No documents uploaded.</p>
                      )}
                    </div>

                    {/* News/Audit Feed */}
                    <div className="detail-section">
                      <h2 className="detail-section-title">Audit Log / News Feed</h2>
                      <div className="audit-feed">
                        {sampleAuditLogs
                           .filter(log => log.target === contract.id && userPermissions.canViewAuditLogs)
                           .slice(0).reverse().map(log => ( // show most recent first
                          <div className="audit-item" key={log.id}>
                            <div className="audit-timestamp">{new Date(log.timestamp).toLocaleString()}</div>
                            <div className="audit-details">
                              <span className="user">{log.actor}</span> {log.details}
                            </div>
                          </div>
                        ))}
                        {sampleAuditLogs.filter(log => log.target === contract.id && userPermissions.canViewAuditLogs).length === 0 && (
                          <p className="text-secondary">No audit entries for this contract.</p>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </section>
          )}

          {/* Contract Edit Screen */}
          {view.screen === 'CONTRACT_EDIT' && userPermissions.canEditContract && (
            <section className="contract-edit">
              {(() => {
                const contract = contracts.find(c => c.id === view.params.id);
                if (!contract) return <p>Contract not found.</p>;

                const [formData, setFormData] = useState(contract);
                const [errors, setErrors] = useState({});
                const [file, setFile] = useState(null);

                // Initialize formData with contract data on component mount or contract ID change
                useEffect(() => {
                  if (contract) {
                    setFormData(contract);
                    setErrors({}); // Clear errors when contract changes
                  }
                }, [contract]);

                const handleChange = (e) => {
                  const { name, value } = e.target;
                  setFormData(prev => ({ ...prev, [name]: value }));
                  setErrors(prev => ({ ...prev, [name]: '' })); // Clear error on change
                };

                const handleFileChange = (e) => {
                  setFile(e.target.files?.[0]);
                };

                const validateForm = () => {
                  let newErrors = {};
                  if (!formData.owner?.trim()) newErrors.owner = 'Owner is mandatory.';
                  if (!formData.dealership?.trim()) newErrors.dealership = 'Dealership is mandatory.';
                  if (!formData.contractType?.trim()) newErrors.contractType = 'Contract Type is mandatory.';
                  if (!formData.startDate?.trim()) newErrors.startDate = 'Start Date is mandatory.';
                  if (!formData.endDate?.trim()) newErrors.endDate = 'End Date is mandatory.';
                  if (!formData.vehicleId?.trim()) newErrors.vehicleId = 'Vehicle ID is mandatory.';
                  if (isNaN(formData.premium) || formData.premium < 0) newErrors.premium = 'Premium must be a non-negative number.';
                  if (isNaN(formData.deductible) || formData.deductible < 0) newErrors.deductible = 'Deductible must be a non-negative number.';
                  // More validations can be added (e.g., date formats, premium/deductible numbers)
                  setErrors(newErrors);
                  return Object.keys(newErrors).length === 0;
                };

                const handleSubmit = (e) => {
                  e.preventDefault();
                  if (validateForm()) {
                    // Simulate API call to save updated contract
                    setContracts(prevContracts =>
                      prevContracts.map(c => (c.id === formData.id ? { ...formData } : c))
                    );
                    // Simulate file upload
                    if (file) {
                      console.log('Uploading file:', file.name);
                      // In a real app, integrate with file storage service
                      // Add new document to contract.documents array
                      const newDoc = {
                          name: file.name,
                          url: `/docs/${file.name}`, // Placeholder URL
                          type: file.type.startsWith('image/') ? 'IMG' : 'PDF' // Basic type detection
                      };
                      setContracts(prevContracts =>
                          prevContracts.map(c =>
                              c.id === formData.id ? { ...c, documents: [...(c.documents || []), newDoc] } : c
                          )
                      );
                    }
                    // Add an audit log entry for the update
                    const newAuditLog = {
                        id: sampleAuditLogs.length + 1,
                        timestamp: new Date().toISOString(),
                        actor: userRole,
                        action: 'UPDATE',
                        target: formData.id,
                        details: `Contract ${formData.id} updated by ${userRole}.`
                    };
                    sampleAuditLogs.push(newAuditLog);

                    console.log('Contract updated:', formData);
                    handleCardClick('CONTRACT_DETAIL', { id: contract.id });
                  } else {
                      console.log('Validation errors:', errors);
                  }
                };

                const handleCancel = () => {
                  handleCardClick('CONTRACT_DETAIL', { id: contract.id });
                };

                return (
                  <div className="detail-section">
                    <h1 className="detail-section-title" style={{ fontSize: 'var(--font-size-xxl)', marginBottom: 'var(--spacing-xl)' }}>Edit Contract: {contract.id}</h1>
                    <form onSubmit={handleSubmit}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-xl)' }}>
                        <div>
                          <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--spacing-md)' }}>Contract Details</h3>
                          <div className="form-group">
                            <label htmlFor="owner">Owner <span style={{ color: 'var(--danger-red)' }}>*</span></label>
                            <input
                              type="text"
                              id="owner"
                              name="owner"
                              value={formData.owner || ''}
                              onChange={handleChange}
                              placeholder="Vehicle owner name"
                              required
                            />
                            {errors.owner && <p className="error-message">{errors.owner}</p>}
                          </div>
                          <div className="form-group">
                            <label htmlFor="dealership">Dealership <span style={{ color: 'var(--danger-red)' }}>*</span></label>
                            <input
                              type="text"
                              id="dealership"
                              name="dealership"
                              value={formData.dealership || ''}
                              onChange={handleChange}
                              placeholder="Dealership name"
                              required
                            />
                            {errors.dealership && <p className="error-message">{errors.dealership}</p>}
                          </div>
                          <div className="form-group">
                            <label htmlFor="contractType">Contract Type <span style={{ color: 'var(--danger-red)' }}>*</span></label>
                            <select
                              id="contractType"
                              name="contractType"
                              value={formData.contractType || ''}
                              onChange={handleChange}
                              required
                            >
                              <option value="">Select Type</option>
                              <option value="Premium">Premium</option>
                              <option value="Basic">Basic</option>
                              <option value="Extended Warranty">Extended Warranty</option>
                            </select>
                            {errors.contractType && <p className="error-message">{errors.contractType}</p>}
                          </div>
                          <div className="form-group">
                            <label htmlFor="vehicleId">Vehicle ID (VIN) <span style={{ color: 'var(--danger-red)' }}>*</span></label>
                            <input
                              type="text"
                              id="vehicleId"
                              name="vehicleId"
                              value={formData.vehicleId || ''}
                              onChange={handleChange}
                              placeholder="Auto-populated or entered VIN"
                              required
                            />
                            {errors.vehicleId && <p className="error-message">{errors.vehicleId}</p>}
                          </div>
                          <div className="form-group">
                            <label htmlFor="coverage">Coverage Details</label>
                            <textarea
                              id="coverage"
                              name="coverage"
                              value={formData.coverage || ''}
                              onChange={handleChange}
                              rows="3"
                              placeholder="Describe the coverage details"
                            ></textarea>
                          </div>
                        </div>

                        <div>
                          <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--spacing-md)' }}>Financials & Dates</h3>
                          <div className="form-group">
                            <label htmlFor="startDate">Start Date <span style={{ color: 'var(--danger-red)' }}>*</span></label>
                            <input
                              type="date"
                              id="startDate"
                              name="startDate"
                              value={formData.startDate || ''}
                              onChange={handleChange}
                              required
                            />
                            {errors.startDate && <p className="error-message">{errors.startDate}</p>}
                          </div>
                          <div className="form-group">
                            <label htmlFor="endDate">End Date <span style={{ color: 'var(--danger-red)' }}>*</span></label>
                            <input
                              type="date"
                              id="endDate"
                              name="endDate"
                              value={formData.endDate || ''}
                              onChange={handleChange}
                              required
                            />
                            {errors.endDate && <p className="error-message">{errors.endDate}</p>}
                          </div>
                          <div className="form-group">
                            <label htmlFor="premium">Premium ($)</label>
                            <input
                              type="number"
                              id="premium"
                              name="premium"
                              value={formData.premium || ''}
                              onChange={handleChange}
                              placeholder="Contract premium"
                            />
                            {errors.premium && <p className="error-message">{errors.premium}</p>}
                          </div>
                          <div className="form-group">
                            <label htmlFor="deductible">Deductible ($)</label>
                            <input
                              type="number"
                              id="deductible"
                              name="deductible"
                              value={formData.deductible || ''}
                              onChange={handleChange}
                              placeholder="Contract deductible"
                            />
                            {errors.deductible && <p className="error-message">{errors.deductible}</p>}
                          </div>

                          <div className="form-group">
                            <label htmlFor="documentUpload">Upload Document</label>
                            <input
                              type="file"
                              id="documentUpload"
                              name="documentUpload"
                              onChange={handleFileChange}
                              style={{ border: 'none', padding: '0', background: 'none', cursor: 'pointer' }}
                            />
                            {file && <p className="text-sm text-secondary" style={{ marginTop: 'var(--spacing-xs)' }}>Selected: {file.name}</p>}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-xl)' }}>
                        <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                          <span className="icon icon-cancel"></span> Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                          <span className="icon icon-save"></span> Save Changes
                        </button>
                      </div>
                    </form>
                  </div>
                );
              })()}
            </section>
          )}

          {/* Contract Create Screen (NEW) */}
          {view.screen === 'CONTRACT_CREATE' && userPermissions.canCreateContract && (
            <section className="contract-create">
              {(() => {
                const [formData, setFormData] = useState({
                  id: '', // Will be generated
                  vehicleId: '',
                  owner: '',
                  dealership: '',
                  contractType: '',
                  startDate: '',
                  endDate: '',
                  status: 'Pending', // Default status for new contracts
                  coverage: '',
                  premium: 0,
                  deductible: 0,
                  documents: [],
                  lastActivity: `Created by ${userRole} on ${new Date().toISOString().split('T')[0]}`,
                  riskScore: 0.2, // Default risk score
                  trend: [] // Empty trend for new contracts
                });
                const [errors, setErrors] = useState({});
                const [file, setFile] = useState(null);

                const handleChange = (e) => {
                  const { name, value } = e.target;
                  setFormData(prev => ({ ...prev, [name]: value }));
                  setErrors(prev => ({ ...prev, [name]: '' }));
                };

                const handleFileChange = (e) => {
                  setFile(e.target.files?.[0]);
                };

                const validateForm = () => {
                  let newErrors = {};
                  if (!formData.owner?.trim()) newErrors.owner = 'Owner is mandatory.';
                  if (!formData.dealership?.trim()) newErrors.dealership = 'Dealership is mandatory.';
                  if (!formData.contractType?.trim()) newErrors.contractType = 'Contract Type is mandatory.';
                  if (!formData.startDate?.trim()) newErrors.startDate = 'Start Date is mandatory.';
                  if (!formData.endDate?.trim()) newErrors.endDate = 'End Date is mandatory.';
                  if (!formData.vehicleId?.trim()) newErrors.vehicleId = 'Vehicle ID is mandatory.';
                  if (isNaN(formData.premium) || formData.premium < 0) newErrors.premium = 'Premium must be a non-negative number.';
                  if (isNaN(formData.deductible) || formData.deductible < 0) newErrors.deductible = 'Deductible must be a non-negative number.';
                  setErrors(newErrors);
                  return Object.keys(newErrors).length === 0;
                };

                const handleSubmit = (e) => {
                  e.preventDefault();
                  if (validateForm()) {
                    const newContractId = `VSC-${String(contracts.length + 1).padStart(3, '0')}`; // Simple ID generation
                    const newContract = {
                      ...formData,
                      id: newContractId,
                      // Add file if uploaded
                      documents: file ? [{
                          name: file.name,
                          url: `/docs/${file.name}`,
                          type: file.type.startsWith('image/') ? 'IMG' : 'PDF'
                      }] : [],
                      lastActivity: `Created by ${userRole} on ${new Date().toISOString().split('T')[0]}`
                    };

                    setContracts(prevContracts => [...prevContracts, newContract]);

                    // Add to audit log
                    const newAuditLog = {
                        id: sampleAuditLogs.length + 1,
                        timestamp: new Date().toISOString(),
                        actor: userRole,
                        action: 'CREATE',
                        target: newContract.id,
                        details: `New contract ${newContract.id} created by ${userRole}.`
                    };
                    sampleAuditLogs.push(newAuditLog);

                    console.log('New Contract Created:', newContract);
                    handleCardClick('CONTRACT_DETAIL', { id: newContract.id }); // Navigate to new contract's detail
                  } else {
                      console.log('Validation errors:', errors);
                  }
                };

                const handleCancel = () => {
                  handleCardClick('CONTRACT_LIST'); // Go back to contract list
                };

                return (
                  <div className="detail-section">
                    <h1 className="detail-section-title" style={{ fontSize: 'var(--font-size-xxl)', marginBottom: 'var(--spacing-xl)' }}>Create New Contract</h1>
                    <form onSubmit={handleSubmit}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-xl)' }}>
                        <div>
                          <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--spacing-md)' }}>Contract Details</h3>
                          <div className="form-group">
                            <label htmlFor="owner">Owner <span style={{ color: 'var(--danger-red)' }}>*</span></label>
                            <input
                              type="text"
                              id="owner"
                              name="owner"
                              value={formData.owner || ''}
                              onChange={handleChange}
                              placeholder="Vehicle owner name"
                              required
                            />
                            {errors.owner && <p className="error-message">{errors.owner}</p>}
                          </div>
                          <div className="form-group">
                            <label htmlFor="dealership">Dealership <span style={{ color: 'var(--danger-red)' }}>*</span></label>
                            <input
                              type="text"
                              id="dealership"
                              name="dealership"
                              value={formData.dealership || ''}
                              onChange={handleChange}
                              placeholder="Dealership name"
                              required
                            />
                            {errors.dealership && <p className="error-message">{errors.dealership}</p>}
                          </div>
                          <div className="form-group">
                            <label htmlFor="contractType">Contract Type <span style={{ color: 'var(--danger-red)' }}>*</span></label>
                            <select
                              id="contractType"
                              name="contractType"
                              value={formData.contractType || ''}
                              onChange={handleChange}
                              required
                            >
                              <option value="">Select Type</option>
                              <option value="Premium">Premium</option>
                              <option value="Basic">Basic</option>
                              <option value="Extended Warranty">Extended Warranty</option>
                            </select>
                            {errors.contractType && <p className="error-message">{errors.contractType}</p>}
                          </div>
                          <div className="form-group">
                            <label htmlFor="vehicleId">Vehicle ID (VIN) <span style={{ color: 'var(--danger-red)' }}>*</span></label>
                            <input
                              type="text"
                              id="vehicleId"
                              name="vehicleId"
                              value={formData.vehicleId || ''}
                              onChange={handleChange}
                              placeholder="Enter Vehicle Identification Number"
                              required
                            />
                            {errors.vehicleId && <p className="error-message">{errors.vehicleId}</p>}
                          </div>
                          <div className="form-group">
                            <label htmlFor="coverage">Coverage Details</label>
                            <textarea
                              id="coverage"
                              name="coverage"
                              value={formData.coverage || ''}
                              onChange={handleChange}
                              rows="3"
                              placeholder="Describe the coverage details"
                            ></textarea>
                          </div>
                        </div>

                        <div>
                          <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--spacing-md)' }}>Financials & Dates</h3>
                          <div className="form-group">
                            <label htmlFor="startDate">Start Date <span style={{ color: 'var(--danger-red)' }}>*</span></label>
                            <input
                              type="date"
                              id="startDate"
                              name="startDate"
                              value={formData.startDate || ''}
                              onChange={handleChange}
                              required
                            />
                            {errors.startDate && <p className="error-message">{errors.startDate}</p>}
                          </div>
                          <div className="form-group">
                            <label htmlFor="endDate">End Date <span style={{ color: 'var(--danger-red)' }}>*</span></label>
                            <input
                              type="date"
                              id="endDate"
                              name="endDate"
                              value={formData.endDate || ''}
                              onChange={handleChange}
                              required
                            />
                            {errors.endDate && <p className="error-message">{errors.endDate}</p>}
                          </div>
                          <div className="form-group">
                            <label htmlFor="premium">Premium ($)</label>
                            <input
                              type="number"
                              id="premium"
                              name="premium"
                              value={formData.premium || ''}
                              onChange={handleChange}
                              placeholder="Contract premium"
                            />
                            {errors.premium && <p className="error-message">{errors.premium}</p>}
                          </div>
                          <div className="form-group">
                            <label htmlFor="deductible">Deductible ($)</label>
                            <input
                              type="number"
                              id="deductible"
                              name="deductible"
                              value={formData.deductible || ''}
                              onChange={handleChange}
                              placeholder="Contract deductible"
                            />
                            {errors.deductible && <p className="error-message">{errors.deductible}</p>}
                          </div>

                          <div className="form-group">
                            <label htmlFor="documentUpload">Upload Document</label>
                            <input
                              type="file"
                              id="documentUpload"
                              name="documentUpload"
                              onChange={handleFileChange}
                              style={{ border: 'none', padding: '0', background: 'none', cursor: 'pointer' }}
                            />
                            {file && <p className="text-sm text-secondary" style={{ marginTop: 'var(--spacing-xs)' }}>Selected: {file.name}</p>}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-xl)' }}>
                        <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                          <span className="icon icon-cancel"></span> Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                          <span className="icon icon-plus"></span> Create Contract
                        </button>
                      </div>
                    </form>
                  </div>
                );
              })()}
            </section>
          )}

          {/* User Management Screen (Admin Only) */}
          {view.screen === 'USER_MANAGEMENT' && userPermissions.canManageUsers && (
            <section className="user-management">
              <h1 style={{ fontSize: 'var(--font-size-xxl)', marginBottom: 'var(--spacing-xl)' }}>User Management</h1>
              <div className="grid-controls">
                <div className="grid-search" style={{ position: 'relative' }}>
                  <span className="icon icon-search" style={{ position: 'absolute', left: 'var(--spacing-sm)', top: '50%', transform: 'translateY(-50%)' }}></span>
                  <input
                    type="text"
                    placeholder="Search Users..."
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: 'calc(var(--spacing-sm) + 20px)' }}
                  />
                </div>
                <div className="flex gap-sm">
                  <button className="btn btn-secondary"><span className="icon icon-filter"></span> Filter</button>
                  <button className="btn btn-secondary"><span className="icon icon-sort"></span> Sort</button>
                  <button className="btn btn-primary"><span className="icon icon-plus"></span> New User</button>
                </div>
              </div>

              {users.length === 0 ? (
                <div className="empty-state">
                  <span className="icon icon-users empty-state-icon"></span>
                  <h3>No Users Found</h3>
                  <p>It looks like there are no users in the system.</p>
                  <button className="btn btn-primary" onClick={() => {/* handle create new user */}}>
                      <span className="icon icon-plus"></span> Add New User
                  </button>
                </div>
              ) : (
                <div className="data-grid">
                  {users.filter(user =>
                    Object.values(user).some(val => String(val).toLowerCase().includes(searchQuery.toLowerCase()))
                  ).map(user => (
                    <div key={user.id} className="card grid-card">
                      <div className="card-content">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                          <h3 className="card-header">{user.name}</h3>
                          <span className={`status-badge ${getStatusColorClass(user.status === 'Active' ? 'Approved' : 'Pending')}`}>{user.status}</span>
                        </div>
                        <p className="text-sm text-secondary" style={{ marginBottom: 'var(--spacing-xs)' }}>
                          Email: <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>{user.email}</span>
                        </p>
                        <p className="text-sm text-secondary">
                          Role: <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>{user.role}</span>
                        </p>
                        <div className="hover-actions">
                          <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); /* handle edit user */ }} title="Edit User"><span className="icon icon-edit"></span></button>
                          <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); /* handle deactivate user */ }} title="Deactivate"><span className="icon icon-error"></span></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Fallback for unauthorized/not found screens */}
          {(() => {
              const isScreenAuthorized = (
                  (view.screen === 'DASHBOARD' && userPermissions.canViewDashboard) ||
                  (view.screen === 'CONTRACT_LIST' && userPermissions.canViewContracts) ||
                  (view.screen === 'CONTRACT_DETAIL' && userPermissions.canViewContracts) ||
                  (view.screen === 'CONTRACT_EDIT' && userPermissions.canEditContract) ||
                  (view.screen === 'CONTRACT_CREATE' && userPermissions.canCreateContract) ||
                  (view.screen === 'USER_MANAGEMENT' && userPermissions.canManageUsers)
              );

              if (!isScreenAuthorized) {
                  return (
                      <div className="empty-state">
                          <span className="icon icon-error empty-state-icon"></span>
                          <h3>Access Denied</h3>
                          <p>You do not have permission to view this page, or the page does not exist.</p>
                          <button className="btn btn-primary" onClick={() => handleCardClick('DASHBOARD')}>Go to Dashboard</button>
                      </div>
                  );
              }
              return null;
          })()}
        </div>
      </main>
    </div>
  );
}

export default App;