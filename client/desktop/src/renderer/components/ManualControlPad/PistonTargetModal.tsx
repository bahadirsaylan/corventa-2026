// 2026-11-19 (kullanıcı): tuş takımında pistonlar sadece basılı-tut (jog) ile hareket ediyordu — konuma veya basınca
// göre gönderme yoktu. Tuş takımının görünümü bozulmasın diye yeni bölüm EKLENMEDİ: piston hapındaki değer
// (ÜST 0.0 …) dokunulabilir; bu pencere açılır.
//   KONUMA GİT (mm)  → POST /api/piston/{id}/position  (sınır = makine durumundaki güvenli geri / ileri sınır,
//                       backend ValidatePistonPosition ile aynı; sınır bilgisi yoksa backend karar verir)
//   BASINÇLA İT (bar) → POST /api/piston/{id}/pressure (yön +1 = ileri, parçaya doğru; backend 0..250 bar,
//                       burada 1..250 — piston hedef basınca ulaşınca PLC durdurur ve tutar)
// Hız = tuş takımının o anki hızı (pencerede değiştirilebilir; tuş takımının hızını değiştirmez).
// Gönderdikten sonra piston hareket ederken DURDUR görünür. Hata mesajları sakin bilgi satırında (tp ile çeviri).
// Makro kaydı açıkken sadece KONUMA GİT: hareket noteMotion ile kayda bildirilir (jog ile aynı — son konum
// "Position" adımı olur). Makro şemasında basınç adımı yok → BASINÇLA İT kayıt sırasında kapalı.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { PistonName } from "@shared/types";
import NumpadModal from "@/components/NumpadModal/NumpadModal";
import { Icon } from "@/components/Icon";
import { useT } from "@/i18n";
import { pistonAxis } from "@/services/macroAxes";
import { cleanIpcError } from "@/services/savedBends";
import { useMachineStateStore } from "@/stores/machineStateStore";
import { useMacroRecorderStore } from "@/stores/macroRecorderStore";
import styles from "./PistonTargetModal.module.css";

type Mode = "position" | "pressure";

const PRESSURE_MIN = 1;
const PRESSURE_MAX = 250; // backend ExecutePistonMoveToPressureAsync üst sınırı
const PRESSURE_DEFAULT = 30; // güvenli öneri (operatör değiştirir)
const SPEED_STEP = 5;
const SPEED_MIN = 5;
const SPEED_MAX = 100;
const TOL = 0.01; // backend ValidatePistonPosition toleransı

const TITLES: Record<PistonName, string> = {
  upper: "ÜST TOP — HEDEF GÖNDER",
  lower: "ALT TOP — HEDEF GÖNDER",
  left: "SOL TOP — HEDEF GÖNDER",
  right: "SAĞ TOP — HEDEF GÖNDER",
};

const STATE_KEY = {
  upper: "upperPiston",
  lower: "lowerPiston",
  left: "leftPiston",
  right: "rightPiston",
} as const;

interface Props {
  piston: PistonName;
  initialSpeed: number;
  onClose: () => void;
}

function fmt(v: number): string {
  return v.toFixed(2); // 2026-11-20: piston konumu 0.00
}

export default function PistonTargetModal({
  piston,
  initialSpeed,
  onClose,
}: Props) {
  const t = useT();
  const key = STATE_KEY[piston];
  const pos = useMachineStateStore((s) => s.state[key].positionMm);
  const moving = useMachineStateStore((s) => s.state[key].moving);
  const safeBack = useMachineStateStore((s) => s.state[key].safeBackwardMm);
  const safeFwd = useMachineStateStore((s) => s.state[key].safeForwardMm);
  // Üst / alt top S1 devresinde, yan toplar (sağ / sol) S2 devresinde
  const pressureNow = useMachineStateStore((s) =>
    piston === "upper" || piston === "lower"
      ? s.state.sensors.s1PressureBar
      : s.state.sensors.s2PressureBar,
  );
  const motorRunning = useMachineStateStore(
    (s) => s.state.hydraulicMotorState === 2,
  );
  const recording = useMacroRecorderStore((s) => s.recording);

  const [mode, setMode] = useState<Mode>("position");
  const [posText, setPosText] = useState(() =>
    fmt(useMachineStateStore.getState().state[key].positionMm),
  );
  const [barText, setBarText] = useState(String(PRESSURE_DEFAULT));
  const [speed, setSpeed] = useState(initialSpeed);
  const [numpad, setNumpad] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentAt, setSentAt] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  // Gönderim sonrası kısa "hareket ediyor" penceresi bitince yeniden çiz (durum değişmese bile)
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!sentAt) return;
    const id = setTimeout(() => setTick((n) => n + 1), 850);
    return () => clearTimeout(id);
  }, [sentAt]);

  // Kayıt açılırsa basınç sekmesi kapanır
  useEffect(() => {
    if (recording && mode === "pressure") setMode("position");
  }, [recording, mode]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !numpad) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [numpad, onClose]);

  // Sınır bilgisi: gönye öncesi / bağlantı yokken ikisi de 0 gelir → bilinmiyor say (backend yine doğrular)
  const limitsKnown =
    Number.isFinite(safeBack) &&
    Number.isFinite(safeFwd) &&
    safeFwd - safeBack > 0.1;

  const posNum = parseFloat(posText);
  const barNum = Math.round(parseFloat(barText));
  let invalid: string | null = null;
  if (mode === "position") {
    if (!Number.isFinite(posNum)) invalid = t("HEDEF KONUMU GİRİN");
    else if (limitsKnown && (posNum < safeBack - TOL || posNum > safeFwd + TOL))
      invalid = t("HEDEF İZİN VERİLEN ARALIĞIN DIŞINDA ({min} … {max} mm)", {
        min: fmt(safeBack),
        max: fmt(safeFwd),
      });
  } else if (
    !Number.isFinite(barNum) ||
    barNum < PRESSURE_MIN ||
    barNum > PRESSURE_MAX
  ) {
    invalid = t("BASINÇ {min}–{max} BAR ARASI OLMALI", {
      min: PRESSURE_MIN,
      max: PRESSURE_MAX,
    });
  }

  async function send() {
    if (busy || invalid || !motorRunning) return;
    setBusy(true);
    setNotice(null);
    try {
      if (mode === "position") {
        // Usta öğrenme kaydı açıksa hareket bildirilir (kayıt kapalıyken etkisiz) — jog ile aynı
        useMacroRecorderStore.getState().noteMotion(pistonAxis(piston), speed);
        await window.corventa.machine.pistonPosition({
          piston,
          positionMm: Math.round(posNum * 100) / 100,
          speedPercent: speed,
        });
      } else {
        await window.corventa.machine.pistonPressure({
          piston,
          pressureBar: barNum,
          speedPercent: speed,
          direction: 1,
        });
      }
      setSent(true);
      setSentAt(Date.now());
    } catch (err) {
      setNotice(cleanIpcError(err));
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    try {
      await window.corventa.machine.pistonStop(piston);
    } catch (err) {
      setNotice(cleanIpcError(err));
    }
  }

  // Komuttan hemen sonra (ilk durum güncellemeleri gelene kadar) "durdu" yazmasın
  const shownMoving = sent && (moving || Date.now() - sentAt < 800);

  function selectMode(m: Mode) {
    setMode(m);
    setSent(false);
    setNotice(null);
  }

  return createPortal(
    // Hareket sürerken dışarı dokunmak pencereyi kapatmaz (DURDUR yanlışlıkla kaybolmasın)
    <div className={styles.overlay} onClick={() => !shownMoving && onClose()}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className={styles.title}>{t(TITLES[piston])}</h2>

        <div className={styles.segment} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "position"}
            className={styles.segBtn}
            data-active={mode === "position" || undefined}
            onClick={() => selectMode("position")}
          >
            {t("KONUMA GİT")} <span className={styles.segUnit}>mm</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "pressure"}
            className={styles.segBtn}
            data-active={mode === "pressure" || undefined}
            disabled={recording}
            onClick={() => selectMode("pressure")}
          >
            {t("BASINÇLA İT")} <span className={styles.segUnit}>bar</span>
          </button>
        </div>

        <div className={styles.infoRow}>
          <div className={styles.infoCell}>
            <span className={styles.infoLabel}>{t("ŞU ANKİ KONUM")}</span>
            <span className={styles.infoValue}>{fmt(pos)} mm</span>
          </div>
          {mode === "position" ? (
            <div className={styles.infoCell}>
              <span className={styles.infoLabel}>
                {t("İZİN VERİLEN ARALIK")}
              </span>
              <span className={styles.infoValue}>
                {limitsKnown
                  ? `${fmt(safeBack)} … ${fmt(safeFwd)} mm`
                  : t("MAKİNE DENETLER")}
              </span>
            </div>
          ) : (
            <div className={styles.infoCell}>
              <span className={styles.infoLabel}>
                {piston === "upper" || piston === "lower"
                  ? t("S1 BASINCI")
                  : t("S2 BASINCI")}
              </span>
              <span className={styles.infoValue}>
                {Math.round(pressureNow)} bar
              </span>
            </div>
          )}
        </div>

        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>
            {mode === "position"
              ? t("HEDEF KONUM (mm)")
              : t("HEDEF BASINÇ (bar) — İLERİ")}
          </span>
          <button
            type="button"
            className={styles.valueBtn}
            onClick={() => setNumpad(true)}
          >
            <span>{(mode === "position" ? posText : barText) || "—"}</span>
            <Icon name="keyboard" size="lg" className={styles.valueIcon} />
          </button>
        </div>

        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>{t("HIZ (%)")}</span>
          <div className={styles.speedRow}>
            <button
              type="button"
              className={styles.speedBtn}
              disabled={speed <= SPEED_MIN}
              onClick={() =>
                setSpeed((v) => Math.max(SPEED_MIN, v - SPEED_STEP))
              }
              aria-label={t("Hızı azalt")}
            >
              <Icon name="minus" size="xl" />
            </button>
            <span className={styles.speedValue}>%{speed}</span>
            <button
              type="button"
              className={styles.speedBtn}
              disabled={speed >= SPEED_MAX}
              onClick={() =>
                setSpeed((v) => Math.min(SPEED_MAX, v + SPEED_STEP))
              }
              aria-label={t("Hızı artır")}
            >
              <Icon name="plus" size="xl" />
            </button>
          </div>
        </div>

        <div className={styles.msgs}>
          {recording && (
            <p className={styles.note}>
              {t(
                "MAKRO KAYDI AÇIK — SADECE KONUMA GİT KAYDEDİLİR (MAKRODA BASINÇ ADIMI YOK)",
              )}
            </p>
          )}
          {!motorRunning && (
            <p className={styles.note}>
              {t("HİDROLİK MOTOR ÇALIŞMIYOR — ÖNCE ÇALIŞTIR")}
            </p>
          )}
          {motorRunning && invalid && <p className={styles.note}>{invalid}</p>}
          {notice && (
            <p className={styles.notice}>
              <Icon name="info" size="lg" /> <span>{notice}</span>
            </p>
          )}
          {sent && !notice && (
            <p className={styles.status}>
              {shownMoving
                ? t("HAREKET EDİYOR…")
                : mode === "pressure"
                  ? t("HEDEF BASINCA ULAŞILDI / PİSTON DURDU")
                  : t("PİSTON DURDU")}
            </p>
          )}
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.cancel}`}
            onClick={onClose}
          >
            {sent ? t("KAPAT") : t("VAZGEÇ")}
          </button>
          {shownMoving ? (
            <button
              type="button"
              className={`${styles.btn} ${styles.stop}`}
              onClick={() => void stop()}
            >
              <Icon name="stop" size="xl" /> {t("DURDUR")}
            </button>
          ) : (
            <button
              type="button"
              className={`${styles.btn} ${styles.send}`}
              disabled={busy || !!invalid || !motorRunning}
              onClick={() => void send()}
            >
              <Icon name="play" size="xl" /> {t("GÖNDER")}
            </button>
          )}
        </div>

        {numpad && (
          <NumpadModal
            fieldLabel={
              mode === "position"
                ? t("HEDEF KONUM (mm)")
                : t("HEDEF BASINÇ (bar)")
            }
            initialValue=""
            allowNegative={mode === "position"}
            onConfirm={(v) =>
              mode === "position" ? setPosText(v) : setBarText(v)
            }
            onClose={() => setNumpad(false)}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}
