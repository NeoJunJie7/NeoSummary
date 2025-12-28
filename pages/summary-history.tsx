// pages/summary-history.tsx
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { auth } from '../lib/firebase-client';
import { onAuthStateChanged } from 'firebase/auth';

interface SummaryItem {
  id: string;
  title: string;
  originalText: string;
  summaryText: string;
  config: any;
  timestamp: any;
}

export default function SummaryHistory() {
  const [user, setUser] = useState<any | null>(null);
  const [summaries, setSummaries] = useState<SummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<SummaryItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const router = useRouter();

  // Listen for auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Fetch summaries when user is available
  useEffect(() => {
    if (!user) return;

    const fetchSummaries = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/get-summaries?userId=${user.uid}`);
        const text = await response.text(); 
        console.log("RAW SERVER RESPONSE:", text);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch summaries');
        }

        setSummaries(data.summaries || []);
      } catch (err: any) {
        console.error('Error fetching summaries:', err);
        setError(err.message || 'Failed to load summaries');
      } finally {
        setLoading(false);
      }
    };

    fetchSummaries();
  }, [user]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === summaries.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(summaries.map((s) => s.id));
    }
  };

  const handleDelete = async (summaryId: string) => {
    if (!confirm('Are you sure you want to delete this summary?')) return;

    try {
      const response = await fetch('/api/delete-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, summaryId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete summary');
      }

      // Remove from local state
      setSummaries(prev => prev.filter(s => s.id !== summaryId));
      if (selectedSummary?.id === summaryId) {
        setSelectedSummary(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete summary');
    }
  };

  const handleBulkDelete = async () => {
    if (!user || selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} selected summaries?`)) return;

    try {
      const response = await fetch('/api/delete-summaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, summaryIds: selectedIds }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete selected summaries');
      }

      const deletedIds: string[] = data.deletedIds || selectedIds;

      setSummaries((prev) => prev.filter((s) => !deletedIds.includes(s.id)));
      setSelectedIds([]);
      if (selectedSummary && deletedIds.includes(selectedSummary.id)) {
        setSelectedSummary(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete selected summaries');
    }
  };

  const handleRestore = (summary: SummaryItem) => {
    // Store the summary data in localStorage for the main page to restore
    localStorage.setItem('restoredSummary', JSON.stringify({
      inputText: summary.originalText,
      summaryResult: summary.summaryText
    }));
    router.push('/');
  };

  const formatDate = (ts: any) => {
    if (!ts && ts !== 0) return 'Unknown date';
    try {
      if (typeof ts === 'number') return new Date(ts).toLocaleString();
      if (ts?.toDate) return ts.toDate().toLocaleString();
      if (ts?._seconds) return new Date(ts._seconds * 1000).toLocaleString();
      return new Date(ts).toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <button onClick={() => router.push('/')} style={backButtonStyle}>
            ← Back to Home
          </button>
          <h1 style={{ margin: 0 }}>Summary History</h1>
        </div>
        <div style={loadingStyle}>Loading your summaries...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <button onClick={() => router.push('/')} style={backButtonStyle}>
            ← Back to Home
          </button>
          <h1 style={{ margin: 0 }}>Summary History</h1>
        </div>
        <div style={errorStyle}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <button onClick={() => router.push('/')} style={backButtonStyle}>
          ← Back to Home
        </button>
        <h1 style={{ margin: 0 }}>Summary History</h1>
      </div>

      {summaries.length === 0 ? (
        <div style={emptyStateStyle}>
          <p style={{ fontSize: '18px', color: '#666' }}>No saved summaries yet.</p>
          <p style={{ fontSize: '14px', color: '#999' }}>
            Create and save summaries from the main page to see them here.
          </p>
        </div>
      ) : (
        <div style={contentStyle}>
          {/* List of summaries */}
          <div style={listContainerStyle}>
            <h2 style={{ marginBottom: '15px', fontSize: '18px' }}>
              Your Summaries ({summaries.length})
            </h2>
            {/* Bulk actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedIds.length > 0 && selectedIds.length === summaries.length}
                  // @ts-ignore
                  indeterminate={selectedIds.length > 0 && selectedIds.length < summaries.length}
                  onChange={toggleSelectAll}
                />
                <span>Select all</span>
              </label>
              <button
                onClick={handleBulkDelete}
                disabled={selectedIds.length === 0}
                style={{
                  padding: '6px 10px',
                  backgroundColor: selectedIds.length === 0 ? '#ccc' : '#d9534f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: selectedIds.length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                }}
              >
                Delete selected
              </button>
            </div>
            <div style={listStyle}>
              {summaries.map((summary) => (
                <div
                  key={summary.id}
                  style={{
                    ...listItemStyle,
                    backgroundColor: selectedSummary?.id === summary.id ? '#f0f8ff' : 'white'
                  }}
                  onClick={() => setSelectedSummary(summary)}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(summary.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelect(summary.id);
                    }}
                    style={{ marginRight: 8 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={titleStyle}>{summary.title}</div>
                    <div style={dateStyle}>{formatDate(summary.timestamp)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(summary);
                      }}
                      style={restoreButtonStyle}
                      title="Restore to main page"
                    >
                      ↻
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(summary.id);
                      }}
                      style={deleteButtonStyle}
                      title="Delete"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detail view */}
          <div style={detailContainerStyle}>
            {selectedSummary ? (
              <>
                <h2 style={{ marginBottom: '15px', fontSize: '18px' }}>
                  {selectedSummary.title}
                </h2>
                <div style={detailDateStyle}>
                  {formatDate(selectedSummary.timestamp)}
                </div>

                <div style={sectionStyle}>
                  <h3 style={sectionTitleStyle}>Original Text</h3>
                  <div style={textBoxStyle}>{selectedSummary.originalText}</div>
                </div>

                <div style={sectionStyle}>
                  <h3 style={sectionTitleStyle}>Summary</h3>
                  <div 
                    style={textBoxStyle}
                    dangerouslySetInnerHTML={{ __html: selectedSummary.summaryText }}
                  />
                </div>

                {selectedSummary.config && Object.keys(selectedSummary.config).length > 0 && (
                  <div style={configStyle}>
                    <strong>Settings:</strong> Length: {selectedSummary.config.lengthPercent}%
                  </div>
                )}
              </>
            ) : (
              <div style={noSelectionStyle}>
                Select a summary from the list to view details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#f5f5f5',
  fontFamily: 'Arial, sans-serif'
};

const headerStyle: React.CSSProperties = {
  backgroundColor: 'white',
  padding: '20px',
  borderBottom: '1px solid #ddd',
  display: 'flex',
  alignItems: 'center',
  gap: '20px'
};

const backButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: '#666',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '14px'
};

const loadingStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '40px',
  fontSize: '16px',
  color: '#666'
};

const errorStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '40px',
  fontSize: '16px',
  color: '#d9534f'
};

const emptyStateStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '60px 20px'
};

const contentStyle: React.CSSProperties = {
  display: 'flex',
  height: 'calc(100vh - 100px)',
  gap: '20px',
  padding: '20px'
};

const listContainerStyle: React.CSSProperties = {
  width: '350px',
  backgroundColor: 'white',
  borderRadius: '8px',
  padding: '20px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  display: 'flex',
  flexDirection: 'column'
};

const listStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px'
};

const listItemStyle: React.CSSProperties = {
  padding: '15px',
  border: '1px solid #e0e0e0',
  borderRadius: '6px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  display: 'flex',
  alignItems: 'center',
  gap: '10px'
};

const titleStyle: React.CSSProperties = {
  fontWeight: 'bold',
  fontSize: '14px',
  marginBottom: '5px',
  color: '#333'
};

const dateStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#999'
};

const restoreButtonStyle: React.CSSProperties = {
  padding: '6px 10px',
  backgroundColor: '#4CAF50',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '16px'
};

const deleteButtonStyle: React.CSSProperties = {
  padding: '6px 10px',
  backgroundColor: '#d9534f',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '14px'
};

const detailContainerStyle: React.CSSProperties = {
  flex: 1,
  backgroundColor: 'white',
  borderRadius: '8px',
  padding: '20px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  overflowY: 'auto'
};

const detailDateStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#999',
  marginBottom: '20px'
};

const sectionStyle: React.CSSProperties = {
  marginBottom: '25px'
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: 'bold',
  marginBottom: '10px',
  color: '#555'
};

const textBoxStyle: React.CSSProperties = {
  padding: '15px',
  backgroundColor: '#f9f9f9',
  border: '1px solid #e0e0e0',
  borderRadius: '4px',
  fontSize: '14px',
  lineHeight: '1.6',
  whiteSpace: 'pre-wrap',
  wordWrap: 'break-word'
};

const configStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#666',
  padding: '10px',
  backgroundColor: '#f0f0f0',
  borderRadius: '4px'
};

const noSelectionStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '60px 20px',
  color: '#999',
  fontSize: '16px'
};