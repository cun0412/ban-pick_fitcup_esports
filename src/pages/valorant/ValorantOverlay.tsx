import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import OverlayWrapper from '../../components/common/OverlayWrapper';
import HudCorners from '../../components/common/HudCorners';
import MapCard from '../../components/valorant/MapCard';
import SpinWheel from '../../components/valorant/SpinWheel';
import SlotMachine from '../../components/valorant/SlotMachine';
import CardFlip from '../../components/valorant/CardFlip';
import SpinCelebration from '../../components/valorant/SpinCelebration';
import { useBroadcast } from '../../hooks/useBroadcast';
import { useAudio } from '../../hooks/useAudio';
import { getPhasesForBo, type PreSpinBan } from '../../stores/valorantStore';
import { useSettingsStore } from '../../stores/settingsStore';
import valorantMapsRaw from '../../data/valorant-maps.json';
import type {
  BoType,
  SpinConfig,
  SpinResult,
  SpinStyle,
  TeamConfig,
  ValorantMap,
  VetoEntry,
  VetoPhase,
} from '../../types';

interface ValOverlayState {
  mode: 'veto' | 'spin';
  boType: BoType;
  maps: ValorantMap[];
  vetoPhases: VetoPhase[];
  currentVetoIndex: number;
  vetoHistory: VetoEntry[];
  vetoComplete: boolean;
  spinConfig: SpinConfig;
  spinResults: SpinResult[];
  preSpinBans?: PreSpinBan[];
  teamA: TeamConfig;
  teamB: TeamConfig;
  tournamentName: string;
  roundName: string;
  overlayBg?: 'transparent' | 'chroma' | 'dark';
}

interface ActiveSpinAnim {
  targetMapId: string;
  poolMaps: ValorantMap[];
  duration: number;
  style: SpinStyle;
  mapNumber: number;
  triggerId: number;
}

function getInitialValOverlay(): ValOverlayState {
  const settings = useSettingsStore.getState();
  return {
    mode: 'veto',
    boType: 'bo3',
    maps: valorantMapsRaw as ValorantMap[],
    vetoPhases: getPhasesForBo('bo3'),
    currentVetoIndex: 0,
    vetoHistory: [],
    vetoComplete: false,
    spinConfig: {
      style: 'wheel',
      duration: 5,
      excludePicked: true,
      boType: 'bo3',
      spinPool: 'all',
      customPool: [],
      banBeforeSpin: false,
      bansPerTeam: 1,
      autoSpinAll: false,
      autoSpinDelay: 2,
      allowRespin: false,
    },
    spinResults: [],
    preSpinBans: [],
    teamA: settings.teamA,
    teamB: settings.teamB,
    tournamentName: settings.tournamentName,
    roundName: settings.roundName,
    overlayBg: settings.overlayBg,
  };
}

/**
 * Màn hình Overlay 1920x1080 - Valorant Esports Broadcast HUD
 * Bố cục 1 hình to (Spotlight Splash) + các hình bé (Minimap, Thẻ dọc, Lịch trình Map & Map Pool)
 * Kèm hiệu ứng pháo sáng, vòng xung kích & ánh sáng quét khi quay xong
 */
export default function ValorantOverlay() {
  const [searchParams] = useSearchParams();
  const { send, subscribe } = useBroadcast('val-channel', { remoteListen: true });
  const { playTick, playFanfare } = useAudio();
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);

  const [state, setState] = useState<ValOverlayState>(getInitialValOverlay);
  const [spinAnim, setSpinAnim] = useState<ActiveSpinAnim | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [winnerSpotlight, setWinnerSpotlight] = useState<{
    map: ValorantMap;
    mapNumber: number;
  } | null>(null);

  const bgParam = searchParams.get('bg') as 'transparent' | 'chroma' | 'dark' | null;
  const effectiveBg = bgParam || state.overlayBg || 'dark';
  const showAmbientDarkBg = effectiveBg === 'dark';

  useEffect(() => {
    const unsub = subscribe((msg) => {
      if (msg.type === 'val-sync' && msg.payload) {
        const next = msg.payload as ValOverlayState;
        setState(next);
        if (!next.spinResults || next.spinResults.length === 0) {
          setWinnerSpotlight(null);
        }
      } else if (msg.type === 'val-spin-start' && msg.payload) {
        const triggeredAt = msg.payload.triggeredAt as number | undefined;
        if (triggeredAt && Date.now() - triggeredAt > 5000) return;
        setWinnerSpotlight(null);
        setCelebrating(false);
        setSpinAnim({
          targetMapId: msg.payload.targetMapId,
          poolMaps: msg.payload.poolMaps,
          duration: msg.payload.duration,
          style: msg.payload.style,
          mapNumber: msg.payload.mapNumber,
          triggerId: Date.now(),
        });
        setIsSpinning(true);
      }
    });
    send('request-sync', {});
    return unsub;
  }, [subscribe, send]);

  const handleSpinFinish = () => {
    setIsSpinning(false);
    if (soundEnabled) playFanfare();
    setCelebrating(true);
    setTimeout(() => setCelebrating(false), 3200);

    if (spinAnim) {
      const won = state.maps.find((m) => m.id === spinAnim.targetMapId);
      if (won) {
        setWinnerSpotlight({ map: won, mapNumber: spinAnim.mapNumber });
      }
    }
  };

  const vetoMapLookup = useMemo(() => {
    const m = new Map<string, VetoEntry>();
    state.vetoHistory.forEach((entry) => m.set(entry.mapId, entry));
    return m;
  }, [state.vetoHistory]);

  const enabledMaps = state.maps.filter((m) => m.enabled);
  const currentPhase =
    !state.vetoComplete && state.currentVetoIndex < state.vetoPhases.length
      ? state.vetoPhases[state.currentVetoIndex]
      : null;

  const pickedAndDecider = state.vetoHistory.filter(
    (v) => v.action === 'pick' || v.action === 'decider'
  );

  const targetSpinCount =
    state.spinConfig.boType === 'bo1'
      ? 1
      : state.spinConfig.boType === 'bo5'
      ? 5
      : 3;

  const featuredSpinResult = useMemo(() => {
    if (winnerSpotlight) {
      const matchedResult = state.spinResults.find(
        (r) => r.mapNumber === winnerSpotlight.mapNumber
      );
      return {
        map: winnerSpotlight.map,
        mapNumber: winnerSpotlight.mapNumber,
        side: matchedResult?.side,
      };
    }
    if (state.spinResults.length > 0) {
      const last = state.spinResults[state.spinResults.length - 1];
      const mapObj = state.maps.find((m) => m.id === last.mapId);
      if (mapObj) {
        return {
          map: mapObj,
          mapNumber: last.mapNumber,
          side: last.side,
        };
      }
    }
    return null;
  }, [winnerSpotlight, state.spinResults, state.maps]);

  const spinPickedSet = useMemo(
    () => new Set(state.spinResults.map((r) => r.mapId)),
    [state.spinResults]
  );

  const preBanMapLookup = useMemo(() => {
    const m = new Map<string, PreSpinBan>();
    (state.preSpinBans || []).forEach((b) => m.set(b.mapId, b));
    return m;
  }, [state.preSpinBans]);

  return (
    <OverlayWrapper bgOverride={state.overlayBg}>
      <div className="w-full h-full flex flex-col justify-between px-12 py-8 relative text-white overflow-hidden">
        {/* Chỉ hiển thị lưới tactical & ánh sáng nền khi dùng nền tối (giữ nguyên transparency khi ?bg=transparent/chroma) */}
        {showAmbientDarkBg && (
          <>
            <div
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
                backgroundSize: '64px 64px',
              }}
            />
            <div className="pointer-events-none absolute -top-28 -left-28 w-[480px] h-[480px] rounded-full bg-[#3185FF]/15 blur-[135px]" />
            <div className="pointer-events-none absolute -top-28 -right-28 w-[480px] h-[480px] rounded-full bg-[#FF343F]/15 blur-[135px]" />
            <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[820px] h-[220px] rounded-full bg-[#FF4057]/10 blur-[120px]" />
          </>
        )}

        {/* Header: Team A (xanh #3185FF) — Giải đấu — Team B (đỏ #FF343F) */}
        <header className="relative z-10 flex items-center justify-between gap-6">
          {/* Team A: 6-8px radius + viền xanh & ánh sáng cạnh trái */}
          <div className="flex items-center gap-4 px-5 py-3 rounded-[7px] bg-[#0b1018]/92 hud-team-blue flex-1 max-w-[520px] min-w-0 relative">
            <div className="w-16 h-16 rounded-[6px] bg-black/60 border border-[#3185FF]/45 flex items-center justify-center overflow-hidden shrink-0">
              {state.teamA.logo ? (
                <img src={state.teamA.logo} alt="" className="w-full h-full object-contain p-1.5" />
              ) : (
                <span className="font-display font-black text-2xl text-[#3185FF]">
                  {state.teamA.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-display font-bold uppercase tracking-[0.28em] text-[#3185FF]">
                TEAM A
              </div>
              <div className="font-display font-black text-3xl tracking-wider truncate">
                {state.teamA.name}
              </div>
            </div>
          </div>

          {/* Giữa: Thông tin giải đấu */}
          <div className="text-center px-10 py-3 rounded-[10px] bg-[#0b1018]/94 hud-neon-red relative shrink-0 max-w-[600px]">
            <HudCorners color="#FF4057" size={10} offset={5} />
            <div className="font-display font-black text-3xl tracking-widest text-white uppercase">
              {state.tournamentName}
            </div>
            <div className="flex items-center justify-center gap-3 mt-1">
              <span className="h-[1px] w-7 bg-[#FF4057]" />
              <span className="font-display font-bold text-base tracking-[0.22em] text-[#FF4057] uppercase">
                {state.roundName} • {state.mode === 'spin' ? state.spinConfig.boType.toUpperCase() : state.boType.toUpperCase()}
              </span>
              <span className="h-[1px] w-7 bg-[#FF4057]" />
            </div>
          </div>

          {/* Team B: 6-8px radius + viền đỏ & ánh sáng cạnh phải */}
          <div className="flex flex-row-reverse items-center gap-4 px-5 py-3 rounded-[7px] bg-[#0b1018]/92 hud-team-red flex-1 max-w-[520px] min-w-0 text-right relative">
            <div className="w-16 h-16 rounded-[6px] bg-black/60 border border-[#FF343F]/45 flex items-center justify-center overflow-hidden shrink-0">
              {state.teamB.logo ? (
                <img src={state.teamB.logo} alt="" className="w-full h-full object-contain p-1.5" />
              ) : (
                <span className="font-display font-black text-2xl text-[#FF343F]">
                  {state.teamB.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-display font-bold uppercase tracking-[0.28em] text-[#FF343F]">
                TEAM B
              </div>
              <div className="font-display font-black text-3xl tracking-wider truncate">
                {state.teamB.name}
              </div>
            </div>
          </div>
        </header>

        {/* Nội dung chính */}
        <main className="relative z-10 flex-1 flex flex-col justify-center py-4">
          {state.mode === 'veto' ? (
            /* ===== CHẾ ĐỘ VETO ===== */
            <div className="flex flex-col items-center justify-center gap-7">
              {!state.vetoComplete && currentPhase && (
                <div className="px-10 py-3 rounded-[9px] bg-[#0b1018]/92 hud-neon-red text-center relative">
                  <HudCorners color="#FF4057" size={9} offset={5} />
                  <span className="font-display font-black text-2xl tracking-wider">
                    <span
                      style={{
                        color: currentPhase.team === 'A' ? '#3185FF' : '#FF343F',
                      }}
                    >
                      {currentPhase.team === 'A' ? state.teamA.name : state.teamB.name}
                    </span>{' '}
                    —{' '}
                    {currentPhase.action === 'ban'
                      ? 'ĐANG CẤM MAP (BAN)'
                      : currentPhase.action === 'pick'
                      ? 'ĐANG CHỌN MAP (PICK)'
                      : 'ĐANG CHỌN BÊN (ATTACK / DEFENSE)'}
                  </span>
                </div>
              )}

              {!state.vetoComplete ? (
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  {enabledMaps.map((m) => {
                    const entry = vetoMapLookup.get(m.id);
                    const status = entry
                      ? entry.action === 'ban'
                        ? 'banned'
                        : entry.action === 'decider'
                        ? 'decider'
                        : 'picked'
                      : 'available';
                    const teamObj = entry
                      ? entry.team === 'A'
                        ? state.teamA
                        : state.teamB
                      : undefined;
                    const sideTeamObj = entry?.sideTeam
                      ? entry.sideTeam === 'A'
                        ? state.teamA
                        : state.teamB
                      : undefined;

                    return (
                      <MapCard
                        key={m.id}
                        map={m}
                        status={status}
                        banTeamName={teamObj?.name}
                        banTeamLogo={teamObj?.logo}
                        banTeamColor={entry?.team === 'A' ? '#3185FF' : '#FF343F'}
                        pickTeamName={teamObj?.name}
                        pickTeamColor={entry?.team === 'A' ? '#3185FF' : '#FF4057'}
                        mapNumber={entry?.mapNumber}
                        side={entry?.side || null}
                        sideTeamName={sideTeamObj?.name}
                        size="tall"
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="w-full flex flex-col items-center gap-6">
                  <div className="font-display font-black text-3xl tracking-[0.22em] text-[#FFB800] uppercase">
                    THỨ TỰ MAP THI ĐẤU CHÍNH THỨC
                  </div>
                  <div className="flex items-center justify-center gap-6 flex-wrap">
                    {pickedAndDecider.map((entry, idx) => {
                      const m = state.maps.find((x) => x.id === entry.mapId);
                      if (!m) return null;
                      const teamObj = entry.team === 'A' ? state.teamA : state.teamB;
                      const sideTeamObj = entry.sideTeam
                        ? entry.sideTeam === 'A'
                          ? state.teamA
                          : state.teamB
                        : undefined;
                      return (
                        <MapCard
                          key={`${m.id}-${idx}`}
                          map={m}
                          status={entry.action === 'decider' ? 'decider' : 'picked'}
                          pickTeamName={teamObj.name}
                          pickTeamColor={entry.team === 'A' ? '#3185FF' : '#FF4057'}
                          mapNumber={entry.mapNumber || idx + 1}
                          side={entry.side}
                          sideTeamName={sideTeamObj?.name}
                          size="tall"
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ===== CHẾ ĐỘ QUAY MAP: 1 HÌNH TO + CÁC HÌNH BÉ ===== */
            <div className="w-full flex flex-col gap-5 relative">
              <SpinCelebration active={celebrating} />

              {isSpinning && spinAnim ? (
                <div className="w-full grid grid-cols-12 gap-8 items-center">
                  <div className="col-span-8 flex flex-col items-center justify-center gap-4 bg-[#0b1018]/92 hud-neon-red rounded-[11px] p-8 relative">
                    <HudCorners color="#FF4057" size={16} offset={10} />
                    <div className="px-5 py-1.5 rounded-[4px] bg-[#FF4057]/20 border border-[#FF4057]/60 font-display font-black text-xl tracking-widest text-[#FFB800] uppercase">
                      ĐANG QUAY MAP {spinAnim.mapNumber} / {targetSpinCount}
                    </div>
                    {spinAnim.style === 'wheel' && (
                      <SpinWheel
                        maps={spinAnim.poolMaps}
                        targetMapId={spinAnim.targetMapId}
                        isSpinning={true}
                        duration={spinAnim.duration}
                        triggerId={spinAnim.triggerId}
                        onTick={() => soundEnabled && playTick()}
                        onFinish={handleSpinFinish}
                        size={470}
                      />
                    )}
                    {spinAnim.style === 'slot' && (
                      <SlotMachine
                        maps={spinAnim.poolMaps}
                        targetMapId={spinAnim.targetMapId}
                        isSpinning={true}
                        duration={spinAnim.duration}
                        triggerId={spinAnim.triggerId}
                        onTick={() => soundEnabled && playTick()}
                        onFinish={handleSpinFinish}
                        itemHeight={155}
                        width={640}
                      />
                    )}
                    {spinAnim.style === 'card' && (
                      <CardFlip
                        maps={spinAnim.poolMaps}
                        targetMapId={spinAnim.targetMapId}
                        isSpinning={true}
                        duration={spinAnim.duration}
                        triggerId={spinAnim.triggerId}
                        onTick={() => soundEnabled && playTick()}
                        onFinish={handleSpinFinish}
                      />
                    )}
                  </div>

                  {/* Cột phải khi đang quay */}
                  <div className="col-span-4 flex flex-col gap-3">
                    <div className="font-display font-bold text-xs tracking-[0.25em] text-gray-300 uppercase">
                      DANH SÁCH BẢN ĐỒ ({state.spinConfig.boType.toUpperCase()})
                    </div>
                    {Array.from({ length: targetSpinCount }, (_, idx) => {
                      const mapNum = idx + 1;
                      const res = state.spinResults.find((r) => r.mapNumber === mapNum);
                      const mObj = res
                        ? state.maps.find((m) => m.id === res.mapId)
                        : null;
                      const isCurrent = mapNum === spinAnim.mapNumber;

                      return (
                        <div
                          key={mapNum}
                          className={`relative h-24 rounded-[9px] overflow-hidden flex items-center px-5 transition bg-[#0b1018]/90 ${
                            isCurrent
                              ? 'hud-neon-gold hud-subtle-pulse'
                              : mObj
                              ? 'hud-neon-red'
                              : 'border border-white/10'
                          }`}
                        >
                          {mObj && (
                            <>
                              <img
                                src={mObj.localSplash || mObj.splash}
                                alt={mObj.name}
                                className="absolute inset-0 w-full h-full object-cover opacity-45"
                              />
                              <div className="absolute inset-0 bg-gradient-to-r from-black/88 via-black/55 to-transparent" />
                            </>
                          )}
                          <div className="relative z-10 flex items-center justify-between w-full">
                            <div>
                              <div className="text-[11px] font-display font-bold text-[#FF4057]">
                                MAP {mapNum}
                              </div>
                              <div className="font-display font-black text-2xl uppercase">
                                {mObj
                                  ? mObj.name
                                  : isCurrent
                                  ? 'ĐANG QUAY...'
                                  : 'CHỜ QUAY'}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-12 gap-6 items-stretch">
                    {/* KHUNG MAP CHÍNH (10–12px radius, viền đỏ neon #FF4057 1px + glow mềm, hoặc vàng gold #FFB800 khi vừa trúng) */}
                    <div className="col-span-8">
                      <AnimatePresence mode="wait">
                        {featuredSpinResult ? (
                          <motion.div
                            key={`${featuredSpinResult.map.id}-${featuredSpinResult.mapNumber}-${celebrating ? 'win' : 'idle'}`}
                            initial={{ scale: 0.92, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
                            className={`relative w-full h-[540px] rounded-[11px] overflow-hidden bg-[#0b1018] ${
                              celebrating
                                ? 'hud-neon-gold hud-subtle-pulse'
                                : 'hud-neon-red'
                            }`}
                          >
                            <HudCorners
                              color={celebrating ? '#FFB800' : '#FF4057'}
                              size={16}
                              offset={10}
                            />

                            {/* Ánh sáng nhẹ ở các góc khung chính */}
                            <div
                              className="pointer-events-none absolute -top-10 -left-10 w-44 h-44 rounded-full blur-2xl opacity-30"
                              style={{
                                backgroundColor: celebrating ? '#FFB800' : '#FF4057',
                              }}
                            />
                            <div
                              className="pointer-events-none absolute -bottom-10 -right-10 w-44 h-44 rounded-full blur-2xl opacity-25"
                              style={{ backgroundColor: '#FF4057' }}
                            />

                            <img
                              src={
                                featuredSpinResult.map.localSplash ||
                                featuredSpinResult.map.splash
                              }
                              alt={featuredSpinResult.map.name}
                              onError={(e) => {
                                if (featuredSpinResult.map.splash) {
                                  e.currentTarget.src = featuredSpinResult.map.splash;
                                }
                              }}
                              className="w-full h-full object-cover brightness-95"
                            />

                            {celebrating && (
                              <motion.div
                                initial={{ x: '-120%' }}
                                animate={{ x: '220%' }}
                                transition={{ duration: 0.95, ease: 'easeInOut' }}
                                className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12"
                              />
                            )}

                            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-black/35" />
                            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />

                            {/* Badge góc trên trái (3-4px radius) */}
                            <div className="absolute top-6 left-6 flex items-center gap-2.5 z-10">
                              <span className="px-4 py-1.5 rounded-[4px] bg-[#FF4057] text-white font-display font-black text-xl tracking-wider shadow">
                                MAP {featuredSpinResult.mapNumber}
                              </span>
                              <span className="px-3.5 py-1.5 rounded-[4px] bg-black/75 border border-[#FFB800]/55 text-[#FFB800] font-display font-bold text-sm tracking-widest uppercase">
                                {celebrating ? '★ VỪA QUAY TRÚNG' : 'BẢN ĐỒ THI ĐẤU'}
                              </span>
                            </div>

                            {/* HÌNH BÉ GÓC PHẢI: Minimap + Thẻ dọc (5-6px radius) */}
                            <div className="absolute top-6 right-6 bottom-6 flex flex-col items-end justify-between gap-3 z-10">
                              {featuredSpinResult.map.minimap && (
                                <div className="w-44 h-44 rounded-[6px] bg-black/75 backdrop-blur-md border border-white/15 p-3 flex flex-col items-center justify-center">
                                  <img
                                    src={featuredSpinResult.map.minimap}
                                    alt="Minimap"
                                    className="w-full h-full object-contain opacity-90"
                                  />
                                  <span className="text-[10px] font-display tracking-widest text-gray-400 uppercase mt-1">
                                    TACTICAL RADAR
                                  </span>
                                </div>
                              )}

                              <div className="w-44 h-64 rounded-[6px] overflow-hidden border border-white/25 bg-black/75 relative">
                                <img
                                  src={
                                    featuredSpinResult.map.localIcon ||
                                    featuredSpinResult.map.listViewIcon ||
                                    featuredSpinResult.map.splash
                                  }
                                  alt={featuredSpinResult.map.name}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
                                <div className="absolute bottom-2 inset-x-2 text-center font-display font-bold text-xs tracking-widest text-[#FFB800] uppercase">
                                  {featuredSpinResult.map.name}
                                </div>
                              </div>
                            </div>

                            {/* Tên Map & thông tin Attack/Defense góc dưới trái */}
                            <div className="absolute bottom-7 left-7 max-w-[65%] z-10">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="w-5 h-[2px] bg-[#FFB800]" />
                                <span className="text-xs font-display font-bold uppercase tracking-[0.22em] text-[#FFB800]">
                                  VALORANT COMPETITIVE MAP
                                </span>
                              </div>
                              <div className="font-bebas font-extrabold text-7xl uppercase tracking-wide text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] leading-none">
                                {featuredSpinResult.map.name}
                              </div>

                              {featuredSpinResult.side?.side && (
                                <div className="mt-4 flex items-center gap-2.5">
                                  <span className="px-3 py-1 rounded-[4px] bg-black/80 border border-white/15 font-display font-bold text-base">
                                    {featuredSpinResult.side.team === 'A'
                                      ? state.teamA.name
                                      : state.teamB.name}
                                  </span>
                                  <span
                                    className={`px-3.5 py-1 rounded-[4px] font-display font-black text-base uppercase ${
                                      featuredSpinResult.side.side === 'attack'
                                        ? 'bg-[#FF4057] text-white'
                                        : 'bg-cyan-400 text-black'
                                    }`}
                                  >
                                    {featuredSpinResult.side.side === 'attack'
                                      ? '⚔️ ATTACK'
                                      : '🛡️ DEFENSE'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ) : (
                          /* Màn hình chờ */
                          <div className="relative w-full h-[540px] rounded-[11px] overflow-hidden hud-neon-red bg-[#0b1018]/92 flex flex-col items-center justify-center p-10 text-center">
                            <HudCorners color="#FF4057" size={16} offset={10} />
                            {enabledMaps[0] && (
                              <img
                                src={enabledMaps[0].localSplash || enabledMaps[0].splash}
                                alt=""
                                className="absolute inset-0 w-full h-full object-cover opacity-18 blur-sm"
                              />
                            )}
                            <div className="relative z-10 space-y-4">
                              <span className="inline-block px-4 py-1 rounded-[4px] bg-[#FF4057]/20 border border-[#FF4057]/55 text-[#FF4057] font-display font-bold tracking-[0.25em] text-sm uppercase">
                                RANDOM MAP ROULETTE • {state.spinConfig.boType.toUpperCase()}
                              </span>
                              <div className="font-display font-bold text-5xl tracking-wide uppercase text-white">
                                SẴN SÀNG QUAY MAP
                              </div>
                              <p className="text-xl text-gray-300 max-w-xl mx-auto">
                                Hệ thống đang chuẩn bị{' '}
                                <strong className="text-[#FFB800]">
                                  {enabledMaps.length - (state.preSpinBans?.length || 0)} bản đồ
                                </strong>{' '}
                                hợp lệ để lựa chọn ngẫu nhiên
                              </p>
                            </div>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* KHUNG LỊCH TRÌNH (4 cột, 8-10px radius) */}
                    <div className="col-span-4 flex flex-col justify-between gap-3 bg-[#0b1018]/90 border border-white/10 rounded-[9px] p-5">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <span className="font-display font-black text-base tracking-wider text-[#FFB800] uppercase">
                          LỊCH TRÌNH MAP ĐẤU
                        </span>
                        <span className="px-2.5 py-0.5 rounded-[3px] bg-[#FF4057]/20 border border-[#FF4057]/40 text-[#FF4057] font-display font-bold text-xs">
                          {state.spinResults.length}/{targetSpinCount} MAP
                        </span>
                      </div>

                      <div className="flex-1 flex flex-col justify-center gap-3">
                        {Array.from({ length: targetSpinCount }, (_, idx) => {
                          const mapNum = idx + 1;
                          const res = state.spinResults.find((r) => r.mapNumber === mapNum);
                          const mObj = res
                            ? state.maps.find((m) => m.id === res.mapId)
                            : null;
                          const isFeatured =
                            featuredSpinResult?.mapNumber === mapNum &&
                            featuredSpinResult?.map.id === mObj?.id;
                          const sideTeam = res?.side
                            ? res.side.team === 'A'
                              ? state.teamA
                              : state.teamB
                            : null;

                          return (
                            <div
                              key={mapNum}
                              className={`relative rounded-[9px] overflow-hidden flex items-center gap-4 p-2.5 transition ${
                                targetSpinCount === 1
                                  ? 'h-48 flex-col justify-end items-start p-4'
                                  : targetSpinCount === 3
                                  ? 'h-32'
                                  : 'h-20'
                              } ${
                                isFeatured
                                  ? 'hud-neon-gold hud-subtle-pulse bg-[#FFB800]/10'
                                  : mObj
                                  ? 'border border-white/15 bg-black/50'
                                  : 'border border-white/10 bg-black/35'
                              }`}
                            >
                              {mObj ? (
                                <>
                                  {targetSpinCount === 1 ? (
                                    <>
                                      <img
                                        src={mObj.localSplash || mObj.splash}
                                        alt={mObj.name}
                                        className="absolute inset-0 w-full h-full object-cover brightness-75"
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
                                    </>
                                  ) : (
                                    <img
                                      src={mObj.localSplash || mObj.splash}
                                      alt={mObj.name}
                                      className="h-full aspect-video rounded-[6px] object-cover shrink-0 border border-white/15"
                                    />
                                  )}
                                  <div className="relative z-10 flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-0.5 rounded-[3px] bg-[#FF4057] text-white font-display font-black text-[11px]">
                                        MAP {mapNum}
                                      </span>
                                      {res?.side?.side && (
                                        <span
                                          className={`px-2 py-0.5 rounded-[3px] text-[11px] font-bold uppercase ${
                                            res.side.side === 'attack'
                                              ? 'bg-[#FF4057] text-white'
                                              : 'bg-cyan-400 text-black'
                                          }`}
                                        >
                                          {sideTeam ? `${sideTeam.name}: ` : ''}
                                          {res.side.side === 'attack'
                                            ? 'Attack'
                                            : 'Defense'}
                                        </span>
                                      )}
                                    </div>
                                    <div className="font-display font-black text-2xl uppercase tracking-wide text-white truncate mt-1">
                                      {mObj.name}
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div className="w-full flex items-center justify-between px-3 text-gray-400">
                                  <div>
                                    <div className="text-xs font-display font-bold text-gray-500">
                                      MAP {mapNum}
                                    </div>
                                    <div className="font-display font-bold text-base text-gray-400">
                                      Chờ quay ngẫu nhiên...
                                    </div>
                                  </div>
                                  <span className="text-xl opacity-35">?</span>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {targetSpinCount === 1 && (
                          <div className="rounded-[9px] bg-black/50 border border-white/10 p-4 space-y-2">
                            <div className="text-[11px] font-display font-bold uppercase tracking-widest text-gray-400">
                              TRẠNG THÁI VÒNG QUAY
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-center">
                              <div className="rounded-[6px] bg-white/[0.04] border border-white/5 p-3">
                                <div className="font-display font-black text-3xl text-white">
                                  {enabledMaps.length}
                                </div>
                                <div className="text-xs text-gray-400">Tổng Map Pool</div>
                              </div>
                              <div className="rounded-[6px] bg-white/[0.04] border border-white/5 p-3">
                                <div className="font-display font-black text-3xl text-[#FF4057]">
                                  {state.preSpinBans?.length || 0}
                                </div>
                                <div className="text-xs text-gray-400">Map Đã Ban</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* DẢI MAP POOL PHÍA DƯỚI (Thumbnail map: 5-6px radius; map đang chọn viền vàng gold) */}
                  <div className="bg-[#0b1018]/90 border border-white/10 rounded-[9px] px-5 py-3 flex items-center gap-4">
                    <span className="font-display font-bold text-xs tracking-widest uppercase text-gray-400 shrink-0">
                      MAP POOL ({enabledMaps.length})
                    </span>
                    <div className="flex-1 flex items-center gap-3 overflow-hidden">
                      {enabledMaps.map((m) => {
                        const isPicked = spinPickedSet.has(m.id);
                        const preBan = preBanMapLookup.get(m.id);
                        return (
                          <div
                            key={m.id}
                            className={`relative flex-1 h-20 rounded-[6px] overflow-hidden transition ${
                              isPicked
                                ? 'hud-neon-gold hud-subtle-pulse'
                                : preBan
                                ? 'border border-[#FF343F]/40 opacity-45 grayscale'
                                : 'border border-white/12 opacity-85'
                            }`}
                          >
                            <img
                              src={m.localSplash || m.splash}
                              alt={m.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                            {isPicked && (
                              <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-[3px] bg-[#FFB800] text-black font-display font-black text-[10px]">
                                ĐÃ CHỌN
                              </span>
                            )}
                            {preBan && (
                              <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-[3px] bg-[#FF343F] text-white font-display font-black text-[10px]">
                                BAN {preBan.team}
                              </span>
                            )}
                            <div className="absolute bottom-1.5 left-2 font-display font-bold text-xs uppercase text-white tracking-wider">
                              {m.name}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="relative z-10 flex items-center justify-between text-xs text-gray-400 font-display tracking-widest uppercase border-t border-white/10 pt-3">
          <span>ESPORTS BAN/PICK SYSTEM</span>
          <span>VALORANT TOURNAMENT • LIVE BROADCAST</span>
        </footer>
      </div>
    </OverlayWrapper>
  );
}
