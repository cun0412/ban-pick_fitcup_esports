import { useEffect, useRef, useCallback } from 'react';
import { fetchLiveRoom, pushLiveRoom } from '../lib/api';
import type { BroadcastMsg } from '../types';

interface UseBroadcastOptions {
  /** Bật nhận cập nhật từ Backend API (dùng cho trang Overlay khi chạy khác máy / OBS) */
  remoteListen?: boolean;
}

function stripSyncMeta(payload: any): any {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;
  if (!('_tabId' in payload) && !('_seq' in payload)) return payload;
  const { _tabId: _ignoredTab, _seq: _ignoredSeq, ...rest } = payload;
  return rest;
}

/**
 * Hook đồng bộ trạng thái giữa trang Control và Màn hình chiếu:
 * - Cùng trình duyệt: BroadcastChannel (0ms)
 * - Khác máy / OBS: đồng bộ qua Backend API /api/live với hàng đợi tuần tự và polling nhẹ
 */
export function useBroadcast(
  channelName: string,
  options: UseBroadcastOptions = {}
) {
  const { remoteListen = false } = options;
  const bcRef = useRef<BroadcastChannel | null>(null);
  const listenersRef = useRef<Set<(msg: BroadcastMsg) => void>>(new Set());
  const pushTimerRef = useRef<number | null>(null);
  const pushInFlightRef = useRef(false);
  const pendingPushRef = useRef<{
    game: 'lq' | 'valorant';
    type: string;
    payload: any;
  } | null>(null);

  const lastRemoteUpdateRef = useRef<string>('');
  const tabIdRef = useRef<string>(Math.random().toString(36).slice(2, 10));
  const seqRef = useRef<number>(0);
  const seenSeqByTabRef = useRef<Map<string, number>>(new Map());

  const recordAndCheckFresh = useCallback((payload: any): boolean => {
    if (!payload || typeof payload !== 'object') return true;
    const tabId = payload._tabId;
    const seq = payload._seq;
    if (typeof tabId !== 'string' || typeof seq !== 'number') return true;
    const prev = seenSeqByTabRef.current.get(tabId) ?? 0;
    if (seq <= prev) return false;
    seenSeqByTabRef.current.set(tabId, seq);
    return true;
  }, []);

  const deliverSnapshot = useCallback(
    (snap: { event_type?: string; payload?: any; updated_at?: string; unchanged?: boolean } | null) => {
      if (!snap || snap.unchanged || !snap.payload || !snap.event_type) return;
      if (snap.updated_at && snap.updated_at === lastRemoteUpdateRef.current) return;
      lastRemoteUpdateRef.current = snap.updated_at || '';

      if (!recordAndCheckFresh(snap.payload)) return;

      const msg: BroadcastMsg = {
        type: snap.event_type,
        payload: stripSyncMeta(snap.payload),
        timestamp: Date.now(),
      };
      listenersRef.current.forEach((fn) => fn(msg));
    },
    [recordAndCheckFresh]
  );

  const flushPushQueue = useCallback(async () => {
    if (pushInFlightRef.current) return;
    pushInFlightRef.current = true;
    try {
      while (pendingPushRef.current) {
        const next = pendingPushRef.current;
        pendingPushRef.current = null;
        await pushLiveRoom(channelName, next.game, next.type, next.payload);
      }
    } finally {
      pushInFlightRef.current = false;
    }
  }, [channelName]);

  useEffect(() => {
    try {
      bcRef.current = new BroadcastChannel(channelName);
      bcRef.current.onmessage = (e: MessageEvent<BroadcastMsg>) => {
        const data = e.data;
        if (!data) return;
        recordAndCheckFresh(data.payload);
        listenersRef.current.forEach((fn) =>
          fn({
            ...data,
            payload: stripSyncMeta(data.payload),
          })
        );
      };
    } catch {
      bcRef.current = null;
    }

    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
      bcRef.current?.close();
    };
  }, [channelName, recordAndCheckFresh]);

  // Nếu là Overlay: polling tuần tự (không chồng request) mỗi 300ms qua ?since= để siêu nhẹ
  useEffect(() => {
    if (!remoteListen) return;
    let active = true;
    let timerId: number | null = null;

    const loop = async () => {
      if (!active) return;
      const snap = await fetchLiveRoom(
        channelName,
        lastRemoteUpdateRef.current || undefined
      );
      if (!active) return;
      deliverSnapshot(snap);
      if (active) {
        timerId = window.setTimeout(loop, 300);
      }
    };

    loop();
    return () => {
      active = false;
      if (timerId !== null) clearTimeout(timerId);
    };
  }, [channelName, remoteListen, deliverSnapshot]);

  const send = useCallback(
    (type: string, payload: any) => {
      if (type === 'request-sync') {
        const msg: BroadcastMsg = { type, payload, timestamp: Date.now() };
        bcRef.current?.postMessage(msg);
        fetchLiveRoom(channelName).then((snap) => {
          deliverSnapshot(snap);
        });
        return;
      }

      const nextSeq = ++seqRef.current;
      const wirePayload =
        payload && typeof payload === 'object' && !Array.isArray(payload)
          ? { ...payload, _tabId: tabIdRef.current, _seq: nextSeq }
          : payload;

      // Gửi tức thì 0ms qua BroadcastChannel cho các tab cùng trình duyệt
      bcRef.current?.postMessage({
        type,
        payload: wirePayload,
        timestamp: Date.now(),
      });

      const game: 'lq' | 'valorant' = channelName.startsWith('lq')
        ? 'lq'
        : 'valorant';

      if (type === 'val-spin-start') {
        if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
        pendingPushRef.current = { game, type, payload: wirePayload };
        flushPushQueue();
        return;
      }

      if (type === 'lq-sync' || type === 'val-sync') {
        if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
        pendingPushRef.current = { game, type, payload: wirePayload };
        // Gom các cập nhật đồng bộ trong 1 frame (35ms) rồi đẩy ngay theo hàng đợi
        pushTimerRef.current = window.setTimeout(() => {
          flushPushQueue();
        }, 35);
      }
    },
    [channelName, deliverSnapshot, flushPushQueue]
  );

  const subscribe = useCallback((fn: (msg: BroadcastMsg) => void) => {
    listenersRef.current.add(fn);
    return () => {
      listenersRef.current.delete(fn);
    };
  }, []);

  return { send, subscribe };
}
