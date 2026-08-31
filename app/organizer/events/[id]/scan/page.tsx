"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Html5Qrcode } from "html5-qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, CheckCircle2, CloudOff, RefreshCcw, XCircle } from "lucide-react";
import { api, useT } from "@/lib/client";
import { Badge, Button, Spinner } from "@/components/ui";
import { enqueueOffline, listPending, markSynced, isOnline } from "@/lib/offline/queue";

interface Bundle {
  scannerDevices: { id: string; name: string; deviceCode: string; authorizedAt: string | null }[];
}

interface ScanResult {
  ok: boolean;
  status?: string;
  participant?: { name: string; email?: string | null };
  activityTitle?: string;
  xp?: number;
  stamp?: string | null;
  reason?: string;
}

const SCANNER_ID = "rame-live-scanner";

export default function LiveScannerPage() {
  const { id } = useParams<{ id: string }>();
  const t = useT();

  const { data } = useQuery({ queryKey: ["org-event", id], queryFn: () => api<Bundle>(`/api/organizer/events/${id}`) });
  const devices = data?.scannerDevices.filter((d) => d.authorizedAt) ?? [];

  const [deviceCode, setDeviceCode] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [offline, setOffline] = useState(!isOnline());
  const [queue, setQueue] = useState<{ id: string; payload: string }[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);

  const refreshQueue = useCallback(async () => {
    const pending = await listPending();
    setQueue(pending.filter((p) => !p.synced));
  }, []);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    refreshQueue();
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [refreshQueue]);

  const stopCamera = useCallback(async () => {
    setCameraOn(false);
    setScanning(false);
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch {
      // abaikan — kamera mungkin sudah mati
    }
  }, []);

  const startCamera = useCallback(async () => {
    setResult(null);
    setCameraOn(true);
    setScanning(true);
    try {
      const scanner = new Html5Qrcode(SCANNER_ID);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText) => {
          if (processingRef.current) return;
          processingRef.current = true;
          setLastScan(decodedText);
          await handleScan(decodedText);
          // jeda singkat agar tidak langsung scan ulang
          setTimeout(() => (processingRef.current = false), 2500);
        },
        () => {
          // frame tanpa QR — abaikan
        },
      );
    } catch {
      setCameraOn(false);
      setScanning(false);
    }
  }, [deviceCode, offline]);

  const handleScan = async (payload: string) => {
    if (!deviceCode) {
      setResult({ ok: false, reason: "PILIH_DEVICE" });
      return;
    }
    try {
      const res = await api<ScanResult>("/api/verification/scan", {
        method: "POST",
        body: JSON.stringify({ payload, deviceCode }),
      });
      setResult(res);
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 409 || err.status === 410 || err.status === 422 || err.status === 400) {
        setResult({ ok: false, status: (err as Error & { code?: string }).code, reason: err.message });
        return;
      }
      // jaringan gagal → simpan ke antrean offline
      const localId = `off-${Date.now()}`;
      await enqueueOffline({ id: localId, payload, scannedAt: Date.now(), deviceCode });
      setOffline(true);
      setResult({ ok: false, status: "OFFLINE_QUEUED", reason: localId });
      refreshQueue();
    }
  };

  const syncNow = async () => {
    if (!deviceCode || queue.length === 0) return;
    setSyncing(true);
    try {
      const res = await api<{ results: { localId?: string; status: string }[] }>("/api/scanner/sync", {
        method: "POST",
        body: JSON.stringify({
          deviceCode,
          transactions: queue.map((q) => ({ payload: q.payload, scannedAt: Date.now(), localId: q.id })),
        }),
      });
      for (const r of res.results) {
        if (r.localId) await markSynced(r.localId);
      }
      setResult({ ok: true, status: "SYNCED", participant: { name: `${res.results.length} tx` }, activityTitle: t("scanner.synced") });
      setOffline(false);
      refreshQueue();
    } catch {
      setResult({ ok: false, status: "SYNC_FAILED", reason: t("error.conflict") });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const resultOk = result?.ok || result?.status === "VERIFIED";
  const queued = result?.status === "OFFLINE_QUEUED";

  return (
    <div className="max-w-xl">
      <div className="section-kicker">{t("scanner.title")}</div>
      <h1 className="section-title mb-2">{t("scanner.title")}</h1>
      <p className="mb-4 text-sm text-ink/60">{t("scanner.sub")}</p>

      {/* penjelasan konteks */}
      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-brand/15 bg-brand/5 p-4 text-sm leading-relaxed text-ink/75">
        <Camera className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
        <span>
          <strong className="text-brand">Cara memakai:</strong> {t("org.scanHow")}
        </span>
      </div>

      {/* status koneksi */}
      <div className="mb-4 flex items-center gap-2">
        {offline ? (
          <Badge tone="danger"><CloudOff className="h-3 w-3" /> {t("scanner.offline")} · {queue.length} {t("scanner.pendingQueue")}</Badge>
        ) : (
          <Badge tone="success">● {t("scanner.online")}</Badge>
        )}
        {queue.length > 0 && (
          <Button variant="ghost" className="!px-3 !py-1 text-xs" onClick={syncNow} loading={syncing}>
            <RefreshCcw className="h-3.5 w-3.5" /> {t("scanner.syncNow")} ({queue.length})
          </Button>
        )}
      </div>

      {/* pilih perangkat */}
      <div className="mb-4">
        <label className="label">{t("scanner.selectDevice")}</label>
        <select className="input" value={deviceCode} onChange={(e) => setDeviceCode(e.target.value)}>
          <option value="">—</option>
          {devices.map((d) => (
            <option key={d.id} value={d.deviceCode}>{d.name} · {d.deviceCode}</option>
          ))}
        </select>
        {devices.length === 0 && <p className="mt-1 text-xs text-ink/50">Belum ada perangkat terotorisasi → <a className="text-brand underline" href={`/organizer/events/${id}/scanner`}>kelola perangkat</a></p>}
      </div>

      {/* viewfinder */}
      <div className="card !p-4">
        <div id={SCANNER_ID} className={`w-full overflow-hidden rounded-2xl bg-ink/95 ${cameraOn ? "" : "hidden"}`} style={{ minHeight: cameraOn ? 260 : 0 }} />
        {!cameraOn && (
          <div className="flex h-56 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-ink/20 text-center">
            <Camera className="h-8 w-8 text-ink/30" />
            <p className="text-sm text-ink/50">{t("scanner.searching")}</p>
            <Button onClick={startCamera} disabled={!deviceCode}>
              <Camera className="h-4 w-4" /> {t("scanner.start")}
            </Button>
            {!deviceCode && <p className="text-xs text-ink/40">{t("scanner.selectDevice")}</p>}
          </div>
        )}
        {cameraOn && (
          <Button variant="ghost" className="mt-3 w-full" onClick={stopCamera}>
            <CameraOff className="h-4 w-4" /> {t("scanner.stop")}
          </Button>
        )}
        {scanning && cameraOn && (
          <div className="mt-2 flex items-center justify-center gap-2 text-xs text-ink/50">
            <Spinner className="h-3.5 w-3.5" /> {t("scanner.scanning")}
          </div>
        )}
      </div>

      {/* hasil scan */}
      {result && (
        <div className={`card mt-4 !p-5 ${resultOk || queued ? "border-emerald-500/40 bg-emerald-50/60" : "border-red-500/40 bg-red-50/60"}`}>
          {resultOk || queued ? <CheckCircle2 className="h-8 w-8 text-emerald-600" /> : <XCircle className="h-8 w-8 text-red-500" />}
          <div className="mt-2 text-lg font-black tracking-wide">
            {resultOk ? "✓ " + t("scanner.verified") : queued ? t("scanner.offline") : (result.status ?? t("scanner.error"))}
          </div>
          {result.participant && (
            <div className="mt-1 text-sm">
              <span className="text-ink/55">{t("scanner.participant")}:</span> <strong>{result.participant.name}</strong>
            </div>
          )}
          {result.activityTitle && (
            <div className="text-sm">
              <span className="text-ink/55">{t("scanner.activity")}:</span> <strong>{result.activityTitle}</strong>
            </div>
          )}
          {(result.xp ?? 0) > 0 && <div className="mt-1 text-sm font-bold text-accent">⚡ +{result.xp} XP{result.stamp ? ` · ${result.stamp}` : ""}</div>}
          {result.reason && <div className="mt-1 text-xs text-ink/55">{result.reason}</div>}
          <div className="mt-3 flex gap-2">
            <Button className="!py-2 text-xs" onClick={() => { setResult(null); }}>
              {t("scanner.scanAnother")}
            </Button>
            {queued && (
              <Button variant="ghost" className="!py-2 text-xs" onClick={syncNow} loading={syncing}>
                <RefreshCcw className="h-3.5 w-3.5" /> {t("scanner.syncNow")}
              </Button>
            )}
          </div>
        </div>
      )}

      {lastScan && (
        <div className="mt-3 truncate rounded-lg bg-ink/5 px-3 py-2 font-mono text-[10px] text-ink/40">{lastScan}</div>
      )}
    </div>
  );
}
