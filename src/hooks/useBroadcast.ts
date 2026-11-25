import { useEffect, useRef, useCallback } from 'react';
import { fetchLiveRoom, pushLiveRoom } from '../lib/api';
import type { BroadcastMsg } from '../types';

interface UseBroadcastOptions {
  /** Bật nhận cập nhật từ Backend API (dùng cho trang Overlay khi chạy khác máy) */
  remoteListen?: boolean;
}

/**
 * Hook đồng bộ trạng thái giữa trang Control và Màn hình chiếu:
 * - Cùng máy: BroadcastChannel (0ms)
 * - Khác máy: đồng bộ qua Backend API /api/live (không lưu dữ liệu trên frontend)
 */
export function useBroadcast(
  channelName: string,
  options: UseBroadcastOptions = {}
) {
  const { remoteListen = false } = options;
  const bcRef = useRef<BroadcastChannel | null>(null);
  const listenersRef = useRef<Set<(msg: BroadcastMsg) => void>>(new Set());
  const pushTimerRef = useRef<number | null>(null);
  const lastRemoteUpdateRef = useRef<string>('');

  useEffect(() => {
    try {
      bcRef.current = new BroadcastChannel(channelName);
      bcRef.current.onmessage = (e: MessageEvent<BroadcastMsg>) => {
        listenersRef.current.forEach((fn) => fn(e.data));
      };
    } catch {
      bcRef.current = null;
    }

    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
      bcRef.current?.close();
    };
  }, [channelName]);

  // Nếu là Overlay: đồng bộ định kỳ từ Backend API để hỗ trợ điều khiển khác máy
  useEffect(() => {
    if (!remoteListen) return;
    let active = true;

    const pull = async () => {
      const snap = await fetchLiveRoom(channelName);
      if (!active || !snap?.payload) return;
      if (snap.updated_at && snap.updated_at === lastRemoteUpdateRef.current) return;
      lastRemoteUpdateRef.current = snap.updated_at || '';

      const msg: BroadcastMsg = {
        type: snap.event_type,
        payload: snap.payload,
        timestamp: Date.now(),
      };
      listenersRef.current.forEach((fn) => fn(msg));
    };

    pull();
    const timer = window.setInterval(pull, 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [channelName, remoteListen]);

  const send = useCallback(
    (type: string, payload: any) => {
      const msg: BroadcastMsg = { type, payload, timestamp: Date.now() };
      bcRef.current?.postMessage(msg);

      if (type === 'request-sync') {
        fetchLiveRoom(channelName).then((snap) => {
          if (snap?.payload) {
            lastRemoteUpdateRef.current = snap.updated_at || '';
            const snapMsg: BroadcastMsg = {
              type: snap.event_type,
              payload: snap.payload,
              timestamp: Date.now(),
            };
            listenersRef.current.forEach((fn) => fn(snapMsg));
          }
        });
        return;
      }

      const game: 'lq' | 'valorant' = channelName.startsWith('lq')
        ? 'lq'
        : 'valorant';

      if (type === 'val-spin-start') {
        if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
        pushLiveRoom(channelName, game, type, payload);
        return;
      }

      if (type === 'lq-sync' || type === 'val-sync') {
        if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
        pushTimerRef.current = window.setTimeout(() => {
          pushLiveRoom(channelName, game, type, payload);
        }, 450);
      }
    },
    [channelName]
  );

  const subscribe = useCallback((fn: (msg: BroadcastMsg) => void) => {
    listenersRef.current.add(fn);
    return () => {
      listenersRef.current.delete(fn);
    };
  }, []);

  return { send, subscribe };
}
