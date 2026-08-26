import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE, WS_BASE } from '../utils/constants';

export function useNetworkState() {
  const [networkData, setNetworkData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeDecision, setActiveDecision] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const wsRef = useRef(null);

  const showToast = (message, type = 'info') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchNetwork = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/network`);
      if (res.ok) {
        const data = await res.json();
        setNetworkData(data);
        if (data.latest_decisions && data.latest_decisions.length > 0) {
          setActiveDecision(data.latest_decisions[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch network state:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNetwork();

    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(WS_BASE);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          console.log('Telemetry WebSocket connected.');
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'INITIAL_STATE' || payload.type === 'TELEMETRY_UPDATE') {
              setNetworkData(payload.data);
              if (payload.data.latest_decisions && payload.data.latest_decisions.length > 0) {
                setActiveDecision(payload.data.latest_decisions[0]);
              }
            }
          } catch (e) {
            console.error('Error parsing WS message:', e);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          setTimeout(connectWebSocket, 2000);
        };

        ws.onerror = (err) => {
          console.warn('WS Error, falling back to polling:', err);
          ws.close();
        };
      } catch (err) {
        console.error('WebSocket creation error:', err);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [fetchNetwork]);

  const triggerScenario = async (scenarioId) => {
    try {
      const res = await fetch(`${API_BASE}/api/scenario/${scenarioId}`, { method: 'POST' });
      const data = await res.json();
      showToast(`Triggered ${data.title}`, 'success');
      await fetchNetwork();
      return data;
    } catch (err) {
      showToast(`Scenario failed: ${err.message}`, 'error');
    }
  };

  const dispatchEmergency = async (payload) => {
    try {
      const res = await fetch(`${API_BASE}/api/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Dispatch failed');
      setActiveDecision(data);
      showToast(`Dispatched to ${data.selected_hospital?.name || 'Queued'}`, 'success');
      await fetchNetwork();
      return data;
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const toggleRoadBlock = async (u, v, blocked) => {
    try {
      const res = await fetch(`${API_BASE}/api/block-road`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ u, v, blocked })
      });
      const data = await res.json();
      showToast(`Road ${blocked ? 'BLOCKED' : 'OPENED'}: ${u} ↔ ${v}`, blocked ? 'warning' : 'info');
      await fetchNetwork();
      return data;
    } catch (err) {
      showToast(`Failed to toggle road: ${err.message}`, 'error');
    }
  };

  const resetNetwork = async () => {
    try {
      await fetch(`${API_BASE}/api/reset`, { method: 'POST' });
      showToast('Network reset to initial parameters', 'info');
      setActiveDecision(null);
      await fetchNetwork();
    } catch (err) {
      showToast('Reset failed', 'error');
    }
  };

  const runBenchmark = async (nodeCount = 50000, queryCount = 20) => {
    try {
      const res = await fetch(`${API_BASE}/api/benchmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node_count: nodeCount, query_count: queryCount })
      });
      return await res.json();
    } catch (err) {
      throw err;
    }
  };

  const sendDriverMessage = async (requestId, message, reportRoadBlock = false) => {
    try {
      const res = await fetch(`${API_BASE}/api/driver-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: requestId,
          message,
          report_road_block: reportRoadBlock
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Message failed');
      
      if (data.decision) {
        setActiveDecision(data.decision);
      }
      
      showToast(reportRoadBlock ? `🚧 Road blockage reported. A* recalculating detour!` : `💬 Message delivered to driver!`, reportRoadBlock ? 'warning' : 'success');
      await fetchNetwork();
      return data;
    } catch (err) {
      showToast(`Failed to send message: ${err.message}`, 'error');
    }
  };

  return {
    networkData,
    isConnected,
    loading,
    activeDecision,
    setActiveDecision,
    toastMessage,
    triggerScenario,
    dispatchEmergency,
    toggleRoadBlock,
    sendDriverMessage,
    resetNetwork,
    runBenchmark,
    fetchNetwork
  };
}
