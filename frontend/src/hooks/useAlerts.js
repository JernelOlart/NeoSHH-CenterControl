import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook to monitor server alerts:
 * - Server offline (online -> offline transition)
 * - Disk usage > 80% (metrics.primaryDisk.percent)
 * - RAM usage > 90% (metrics.memory.percent)
 *
 * Provides auto-dismiss after 10s, desktop notifications, and alert queue management.
 */
export function useAlerts(servers = []) {
  const [alerts, setAlerts] = useState([]);
  const prevServersRef = useRef({});
  const notifiedKeysRef = useRef(new Set()); // Prevents spamming duplicate alerts every cycle

  // Request browser notification permission once on trigger
  const triggerBrowserNotification = useCallback((title, body) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/favicon.ico' });
      } catch (_) {
        // Notification API fallback
      }
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          try {
            new Notification(title, { body, icon: '/favicon.ico' });
          } catch (_) {}
        }
      });
    }
  }, []);

  const addAlert = useCallback((alertItem) => {
    const id = `${alertItem.type}-${alertItem.serverId}-${Date.now()}`;
    const newAlert = {
      id,
      timestamp: Date.now(),
      ...alertItem
    };

    setAlerts((prev) => [newAlert, ...prev].slice(0, 20));

    // Desktop notification
    triggerBrowserNotification(
      alertItem.type === 'offline' ? 'NeoShh: Servidor Offline' : 'NeoShh: Alerta del Sistema',
      alertItem.message
    );

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    }, 10000);
  }, [triggerBrowserNotification]);

  const checkServers = useCallback(() => {
    if (!Array.isArray(servers) || servers.length === 0) return;

    const currentMap = {};
    const now = Date.now();

    // Clean up stale notified keys older than 2 minutes
    // To allow re-alerting if condition persists after 2 minutes
    servers.forEach((s) => {
      currentMap[s.id] = s;
      const prev = prevServersRef.current[s.id];

      // 1. Status changed from online to offline
      if (prev && prev.status === 'online' && s.status === 'offline') {
        const key = `offline-${s.id}`;
        if (!notifiedKeysRef.current.has(key)) {
          notifiedKeysRef.current.add(key);
          addAlert({
            type: 'offline',
            serverId: s.id,
            serverName: s.name,
            message: `Servidor offline: ${s.name}`,
            severity: 'critical'
          });
        }
      } else if (s.status === 'online') {
        // Clear offline flag if it came back online
        notifiedKeysRef.current.delete(`offline-${s.id}`);
      }

      // Check resource thresholds only for online servers
      if (s.status === 'online' && s.metrics) {
        // 2. Disk usage > 80%
        const diskPercent = parseFloat(s.metrics?.primaryDisk?.percent ?? s.metrics?.disk?.percent ?? 0);
        const diskKey = `disk-${s.id}`;
        if (diskPercent > 80) {
          if (!notifiedKeysRef.current.has(diskKey)) {
            notifiedKeysRef.current.add(diskKey);
            addAlert({
              type: 'disk',
              serverId: s.id,
              serverName: s.name,
              percent: Math.round(diskPercent),
              message: `Disco crítico en ${s.name}: ${Math.round(diskPercent)}% usado`,
              severity: 'warning'
            });
          }
        } else {
          notifiedKeysRef.current.delete(diskKey);
        }

        // 3. RAM usage > 90%
        const ramPercent = parseFloat(s.metrics?.memory?.percent ?? 0);
        const ramKey = `ram-${s.id}`;
        if (ramPercent > 90) {
          if (!notifiedKeysRef.current.has(ramKey)) {
            notifiedKeysRef.current.add(ramKey);
            addAlert({
              type: 'ram',
              serverId: s.id,
              serverName: s.name,
              percent: Math.round(ramPercent),
              message: `RAM crítica en ${s.name}: ${Math.round(ramPercent)}% usada`,
              severity: 'warning'
            });
          }
        } else {
          notifiedKeysRef.current.delete(ramKey);
        }
      }
    });

    prevServersRef.current = currentMap;
  }, [servers, addAlert]);

  // Check whenever servers change
  useEffect(() => {
    checkServers();
  }, [servers, checkServers]);

  // Periodic polling every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // Allow periodic reminder if still in critical state
      notifiedKeysRef.current.clear();
      checkServers();
    }, 30000);

    return () => clearInterval(interval);
  }, [checkServers]);

  const dismissAlert = useCallback((id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return {
    alerts,
    dismissAlert,
    clearAlerts
  };
}

export default useAlerts;
