# -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
#
# MOTIO · touchscreen-bediening (800 x 600) · alles in één bestand
#
# Dit ene bestand bevat alles om MOTIO op de Raspberry Pi 5 te laten tekenen:
#   1. MOTORSTURING   GPIO, hardware-PWM en de regeling van de drie assen
#                     (overgenomen uit motio.py).
#   2. SIMULATIE      een samenvatting van de MOTIO-simulator (Simulator/js), die
#                     patronen, Home en veiligheid uitrekent in de browser.
#   3. INTERFACE      de bedieningspagina voor het 800 x 600 touchscreen.
#   4. WEBSERVER      toont de pagina en geeft de motorhoeken door aan de motoren.
#
# Starten:
#   python3 dev.py            (op de Pi: stuurt de echte motoren aan, zoals motio.py)
#   python3 dev.py --test A   (motor A/B/C precies 1 omwenteling, controle microstappen)
#   python dev.py --demo      (op een laptop, zonder GPIO: er beweegt niets)
#
# Bovenaan het scherm toont een badge wat er aangestuurd wordt:
#   groen "MOTOREN"  = echte motoren · geel "DEMO" = niets beweegt · rood = geen verbinding
#
# Afsluiten: knop EXIT rechtsboven en de code invoeren (AFSLUIT_CODE).
#
# -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

import argparse
import glob
import json
import math
import os
import subprocess
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


# ############################################################
#
#   DEEL 1 · MOTORSTURING
#
# ############################################################

# ============================================================
# GPIO
# ============================================================

# Simulator-as -> motor. A en B zijn de krukken, C draait het papier.
PINNEN = {
    "A": {"step": 12, "dir": 5},    # motor 1 / X  (step = fysieke pin 32)
    "B": {"step": 13, "dir": 6},    # motor 2 / Y  (step = fysieke pin 33)
    "C": {"step": 18, "dir": 23},   # motor 3 / Z  (step = fysieke pin 12)
}

ENABLE = 22   # fysieke pin 15, laag = drivers aan

# Draait een motor de verkeerde kant op? Zet hem hier op True.
OMKEREN = {"A": False, "B": False, "C": False}

# ============================================================
# HARDWARE-PWM
# ============================================================

PWM_CHANNEL = {12: 0, 13: 1, 18: 2}

# Controleer op de Pi met:  pinctrl funcs 18
PWM_ALT = {12: "a0", 13: "a0", 18: "a3"}

# None = automatisch zoeken, anders het nummer van /sys/class/pwm/pwmchipX
PWM_CHIP = None

# ============================================================
# MOTOREN (moet overeenkomen met de simulator)
# ============================================================

STAPHOEK = 1.8        # graden per volle stap (SY42STH38-1684A)
MICROSTAPPEN = 16     # instelling op de drivers
STAPPEN_PER_RAD = 360 / STAPHOEK * MICROSTAPPEN / (2 * math.pi)

REGEL_HZ = 100        # zo vaak per seconde wordt de snelheid bijgesteld
KP = 6.0              # hoe hard een achterstand wordt bijgewerkt (1/s)
MIN_FREQ = 15         # trager dan dit: pulsen uit (stappen/s)
MAX_FREQ = 2000       # nooit sneller dan dit (stappen/s)
MAX_ACHTERSTAND = 0.6   # rad (~35°); meer dan dit = fout, machine stopt
WATCHDOG = 1.0        # s zonder bericht tijdens beweging = alles stoppen
RUST_BAND = 4         # stappen (~0,45° bij 1/16): staat het doel stil, dan wordt een kleinere
                      # fout niet bijgeregeld. Voorkomt tikken/zoemen na het stoppen.

AFSLUIT_CODE = "1234"  # code voor de EXIT-knop op het scherm


# ============================================================
# PULSGENERATOR: HARDWARE-PWM
# ============================================================

def zoek_pwm_chip():
    if PWM_CHIP is not None:
        pad = f"/sys/class/pwm/pwmchip{PWM_CHIP}"
        return pad if os.path.isdir(pad) else None

    for chip in sorted(glob.glob("/sys/class/pwm/pwmchip*")):
        try:
            apparaat = os.path.realpath(os.path.join(chip, "device"))
            with open(os.path.join(chip, "npwm")) as f:
                kanalen = int(f.read())
        except (OSError, ValueError):
            continue
        # PWM0 van de RP1-chip op de Pi 5 (de ventilator gebruikt een andere)
        if "98000.pwm" in apparaat and kanalen >= 3:
            return chip
    return None


def zet_pin_op_pwm(pin):
    try:
        subprocess.run(
            ["pinctrl", "set", str(pin), PWM_ALT[pin]],
            check=True, capture_output=True
        )
        uit = subprocess.run(
            ["pinctrl", "get", str(pin)],
            capture_output=True, text=True
        ).stdout
        return "PWM" in uit
    except (OSError, subprocess.CalledProcessError):
        return False


class HardwareStappen:

    soort = "hardware-PWM"

    def __init__(self, chip, kanaal):
        self.chip = chip
        self.kanaal = kanaal
        self.pad = f"{chip}/pwm{kanaal}"

        if not os.path.isdir(self.pad):
            self._schrijf(f"{chip}/export", kanaal)
            for _ in range(50):
                if os.access(f"{self.pad}/period", os.W_OK):
                    break
                time.sleep(0.02)

        self._schrijf(f"{self.pad}/enable", 0)

        with open(f"{self.pad}/period") as f:
            self.periode_ns = int(f.read())

        # Een vers geëxporteerd kanaal heeft periode 0: zet eerst 100 Hz
        if self.periode_ns <= 0:
            self.periode_ns = 10_000_000
            self._schrijf(f"{self.pad}/period", self.periode_ns)
            self._schrijf(f"{self.pad}/duty_cycle", self.periode_ns // 2)

        self.aan = False
        self.freq = 1e9 / self.periode_ns
        self.teller = 0.0
        self.sinds = time.monotonic()

    def _schrijf(self, pad, waarde):
        with open(pad, "w") as f:
            f.write(str(waarde))

    def _tel(self):
        # PWM telt zelf geen pulsen: schat ze uit frequentie x tijd
        nu = time.monotonic()
        if self.aan:
            self.teller += (nu - self.sinds) * self.freq
        self.sinds = nu

    def verplaatsing(self):
        """Aantal stappen sinds de vorige oproep."""
        self._tel()
        n, self.teller = self.teller, 0.0
        return n

    def zet_snelheid(self, stappen_per_s):
        self._tel()
        nieuw = int(round(1e9 / stappen_per_s))
        duty = nieuw // 2

        # duty mag nooit groter zijn dan de periode
        if nieuw >= self.periode_ns:
            self._schrijf(f"{self.pad}/period", nieuw)
            self._schrijf(f"{self.pad}/duty_cycle", duty)
        else:
            self._schrijf(f"{self.pad}/duty_cycle", duty)
            self._schrijf(f"{self.pad}/period", nieuw)

        self.periode_ns = nieuw
        self.freq = 1e9 / nieuw

    def start(self):
        if not self.aan:
            self._tel()
            self._schrijf(f"{self.pad}/enable", 1)
            self.aan = True

    def stop(self):
        if self.aan:
            self._tel()
            self._schrijf(f"{self.pad}/enable", 0)
            self.aan = False

    def sluit(self):
        try:
            self.stop()
            self._schrijf(f"{self.chip}/unexport", self.kanaal)
        except OSError:
            pass


# ============================================================
# PULSGENERATOR: SOFTWARE (reserve als PWM niet lukt)
# ============================================================

class SoftwareStappen:

    soort = "software"

    def __init__(self, pin):
        self.pin = maak_uitgang(pin, False)
        self.half = 0.5 / 100
        self.aan = False
        self.geteld = 0
        self.gemeld = 0

    def verplaatsing(self):
        n = self.geteld - self.gemeld
        self.gemeld += n
        return n

    def zet_snelheid(self, stappen_per_s):
        self.half = 0.5 / stappen_per_s

    def _lus(self):
        # Elke puls heeft een vast tijdstip. Duurt een sleep te lang, dan komt
        # de volgende puls sneller: gemiddeld klopt de snelheid dus wel.
        volgende = time.perf_counter()
        while self.aan:
            self.pin.on()
            volgende += self.half
            time.sleep(max(0.0, volgende - time.perf_counter()))
            self.pin.off()
            self.geteld += 1
            volgende += self.half
            nu = time.perf_counter()
            if nu - volgende > 0.05:
                volgende = nu   # te ver achter: niet alles in één keer inhalen
            time.sleep(max(0.0, volgende - nu))

    def start(self):
        if self.aan:
            return
        self.aan = True
        threading.Thread(target=self._lus, daemon=True).start()

    def stop(self):
        self.aan = False
        self.pin.off()

    def sluit(self):
        self.stop()
        self.pin.close()


# ============================================================
# DEMO (laptop zonder GPIO): doet alsof er motoren zijn
# ============================================================

class DemoUitgang:
    def __init__(self, *_args, **_kwargs):
        self.value = False

    def on(self):
        self.value = True

    def off(self):
        self.value = False

    def close(self):
        pass


class DemoStappen(HardwareStappen):

    soort = "demo"

    def __init__(self):
        self.aan = False
        self.freq = 100.0
        self.teller = 0.0
        self.sinds = time.monotonic()

    def zet_snelheid(self, stappen_per_s):
        self._tel()
        self.freq = float(stappen_per_s)

    def start(self):
        self._tel()
        self.aan = True

    def stop(self):
        self._tel()
        self.aan = False

    def sluit(self):
        pass


DEMO = False


def maak_uitgang(pin, waarde):
    if DEMO:
        return DemoUitgang()
    from gpiozero import OutputDevice
    return OutputDevice(pin, initial_value=waarde)


def maak_stappen(pin, chip):
    if DEMO:
        return DemoStappen()
    if chip is not None and zet_pin_op_pwm(pin):
        try:
            return HardwareStappen(chip, PWM_CHANNEL[pin])
        except OSError as fout:
            print(f"GPIO {pin}: hardware-PWM mislukt ({fout})")
    print(f"GPIO {pin}: software-pulsen worden gebruikt")
    return SoftwareStappen(pin)


# ============================================================
# AS: volgt de hoek die de simulator doorgeeft
# ============================================================

class As:

    def __init__(self, naam, chip):
        self.naam = naam
        self.stappen = maak_stappen(PINNEN[naam]["step"], chip)
        self.dir = maak_uitgang(PINNEN[naam]["dir"], False)
        self.richting = 1           # +1 of -1
        self.positie = 0.0          # geschatte stand in stappen
        self.doel = 0.0             # gewenste stand in stappen (bij ontvangst)
        self.doel_snelheid = 0.0    # stappen/s volgens de simulator
        self.freq = 0.0             # huidige snelheid met teken
        self.corrigeert = False     # bij stilstand: zijn we een fout aan het wegwerken?

    def synchroniseer(self, hoek):
        """De machine staat fysiek op deze simulatorhoek (bij Power on)."""
        self.verplaatsing_bijwerken()
        self.positie = hoek * STAPPEN_PER_RAD
        self.doel = self.positie
        self.doel_snelheid = 0.0

    def nieuw_doel(self, hoek, snelheid):
        self.doel = hoek * STAPPEN_PER_RAD
        self.doel_snelheid = snelheid * STAPPEN_PER_RAD

    def verplaatsing_bijwerken(self):
        self.positie += self.richting * self.stappen.verplaatsing()

    def zet_richting(self, richting):
        if richting == self.richting:
            return
        # Verander de DIR-pin pas nadat de pulsen gestopt en de positie bijgewerkt zijn.
        self.stappen.stop()
        self.verplaatsing_bijwerken()
        aan = (richting > 0) != OMKEREN[self.naam]
        self.dir.on() if aan else self.dir.off()
        self.richting = richting
        time.sleep(0.0005)   # DIR moet even stabiel zijn voor de volgende puls

    def regel(self, extra_tijd):
        """Een regelstap: snelheid = voorwaarts + correctie op de achterstand."""
        self.verplaatsing_bijwerken()
        doel = self.doel + self.doel_snelheid * extra_tijd
        fout = doel - self.positie

        # Stilstaand doel: kleine fouten (geschatte PWM-stappen zijn nooit exact)
        # niet bijregelen. Pas boven RUST_BAND corrigeren, dan tot binnen 2 stappen.
        # Zo tikt of zoemt de motor niet heen en weer nadat hij gestopt is.
        if abs(self.doel_snelheid) < 1.0:
            if abs(fout) > RUST_BAND:
                self.corrigeert = True
            elif abs(fout) <= 2:
                self.corrigeert = False
            if not self.corrigeert:
                self.stappen.stop()
                self.freq = 0.0
                return fout / STAPPEN_PER_RAD
        else:
            self.corrigeert = False

        f = self.doel_snelheid + KP * fout

        if abs(f) < MIN_FREQ:
            f = math.copysign(MIN_FREQ, fout) if abs(fout) > 2 else 0.0
        f = max(-MAX_FREQ, min(MAX_FREQ, f))

        if f == 0.0:
            self.stappen.stop()
        else:
            self.zet_richting(1 if f > 0 else -1)
            if abs(abs(f) - abs(self.freq)) > 0.005 * abs(f) or not self.stappen.aan:
                self.stappen.zet_snelheid(abs(f))
            self.stappen.start()
        self.freq = f
        return fout / STAPPEN_PER_RAD

    def stop(self):
        self.stappen.stop()
        self.verplaatsing_bijwerken()
        self.freq = 0.0
        self.doel = self.positie
        self.doel_snelheid = 0.0
        self.corrigeert = False

    def sluit(self):
        self.stappen.sluit()
        self.dir.close()


# ============================================================
# MACHINE: regelt de drie assen en de enable
# ============================================================

class Machine:

    def __init__(self):
        chip = None if DEMO else zoek_pwm_chip()
        if DEMO:
            print("DEMO: geen GPIO, motoren worden alleen nagebootst")
        elif chip is None:
            print("Geen hardware-PWM gevonden, controleer config.txt")
        else:
            print(f"Hardware-PWM gevonden: {chip}")

        self.enable = maak_uitgang(ENABLE, True)   # hoog = drivers uit
        self.assen = {naam: As(naam, chip) for naam in PINNEN}
        self.slot = threading.Lock()
        self.aan = False
        self.fout = ""
        self.laatste_bericht = 0.0
        self.loopt = True
        threading.Thread(target=self._regellus, daemon=True).start()

    def _drivers(self, aan):
        self.enable.off() if aan else self.enable.on()

    def _alles_stop(self, fout=""):
        for a in self.assen.values():
            a.stop()
        self._drivers(False)
        self.aan = False
        if fout:
            self.fout = fout
            print("STOP:", fout)

    def bericht(self, data):
        """Verwerkt een bericht van de browser en geeft de status terug."""
        with self.slot:
            self.laatste_bericht = time.monotonic()
            wil_aan = bool(data.get("aan"))
            assen = data.get("assen", {})

            if not wil_aan:
                # Power off in de simulator wist ook een eerdere fout
                if self.aan:
                    self._alles_stop()
                self.fout = ""
            elif self.fout:
                pass   # eerst Power off nodig
            elif not self.aan:
                # Bij inschakelen nemen we de simulatorstand als startpunt; er volgt nog geen beweging.
                for naam, a in self.assen.items():
                    a.synchroniseer(float(assen[naam][0]))
                self._drivers(True)
                self.aan = True
            else:
                # Daarna volgen we bij elk bericht de nieuwe hoek en hoeksnelheid.
                for naam, a in self.assen.items():
                    a.nieuw_doel(float(assen[naam][0]), float(assen[naam][1]))
            return self.status()

    def status(self):
        return {
            "aan": self.aan,
            "fout": self.fout,
            "motoren": {
                naam: {
                    "soort": a.stappen.soort,
                    "hoek": a.positie / STAPPEN_PER_RAD,
                    "freq": round(a.freq, 1),
                }
                for naam, a in self.assen.items()
            },
            "stappen_per_omw": round(STAPPEN_PER_RAD * 2 * math.pi),
        }

    def _regellus(self):
        periode = 1 / REGEL_HZ
        while self.loopt:
            start = time.monotonic()
            with self.slot:
                if self.aan:
                    stil = start - self.laatste_bericht
                    # Staat alles stil, dan blijven de drivers gewoon vasthouden
                    # (bv. terwijl de browser een nieuw patroon voorbereidt).
                    beweegt = any(a.doel_snelheid or a.freq for a in self.assen.values())
                    if stil > WATCHDOG and beweegt:
                        self._alles_stop("Verbinding met de bediening verloren")
                    else:
                        for naam, a in self.assen.items():
                            achter = a.regel(stil)
                            if abs(achter) > MAX_ACHTERSTAND:
                                self._alles_stop(
                                    f"Motor {naam} kan de simulator niet volgen "
                                    f"({math.degrees(achter):.0f}° achter, "
                                    f"{a.stappen.soort}-pulsen, {abs(a.freq):.0f} stappen/s)")
                                break
            time.sleep(max(0.0, periode - (time.monotonic() - start)))

    def sluit(self):
        self.loopt = False
        with self.slot:
            self._alles_stop()
            for a in self.assen.values():
                a.sluit()
            self.enable.close()


# ############################################################
#
#   DEEL 2 · SIMULATIE
#
#   >>> DIT IS EEN SAMENVATTING VAN DE SIMULATIE <<<
#
#   Hieronder staat de rekenkern van de MOTIO-simulator (Simulator/js),
#   samengebracht in één blok zodat dit bestand op zichzelf werkt. Alleen
#   de delen die nodig zijn om te tekenen zitten erin: geometrie, kinematica,
#   veiligheidscontroles, patronen, de simulatie zelf en het tekenen van het
#   papier. De 3D-weergave, montagehandleiding en onderdelenlijst niet.
#
#   De simulator blijft de bron van de waarheid. Pas je iets aan in
#   Simulator/js, kopieer het dan ook hierheen.
#
#   Aanpassingen t.o.v. Simulator/js (gemarkeerd met "SAMENVATTING:"),
#   zodat het vlot draait op de Pi:
#     - simulation.js: audit() en workspace() worden niet berekend bij elk
#       patroon. Die zijn alleen voor de validatiepagina (scheelt ~4 s).
#     - simulation.js: HOME rekent in stappen van 0,01 s (zoals tekenen),
#       niet 0,002 s. Het volledige HOME-pad wordt vooraf nog steeds gecontroleerd.
#     - collisionDetection.js: de keten van elk onderdeel wordt één keer
#       bepaald i.p.v. per paar. Zelfde resultaat, ~20 % sneller.
#     - patterns.js: patroon 'eigen' (tabblad Eigen) met safeRPM(): de papier-
#       snelheid wordt begrensd tot 70 % van alle motor- en pengrenzen.
#     - patterns.js: testpatroon 'kruis' (tabblad Machine): 4 rechte lijnen van
#       90 mm, 90° uit elkaar, om de echte machine na te meten.
#
#   Bestanden in deze samenvatting (in laadvolgorde):
#     math.js, machineGeometry.js, kinematics.js, paperTransform.js, singularityAnalysis.js, collisionDetection.js, structuralEstimate.js, motorAnalysis.js, mechanics.js, validation.js, bubbleText.js, patterns.js, simulation.js, renderers.js
#
# ############################################################

SIMULATIE = r'''
// ---------- Simulator/js/math.js ----------
(function () {
'use strict';
const TAU = 2 * Math.PI;
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
const cross = (a,b) => a.x*b.y-a.y*b.x;
const subtract = (a,b) => ({x:a.x-b.x,y:a.y-b.y});
function pointSegment(p,a,b) {
 const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;
 const t=den ? Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/den)) : 0;
 return distance(p,{x:a.x+t*dx,y:a.y+t*dy});
}
function segmentsDistance(a,b,c,d) {
 const ab=subtract(b,a),cd=subtract(d,c),den=cross(ab,cd);
 if(Math.abs(den)>1e-9) {
  const ca=subtract(c,a),t=cross(ca,cd)/den,u=cross(ca,ab)/den;
  if(t>=0&&t<=1&&u>=0&&u<=1)return 0;
 }
 return Math.min(pointSegment(a,c,d),pointSegment(b,c,d),pointSegment(c,a,b),pointSegment(d,a,b));
}
const gearPitchRadius=(teeth,module)=>teeth*module/2;
const gearCenter=(motorTeeth,outputTeeth,module)=>gearPitchRadius(motorTeeth,module)+gearPitchRadius(outputTeeth,module);
window.MotioMath={TAU,distance,cross,subtract,pointSegment,segmentsDistance,gearPitchRadius,gearCenter};
})();

// ---------- Simulator/js/machineGeometry.js ----------
(function () {
'use strict';
// Length mm, angle rad, time s, force N, mass kg; motor calculations convert to SI.
const DEFAULT_CONFIG=Object.freeze({patternId:'flower5',wordText:'MOTIO',rpmA:.8,rpmB:-.425,rpmC:-1.8,phaseA:49.0031578912355,phaseB:154.84031330144893,phaseC:0,radiusA:65,radiusB:65,lengthA:180,lengthB:160,
 pivotAx:280,pivotAy:180,pivotBx:160,pivotBy:100,paperX:150,paperY:280,paperRadius:105,paperMargin:10,paperThickness:6,paperMass:.45,
 stiffenerThickness:0,hubHeight:5,hubRadius:9.5,hubBoltRadius:6.35,armHardwareMass:.03,crankDensity:1240,loadReserve:1.1,
 motorStepAngle:1.8,motorCurrent:1.68,motorVoltage:2.8,motorHoldingTorque:.36,motorWidth:42.3,motorLength:38,motorShaftDiameter:5,motorMountPitch:31,
 motorSupplyVoltage:24,motorDriveCurrent:1.68,motorStepsPerFullStep:8,motorCurveConditionsConfirmed:0,motorRadialLimit:28,motorRadialReference:20,motorAxialLimit:10,
 rodWidth:24,rodHeight:16,rodWall:3,materialE:1800,density:1240,crankWidth:24,crankHeight:6,rodZA:44,rodZB:65,crankZA:21,crankZB:30,
 baseX:0,baseY:0,baseWidth:358,baseHeight:404,baseThickness:6,bottomThickness:6,boxHeight:112,wallThickness:6,frameBraceX:8,paperZ:23,clearance:3,branch:-1,
 // Direct 1:1 drive: motor and output have the same speed and direction.
 // Keep SIMV7 motion limits. The half-step datasheet curve cannot prove
 // capacity at these low speeds or with the default 1/8 driver setting.
 maxRPM:8,maxPaperRPM:16,acceleration:1,paperAcceleration:3,maxPenSpeed:120,maxPenAcceleration:150,
 dragForce:2,verticalForce:2,efficiency:.95,frictionAB:.025,frictionC:.03,rotorInertia:0.0000068,couplingInertia:0.0000005,penMass:.10,
 penDiameter:10,penMinDiameter:6,penMaxDiameter:12,holderRadius:14,jointRadius:20,jointShaftRadius:10,jointBoreRadius:6.5,
 conditionCaution:10,conditionCritical:100,transmissionCaution:.20,transmissionCritical:.05,parallelStop:.10,workspaceStep:10,testResolution:48,positionTolerance:.5,deflectionLimit:.5,reachAngle:-130});
const cache=new WeakMap();
function normalize(input={}) {
 const c={...DEFAULT_CONFIG,...input};
 // Imported SIMV7 configurations keep their motion settings; obsolete gearing
 // parameters cannot introduce a transmission into this direct-drive version.
 for(const k of ['outputTeethA','outputTeethB','outputTeethC','motorTeeth','gearModule','motorDirectionA','motorDirectionB','motorDirectionC','gearInertia','couplingRadius','couplingHeight','spindleBearingLow','spindleBearingHigh'])delete c[k];
 for(const k of Object.keys(DEFAULT_CONFIG))if(!['patternId','wordText'].includes(k)&&!Number.isFinite(c[k]))throw Error('Ongeldige parameter: '+k);
 if(typeof c.wordText!=='string')throw Error('Gebruik 1 tot 8 letters (A–Z).');
 c.wordText=c.wordText.trim().toUpperCase();
 if(!/^[A-Z]{1,8}$/.test(c.wordText))throw Error('Gebruik 1 tot 8 letters (A–Z), zonder spaties of cijfers.');
 if(typeof c.patternId!=='string'||(c.patternId&&window.MotioPatterns&&!window.MotioPatterns.get(c.patternId)))throw Error('Onbekend patroon');
 for(const k of ['radiusA','radiusB','lengthA','lengthB','paperRadius','paperThickness','paperMass','rodWidth','rodHeight','rodWall','materialE','density','efficiency','workspaceStep','baseWidth','baseHeight','baseThickness','boxHeight','wallThickness','penDiameter','bottomThickness','hubHeight','hubRadius','hubBoltRadius','crankDensity','loadReserve','motorStepAngle','motorCurrent','motorVoltage','motorWidth','motorLength','motorShaftDiameter','motorMountPitch','motorStepsPerFullStep','motorRadialLimit','motorRadialReference','motorAxialLimit'])if(c[k]<=0)throw Error(k+' moet positief zijn');
 if(c.stiffenerThickness!==0)throw Error('SIMV7 gebruikt geen metalen verstevigingsplaatjes');
 if(c.hubRadius<=c.hubBoltRadius+1.5||c.hubHeight<5||c.loadReserve<1)throw Error('Naafgeometrie of belastingsreserve ongeldig');
 if(![1,2,4,8,16,32].includes(c.motorStepsPerFullStep))throw Error('Microstepping: kies 1, 2, 4, 8, 16 of 32');
 if(c.boxHeight<=2*c.baseThickness||2*c.wallThickness>=Math.min(c.baseWidth,c.baseHeight))throw Error('Ongeldige box- of wandafmetingen');
 if(c.rodWall*2>=Math.min(c.rodWidth,c.rodHeight))throw Error('Kokerwand sluit de doorsnede');
 if(![-1,1].includes(c.branch)||c.clearance<0||c.efficiency>1)throw Error('Ongeldige branch, vrijloop of efficiëntie');
 if(c.penDiameter<c.penMinDiameter||c.penDiameter>c.penMaxDiameter||c.penMaxDiameter>=c.jointBoreRadius*2)throw Error('Pen past niet in doorlopende boring');
 if(c.paperMargin<0||c.paperMargin>=c.paperRadius)throw Error('Ongeldige papiermarge');

 for(const key of ['A','B','C'])if(c.motorCurves?.[key]) {
  const curve=c.motorCurves[key];
  if(!Array.isArray(curve.points)||curve.points.length<2||!curve.source)throw Error('Motorcurve vereist bron en minstens twee [RPM, Nm]-punten');
  curve.points.forEach((p,i)=>{if(!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v)||v<0)||(i&&p[0]<=curve.points[i-1][0]))throw Error('Motorcurve: oplopende RPM en niet-negatief koppel vereist');});
 }
 // A frozen snapshot prevents cached geometry drifting away from its configuration.
 for(const k of ['maxRPM','maxPaperRPM','acceleration','paperAcceleration','maxPenSpeed','maxPenAcceleration','positionTolerance','deflectionLimit'])if(c[k]<=0)throw Error(k+' moet positief zijn');
 for(const k of ['dragForce','verticalForce','penMass','rotorInertia','couplingInertia','frictionAB','frictionC'])if(c[k]<0)throw Error(k+' mag niet negatief zijn');
 if(c.workspaceStep<2||c.workspaceStep>50||c.testResolution<8||c.testResolution>180||!Number.isInteger(c.testResolution))throw Error('Workspace stap 2–50 mm; testresolutie 8–180 geheel');
 if(![0,1].includes(c.motorCurveConditionsConfirmed))throw Error('Drivercondities moeten 0 of 1 zijn');
 if(!(0<c.transmissionCritical&&c.transmissionCritical<c.transmissionCaution&&c.transmissionCaution<1&&c.conditionCaution>1&&c.conditionCritical>c.conditionCaution&&c.parallelStop>0&&c.parallelStop<1))throw Error('Ongeldige singulariteitsgrenzen');
 const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
 return freeze(structuredClone(c));
}
function build(c=DEFAULT_CONFIG) {
 if(cache.has(c))return cache.get(c);
 const paper={x:c.paperX,y:c.paperY,radius:c.paperRadius,safeRadius:c.paperRadius-c.paperMargin,z:c.paperZ,thickness:c.paperThickness,width:2*c.paperRadius,height:2*c.paperRadius,margin:c.paperMargin,mass:c.paperMass};
 const motorZ=-c.motorLength/2;
 const g={...c,base:{x:c.baseX,y:c.baseY,width:c.baseWidth,height:c.baseHeight,z:0,thickness:c.baseThickness},box:{height:c.boxHeight,wall:c.wallThickness,bottom:c.baseThickness-c.boxHeight,bottomThickness:c.bottomThickness},paper,driveSign:1,
  motor:{model:'SY42STH38-1684A',width:c.motorWidth,length:c.motorLength,shaftRadius:c.motorShaftDiameter/2,shaftLength:24,shaftMin:23,shaftMax:25,mountingPitch:c.motorMountPitch,mountingHole:'M3',holeDepth:4.5,bossRadius:11,bossHeight:4.5,z:motorZ},
  hub:{radius:c.hubRadius,height:c.hubHeight,boltRadius:c.hubBoltRadius,source:'Pololu 1998',pilotRadius:0,pilotHeight:0,rootRadius:17,bore:c.motorShaftDiameter/2},bearingP:{inner:10,outer:16,height:7},
  pen:{min:c.penMinDiameter,max:c.penMaxDiameter,radius:c.penDiameter/2,holderRadius:c.holderRadius,jointRadius:c.jointRadius,shaftRadius:c.jointShaftRadius,boreRadius:c.jointBoreRadius,clampZ:Math.max(c.rodZA,c.rodZB)+c.rodHeight/2+c.clearance+13,knobRadius:8,knobReach:36},
  material:{name:'PLA · E conservatief 1800 MPa, printproef vereist',E:c.materialE,density:c.density,verified:false},
  hardware:{motorBolt:10,washerM3:.8,hubWasher:.5,hubBolt:10,hubBoltB:14,plateBolt:10,washerM8:1.6,nutM8:8,stiffenerSize:60,stiffenerThickness:c.stiffenerThickness,flangeThickness:c.hubHeight,flangeRadius:c.hubRadius,flangePitch:c.hubBoltRadius}};
 for(const key of ['A','B','C']) {
  const pivot=key==='C'?{x:paper.x,y:paper.y}:{x:c['pivot'+key+'x'],y:c['pivot'+key+'y']};
  const top=key==='C'?paper.z-paper.thickness/2:c['crankZ'+key]-c.crankHeight/2-(key==='B'?4:0);
  g[key]={pivot,motor:{...pivot},crankZ:c['crankZ'+key],rodZ:c['rodZ'+key],hubBottom:top-c.hubHeight,hubTop:top,ratio:1,motorSign:1};
 }
 g.mounting={threadEngagement:g.hardware.motorBolt-c.baseThickness-c.stiffenerThickness-g.hardware.washerM3,shaftAboveDeck:24-c.baseThickness,bossAboveDeck:4.5-c.baseThickness};
 g.tubeArea=c.rodWidth*c.rodHeight-(c.rodWidth-2*c.rodWall)*(c.rodHeight-2*c.rodWall);
 g.tubeI=(c.rodWidth*c.rodHeight**3-(c.rodWidth-2*c.rodWall)*(c.rodHeight-2*c.rodWall)**3)/12;
 g.tubeIxy=(c.rodHeight*c.rodWidth**3-(c.rodHeight-2*c.rodWall)*(c.rodWidth-2*c.rodWall)**3)/12;
 cache.set(c,g);cache.set(g,g);return g;
}
// The same primitive envelopes feed 3D, sections, picking and collision checking.
function bodies(g,pose,detail=true) {
 const all=[],add=(id,bom,group,shape,props)=>all.push({id,bom,group,shape,instance:id,mount:bom,...props});
 const box=(id,bom,group,x,y,z,w,l,h,props={})=>add(id,bom,group,'box',{x,y,z,w,l,h,...props});
 const cyl=(id,bom,group,x,y,z,r,h,inner=0,props={})=>add(id,bom,group,inner?'ring':'cylinder',{x,y,z,r,h,inner,...props});
 const beam=(id,bom,group,a,b,z,w,h,props={})=>add(id,bom,group,'beam',{a,b,z,w,h,...props});
 const pitch=g.motor.mountingPitch/2,b=g.base;
 const motorHoles=()=>[-1,1].flatMap(x=>[-1,1].map(y=>({x:x*pitch,y:y*pitch,r:1.8,h:20})));
 const hubHoles=(angle,h,r=1.7)=>Array.from({length:4},(_,i)=>({x:g.hub.boltRadius*Math.cos(angle+i*Math.PI/2),y:g.hub.boltRadius*Math.sin(angle+i*Math.PI/2),r,h}));
 const bolt=(id,bom,mount,x,y,top,length,washer=0,csk=false,key=null)=>{
  if(!detail&&!id.startsWith('crankFix'))return; // Fixed mounting screws checked by mountingFit.
  const props={mount,instance:id,...(key?{assemblyGroup:'unit'+key}:{})};
  cyl(id+'-stem',bom,'fastener',x,y,top+washer-length/2,1.5,length,0,props);
  cyl(id+'-head',bom,'fastener',x,y,csk?top-.85:top+washer+1.5,csk?2.8:2.75,csk?1.7:3,0,props);
  if(washer)cyl(id+'-washer',bom==='M3-BOLT'?'M3-WASHER':'HUB-WASHER','fastener',x,y,top+washer/2,bom==='M3-BOLT'?4.5:3.5,washer,1.6,{...props,instance:id+'-washer'});
 };
 for(const [id,z] of [['BASE',3]]){
  box(id,'BASE','frame',b.x+b.width/2,b.y+b.height/2,z,b.width,b.height,6);
  all.at(-1).holes=[];
  for(const key of ['A','B','C']){const o=g[key].pivot;all.at(-1).holes.push({x:o.x-b.width/2,y:o.y-b.height/2,r:11.25,h:20},...motorHoles().map(h=>({...h,x:h.x+o.x-b.width/2,y:h.y+o.y-b.height/2})));}
  all.at(-1).slots=[140,240].flatMap(y=>[100,250].map(x=>({x:x-b.width/2,y:y-b.height/2,w:20.2,l:6.2})));
 }
 const wall=g.box.wall,lo=g.box.bottom+g.box.bottomThickness;
 box('box-bottom','BOTTOM','frame',b.width/2,b.height/2,g.box.bottom+g.box.bottomThickness/2,b.width,b.height,g.box.bottomThickness);
 box('box-back','WALL-FB','frame',b.width/2,wall/2,lo/2,b.width,wall,-lo);
 box('box-front','WALL-FB','frame',b.width/2,b.height-wall/2,lo/2,b.width,wall,-lo);
 box('box-left','WALL-LR','frame',wall/2,b.height/2,lo/2,wall,b.height-2*wall,-lo);
 box('box-right','WALL-LR','frame',b.width-wall/2,b.height/2,lo/2,wall,b.height-2*wall,-lo);
 for(const [i,y] of [140,240].entries()){
  const props={instance:'brace'+i};
  box('brace'+i,'RIB','frame',b.width/2,y,-15,b.width-2*wall,6,30,props);
  for(const [j,x] of [100,250].entries())box('braceTab'+i+j,'RIB','frame',x,y,3,20,6,6,props);
 }
 for(const key of ['A','B','C']){
  const d=g[key],o=d.pivot,a=pose?.q?.[key]||0,unit={instance:'motor'+key};
  box('motor'+key,'MOTOR','drive',o.x,o.y,g.motor.z,g.motor.width,g.motor.width,g.motor.length,{...unit,holes:motorHoles().map(h=>({...h,z:g.motor.length/2-g.motor.holeDepth/2,r:1.5,h:g.motor.holeDepth}))});
  cyl('motorShaft'+key,'MOTOR','shaft',o.x,o.y,12,g.motor.shaftRadius,24,0,unit);
  cyl('motorBoss'+key,'MOTOR','shaft',o.x,o.y,2.25,11,4.5,g.motor.shaftRadius,unit);
  for(const x of [-1,1])for(const y of [-1,1])bolt('motorFix'+key+x+','+y,'M3-BOLT','MOTOR-FIX',o.x+x*pitch,o.y+y*pitch,b.thickness,g.hardware.motorBolt,g.hardware.washerM3);
  const hc={instance:'hub'+key,mount:'HUB-'+key,assemblyGroup:'unit'+key};
  cyl('hub'+key,'HUB','drive',o.x,o.y,(d.hubBottom+d.hubTop)/2,g.hub.radius,g.hub.height,g.hub.bore,{...hc,holes:[...hubHoles(a,7,1.5),{axis:'x',angle:a+Math.PI/4,x:6*Math.cos(a+Math.PI/4),y:6*Math.sin(a+Math.PI/4),r:1.5,h:10}]});
  // One supplied radial M3 set screw; the 1.5 mm Allen key reaches it from outside.
  const ang=a+Math.PI/4;
  cyl('hubSet'+key,'HUB-SET','fastener',o.x+6.5*Math.cos(ang),o.y+6.5*Math.sin(ang),(d.hubBottom+d.hubTop)/2,1.5,8,0,{axis:'x',angle:ang,mount:'HUB-LOCK-'+key,assemblyGroup:'unit'+key,approachSign:1,instance:'hubSet'+key});
 }
 const p=g.paper,angle=pose?.q?.C||0;
 cyl('platter','PL','platter',p.x,p.y,p.z,p.radius,p.thickness,0,{assemblyGroup:'unitC',holes:[{x:0,y:0,r:2.8,h:p.thickness+2},...hubHoles(angle,p.thickness+2),...hubHoles(angle,1.72,2.9).map(h=>({...h,z:p.thickness/2-.85}))]});
 for(let i=0;i<4;i++){const a=angle+i*Math.PI/2;bolt('plateFix'+i,'PL-BOLT','PL-FIX',p.x+g.hub.boltRadius*Math.cos(a),p.y+g.hub.boltRadius*Math.sin(a),p.z+p.thickness/2,g.hardware.plateBolt,0,true,'C');}
 cyl('paper','PAPER','paper',p.x,p.y,p.z+p.thickness/2+.1,p.radius,.2);
 if(!pose?.valid)return all;
 for(const key of ['A','B']){
  const d=g[key],e=key==='A'?pose.a:pose.b,a=pose.q[key],uK={x:(e.x-d.pivot.x)/g['radius'+key],y:(e.y-d.pivot.y)/g['radius'+key]},crank={instance:'K-'+key,assemblyGroup:'unit'+key};
  beam('crank'+key,'K-'+key,'moving',{x:d.pivot.x+12*uK.x,y:d.pivot.y+12*uK.y},{x:e.x-5*uK.x,y:e.y-5*uK.y},d.crankZ,g.crankWidth,g.crankHeight,crank);
  cyl('crankHub'+key,'K-'+key,'moving',d.pivot.x,d.pivot.y,d.crankZ,g.hub.rootRadius,g.crankHeight,2.8,{...crank,holes:hubHoles(a,12)});
  if(key==='B')cyl('crankBossB','K-B','moving',d.pivot.x,d.pivot.y,d.hubTop+2,14,4,2.8,{...crank,holes:hubHoles(a,12)});
  cyl('crankEnd'+key,'K-'+key,'moving',e.x,e.y,d.crankZ,12,g.crankHeight,4.2,crank);
  for(let i=0;i<4;i++){const q=a+i*Math.PI/2;bolt('crankFix'+key+i,key==='A'?'HUB-BOLT-A':'HUB-BOLT-B','K-FIX-'+key,d.pivot.x+g.hub.boltRadius*Math.cos(q),d.pivot.y+g.hub.boltRadius*Math.sin(q),d.crankZ+g.crankHeight/2,key==='A'?g.hardware.hubBolt:g.hardware.hubBoltB,.5,false,key);}
  const L=g['length'+key],u={x:(pose.pen.x-e.x)/L,y:(pose.pen.y-e.y)/L},arm={instance:'L-'+key};
  beam('rod'+key,'L-'+key,'moving',{x:e.x+12*u.x,y:e.y+12*u.y},{x:pose.pen.x-(g.pen.jointRadius-2)*u.x,y:pose.pen.y-(g.pen.jointRadius-2)*u.y},d.rodZ,g.rodWidth,g.rodHeight,{...arm,wall:g.rodWall});
  const top=d.crankZ+g.crankHeight/2,seat=d.rodZ-3.5,post={instance:'E-'+key};
  cyl('elbow'+key,'E-'+key,'moving',e.x,e.y,(top+seat-2)/2,7,seat-top-2,4.2,post);
  cyl('elbowNeck'+key,'E-'+key,'moving',e.x,e.y,seat-1,6,2,4.2,post);
  const under=d.crankZ-g.crankHeight/2-g.hardware.washerM8,length=key==='A'?50:60,mount='ELBOW-BOLT-'+key;
  cyl('elbowBolt'+key,key==='A'?'M8-BOLT-A':'M8-BOLT-B','moving',e.x,e.y,under+length/2,4,length,0,{mount,instance:'elbowBolt'+key});
  cyl('elbowHead'+key,key==='A'?'M8-BOLT-A':'M8-BOLT-B','moving',e.x,e.y,under-2.65,7.51,5.3,0,{mount,instance:'elbowBolt'+key,segments:6});
  cyl('elbowWasher'+key+'-1','M8-WASHER','moving',e.x,e.y,under+.8,8,1.6,4.2,{mount});
  const upper=d.rodZ+g.rodHeight/2;
  cyl('elbowSpacer'+key,'E-SPACER','moving',e.x,e.y,d.rodZ+5.75,6,4.5,4.2,{mount:'ELBOW-FIX'});
  cyl('elbowWasher'+key+'1','M8-WASHER','moving',e.x,e.y,upper+.8,8,1.6,4.2,{mount:'ELBOW-FIX'});
  cyl('elbowNut'+key,'M8-NUT','moving',e.x,e.y,upper+1.6+4,7.51,8,4,{mount:'ELBOW-FIX',segments:6});
  for(const [id,pt] of [['E',e],['P',pose.pen]]){
   const big=id==='P',outer=big?16:11.05,bore=big?12.3:7.3;
   cyl('end'+id+key,'L-'+key,'moving',pt.x,pt.y,d.rodZ,big?g.pen.jointRadius:15,g.rodHeight,outer,arm);
   cyl('armShoulder'+id+key,'L-'+key,'moving',pt.x,pt.y,d.rodZ-5.75,outer,4.5,bore,arm);
   cyl('joint'+id+key,big?'6804':'608','joint',pt.x,pt.y,d.rodZ,big?16:11,7,big?10:4,{mount:(big?'6804-':'608-JOINT-')+key});
  }
 }
 const pt=pose.pen,low=g.A.rodZ,high=g.B.rodZ,z=g.pen.clampZ,bottom=low-8.5,top=z-3.5;
 const carrier={instance:'penCarrier'};
 cyl('penSleeve','P','pen',pt.x,pt.y,(bottom+top)/2,9.95,top-bottom,6.5,carrier);
 cyl('penShoulder','P','pen',pt.x,pt.y,low-6,12,5,6.5,carrier);
 cyl('penSpacer','SP-P','pen',pt.x,pt.y,(low+high)/2,12,high-low-7,10.1);
 cyl('penTopSpacer','SP-P-TOP','pen',pt.x,pt.y,(high+3.5+z-11)/2,12,z-11-high-3.5,10.1);
 const holder={instance:'holder',holes:[{x:0,y:0,z:-7,r:10.1,h:8.02},{axis:'x',x:10,y:0,r:2.2,h:12},{axis:'x',x:7,y:0,r:4.4,h:5},{axis:'x',x:12.7,y:0,r:4.15,h:3.6,segments:6}],slots:[{x:12,y:0,z:-7,w:24,l:1,h:8.02}]};
 cyl('holder','PEN','pen',pt.x,pt.y,z,g.pen.holderRadius,22,g.pen.boreRadius,holder);
 for(const sign of [-1,1])box('holderEar'+sign,'PEN','pen',pt.x+15.5,pt.y+sign*3.75,z-7,11,6.5,8,{instance:'holder',holes:[{axis:'x',angle:Math.PI/2,x:1.5,y:0,z:0,r:1.7,h:20},...(sign>0?[{axis:'x',angle:Math.PI/2,x:1.5,y:1.8,r:3.3,h:3,segments:6}]:[])]});
 cyl('holderClampBolt','COLLAR-BOLT','pen',pt.x+17,pt.y,z-7,1.5,20,0,{axis:'x',angle:Math.PI/2});
 cyl('holderClampHead','COLLAR-BOLT','pen',pt.x+17,pt.y-8.5,z-7,2.75,3,0,{axis:'x',angle:Math.PI/2,instance:'holderClampBolt'});
 // Count both screw primitives as one purchased screw.
 all.find(v=>v.id==='holderClampBolt').instance='holderClampBolt';
 cyl('holderClampNut','M3-NUT','pen',pt.x+17,pt.y+5.7,z-7,3.18,2.4,1.5,{axis:'x',angle:Math.PI/2,segments:6});
 cyl('penClampNut','M4-NUT','pen',pt.x+12.3,pt.y,z,4.04,3.2,2,{axis:'x',segments:6});
 const bush={instance:'penBush'};
 cyl('centeringBush','BUSH','pen',pt.x,pt.y,z+4,g.pen.boreRadius,14,g.pen.radius+.15,{...bush,slots:[{x:6,y:0,w:5,l:1}],holes:[{axis:'x',x:5.5,y:0,z:-4,r:4.4,h:8}]});
 cyl('bushFlange','BUSH','pen',pt.x,pt.y,z+11.5,8,1,g.pen.radius+.15,bush);
 const screwStart=g.pen.radius+3;
 cyl('clampScrew','CLAMP-SCREW','pen',pt.x+(screwStart+33)/2,pt.y,z,2,25,0,{axis:'x'});
 box('clampPad','PAD','pen',pt.x+g.pen.radius+1,pt.y,z,2,6,6);
 box('clampKnob','KNOB','pen',pt.x+33,pt.y,z,6,16,16,{holes:[{axis:'x',x:0,y:0,r:2.2,h:10},{axis:'x',x:1.5,y:0,r:4.15,h:3.1,segments:6}]});
 const tip=p.z+p.thickness/2+.2,penTop=z+21;
 cyl('pen','PEN-TOOL','pen',pt.x,pt.y,(tip+penTop)/2,g.pen.radius,penTop-tip);
 return all;
}
// Shared exterior bounds for the isolated component view and compound BOM dimensions.
function bounds(parts){
 const limits=parts.map(b=>{
  const a=b.angle||0,beam=b.shape==='beam';
  return {x:beam?(b.a.x+b.b.x)/2:b.x,y:beam?(b.a.y+b.b.y)/2:b.y,z:b.z,
   w:beam?Math.abs(b.b.x-b.a.x)+b.w:b.axis==='x'?Math.abs(Math.cos(a))*b.h+Math.abs(Math.sin(a))*2*b.r:b.w||2*b.r,
   l:beam?Math.abs(b.b.y-b.a.y)+b.w:b.axis==='x'?Math.abs(Math.sin(a))*b.h+Math.abs(Math.cos(a))*2*b.r:b.l||2*b.r,h:b.axis==='x'?2*b.r:b.h};
 });
 const result={};for(const [axis,size] of [['x','w'],['y','l'],['z','h']]){
  const lo=Math.min(...limits.map(b=>b[axis]-b[size]/2)),hi=Math.max(...limits.map(b=>b[axis]+b[size]/2));result[axis]=(lo+hi)/2;result[size]=hi-lo;
 }return result;
}
// Small polygon cuts for visible drilled passages. No CSG dependency or thread model.
// Planes use n·p <= d; subtracting a convex hole leaves convex drawable fragments.
function clipPolygon(points,plane){
 const out=[],distance=p=>plane.x*p.x+plane.y*p.y+plane.z*p.z-plane.d;
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length],da=distance(a),db=distance(b),ina=da<=1e-8,inb=db<=1e-8;
  if(ina)out.push(a);
  if(ina!==inb){const t=da/(da-db);out.push({x:a.x+t*(b.x-a.x),y:a.y+t*(b.y-a.y),z:a.z+t*(b.z-a.z)});}
 }
 if(out.length<3)return [];
 const area={x:0,y:0,z:0};
 for(let i=0;i<out.length;i++){const a=out[i],b=out[(i+1)%out.length];area.x+=a.y*b.z-a.z*b.y;area.y+=a.z*b.x-a.x*b.z;area.z+=a.x*b.y-a.y*b.x;}
 return Math.hypot(area.x,area.y,area.z)>1e-7?out:[];
}
function subtractPolygon(points,planes){
 if(points.length<3)return [];
 if(planes.some(n=>points.every(p=>n.x*p.x+n.y*p.y+n.z*p.z>n.d-1e-8)))return [points];
 const pieces=[];let inside=points;
 for(const plane of planes){
  if(inside.length<3)break;
  const outside=clipPolygon(inside,{x:-plane.x,y:-plane.y,z:-plane.z,d:-plane.d});
  if(outside.length>=3)pieces.push(outside);
  inside=clipPolygon(inside,plane);
 }
 return pieces;
}
function prism(center,r,h,axis='z',angle=0,count=24){
 const n=axis==='x'?{x:Math.cos(angle),y:Math.sin(angle),z:0}:{x:0,y:0,z:1};
 const u=axis==='x'?{x:0,y:0,z:1}:{x:1,y:0,z:0},v=axis==='x'?{x:-Math.sin(angle),y:Math.cos(angle),z:0}:{x:0,y:1,z:0};
 const plane=(normal,offset)=>({...normal,d:normal.x*center.x+normal.y*center.y+normal.z*center.z+offset});
 const planes=[plane(n,h/2),plane({x:-n.x,y:-n.y,z:-n.z},h/2)];
 const point=(a,t)=>({x:center.x+n.x*t+r*(u.x*Math.cos(a)+v.x*Math.sin(a)),y:center.y+n.y*t+r*(u.y*Math.cos(a)+v.y*Math.sin(a)),z:center.z+n.z*t+r*(u.z*Math.cos(a)+v.z*Math.sin(a))});
 for(let i=0;i<count;i++){const a=(i+.5)*Math.PI*2/count;planes.push(plane({x:u.x*Math.cos(a)+v.x*Math.sin(a),y:u.y*Math.cos(a)+v.y*Math.sin(a),z:u.z*Math.cos(a)+v.z*Math.sin(a)},r*Math.cos(Math.PI/count)));}
 return {planes,point,count};
}
function surfaces(b){
 const faces=[],push=(points,shade=1)=>{if(points.length>=3)faces.push({points,shade});},lo=b.z-b.h/2,hi=b.z+b.h/2;
 const quad=(a,c,d,e,shade)=>push([a,c,d,e],shade),p=(x,y,z)=>({x,y,z});
 if(b.shape==='box'){
  const x=b.x-b.w/2,X=b.x+b.w/2,y=b.y-b.l/2,Y=b.y+b.l/2;
  quad(p(x,y,lo),p(X,y,lo),p(X,Y,lo),p(x,Y,lo),.55);quad(p(x,y,hi),p(X,y,hi),p(X,Y,hi),p(x,Y,hi));
  quad(p(x,y,lo),p(X,y,lo),p(X,y,hi),p(x,y,hi),.72);quad(p(X,y,lo),p(X,Y,lo),p(X,Y,hi),p(X,y,hi),.82);
  quad(p(X,Y,lo),p(x,Y,lo),p(x,Y,hi),p(X,Y,hi),.64);quad(p(x,Y,lo),p(x,y,lo),p(x,y,hi),p(x,Y,hi),.75);
 }else{
  const count=b.segments||(b.r>100?72:b.r<=7?16:32),arc=b.arc||Math.PI*2;
  if(b.inner){
   for(let i=0;i<count;i++){
    const a=i*arc/count,t=(i+1)*arc/count,pt=(angle,r,z)=>p(b.x+r*Math.cos(angle),b.y+r*Math.sin(angle),z);
    quad(pt(a,b.r,hi),pt(t,b.r,hi),pt(t,b.inner,hi),pt(a,b.inner,hi));
    quad(pt(a,b.r,lo),pt(t,b.r,lo),pt(t,b.inner,lo),pt(a,b.inner,lo),.6);
    quad(pt(a,b.r,lo),pt(t,b.r,lo),pt(t,b.r,hi),pt(a,b.r,hi),.8);
    quad(pt(a,b.inner,lo),pt(t,b.inner,lo),pt(t,b.inner,hi),pt(a,b.inner,hi),.5);
   }
   if(b.arc)for(const a of [0,arc])quad(p(b.x+b.r*Math.cos(a),b.y+b.r*Math.sin(a),lo),p(b.x+b.inner*Math.cos(a),b.y+b.inner*Math.sin(a),lo),p(b.x+b.inner*Math.cos(a),b.y+b.inner*Math.sin(a),hi),p(b.x+b.r*Math.cos(a),b.y+b.r*Math.sin(a),hi),.75);
  }else{
   const cuts=[lo,hi,...(b.flats||[]).flatMap(f=>[b.z+f.z-f.h/2,b.z+f.z+f.h/2])].filter(z=>z>=lo&&z<=hi).sort((a,c)=>a-c);
   for(let band=1;band<cuts.length;band++){
    const z0=cuts[band-1],z1=cuts[band];if(z1-z0<1e-8)continue;
    let profile=Array.from({length:count},(_,i)=>p(b.x+b.r*Math.cos(i*Math.PI*2/count),b.y+b.r*Math.sin(i*Math.PI*2/count),z0));
    for(const flat of b.flats||[])if(Math.abs((z0+z1)/2-b.z-flat.z)<flat.h/2)profile=clipPolygon(profile,{x:Math.cos(flat.angle),y:Math.sin(flat.angle),z:0,d:b.x*Math.cos(flat.angle)+b.y*Math.sin(flat.angle)+b.r-flat.depth});
    const top=profile.map(pt=>({...pt,z:z1}));push(profile,.55);push(top);
    for(let i=0;i<profile.length;i++)quad(profile[i],profile[(i+1)%profile.length],top[(i+1)%profile.length],top[i],.75);
   }
  }
 }
 if(!b.holes?.length&&!b.slots?.length)return faces;
 const holes=(b.holes||[]).map(h=>prism({x:b.x+(h.x||0),y:b.y+(h.y||0),z:b.z+(h.z||0)},h.r,h.h,h.axis,h.angle,h.segments||32));
 const host=b.shape==='box'?[
  {x:1,y:0,z:0,d:b.x+b.w/2},{x:-1,y:0,z:0,d:-b.x+b.w/2},{x:0,y:1,z:0,d:b.y+b.l/2},{x:0,y:-1,z:0,d:-b.y+b.l/2},{x:0,y:0,z:1,d:hi},{x:0,y:0,z:-1,d:-lo}
 ]:prism(b,b.r,b.h,'z',0,b.segments||(b.r>100?72:b.r<=7?16:32)).planes;
 const bore=b.inner?prism(b,b.inner,b.h+2,'z',0,b.segments||(b.r>100?72:b.r<=7?16:32)).planes:null;
 const walls=[];
 for(const [index,hole] of holes.entries()){
  const candidates=Array.from({length:hole.count},(_,i)=>[hole.point(i*Math.PI*2/hole.count,-b.holes[index].h/2),hole.point((i+1)*Math.PI*2/hole.count,-b.holes[index].h/2),hole.point((i+1)*Math.PI*2/hole.count,b.holes[index].h/2),hole.point(i*Math.PI*2/hole.count,b.holes[index].h/2)]);
  for(const sign of [-1,1]){
   const cap=Array.from({length:hole.count},(_,i)=>hole.point(i*Math.PI*2/hole.count,sign*b.holes[index].h/2)),center=cap.reduce((s,v)=>({x:s.x+v.x/hole.count,y:s.y+v.y/hole.count,z:s.z+v.z/hole.count}),{x:0,y:0,z:0});
   if(host.every(n=>n.x*center.x+n.y*center.y+n.z*center.z<n.d-1e-5))candidates.push(cap);
  }
  for(let polygon of candidates){
   for(const plane of host)polygon=clipPolygon(polygon,plane);
   let pieces=bore?subtractPolygon(polygon,bore):[polygon];
   for(const [j,other] of holes.entries())if(j!==index)pieces=pieces.flatMap(f=>subtractPolygon(f,other.planes));
   walls.push(...pieces.filter(f=>f.length>=3).map(points=>({points,shade:.42})));
  }
 }
 let result=faces;
 for(const hole of holes)result=result.flatMap(f=>subtractPolygon(f.points,hole.planes).map(points=>({points,shade:f.shade})));
 let visible=[...result,...walls];
 for(const slot of b.slots||[]){
  const a=slot.angle||0,c=Math.cos(a),s=Math.sin(a),cx=b.x+slot.x,cy=b.y+slot.y;
  const planes=[{x:c,y:s,z:0,d:c*cx+s*cy+slot.w/2},{x:-c,y:-s,z:0,d:-c*cx-s*cy+slot.w/2},{x:-s,y:c,z:0,d:-s*cx+c*cy+slot.l/2},{x:s,y:-c,z:0,d:s*cx-c*cy+slot.l/2}];
  if(slot.h)planes.push({x:0,y:0,z:1,d:b.z+(slot.z||0)+slot.h/2},{x:0,y:0,z:-1,d:-b.z-(slot.z||0)+slot.h/2});
  visible=visible.flatMap(f=>subtractPolygon(f.points,planes).map(points=>({points,shade:f.shade})));
 }
 return visible;
}
function mountingFit(g){
 const issues=[],engagement=g.mounting.threadEngagement;
 if(engagement<3||engagement>g.motor.holeDepth-.3)issues.push('M3-motorbout heeft onvoldoende draad of bodemt in motor');
 if(g.base.thickness!==6||g.box.wall!==6||g.paper.thickness!==6)issues.push('Bouwbestanden vereisen 6 mm dek, 6 mm wanden en 6 mm plateau');
 for(const key of ['A','B','C']){
  const d=g[key],overlap=Math.min(d.hubTop,g.motor.shaftMin)-d.hubBottom;
  if(overlap<5-1e-6)issues.push('Naaf '+key+' zit niet volledig op de minimale motoras');
  if(d.hubBottom-g.base.thickness<2.5)issues.push('Naaf '+key+' te dicht bij bovenplaat');
 }
 if(g.paper.z+g.paper.thickness/2<g.motor.shaftMax+1-1e-6)issues.push('Motoras C raakt papier');
 if(g.B.rodZ-g.A.rodZ<g.rodHeight+g.clearance)issues.push('Armlagen hebben onvoldoende hoogte');
 for(const key of ['A','B']){
  const d=g[key],under=d.crankZ-g.crankHeight/2-1.6,length=key==='A'?50:60,nutTop=d.rodZ+g.rodHeight/2+1.6+8;
  if(under+length-nutTop<2.5)issues.push('M8-bout '+key+' heeft te weinig uitstekende draad voorbij borgmoer');
 }
 return {state:issues.length?'FAIL':'PASS',issues,threadEngagement:engagement,minimumShaft:23,maximumShaft:25};
}
window.MotioGeometry={DEFAULT_CONFIG,normalize,build,bodies,bounds,surfaces,clipPolygon,mountingFit};
})();

// ---------- Simulator/js/kinematics.js ----------
(function () {
'use strict';
const {distance,cross,subtract,TAU}=window.MotioMath;
const clamp=x=>Math.max(-1,Math.min(1,x));
function solve(config,q) {
 const g=window.MotioGeometry.build(config);
 const a={x:g.A.pivot.x+config.radiusA*Math.cos(q.A),y:g.A.pivot.y+config.radiusA*Math.sin(q.A)};
 const b={x:g.B.pivot.x+config.radiusB*Math.cos(q.B),y:g.B.pivot.y+config.radiusB*Math.sin(q.B)};
 const d=distance(a,b),la=config.lengthA,lb=config.lengthB;
 if(!Number.isFinite(d)||d<=1e-9||d>=la+lb||d<=Math.abs(la-lb))return {valid:false,a,b,reason:'Keten kan niet sluiten / parallelle dode stand',branch:g.branch};
 const t=(la*la-lb*lb+d*d)/(2*d),h2=la*la-t*t;
 if(h2<=1e-10)return {valid:false,a,b,reason:'Samenvallende assembly branches',branch:g.branch};
 const h=Math.sqrt(h2)*g.branch,dx=(b.x-a.x)/d,dy=(b.y-a.y)/d;
 const pen={x:a.x+t*dx-h*dy,y:a.y+t*dy+h*dx};
 const ua={x:(pen.x-a.x)/la,y:(pen.y-a.y)/la},ub={x:(pen.x-b.x)/lb,y:(pen.y-b.y)/lb};
 const determinant=cross(ua,ub),dotA=ua.x*(-config.radiusA*Math.sin(q.A))+ua.y*config.radiusA*Math.cos(q.A),dotB=ub.x*(-config.radiusB*Math.sin(q.B))+ub.y*config.radiusB*Math.cos(q.B);
 const J={ax:ub.y*dotA/determinant,ay:-ub.x*dotA/determinant,bx:-ua.y*dotB/determinant,by:ua.x*dotB/determinant};
 return {valid:true,a,b,pen,ua,ub,J,q:{...q},branch:g.branch,workingBranch:{A:Math.sign(dotA),B:Math.sign(dotB)},sin:Math.abs(determinant),gamma:Math.acos(clamp(ua.x*ub.x+ua.y*ub.y))*180/Math.PI,
  armAngleA:Math.atan2(ua.y,ua.x),armAngleB:Math.atan2(ub.y,ub.x),serialA:Math.abs(dotA/config.radiusA),serialB:Math.abs(dotB/config.radiusB),closureMargin:Math.min(la+lb-d,d-Math.abs(la-lb))};
}
function inverse(config,pen,previous=null,lockWorking=false) {
 const g=window.MotioGeometry.build(config),angles={};
 for(const key of ['A','B']) {
  const o=g[key].pivot,r=config['radius'+key],l=config['length'+key],d=distance(o,pen);
  if(!Number.isFinite(d)||d<1e-9||d>r+l+1e-8||d<Math.abs(r-l)-1e-8)return {valid:false,solutions:[],reason:'P buiten annulus '+key};
  const alpha=Math.acos(clamp((r*r+d*d-l*l)/(2*r*d))),phi=Math.atan2(pen.y-o.y,pen.x-o.x);
  angles[key]=[phi-alpha,phi+alpha];
 }
 const solutions=[];
 for(const A of angles.A)for(const B of angles.B) {
  const q={A,B,C:previous?.q?.C||0};
  for(const key of ['A','B'])if(previous?.q)q[key]+=TAU*Math.round((previous.q[key]-q[key])/TAU);
  const pose=solve(config,q);
  if(!pose.valid||distance(pose.pen,pen)>1e-5)continue;
  if(lockWorking&&previous?.workingBranch&&['A','B'].some(k=>previous.workingBranch[k]!==pose.workingBranch[k]))continue;
  if(previous&&pose.branch!==previous.branch)continue;
  solutions.push(pose);
 }
 solutions.sort((a,b)=>previous?.q?(a.q.A-previous.q.A)**2+(a.q.B-previous.q.B)**2-((b.q.A-previous.q.A)**2+(b.q.B-previous.q.B)**2):0);
 return {valid:!!solutions.length,solutions,pose:solutions[0],q:solutions[0]?.q,reason:solutions.length?'':'P vereist andere assembly/working branch'};
}
function branchChange(previous,next) {
 if(!previous?.valid||!next?.valid)return {assembly:false,working:false};
 return {assembly:previous.branch!==next.branch||Math.sign(cross(subtract(previous.b,previous.a),subtract(previous.pen,previous.a)))!==Math.sign(cross(subtract(next.b,next.a),subtract(next.pen,next.a))),working:['A','B'].some(k=>previous.workingBranch[k]*next.workingBranch[k]<0)};
}
window.MotioKinematics={solve,inverse,branchChange};
})();

// ---------- Simulator/js/paperTransform.js ----------
(function () {
'use strict';
// Paper coordinates have their origin at the spindle. +Y down, positive rotation clockwise.
function machineToPaper(p,theta,g){const x=p.x-g.paper.x,y=p.y-g.paper.y,c=Math.cos(theta),s=Math.sin(theta);return {x:c*x+s*y,y:-s*x+c*y};}
function paperToMachine(p,theta,g){const c=Math.cos(theta),s=Math.sin(theta);return {x:g.paper.x+c*p.x-s*p.y,y:g.paper.y+s*p.x+c*p.y};}
function inside(p,g,margin=0){return Number.isFinite(p?.x)&&Number.isFinite(p?.y)&&Math.hypot(p.x,p.y)<=g.paper.radius-margin+1e-9;}
window.MotioPaper={machineToPaper,paperToMachine,inside};
})();

// ---------- Simulator/js/singularityAnalysis.js ----------
(function () {
'use strict';
function analyze(p,g) {
 if(!p.valid)return {state:'CRITICAL',condition:Infinity,quality:0,distanceDeg:0,gain:Infinity,minGain:0};
 const j=p.J,a=j.ax*j.ax+j.ay*j.ay,d=j.bx*j.bx+j.by*j.by,b=j.ax*j.bx+j.ay*j.by;
 const maxEigen=(a+d+Math.hypot(a-d,2*b))/2,det=j.ax*j.by-j.ay*j.bx;
 const max=Math.sqrt(Math.max(0,maxEigen)),min=max>1e-12?Math.abs(det)/max:0,condition=min<1e-9?Infinity:max/min;
 const quality=Math.min(p.sin,p.serialA,p.serialB),distanceDeg=Math.asin(Math.min(1,quality))*180/Math.PI;
 const state=condition>=g.conditionCritical||quality<=g.transmissionCritical?'CRITICAL':condition>=g.conditionCaution||quality<=g.transmissionCaution?'CAUTION':'SAFE';
 return {state,condition,quality,distanceDeg,gain:max,minGain:min,parallel:p.sin,serialA:p.serialA,serialB:p.serialB};
}
window.MotioSingularity={analyze};
})();

// ---------- Simulator/js/collisionDetection.js ----------
(function () {
'use strict';
const {segmentsDistance}=window.MotioMath;
function polygon(b){return [{x:b.x-b.w/2,y:b.y-b.l/2},{x:b.x+b.w/2,y:b.y-b.l/2},{x:b.x+b.w/2,y:b.y+b.l/2},{x:b.x-b.w/2,y:b.y+b.l/2}];}
const inside=(p,b)=>Math.abs(p.x-b.x)<=b.w/2&&Math.abs(p.y-b.y)<=b.l/2;
function capsule(b){return b.shape==='beam'?{a:b.a,b:b.b,r:b.w/2}:{a:b,b:b,r:b.r};}
function planar(a,b) {
 if(a.shape==='box'&&b.shape==='box')return Math.hypot(Math.max(0,Math.abs(a.x-b.x)-(a.w+b.w)/2),Math.max(0,Math.abs(a.y-b.y)-(a.l+b.l)/2))||Math.max(Math.abs(a.x-b.x)-(a.w+b.w)/2,Math.abs(a.y-b.y)-(a.l+b.l)/2);
 if(a.shape==='box'||b.shape==='box') {
  const box=a.shape==='box'?a:b,c=capsule(a.shape==='box'?b:a),poly=polygon(box);
  if(inside(c.a,box)||inside(c.b,box))return -c.r;
  return Math.min(...poly.map((p,i)=>segmentsDistance(c.a,c.b,p,poly[(i+1)%4])))-c.r;
 }
 const x=capsule(a),y=capsule(b);return segmentsDistance(x.a,x.b,y.a,y.b)-x.r-y.r;
}
function gap(a,b){const xy=planar(a,b),z=Math.abs(a.z-b.z)-(a.h+b.h)/2;return xy>0&&z>0?Math.hypot(xy,z):Math.max(xy,z);}
const staticCache=new WeakMap(),staticChecks=new WeakMap();
function analyze(g,pose,motionBounds=null) {
 const minima={arm:Infinity,frame:Infinity,holder:Infinity,platform:Infinity,drive:Infinity,support:Infinity},violations=[];let minimum=Infinity,closest=null;
 // A body displacement bound subtracts the largest possible gap change over a
 // continuous radial-route interval. Static geometry has zero displacement.
 const movement=b=>!motionBounds?0:b.group==='pen'?motionBounds.pen:b.group==='moving'||b.group==='fastener'?motionBounds[chain(b)]||0:0;
 const check=(a,b,category)=>{
  const z=Math.abs(a.z-b.z)-(a.h+b.h)/2;
  // XY motion cannot reduce a fixed Z gap. Skip only when this pair cannot
  // improve either reported minimum or cross the clearance threshold.
  if(z>=g.clearance&&z>=minimum&&z>=minima[category])return;
  // The route moves only in XY; an XY displacement cannot reduce a fixed Z gap.
  const xy=planar(a,b)-movement(a)-movement(b);
  const d=xy>0&&z>0?Math.hypot(xy,z):Math.max(xy,z);
  minima[category]=Math.min(minima[category],d);if(d<minimum){minimum=d;closest=[a.id,b.id];}if(d<g.clearance)violations.push({a:a.id,b:b.id,gap:d,category,state:d<0?'COLLISION':'CLEARANCE'});
 };
 if(!pose.valid)return {minimum:null,minima,violations:[],state:'NOT CALCULATED'};
 let fixed=staticCache.get(g);if(!fixed){fixed=window.MotioGeometry.bodies(g,null,false);staticCache.set(g,fixed);}
 const full=window.MotioGeometry.bodies(g,pose,false).map(b=>b.axis==='x'?{...b,shape:'box',w:b.h,l:2*b.r,h:2*b.r}:b),moving=full.filter(b=>b.group==='moving'||b.group==='fastener'),pen=full.filter(b=>b.group==='pen'&&b.id!=='pen');
 const chain=b=>b.assemblyGroup?.startsWith('unit')?b.assemblyGroup.slice(-1):b.id.match(/(?:elbow\w*|crank\w*|rod|end[EP]|armShoulder[EP])([AB])/)?.[1]||b.id.slice(-1);
 const obstacles=fixed.filter(b=>['frame','support','drive','platter'].includes(b.group));
 for(const a of moving)for(const b of obstacles){
  if(a.assemblyGroup&&a.assemblyGroup===b.assemblyGroup)continue; // Preassembled bolted crank / platter and its own hub.
  // A metal hub and its own crank plate/screws are an intentional bolted joint.
  if(b.bom==='HUB'&&b.id.endsWith(chain(a))&&/^(crank|hub)/.test(a.id))continue;
  check(a,b,b.group==='frame'?'frame':b.group==='platter'?'platform':b.group==='drive'?'drive':'support');
 }
 const chains=moving.map(chain); // SAMENVATTING: keten één keer per onderdeel bepalen
 for(let i=0;i<moving.length;i++)for(let j=i+1;j<moving.length;j++){
  const a=moving[i],b=moving[j];
  // Own elbow/crank/arm interfaces are deliberate joints. Cross-chain pairs are checked.
  if(chains[i]===chains[j])continue;
  check(a,b,'arm');
 }
 for(const a of pen) {
  for(const b of obstacles)check(a,b,'holder');
  for(const b of moving.filter(v=>v.id.startsWith('crank')||v.id.startsWith('elbow')||(['clampKnob','clampScrew','holder'].includes(a.id)&&v.id.startsWith('rod'))))check(a,b,'holder');
 }
 // Static platter-to-tower and under-deck drive-to-frame/support installation checks.
 let installation=staticChecks.get(g);
 if(!installation){
  installation=[];const platter=fixed.find(b=>b.id==='platter');
  for(const b of fixed.filter(b=>/^housing[AB]|^foot[AB]/.test(b.id)))installation.push({a:platter,b,category:'platform',d:gap(platter,b)});
  for(const a of fixed.filter(b=>b.group==='drive'))for(const b of fixed.filter(b=>b.group==='frame'||b.group==='support')) {
   if(a.bom==='HUB'&&((b.id==='stiffener'+a.id.slice(-1))||(a.id.startsWith('hubPilot')&&b.id==='BASE')))continue; // local running clearances verified by mountingFit, not the 3 mm linkage rule
   if(a.id.startsWith('motor')&&b.bom==='BASE')continue; // specified flange/deck contact
   installation.push({a,b,category:'drive',d:gap(a,b)});
  }
  const drives=fixed.filter(b=>b.group==='drive');
  for(let i=0;i<drives.length;i++)for(let j=i+1;j<drives.length;j++) {
   const a=drives[i],b=drives[j];if(a.instance===b.instance)continue;
   installation.push({a,b,category:'drive',d:gap(a,b)});
  }
  staticChecks.set(g,installation);
 }
 for(const {a,b,category,d} of installation){minima[category]=Math.min(minima[category],d);if(d<minimum){minimum=d;closest=[a.id,b.id];}if(d<g.clearance)violations.push({a:a.id,b:b.id,gap:d,category,state:d<0?'COLLISION':'CLEARANCE'});}
 return {minimum,minima,closest,violations,state:violations.some(v=>v.gap<0)?'COLLISION':violations.length?'CAUTION':'CLEAR',model:'Conservatieve 2.5D-enveloppen, inclusief krukboutkoppen en elleboogborgingen. Alleen eigen scharnieren, kruk-naafverbinding en motorflenscontact uitgezonderd. Asdoorvoeren en montagepaden apart gecontroleerd.'};
}
window.MotioCollision={analyze,gap};
})();

// ---------- Simulator/js/structuralEstimate.js ----------
(function () {
'use strict';
function analyze(g,p) {
 if(!p.valid)return {state:'NOT CALCULATED'};
 const armForce=g.dragForce/Math.max(p.sin,1e-12),arms={};
 for(const key of ['A','B']) {
  const L=g['length'+key],mass=g.tubeArea*L*1e-9*g.density;
  // Cantilever surrogate: ALL pen normal force on each arm + uniform own weight.
  const vertical=g.verticalForce*L**3/(3*g.materialE*g.tubeI)+mass*9.80665*L**3/(8*g.materialE*g.tubeI);
  const axial=armForce*L/(g.materialE*g.tubeArea);
  arms[key]={vertical,axial,mass,force:armForce,buckling:Math.PI**2*g.materialE*Math.min(g.tubeI,g.tubeIxy)/L**2};
 }
 // Worst signed rod extensions, propagated through the two unit-length constraints.
 const det=p.ua.x*p.ub.y-p.ua.y*p.ub.x;let errorXY=0;
 for(const sa of [-1,1])for(const sb of [-1,1])errorXY=Math.max(errorXY,Math.hypot((p.ub.y*arms.A.axial*sa-p.ua.y*arms.B.axial*sb)/det,(-p.ub.x*arms.A.axial*sa+p.ua.x*arms.B.axial*sb)/det));
 return {state:'ESTIMATE',material:g.material,printValidated:false,arms,errorXY,verticalEnvelope:Math.max(arms.A.vertical,arms.B.vertical),totalPositionError:null,
  assumptions:'Isotrope PLA-schatting voor een volledig gevulde kokerwand; geen bewijs voor een specifieke print. Laaghechting, kruip, verbindingen, lagerpassingen en asbuiging niet bewezen. Kokerbuiging in Z en axiale rek in XY zijn alleen rekenindicaties.'};
}
window.MotioStructure={analyze};
})();

// ---------- Simulator/js/motorAnalysis.js ----------
(function () {
'use strict';
const {solve}=window.MotioKinematics;
const axes=['A','B'];
// Approximate readings from the supplied SY42STH38-1684A graph, not measured data.
// Graph: PPS, 24 VDC, constant current 1.68 A, HALF STEP (400 pulses/revolution).
const DATASHEET_CURVE=Object.freeze({source:'SY42STH38-1684A.pdf · pull-out curve (afgelezen, circa)',supplyVoltage:24,current:1.68,stepsPerFullStep:2,approximate:true,
 points:Object.freeze([[30,.26],[75,.29],[105,.30],[135,.28],[180,.24],[270,.24],[360,.23],[450,.22],[600,.20],[750,.19]].map(Object.freeze))});
function available(g,key,rpm) {
 const custom=g.motorCurves?.[key],curve=custom||DATASHEET_CURVE;
 const qualified=!!g.motorCurveConditionsConfirmed&&(custom?!!custom.conditionsConfirmed:
  g.motorSupplyVoltage===curve.supplyVoltage&&g.motorDriveCurrent===curve.current&&g.motorStepsPerFullStep===curve.stepsPerFullStep);
 const x=Math.abs(rpm),pts=curve.points;
 if(x<pts[0][0]||x>pts.at(-1)[0])return {torque:null,state:'Niet aangetoond · buiten curvebereik',source:curve.source,qualified:false};
 for(let i=1;i<pts.length;i++)if(x<=pts[i][0])return {torque:pts[i-1][1]+(pts[i][1]-pts[i-1][1])*(x-pts[i-1][0])/(pts[i][0]-pts[i-1][0]),state:qualified?'Curvecondities bevestigd':'Niet aangetoond · drivercondities bevestigen',source:curve.source,qualified,approximate:curve.approximate!==false};
 return {torque:null,state:'Niet aangetoond',qualified:false};
}
function massMatrix(g,p) {
 const j=p.J,vp=[[j.ax/1000,j.bx/1000],[j.ay/1000,j.by/1000]],M=[[0,0],[0,0]];
 for(let i=0;i<2;i++)for(let k=0;k<2;k++)M[i][k]=g.penMass*(vp[0][i]*vp[0][k]+vp[1][i]*vp[1][k]);
 for(let a=0;a<2;a++) {
  const key=axes[a],r=g['radius'+key]/1000,L=g['length'+key]/1000,q=p.q[key],u=key==='A'?p.ua:p.ub;
  const rodMass=g.tubeArea*L*1e-6*g.density,crankMass=g.crankWidth*g.crankHeight*r*1e-6*g.crankDensity;
  const vE=[[a===0?-r*Math.sin(q):0,a===1?-r*Math.sin(q):0],[a===0?r*Math.cos(q):0,a===1?r*Math.cos(q):0]];
  const w=[0,1].map(i=>(u.x*(vp[1][i]-vE[1][i])-u.y*(vp[0][i]-vE[0][i]))/L);
  for(let i=0;i<2;i++)for(let k=0;k<2;k++)M[i][k]+=rodMass*((vp[0][i]+vE[0][i])*(vp[0][k]+vE[0][k])+(vp[1][i]+vE[1][i])*(vp[1][k]+vE[1][k]))/4+rodMass*L*L/12*w[i]*w[k];
  M[a][a]+=crankMass*r*r/3+g.couplingInertia;
 }
 return M;
}
function analyze(g,p,velocity={A:0,B:0,C:0},acceleration={A:0,B:0,C:0}) {
 if(!p.valid)return {state:'NOT CALCULATED'};
 const M=massMatrix(g,p),h=1e-5,dM=[];
 for(const key of axes) {
  const plus=solve(g,{...p.q,[key]:p.q[key]+h}),minus=solve(g,{...p.q,[key]:p.q[key]-h});
  if(!plus.valid||!minus.valid)return {state:'NOT CALCULATED',reason:'Mass-matrix derivative crosses closure boundary'};
  const a=massMatrix(g,plus),b=massMatrix(g,minus);dM.push(a.map((row,i)=>row.map((v,j)=>(v-b[i][j])/(2*h))));
 }
 const result={state:'ESTIMATE',massMatrix:M};
 for(let i=0;i<2;i++) {
  const key=axes[i];let inertia=0,coriolis=0;
  for(let j=0;j<2;j++) {
   inertia+=M[i][j]*acceleration[axes[j]];
   for(let k=0;k<2;k++)coriolis+=.5*(dM[k][i][j]+dM[j][i][k]-dM[i][j][k])*velocity[axes[j]]*velocity[axes[k]];
  }
  const staticLoad=g.dragForce*Math.hypot(p.J[i?'bx':'ax'],p.J[i?'by':'ay'])/1000;
  result[key]=axis(g,key,velocity[key],acceleration[key],staticLoad,Math.abs(inertia+coriolis),g.frictionAB);
 }
 const radius=Math.hypot(p.pen.x-g.paper.x,p.pen.y-g.paper.y)/1000,I=g.paper.mass*(g.paper.radius/1000)**2/2+g.couplingInertia;
 result.C=axis(g,'C',velocity.C,acceleration.C,g.dragForce*radius,I*Math.abs(acceleration.C),g.frictionC);
 result.platterInertia=I;result.spindleAxial=g.paper.mass*9.80665+g.verticalForce;
 result.spindleMoment=g.verticalForce*radius;result.bearingLoads=shaftLoads(g,p);return result;
}
function axis(g,key,w,alpha,staticLoad,dynamic,friction) {
 const ratio=g[key].ratio,rpm=g[key].motorSign*w*60/(2*Math.PI)*ratio,required=(staticLoad+dynamic+friction)/(ratio*g.efficiency)+g.rotorInertia*Math.abs(alpha)*ratio;
 const avail=available(g,key,rpm),torque=avail.torque;
 const fullSteps=360/g.motorStepAngle,pulsesPerRevolution=fullSteps*g.motorStepsPerFullStep;
 return {rpm,ratio,staticLoad,dynamic,friction,required,available:torque,qualified:avail.qualified,curveState:avail.state,curveSource:avail.source,utilisation:torque===null?null:torque>0?required/torque*100:Infinity,safetyFactor:torque===null?null:required>0?torque/required:Infinity,
  fullStepsPerOutputRevolution:fullSteps*ratio,pulsesPerOutputRevolution:pulsesPerRevolution*ratio,pulseRate:Math.abs(rpm)*pulsesPerRevolution/60,outputTorque:staticLoad+dynamic+friction,state:'ESTIMATE'};
}
// Preliminary flange moment envelope, NOT a manufacturer's combined-load rating.
// The quoted 28 N at 20 mm provides a 0.56 Nm comparison moment. Apply forces
// at their real heights; add the transverse moment from eccentric axial load.
function shaftLoads(g,p){
 if(!p.valid)return {state:'NOT CALCULATED',axes:{}};
 const axes={},gravity=9.80665,reference=g.motorRadialReference/1000;
 const make=(key,axial,radial,moment,mass)=>{
  const equivalentRadial=moment/reference,axialDesign=axial*g.loadReserve,radialDesign=equivalentRadial*g.loadReserve;
  axes[key]={mass,axial,radial,moment,equivalentRadial,axialDesign,radialDesign,margin:Math.min(g.motorAxialLimit/axialDesign,g.motorRadialLimit/radialDesign),withinEstimate:axialDesign<=g.motorAxialLimit&&radialDesign<=g.motorRadialLimit};
 };
 for(const key of ['A','B']){
  const L=g['length'+key],r=g['radius'+key]/1000,d=g[key];
  const tube=g.tubeArea*L*1e-9*g.density,eyes=Math.PI*((15**2-11**2)+(g.pen.jointRadius**2-16**2))*g.rodHeight*1e-9*g.density;
  const post=Math.PI*((7**2-4.2**2)*(d.rodZ-3.5-d.crankZ-g.crankHeight/2)+(6**2-4.2**2)*4.5)*1e-9*g.density;
  const hardware=.012+.018+.020+Math.PI*4**2*(key==='A'?50:60)*1e-9*7850+g.armHardwareMass; // two bearings, nuts/bus, extra mass allowance
  const crank=(g.crankWidth*g.crankHeight*g['radius'+key]+Math.PI*17**2*g.crankHeight+(key==='B'?Math.PI*14**2*4:0))*1e-9*g.crankDensity;
  const mass=tube+eyes+post+hardware+g.penMass+crank;
  const axial=g.verticalForce+gravity*mass;
  const radial=(g.dragForce+mass*g.maxPenAcceleration/1000)/Math.max(p.sin,.001);
  const moment=radial*Math.max(reference,d.rodZ/1000)+(g.verticalForce+gravity*(mass-crank))*r+gravity*crank*r/2;
  make(key,axial,radial,moment,mass);
 }
 const radius=Math.hypot(p.pen.x-g.paper.x,p.pen.y-g.paper.y)/1000;
 const axial=g.paper.mass*gravity+g.verticalForce,radial=g.dragForce;
 make('C',axial,radial,radial*Math.max(reference,(g.paper.z+g.paper.thickness/2)/1000)+g.verticalForce*radius+g.paper.mass*gravity*.002,g.paper.mass);
 return {state:Object.values(axes).every(a=>a.withinEstimate)?'WITHIN ESTIMATE':'LIMIT EXCEEDED',axes,reserve:g.loadReserve,assumptions:'Som van buigmomenten / 20 mm, 2 mm plateau-excentriciteit, volledige penlast per arm, beide lager-/postmassa’s, massatoeslag en maximale penversnelling. Geen fabrikantsbewijs voor gecombineerde lasten, levensduur of schokbelasting. Massa, penkracht en slingering fysiek meten.'};
}
window.MotioMotor={analyze,available,massMatrix,DATASHEET_CURVE,shaftLoads};
})();

// ---------- Simulator/js/mechanics.js ----------
(function () {
'use strict';
const {DEFAULT_CONFIG,build}=window.MotioGeometry;
const {solve,inverse}=window.MotioKinematics;
function inspect(config,q) {
 const g=build(config),pose=solve(config,q),issues=[];
 if(!pose.valid)return {...pose,safe:false,issues:[pose.reason],clearance:null};
 const singularity=window.MotioSingularity.analyze(pose,g),collision=window.MotioCollision.analyze(g,pose);
 if(pose.sin<g.parallelStop)issues.push('Parallelle singulariteit: onder geconfigureerde transmissiegrens');
 if(singularity.state==='CRITICAL')issues.push('Singulariteit: onveilige kruk-/armstand');
 if(collision.violations.length)issues.push(...collision.violations.slice(0,3).map(v=>v.a+' / '+v.b+': '+v.gap.toFixed(2)+' mm'));
 const mounting=window.MotioGeometry.mountingFit(g),shaftLoads=window.MotioMotor.shaftLoads(g,pose);
 issues.push(...mounting.issues);
 for(const [key,a] of Object.entries(shaftLoads.axes))if(!a.withinEstimate)issues.push('Geschatte motoraslast '+key+' boven 10 N / 28 N op 20 mm');
 return {...pose,singularity,collision,mounting,shaftLoads,safe:!issues.length,issues,clearance:collision.minimum,force:g.dragForce/pose.sin};
}
window.MotioMechanics={DEFAULT_CONFIG,solve,inverse,inspect,audit:(config,resolution=36)=>window.MotioValidation.audit(config,resolution)};
})();

// ---------- Simulator/js/validation.js ----------
(function () {
'use strict';
const {TAU,distance}=window.MotioMath;
const {build}=window.MotioGeometry;
const {inverse}=window.MotioKinematics;
function workspace(config) {
 const g=build(config),step=g.workspaceStep,cells=[];let reachable=0,comfortable=0;
 for(let x=g.paper.x-g.paper.radius+step/2;x<g.paper.x+g.paper.radius;x+=step)for(let y=g.paper.y-g.paper.radius+step/2;y<g.paper.y+g.paper.radius;y+=step) {
  if(Math.hypot(x-g.paper.x,y-g.paper.y)>g.paper.radius)continue;
  let state='UNREACHABLE',condition=null,clearance=null,best=-1;
  const ik=inverse(config,{x,y});
  if(ik.valid){reachable++;state='CRITICAL';
   for(const p of ik.solutions){const s=window.MotioSingularity.analyze(p,g),c=window.MotioCollision.analyze(g,p),rank=c.minimum<0||s.state==='CRITICAL'?0:c.minimum<g.clearance||s.state==='CAUTION'?1:2;
    if(rank>best){best=rank;state=['CRITICAL','CAUTION','SAFE'][rank];condition=s.condition;clearance=c.minimum;}
   }
   if(state==='SAFE')comfortable++;
  }
  cells.push({x,y,state,condition,clearance});
 }
 return {step,cells,reachable,comfortable,scope:'Discrete cell centres; any working branch within fixed assembly branch. No continuous-path proof.'};
}
// Reachability is radial when paper rotation is independent: a continuous safe
// machine-space route from radius 0 to R, plus unrestricted C rotation, covers
// every point of the paper disk. The small intervals below are proved with
// analytic distance bounds and conservative motion envelopes, not point samples.
function drawingArea(config) {
 const g=build(config),angle=g.reachAngle*Math.PI/180,u={x:Math.cos(angle),y:Math.sin(angle)},R=g.paper.safeRadius;
 const result={count:0,missing:0,singular:0,unsafe:0,step:.5,angles:'360° continu',reachState:'NIET BEWEZEN',singularState:'NIET BEWEZEN',collisionState:'NIET BEWEZEN',minClearanceBound:Infinity,minSinBound:1,minSerialBound:1,maxConditionBound:0,routeAngle:g.reachAngle,routeRadius:R,
  scope:'Continue radiale penroute + onafhankelijke papierrotatie; analytische annulusgrenzen en bewegingsenveloppen over elk interval. Geen bewijs voor alle willekeurige motorstanden.'};
 const point=t=>({x:g.paper.x+t*u.x,y:g.paper.y+t*u.y});
 const home=window.MotioKinematics.solve(config,{A:g.phaseA*Math.PI/180,B:g.phaseB*Math.PI/180,C:g.phaseC*Math.PI/180});
 const centre=inverse(config,point(0),home.valid?home:null,true);
 if(!centre.valid){result.missing=1;result.reachState='FAIL';result.reason='Het papiercentrum is niet bereikbaar op de gekozen bewegingsconfiguratie; papierrotatie verplaatst dit punt niet.';return result;}
 let previous=centre.pose;
 const fail=reason=>{result.reason=reason;return result;};
 // Exact distance range from a pivot to a radial line segment.
 function legBound(key,lo,hi) {
  const o=g[key].pivot,x=g.paper.x-o.x,y=g.paper.y-o.y,dot=x*u.x+y*u.y,at=Math.max(lo,Math.min(hi,-dot));
  const d2=t=>(x+t*u.x)**2+(y+t*u.y)**2,low=d2(at),high=Math.max(d2(lo),d2(hi)),r=g['radius'+key],l=g['length'+key];
  if(low<=(r-l)**2||high>=(r+l)**2)return null;
  const cos=d=>(d-r*r-l*l)/(2*r*l),extreme=Math.max(Math.abs(cos(low)),Math.abs(cos(high)));
  return Math.sqrt(Math.max(0,1-extreme*extreme));
 }
 const intervals=Math.ceil(R/result.step);
 for(let i=0;i<intervals;i++) {
  const lo=R*i/intervals,hi=R*(i+1)/intervals,mid=(lo+hi)/2,delta=(hi-lo)/2;result.count++;
  const serialA=legBound('A',lo,hi),serialB=legBound('B',lo,hi);
  if(serialA===null||serialB===null){result.missing++;return fail('Deze radiale route verlaat een armannulus. Een andere route of aangepaste kruklengte is nodig.');}
  if(Math.min(serialA,serialB)<=g.transmissionCritical){result.singular++;return fail('Seriële singulariteitsmarge van de radiale route is te klein.');}
  const ik=inverse(config,point(mid),previous,true);
  if(!ik.valid){result.missing++;return fail('De radiale route kan niet op dezelfde assembly- en working branch worden gevolgd.');}
  const p=ik.pose;previous=p;
  // From the rod constraint: |dq/ds| <= 1 / (crankRadius * serial).
  // Thus each elbow moves at most delta/serial from the interval midpoint.
  const elbowA=delta/serialA,elbowB=delta/serialB,d=distance(p.a,p.b),la=g.lengthA,lb=g.lengthB;
  const dLo=Math.max(0,d-elbowA-elbowB),dHi=d+elbowA+elbowB;
  if(dLo<=Math.abs(la-lb)||dHi>=la+lb){result.singular++;return fail('Parallelle sluiting niet over het volledige interval bewezen.');}
  const sinAt=v=>Math.sqrt(Math.max(0,1-((la*la+lb*lb-v*v)/(2*la*lb))**2)),sin=Math.min(sinAt(dLo),sinAt(dHi));
  const cos=Math.sqrt(Math.max(0,1-sin*sin)),condition=Math.sqrt((1+cos)/(1-cos))*Math.max(g.radiusA,g.radiusB)/Math.min(g.radiusA*serialA,g.radiusB*serialB);
  result.minSerialBound=Math.min(result.minSerialBound,serialA,serialB);result.minSinBound=Math.min(result.minSinBound,sin);result.maxConditionBound=Math.max(result.maxConditionBound,condition);
  if(sin<=g.parallelStop||sin<=g.transmissionCritical||condition>=g.conditionCritical){result.singular++;return fail('Singulariteitsgrens niet over het volledige route-interval bewezen.');}
  // Rod end trimming also changes with arm direction: |du/ds| <=
  // (1 + 1/serial)/L. Include both configured endpoint trims conservatively.
  const trim=Math.max(12,g.pen.jointRadius-2),motion={A:elbowA+trim/la*(delta+elbowA),B:elbowB+trim/lb*(delta+elbowB),pen:delta};
  const collision=window.MotioCollision.analyze(g,p,motion);
  result.minClearanceBound=Math.min(result.minClearanceBound,collision.minimum);
  if(collision.minimum<g.clearance){result.unsafe++;const actual=window.MotioCollision.analyze(g,p);if(actual.minimum<0)result.collisionState='FAIL';return fail('Geen voldoende vrijloop bewezen: '+collision.closest.join(' / ')+'.');}
 }
 result.start=centre.q;result.end=inverse(config,point(R),previous,true).q;
 result.reachState=result.singularState=result.collisionState='PASS';result.proven=true;
 return result;
}
function audit(config,resolution=36) {
 const g=build(config);let failures=0,critical=0,minSin=1,minClearance=Infinity,minGamma=180,maxGamma=0,minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,firstIssue='';
 for(let a=0;a<resolution;a++)for(let b=0;b<resolution;b++) {
  const p=window.MotioMechanics.inspect(config,{A:a*TAU/resolution,B:b*TAU/resolution,C:0});
  if(!p.safe){failures++;firstIssue ||= p.issues[0];}if(!p.valid)continue;
  if(p.singularity.state==='CRITICAL')critical++;
  minSin=Math.min(minSin,p.sin);minClearance=Math.min(minClearance,p.clearance);minGamma=Math.min(minGamma,p.gamma);maxGamma=Math.max(maxGamma,p.gamma);
  minX=Math.min(minX,p.pen.x);maxX=Math.max(maxX,p.pen.x);minY=Math.min(minY,p.pen.y);maxY=Math.max(maxY,p.pen.y);
 }
 const d=distance(g.A.pivot,g.B.pivot),r=config.radiusA+config.radiusB,l=config.lengthA,m=config.lengthB,dmin=Math.max(0,d-r),dmax=d+r,closureAll=dmin>Math.abs(l-m)&&dmax<l+m;
 const sinBound=closureAll?Math.min(...[dmin,dmax].map(v=>Math.sqrt(Math.max(0,1-((l*l+m*m-v*v)/(2*l*m))**2)))):0;
 return {samples:resolution**2,failures,critical,firstIssue,minSin,minClearance,minGamma,maxGamma,minX,maxX,minY,maxY,closureAll,sinBound};
}
// Independent phase samples are a sweep; the second stage is a continuous ramp/reversal profile.
class EngineeringTest {
 constructor(config){this.config=config;this.g=build(config);this.resolution=config.testResolution;this.index=0;this.trajectoryIndex=0;this.duration=20;this.dt=.01;this.total=this.resolution**2+Math.round(this.duration/this.dt);this.running=true;this.previous=null;this.q={A:config.phaseA*Math.PI/180,B:config.phaseB*Math.PI/180,C:config.phaseC*Math.PI/180};this.v={A:0,B:0,C:0};this.preview=null;this.report={scope:'Discrete phase sweep + 20 s ramp/reversal stress profile; no continuous global certification',samples:0,invalid:0,collisions:0,critical:0,cautions:0,workingChanges:0,assemblyChanges:0,minClearance:Infinity,minima:{arm:Infinity,frame:Infinity,holder:Infinity,platform:Infinity,drive:Infinity},maxRPM:0,maxSpeed:0,maxAcceleration:0,maxDeflection:0,maxElasticXY:0,maxTorque:{A:0,B:0,C:0},minSafety:{A:Infinity,B:Infinity,C:Infinity},curveMissing:false,missingCurve:{A:false,B:false,C:false},worst:[],complete:false};}
 cancel(){this.running=false;this.report.cancelled=true;}
 step(budget=25) {
  const end=performance.now()+budget;
  while(this.running&&performance.now()<end) {
   let q,v={A:0,B:0,C:0},alpha={A:0,B:0,C:0},continuous=false;
   if(this.index<this.resolution**2){const a=Math.floor(this.index/this.resolution),b=this.index%this.resolution;q={A:a*TAU/this.resolution,B:b*TAU/this.resolution,C:this.index*TAU/(this.resolution**2-1)};this.index++;}
   else {
    if(this.trajectoryIndex>=this.duration/this.dt){this.running=false;this.report.complete=true;break;}
    continuous=true;const t=this.trajectoryIndex*this.dt;q={...this.q};
    for(const key of ['A','B','C']) {
     const max=(key==='C'?this.g.maxPaperRPM:this.g.maxRPM)*TAU/60,acc=key==='C'?this.g.paperAcceleration:this.g.acceleration,target=(t<10?1:-1)*max*(key==='B'?-.83:1);
     v[key]=this.v[key]+Math.max(-acc*this.dt,Math.min(acc*this.dt,target-this.v[key]));alpha[key]=(v[key]-this.v[key])/this.dt;q[key]+=(v[key]+this.v[key])/2*this.dt;
    }
    this.q=q;this.v=v;this.trajectoryIndex++;
   }
   this.sample(q,v,alpha,continuous);
  }
  return this.report;
 }
 sample(q,v,alpha,continuous) {
  const g=this.g,r=this.report,p=window.MotioMechanics.inspect(this.config,q);r.samples++;this.preview={pose:p,q,geometry:g,config:this.config,trace:[]};
  if(!p.valid){r.invalid++;if(continuous)this.previous=null;return;}
  const s=p.singularity,c=p.collision;
  if(s.state==='CRITICAL')r.critical++;if(s.state==='CAUTION')r.cautions++;if(c.minimum<0)r.collisions++;
  if(c.minimum<r.minClearance){r.minClearance=c.minimum;r.closest=c.closest;}
  for(const k of Object.keys(r.minima))r.minima[k]=Math.min(r.minima[k],c.minima[k]);
  if(r.worst.length<12&&(s.state==='CRITICAL'||c.minimum<g.clearance))r.worst.push({q:{...q},machine:p.pen,condition:s.condition,clearance:c.minimum,pair:c.closest});
  const structure=window.MotioStructure.analyze(g,p);r.maxDeflection=Math.max(r.maxDeflection,structure.verticalEnvelope);r.maxElasticXY=Math.max(r.maxElasticXY,structure.errorXY);
  // The phase sweep detects forbidden poses; they cannot be requested drawing
  // loads. Analyse motor duty only where the simulator permits physical drawing.
  if(!continuous||!p.safe||!window.MotioPaper.inside(window.MotioPaper.machineToPaper(p.pen,q.C,g),g,g.paper.margin)){if(continuous)this.previous=null;return;}
  const pv={x:p.J.ax*v.A+p.J.bx*v.B,y:p.J.ay*v.A+p.J.by*v.B},speed=Math.hypot(pv.x,pv.y);
  r.maxSpeed=Math.max(r.maxSpeed,speed);
  if(this.previous){r.maxAcceleration=Math.max(r.maxAcceleration,distance(pv,this.previous.pv)/this.dt);const change=window.MotioKinematics.branchChange(this.previous.pose,p);r.workingChanges+=Number(change.working);r.assemblyChanges+=Number(change.assembly);}
  this.previous={pose:p,pv};
  const motor=window.MotioMotor.analyze(g,p,v,alpha);
  for(const key of ['A','B','C']) {
   r.maxRPM=Math.max(r.maxRPM,Math.abs(v[key]*g[key].ratio*60/TAU));
   if(motor[key]){r.maxTorque[key]=Math.max(r.maxTorque[key],motor[key].required);if(motor[key].safetyFactor===null||!motor[key].qualified){r.curveMissing=true;r.missingCurve[key]=true;}else r.minSafety[key]=Math.min(r.minSafety[key],motor[key].safetyFactor);}else {r.curveMissing=true;r.missingCurve[key]=true;}
  }
 }
 get progress(){return (this.index+this.trajectoryIndex)/this.total;}
}
function rows(sim,test) {
 const g=sim.geometry,a=sim.audit,area=sim.drawingArea,r=test?.report,complete=r?.complete;
 const result=[],add=(name,state,value,evidence)=>result.push({name,state,value,evidence});
 add('Volledige veilige tekencirkel bereikbaar',area.reachState,area.proven?'Ø'+(2*g.paper.safeRadius)+' mm via pen + papierrotatie':area.reason||'Bereik nog niet bewezen',area.scope);
 add('Mechanische botsingen',area.collisionState,area.proven?'Geen op de bewezen tekenroute':area.reason||'Tekenroute nog niet vrijgegeven','Continue envelopcontrole van de radiale route, inclusief lage krukken, naafbouten en plateau. Andere onveilige motorstanden worden tijdens de simulatie geblokkeerd.');
 add('Problematische singulariteiten',area.singularState,area.proven?'Geen op de bewezen tekenroute':area.reason||'Route nog niet bewezen','Zowel seriële als parallelle marges zijn over volledige route-intervallen begrensd; alle willekeurige krukstanden zijn niet vrijgegeven.');
 const overload=complete&&Object.values(r.minSafety).some(v=>Number.isFinite(v)&&v<1),motorState=overload?'FAIL':'NIET BEWEZEN';
 add('Motoren kunnen de beweging aan',motorState,overload?'Gevraagd koppel te hoog':'Driver en belastingen bevestigen','SY42STH38-1684A: afgelezen koppelcurve geldt voor 24 V, 1,68 A, halfstep en 30–750 RPM. Directe aandrijving gebruikt standaard 1/8 microstepping en blijft onder 30 RPM; de halfstepcurve bewijst dit niet. Houdkoppel 0,36 Nm bewijst geen dynamische capaciteit; belasting, wrijving en inertie zijn ontwerpschattingen.');
 const fitFail=area.proven&&area.minClearanceBound<g.clearance;
 add('Belangrijkste mechanische spelingen',fitFail?'FAIL':'NIET BEWEZEN',area.proven?'Modelvrijloop ≥ '+area.minClearanceBound.toFixed(1)+' mm; passing nog testen':'Vrijloop nog niet bewezen','Het model gebruikt '+g.clearance+' mm minimale vrijloop. Lagerpassing, naafklemming, fabricagetoleranties en papierloop moeten aan het prototype worden gecontroleerd.');
 add('Constructiesterkte PLA en MDF','NIET BEWEZEN',g.material.name+' · MDF-platen '+g.base.thickness+'/'+g.box.wall+'/'+g.paper.thickness+' mm (dek/wand/plateau)','Isotrope rekenschatting voor de PLA-kokerarmen: E '+g.materialE+' MPa, ρ '+g.density+' kg/m³. Doorbuiging van MDF, boutdruk en houtverbindingen zijn niet berekend. Printoriëntatie, kruip, passing en de stijfheid van de gemonteerde MDF-box moeten fysiek worden getest; geometrische vrijloop bewijst de constructiesterkte niet.');
 const fit=window.MotioGeometry.mountingFit(g),loads=window.MotioMotor.shaftLoads(g,sim.pose);
 add('Rechtstreekse flensmontage',fit.state,fit.issues.join('; ')||'M3-draad '+fit.threadEngagement.toFixed(1)+' mm; Pololu-naven volledig 5 mm op minimumas 23 mm','Ø22,5-doorvoeren; motorflenzen rechtstreeks tegen MDF; een 6 mm MDF-dek met twee 6 mm MDF-ribben. Montagevolgorde en aslengtes geometrisch gecontroleerd.');
 add('Motoraslasten (voorlopige schatting)',loads.state==='LIMIT EXCEEDED'?'FAIL':'NIET BEWEZEN',Object.entries(loads.axes).map(([k,a])=>k+': ax '+a.axialDesign.toFixed(1)+' N; rad.eq '+a.radialDesign.toFixed(1)+' N').join(' · '),loads.assumptions+' Inclusief '+Math.round((g.loadReserve-1)*100)+'% toeslag. Grenzen 10 N / 28 N. Geldt voor huidige stand; export bevat volledige bewegingscontrole.');
 return result;
}
window.MotioValidation={workspace,drawingArea,audit,EngineeringTest,rows};
})();

// ---------- Simulator/js/bubbleText.js ----------
(function () {
'use strict';
// Small outline alphabet: widths, curve knots and optional inner loops.
// Inner loops are reached and retraced with the pen down, like the connectors.
const letters={
 A:{w:24,p:[[5,0],[1,-3],[4,-15],[10,-29],[14,-29],[20,-15],[23,-3],[20,0],[16,-1],[12,-11],[8,-1]],h:[[[12,-24],[15,-17],[9,-17]]]},
 B:{w:24,p:[[12,0],[3,0],[0,-4],[0,-26],[3,-30],[13,-30],[21,-27],[23,-22],[19,-15],[24,-9],[22,-3]],h:[[[8,-23],[14,-23],[16,-20],[14,-18],[8,-18]],[[8,-12],[15,-12],[17,-9],[15,-6],[8,-6]]]},
 C:{w:24,p:[[12,0],[4,-3],[0,-10],[0,-21],[5,-28],[13,-30],[22,-27],[24,-23],[21,-20],[17,-22],[11,-22],[8,-18],[8,-11],[11,-8],[17,-8],[21,-10],[24,-7],[22,-3]]},
 D:{w:24,p:[[12,0],[3,0],[0,-4],[0,-26],[3,-30],[12,-30],[21,-26],[24,-18],[24,-11],[21,-4]],h:[[[8,-22],[14,-22],[17,-18],[17,-11],[14,-7],[8,-7]]]},
 E:{w:24,p:[[12,0],[4,-2],[0,-8],[0,-22],[3,-28],[9,-30],[19,-30],[23,-27],[21,-23],[11,-22],[10,-18],[18,-17],[20,-14],[18,-11],[10,-10],[11,-6],[21,-6],[24,-3],[21,0]]},
 F:{w:23,p:[[4,0],[0,-4],[0,-26],[3,-30],[19,-30],[23,-27],[21,-23],[9,-22],[8,-18],[17,-18],[21,-15],[18,-11],[8,-11],[8,-3]]},
 G:{w:26,p:[[13,0],[5,-2],[0,-9],[0,-21],[5,-28],[14,-30],[23,-27],[25,-23],[22,-20],[17,-22],[11,-22],[8,-18],[8,-11],[12,-7],[18,-8],[18,-12],[14,-12],[12,-15],[15,-18],[23,-18],[26,-15],[26,-7],[22,-2]]},
 H:{w:24,p:[[4,0],[0,-4],[0,-26],[4,-30],[8,-26],[8,-19],[16,-19],[16,-26],[20,-30],[24,-26],[24,-4],[20,0],[16,-4],[16,-11],[8,-11],[8,-4]]},
 I:{w:10,p:[[5,0],[0,-3],[0,-25],[2,-30],[8,-30],[10,-25],[10,-3]]},
 J:{w:22,p:[[10,0],[3,-2],[0,-7],[1,-12],[5,-14],[8,-10],[11,-8],[14,-11],[14,-26],[18,-30],[22,-26],[22,-10],[19,-3]]},
 K:{w:25,p:[[4,0],[0,-4],[0,-26],[4,-30],[8,-26],[8,-19],[17,-28],[22,-30],[25,-26],[15,-15],[24,-5],[25,-2],[21,0],[17,-2],[8,-12],[8,-4]]},
 L:{w:23,p:[[12,0],[4,0],[0,-4],[0,-26],[4,-30],[8,-26],[8,-8],[19,-8],[23,-4],[20,0]]},
 M:{w:30,p:[[5,0],[0,-3],[0,-27],[4,-30],[8,-29],[15,-17],[22,-29],[26,-30],[30,-27],[30,-3],[25,0],[22,-3],[22,-16],[17,-8],[13,-8],[8,-16],[8,-3]]},
 N:{w:25,p:[[4,0],[0,-4],[0,-26],[4,-30],[8,-28],[17,-13],[17,-26],[21,-30],[25,-26],[25,-4],[21,0],[17,-2],[8,-17],[8,-4]]},
 O:{w:24,p:[[12,0],[4,-2],[0,-9],[0,-22],[4,-29],[12,-31],[20,-29],[24,-22],[24,-9],[20,-2]],h:[[[12,-8],[7,-11],[7,-20],[12,-23],[17,-20],[17,-11]]]},
 P:{w:24,p:[[4,0],[0,-4],[0,-26],[4,-30],[14,-30],[22,-27],[24,-20],[22,-13],[16,-10],[8,-10],[8,-4]],h:[[[8,-23],[14,-23],[17,-20],[14,-17],[8,-17]]]},
 Q:{w:27,p:[[12,0],[4,-2],[0,-9],[0,-22],[4,-29],[12,-31],[20,-29],[24,-22],[24,-10],[21,-5],[26,0],[26,3],[22,4],[17,-1]],h:[[[12,-8],[7,-11],[7,-20],[12,-23],[17,-20],[17,-11]]]},
 R:{w:25,p:[[4,0],[0,-4],[0,-26],[4,-30],[14,-30],[22,-27],[24,-21],[22,-15],[18,-12],[24,-5],[25,-2],[21,0],[17,-2],[10,-11],[8,-11],[8,-4]],h:[[[8,-23],[14,-23],[17,-20],[14,-17],[8,-17]]]},
 S:{w:25,p:[[7,0],[0,-3],[0,-8],[4,-10],[9,-8],[16,-9],[17,-12],[10,-15],[4,-17],[0,-22],[1,-27],[7,-30],[17,-30],[24,-27],[24,-23],[20,-21],[15,-23],[9,-22],[8,-19],[16,-17],[22,-14],[25,-9],[23,-3],[17,0]]},
 T:{w:26,p:[[13,0],[9,-3],[9,-22],[4,-22],[0,-26],[3,-30],[23,-30],[26,-26],[22,-22],[17,-22],[17,-3]]},
 U:{w:24,p:[[12,0],[4,-2],[0,-8],[0,-26],[4,-30],[8,-26],[8,-11],[12,-8],[16,-11],[16,-26],[20,-30],[24,-26],[24,-8],[20,-2]]},
 V:{w:28,p:[[13,0],[8,-2],[0,-22],[0,-27],[4,-29],[8,-26],[13,-12],[18,-26],[22,-29],[26,-27],[26,-22],[18,-2]]},
 W:{w:32,p:[[8,0],[4,-3],[0,-25],[2,-30],[6,-30],[9,-15],[12,-27],[16,-30],[20,-27],[23,-15],[26,-30],[30,-30],[32,-25],[28,-3],[24,0],[20,-2],[16,-15],[12,-2]]},
 X:{w:25,p:[[4,0],[0,-3],[1,-7],[8,-15],[1,-24],[0,-27],[4,-30],[8,-28],[13,-21],[18,-28],[22,-30],[25,-27],[24,-23],[17,-15],[24,-7],[25,-3],[21,0],[17,-2],[13,-9],[8,-2]]},
 Y:{w:26,p:[[13,0],[9,-3],[9,-12],[1,-23],[0,-27],[4,-30],[8,-28],[13,-21],[18,-28],[22,-30],[26,-27],[25,-23],[17,-12],[17,-3]]},
 Z:{w:25,p:[[12,0],[4,0],[0,-4],[2,-9],[13,-22],[4,-22],[0,-26],[4,-30],[21,-30],[25,-26],[23,-21],[12,-8],[21,-8],[25,-4],[21,0]]}
};
const cache=new WeakMap();
function controls(points) {
 const result=[...points];
 for(let i=0;i<points.length-1;i++){
  const a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],d=points[Math.min(points.length-1,i+2)];
  result.push(b.map((v,k)=>v+(c[k]-a[k])/6),c.map((v,k)=>v-(d[k]-b[k])/6));
 }
 return result;
}
function path(g) {
 if(cache.has(g))return cache.get(g);
 const knots=[[-5,2]];let cursor=0;
 for(const char of g.wordText){
  const letter=letters[char],entry=[cursor+letter.p[0][0],letter.p[0][1]],previous=knots.at(-1);
  knots.push([(previous[0]+entry[0])/2,4],...letter.p.map(([x,y])=>[x+cursor,y]),entry);
  for(const hole of letter.h||[]){
   const first=[cursor+hole[0][0],hole[0][1]],bridge=[(entry[0]+first[0])/2,(entry[1]+first[1])/2];
   knots.push(bridge,...hole.map(([x,y])=>[x+cursor,y]),first,bridge,entry);
  }
  cursor+=letter.w+6;
 }
 knots.push([cursor-1,2]);
 // Bézier control bounds cover the whole spline, including rounded overshoot.
 const hull=controls(knots),xs=hull.map(p=>p[0]),left=Math.min(...xs),right=Math.max(...xs),centre=(left+right)/2;
 const scale=Math.min(1.2,145/(right-left)),place=([x,y])=>[(x-centre)*scale,y*scale-18];
 const maxRadius=Math.max(...hull.map(p=>Math.hypot(...place(p)))),fit=Math.min(1,81.7/maxRadius);
 const result=knots.map(p=>place(p).map(v=>v*fit));
 cache.set(g,result);return result;
}
window.MotioBubbleText={path,maxLetters:8};
})();

// ---------- Simulator/js/patterns.js ----------
(function () {
'use strict';
const {TAU}=window.MotioMath;
// All profiles keep the pen on the existing certified radial route. C rotates
// the paper to put the ink in the requested place, including bubble words.
const list=Object.freeze([
 // Profile RPM sets drawing progress, not the instantaneous motor-shaft RPM.
 {id:'circle',name:'Cirkel',detail:'Een gesloten cirkel',min:.68,max:.68,frequency:0,turns:1,rpm:5.6},
 {id:'flower3',name:'Bloem · 3 blaadjes',detail:'Drie brede lussen',min:.12,max:.86,frequency:3,turns:1,rpm:2.4},
 {id:'flower5',name:'Bloem · 5 blaadjes',detail:'Vijf symmetrische lussen',min:.12,max:.86,frequency:5,turns:1,rpm:1.8},
 {id:'flower7',name:'Bloem · 7 blaadjes',detail:'Zeven fijne lussen',min:.24,max:.86,frequency:7,turns:1,rpm:1.4},
 {id:'ripple12',name:'Golfring',detail:'Twaalf golven rond de cirkel',min:.43,max:.71,frequency:12,turns:1,rpm:1.2},
 {id:'rosette52',name:'Rozet · 2 rondes',detail:'Vijf overlappende lussen',min:.24,max:.84,frequency:2.5,turns:2,rpm:3.6},
 {id:'rosette73',name:'Rozet · 3 rondes',detail:'Zeven overlappende lussen',min:.24,max:.84,frequency:7/3,turns:3,rpm:3.6},
 {id:'wovenFlower',name:'Verweven bloem',detail:'73 verschoven lussen · 18 rondes',min:.12,max:.86,frequency:73/18,turns:18,rpm:2.4},
 {id:'openRosette',name:'Open rozet',detail:'17 ruime lussen · 6 rondes',min:.24,max:.76,frequency:17/6,turns:6,rpm:3.6},
 {id:'wovenRosette',name:'Dichte rozet',detail:'61 verweven lussen · 16 rondes',min:.08,max:.86,frequency:61/16,turns:16,rpm:2.4},
 {id:'wovenStar',name:'Sterrozet',detail:'79 overlappende lussen met open kern · 18 rondes',min:.18,max:.86,frequency:79/18,turns:18,rpm:2.4},
 {id:'spiral',name:'Spiraal',detail:'Drie rondes van binnen naar buiten',min:.08,max:.86,turns:3,rpm:4.8},
 {id:'vives',name:'VIVES',detail:'Vloeiende bubbelletters · verbonden · vaste pen',turns:1,rpm:.64}
].map(Object.freeze));
// Rounded outlines joined in one pen-down stroke. The knots stay above the
// paper centre so the polar paper angle remains defined throughout the word.
const word=Object.freeze([
 [-56,-14],[-61,-16],[-69,-36],[-69,-41],[-65,-43],[-61,-40],[-56,-26],[-51,-40],[-47,-43],[-43,-41],[-43,-36],[-51,-16],[-56,-14], // V
 [-44,-11],[-33,-14], // flowing connector
 [-38,-17],[-38,-38],[-36,-43],[-30,-43],[-28,-38],[-28,-17],[-33,-14], // I
 [-22,-11],[-10,-14],
 [-15,-16],[-23,-36],[-23,-41],[-19,-43],[-15,-40],[-10,-26],[-5,-40],[-1,-43],[3,-41],[3,-36],[-5,-16],[-10,-14], // V
 [4,-11],[18,-14],
 [11,-16],[9,-22],[9,-36],[11,-42],[18,-44],[29,-44],[33,-41],[31,-37],[20,-36],[19,-32],[28,-31],[30,-28],[28,-25],[19,-24],[20,-20],[31,-20],[34,-17],[31,-14],[18,-14], // E
 [33,-11],[48,-14],
 [41,-17],[41,-22],[45,-24],[50,-22],[57,-23],[58,-26],[51,-29],[45,-31],[41,-36],[42,-41],[48,-44],[58,-44],[65,-41],[65,-37],[61,-35],[56,-37],[50,-36],[49,-33],[57,-31],[63,-28],[66,-23],[64,-17],[58,-14],[48,-14], // S
 [58,-11],[68,-14] // rounded exit
].map(Object.freeze));
const generated=Object.freeze({id:'word',name:'Eigen woord',detail:'Verbonden bubbelletters',turns:1,rpm:.9});
const isText=p=>p?.id==='vives'||p?.id==='word';
const textPath=(g,p)=>p?.id==='word'?window.MotioBubbleText.path(g):word;
function textPoint(phase,g,p=get(g.patternId)) {
 const knots=textPath(g,p),segments=knots.length-1,at=Math.max(0,Math.min(segments,phase/TAU*segments)),i=Math.min(Math.floor(at),segments-1),t=at-i;
 // Catmull-Rom curves share tangents at each knot: no stop at every corner.
 const a=knots[Math.max(0,i-1)],b=knots[i],c=knots[i+1],d=knots[Math.min(knots.length-1,i+2)],scale=g.paper.safeRadius/95;
 const value=[],derivative=[];
 for(let axis=0;axis<2;axis++){
  const m=(c[axis]-a[axis])/2,n=(d[axis]-b[axis])/2;
  const u=2*b[axis]-2*c[axis]+m+n,v=-3*b[axis]+3*c[axis]-2*m-n;
  value[axis]=((u*t+v)*t+m)*t+b[axis];
  derivative[axis]=(3*u*t*t+2*v*t+m)*segments/TAU;
 }
 return {x:value[0]*scale,y:value[1]*scale,dx:derivative[0]*scale,dy:derivative[1]*scale};
}
// SAMENVATTING: 'eigen' = een eigen ontwerp uit het tabblad Eigen (zelfde soort profiel als de patronen).
let eigen=null;
function setEigen(o){eigen=Object.freeze({id:'eigen',name:'Eigen ontwerp',detail:'Zelf ingesteld',...o});return eigen;}
// SAMENVATTING: testpatroon 'kruis' om de echte machine te controleren. Het papier staat
// stil terwijl de pen een rechte lijn trekt (alleen A/B), daarna draait alleen het papier
// 90°. Resultaat: een + met 4 armen van 90 mm, exact 90° uit elkaar.
const kruis=Object.freeze({id:'kruis',name:'Test · rechte lijnen',detail:'4 lijnen van 90 mm, 90° uit elkaar',armen:4,deel:.75,min:0,max:90/95,turns:1,frequency:8,rpm:2});
// Waar in het kruis zitten we? r = afstand tot het midden (mm), hoek = papierhoek (rad), met afgeleiden naar phase.
function kruisStand(p,phase,g){
 const R=g.paper.safeRadius,span=(p.max-p.min)*R,u=Math.max(0,Math.min(p.armen-1e-9,phase/TAU*p.armen)),k=Math.floor(u),f=u-k,du=p.armen/TAU;
 if(f<p.deel){const s=f/p.deel;return {r:p.min*R+span*(1-Math.cos(TAU*s))/2,dr:span*Math.PI*Math.sin(TAU*s)*du/p.deel,hoek:k*Math.PI/2,dhoek:0};}
 const s=(f-p.deel)/(1-p.deel);
 return {r:p.min*R,dr:0,hoek:k*Math.PI/2+Math.PI/4*(1-Math.cos(Math.PI*s)),dhoek:Math.PI/4*Math.PI*Math.sin(Math.PI*s)*du/(1-p.deel)};
}
const get=id=>id==='word'?generated:id==='eigen'?eigen:id==='kruis'?kruis:list.find(p=>p.id===id);
const motion=p=>p.id==='kruis'?'alleen A/B tekenen een rechte lijn; daarna draait alleen C het papier 90°':isText(p)?'A/B en C volgen verbonden bubbelletters in één vloeiend penpad':p.id==='circle'?'A/B houden de pen op vaste radius; C draait het papier':p.id==='spiral'?'A/B bewegen de pen langzaam naar buiten; C draait het papier':'A/B bewegen heen en weer; C draait het papier';
function radius(p,phase,g) {
 if(p.id==='kruis'){const k=kruisStand(p,phase,g);return {value:k.r,derivative:k.dr};} // SAMENVATTING
 if(isText(p)){const t=textPoint(phase,g,p),value=Math.hypot(t.x,t.y);return {value,derivative:(t.x*t.dx+t.y*t.dy)/value};}
 const R=g.paper.safeRadius,span=(p.max-p.min)*R;
 if(p.id==='spiral')return {value:p.min*R+span*phase/(TAU*p.turns),derivative:span/(TAU*p.turns)};
 return {value:p.min*R+span*(1+Math.cos(p.frequency*phase))/2,derivative:-span*p.frequency*Math.sin(p.frequency*phase)/2};
}
function point(g,r) {const a=g.reachAngle*Math.PI/180;return {x:g.paper.x+r*Math.cos(a),y:g.paper.y+r*Math.sin(a)};}
function textRPM(config,p,g) {
 // Check the actual word once before drawing. Short letters can require faster
 // paper reversals than long words. Include BOTH path curvature and the
 // three-second start/resume ramp in the 70% acceleration budget.
 const count=(textPath(g,p).length-1)*64,a=g.reachAngle*Math.PI/180;
 let previous=null,last=null,limit=Infinity;
 for(let i=0;i<=count;i++){
  const phase=TAU*i/count,next=pose(config,p,phase,previous);
  if(!next.valid)throw Error('Woord niet bereikbaar met deze geometrie.');
  previous=next.pose;
  const v=next.r.derivative,px=Math.cos(a)*v,py=Math.sin(a)*v,J=next.pose.J,det=J.ax*J.by-J.ay*J.bx;
  const w={A:(J.by*px-J.bx*py)/det,B:(J.ax*py-J.ay*px)/det,C:next.paperDerivative,pen:v};
  for(const key of ['A','B','C','pen']){
   const speedLimit=key==='pen'?g.maxPenSpeed:(key==='C'?g.maxPaperRPM:g.maxRPM)*TAU/60;
   const accelerationLimit=key==='pen'?g.maxPenAcceleration:key==='C'?g.paperAcceleration:g.acceleration;
   if(w[key])limit=Math.min(limit,.7*speedLimit/Math.abs(w[key]));
   if(last){
    const derivative=Math.abs(w[key]-last[key])*count/TAU;
    const ramp=Math.max(Math.abs(w[key]),Math.abs(last[key]))/3,budget=.7*accelerationLimit;
    const bound=derivative?2*budget/(ramp+Math.sqrt(ramp*ramp+4*derivative*budget)):ramp?budget/ramp:Infinity;
    limit=Math.min(limit,bound);
   }
  }
  last=w;
 }
 const pace=(textPath(g,p).length-1)/(word.length-1);
 return limit*60/TAU*pace;
}
// SAMENVATTING: hoogste veilige papiersnelheid voor een eigen ontwerp. Zelfde methode als
// textRPM: 70 % van de snelheids- en versnellingsgrenzen van A, B, C en de pen.
function safeRPM(config,p,g) {
 const count=Math.ceil(256*p.turns*Math.max(1,p.frequency||1)),a=g.reachAngle*Math.PI/180,span=TAU*p.turns;
 let previous=null,last=null,limit=Infinity;
 for(let i=0;i<=count;i++){
  const next=pose(config,p,span*i/count,previous);
  if(!next.valid)throw Error('Eigen ontwerp niet bereikbaar met deze geometrie.');
  previous=next.pose;
  const v=next.r.derivative,px=Math.cos(a)*v,py=Math.sin(a)*v,J=next.pose.J,det=J.ax*J.by-J.ay*J.bx;
  const w={A:(J.by*px-J.bx*py)/det,B:(J.ax*py-J.ay*px)/det,C:next.paperDerivative,pen:v};
  for(const key of ['A','B','C','pen']){
   const speedLimit=key==='pen'?g.maxPenSpeed:(key==='C'?g.maxPaperRPM:g.maxRPM)*TAU/60;
   const accelerationLimit=key==='pen'?g.maxPenAcceleration:key==='C'?g.paperAcceleration:g.acceleration;
   if(w[key])limit=Math.min(limit,.7*speedLimit/Math.abs(w[key]));
   if(last){
    const derivative=Math.abs(w[key]-last[key])*count/span;
    const ramp=Math.max(Math.abs(w[key]),Math.abs(last[key]))/3,budget=.7*accelerationLimit;
    const bound=derivative?2*budget/(ramp+Math.sqrt(ramp*ramp+4*derivative*budget)):ramp?budget/ramp:Infinity;
    limit=Math.min(limit,bound);
   }
  }
  last=w;
 }
 return limit*60/TAU;
}
function prepare(config) {
 const p=get(config.patternId);if(!p)return config;
 if(!config.rpmC)throw Error('Een patroon vraagt papierrotatie. Kies Eigen motorinstellingen voor stilstaand papier.');
 const g=window.MotioGeometry.build(config),home=window.MotioKinematics.solve(config,{A:config.phaseA*Math.PI/180,B:config.phaseB*Math.PI/180,C:config.phaseC*Math.PI/180});
 const ik=window.MotioKinematics.inverse(config,point(g,radius(p,0,g).value),home.valid?home:null,true);
 if(!ik.valid)throw Error('Patroon niet bereikbaar met deze geometrie. Herstel bouwgeometrie.');
 const start=isText(p)?textPoint(0,g,p):null;
 const phaseC=start?g.reachAngle-Math.atan2(start.y,start.x)*180/Math.PI:config.phaseC;
 const rpmC=p.id==='word'?Math.sign(config.rpmC)*Math.min(Math.abs(config.rpmC),textRPM(config,p,g)):
  p.id==='eigen'||p.id==='kruis'?Math.sign(config.rpmC)*Math.min(Math.abs(config.rpmC),safeRPM(config,p,g)):config.rpmC; // SAMENVATTING
 return window.MotioGeometry.normalize({...config,rpmC,phaseA:ik.q.A*180/Math.PI,phaseB:ik.q.B*180/Math.PI,phaseC});
}
function pose(config,p,phase,previous) {
 const g=window.MotioGeometry.build(config),r=radius(p,phase,g),ik=window.MotioKinematics.inverse(config,point(g,r.value),previous,true);
 if(!ik.valid)return {valid:false,reason:ik.reason};
 let paperDelta=Math.sign(config.rpmC)*phase,paperDerivative=Math.sign(config.rpmC);
 if(p.id==='kruis'){const k=kruisStand(p,phase,g);paperDelta=Math.sign(config.rpmC)*k.hoek;paperDerivative=Math.sign(config.rpmC)*k.dhoek;} // SAMENVATTING
 if(isText(p)){
  const t=textPoint(phase,g,p),start=textPoint(0,g,p);
  paperDelta=Math.atan2(start.y,start.x)-Math.atan2(t.y,t.x);
  paperDerivative=-(t.x*t.dy-t.y*t.dx)/(r.value*r.value);
 }
 const q={...ik.q,C:config.phaseC*Math.PI/180+paperDelta};
 return {valid:true,q,pose:ik.pose,r,paperDelta,paperDerivative};
}
// The ideal reference is computed from the requested machine position and paper
// angle. Live ink is computed independently by forward kinematics in Simulation.
function preview(config,p,samples=360*p.turns) {
 const g=window.MotioGeometry.build(config),points=[];
 if(isText(p)){
  const count=(textPath(g,p).length-1)*16;
  for(let i=0;i<=count;i++){const t=textPoint(TAU*i/count,g,p);points.push({x:t.x,y:t.y});}
  return points;
 }
 if(p.id==='kruis'){ // SAMENVATTING
  for(let i=0;i<=720;i++){const k=kruisStand(p,TAU*i/720,g);points.push(window.MotioPaper.machineToPaper(point(g,k.r),config.phaseC*Math.PI/180+Math.sign(config.rpmC||-1)*k.hoek,g));}
  return points;
 }
 for(let i=0;i<=samples;i++){
  const phase=TAU*p.turns*i/samples,r=radius(p,phase,g).value;
  points.push(window.MotioPaper.machineToPaper(point(g,r),config.phaseC*Math.PI/180+Math.sign(config.rpmC||-1)*phase,g));
 }
 return points;
}
function svg(g,points,name) {
 const R=g.paper.radius,path=points.map((p,i)=>(i?'L':'M')+p.x.toFixed(2)+','+p.y.toFixed(2)).join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+[-R-4,-R-4,2*R+8,2*R+8].join(' ')+'" role="img" aria-label="Voorbeeld '+name+'"><circle r="'+R+'" fill="#f4f0e7"/><circle r="'+g.paper.safeRadius+'" fill="none" stroke="#b5a284" stroke-dasharray="3 5"/><path d="'+path+'" fill="none" stroke="#233b50" stroke-width="1.2"/></svg>';
}
function timing(config,p,t) {
 // Keep roughly the same time per curve segment as VIVES for short/long words.
 const pace=p.id==='word'?(textPath(window.MotioGeometry.build(config),p).length-1)/(word.length-1):1;
 const speed=Math.abs(config.rpmC)*TAU/60/pace,limit=TAU*p.turns,ramp=Math.max(3,speed/config.paperAcceleration),duration=limit/speed+ramp;
 if(t>=duration)return {phase:limit,speed:0,duration,complete:true};
 if(t<ramp)return {phase:speed*t*t/(2*ramp),speed:speed*t/ramp,duration};
 if(t<=duration-ramp)return {phase:speed*(t-ramp/2),speed,duration};
 const remaining=duration-t;return {phase:limit-speed*remaining*remaining/(2*ramp),speed:speed*remaining/ramp,duration};
}
window.MotioPatterns={list,get,isText,motion,radius,point,textPoint,prepare,pose,preview,svg,timing,setEigen};
})();

// ---------- Simulator/js/simulation.js ----------
(function () {
'use strict';
const {TAU,distance}=window.MotioMath;
const {DEFAULT_CONFIG,inspect,audit}=window.MotioMechanics;
const approach=(value,target,step)=>value+Math.max(-step,Math.min(step,target-value));
class Simulation {
 constructor(config=DEFAULT_CONFIG) {
  this.powered=false;this.trace=[];this.configure(config);
 }
 configure(config) {
  const next=window.MotioPatterns.prepare(window.MotioGeometry.normalize(config)),geometry=window.MotioGeometry.build(next);
  const pattern=window.MotioPatterns.get(next.patternId),drawingArea=window.MotioValidation.drawingArea(next);
  if(pattern&&!drawingArea.proven)throw Error('Patroonroute niet veilig aangetoond met deze geometrie. Herstel bouwgeometrie of kies eigen motorinstellingen.');
  this.config=next;this.geometry=geometry;this.pattern=pattern;
  this.patternPreview=pattern?window.MotioPatterns.preview(next,pattern):[];
  this.showPreview=this.showPreview??true;
  // SAMENVATTING: audit() en workspace() weggelaten, alleen nodig voor de validatiepagina.
  this.audit=null;this.workspace=null;this.drawingArea=drawingArea;this.reset();
 }
 reset() {
  this.running=false;this.stopping=false;this.afterStopHome=false;this.homing=false;this.homed=false;this.time=0;this.penSpeed=0;this.penAcceleration=0;this.fault='';this.trace=[];this.strokeBreak=true;this.branchEvents=[];this.angularAcceleration={A:0,B:0,C:0};
  this.q={A:this.config.phaseA*Math.PI/180,B:this.config.phaseB*Math.PI/180,C:this.config.phaseC*Math.PI/180};this.velocity={A:0,B:0,C:0};this.penVelocity={x:0,y:0};
  this.patternTime=0;this.patternPhase=0;this.patternClockRate=1;this.patternComplete=false;this.patternCOrigin=this.q.C;
  this.setPose(inspect(this.config,this.q));this.message=this.powered?'Home vereist · pen handmatig op vaste hoogte':'Power on → Home → Play · pen handmatig vastgezet';
 }
 setPose(pose) {
  this.pose=pose;this.linkageValid=pose.valid;this.safe=pose.safe;
  if(pose.valid) {
   this.penWorld=pose.pen;this.penLocal=window.MotioPaper.machineToPaper(pose.pen,this.q.C,this.geometry);
   this.insidePaper=window.MotioPaper.inside(this.penLocal,this.geometry);
   this.insideSafe=window.MotioPaper.inside(this.penLocal,this.geometry,this.geometry.paper.margin);
  } else {this.penWorld=null;this.penLocal=null;this.insidePaper=false;this.insideSafe=false;}
 }
 halt() {this.running=false;this.stopping=false;this.afterStopHome=false;this.homing=false;this.velocity={A:0,B:0,C:0};this.angularAcceleration={A:0,B:0,C:0};this.penVelocity={x:0,y:0};this.penSpeed=0;this.penAcceleration=0;}
 stop() {
  if(this.running){this.stopping=true;this.message='Gecoördineerd afremmen · pen blijft op papier';return;}
  this.halt();this.message='Gestopt · pen blijft op vaste hoogte';
 }
 pause() {this.stop();}
 power() {this.halt();this.powered=!this.powered;this.homed=false;this.fault='';this.message=this.powered?'Home vereist':'Power off';}
 trip(reason) {this.halt();this.homed=false;this.fault=reason;this.message='INTERLOCK · '+reason;}
 // SAMENVATTING: home(doel) rijdt naar een vaste hardware-home (hoeken in rad)
 // in plaats van naar de startstand van het patroon. Daarna is homed=false.
 home(doel=null) {
  const DESIGN=this.geometry;
  if(!this.powered||this.homing)return;
  if(this.running){this.stop();this.afterStopHome=true;return;}
  this.stop();this.fault='';
  if(!this.safe){this.trip(this.pose.issues.join(' · '));return;}
  this.homeStart={...this.q};this.homeTarget={};let duration=2;
  for(const key of ['A','B','C']) {
   const phase=doel?doel[key]:this.config['phase'+key]*Math.PI/180;
   const target=phase+TAU*Math.round((this.q[key]-phase)/TAU),delta=Math.abs(target-this.q[key]);
   this.homeTarget[key]=target;
   duration=Math.max(duration,1.875*delta/((key==='C'?DESIGN.maxPaperRPM:DESIGN.maxRPM)*TAU/60),Math.sqrt(5.78*delta/(key==='C'?DESIGN.paperAcceleration:DESIGN.acceleration)));
  }
  // Validate the coordinated path before any reference motion. Runtime checks also apply.
  for(let i=0;i<=200;i++) {
   const t=i/200,s=t*t*t*(10+t*(-15+6*t)),q={};
   for(const key of ['A','B','C'])q[key]=this.homeStart[key]+(this.homeTarget[key]-this.homeStart[key])*s;
   const pose=inspect(this.config,q);if(!pose.safe){this.trip('Referentiepad onveilig: '+pose.issues[0]);return;}
   if(!window.MotioPaper.inside(window.MotioPaper.machineToPaper(pose.pen,q.C,DESIGN),DESIGN,DESIGN.paper.margin)){
    this.trip('Referentiepad verlaat de veilige tekencirkel');return;
   }
  }
  this.homeDuration=duration;this.homeElapsed=0;this.homed=false;this.homing=true;this.homingFixed=!!doel;this.message=doel?'Naar vaste home':'Naar startpunt van het patroon';
 }
 play() {
  const DESIGN=this.geometry;
  if(!this.powered||!this.homed||this.homing||this.stopping||!this.safe||!this.insideSafe||this.fault||this.patternComplete)return;
  if(Math.abs(this.config.rpmA)>DESIGN.maxRPM||Math.abs(this.config.rpmB)>DESIGN.maxRPM||Math.abs(this.config.rpmC)>DESIGN.maxPaperRPM){this.trip('Toerental buiten prototypebereik');return;}
  this.running=true;this.message=this.pattern?this.pattern.name+' · '+window.MotioPatterns.motion(this.pattern):'Eigen motorinstellingen · gesloten keten bewaakt';
 }
 clearTrace(){this.trace=[];this.strokeBreak=true;}
 get state(){return !this.powered?'POWER OFF':this.fault||!this.safe?'INTERLOCK':this.homing?'HOMING':!this.homed?'NOT HOMED':this.stopping?'BRAKING':this.running?'RUNNING':this.patternComplete?'COMPLETE':this.time?'PAUSED':'HOMED';}
 advance(q,velocity,dt) {
  const DESIGN=this.geometry;
  const candidate=inspect(this.config,q);
  if(!candidate.safe){this.trip(candidate.issues[0]);return false;}
  const local=window.MotioPaper.machineToPaper(candidate.pen,q.C,DESIGN);
  if(!window.MotioPaper.inside(local,DESIGN,DESIGN.paper.margin)){
   this.trip('Grens veilige tekencirkel bereikt (radius '+DESIGN.paper.safeRadius+' mm)');return false;
  }
  const changed=window.MotioKinematics.branchChange(this.pose,candidate);
  if(changed.assembly){this.trip('Assembly branch switching geweigerd');return false;}
  if(changed.working){this.branchEvents.push({time:this.time,q:{...q},kind:'SERIAL WORKING BRANCH CROSSING'});this.trip('Seriële singulariteit: wissel van bewegingsconfiguratie geblokkeerd');return false;}
  const pv={x:candidate.J.ax*velocity.A+candidate.J.bx*velocity.B,y:candidate.J.ay*velocity.A+candidate.J.by*velocity.B};
  const speed=Math.hypot(pv.x,pv.y),acceleration=distance(pv,this.penVelocity)/dt;
  if(speed>DESIGN.maxPenSpeed||acceleration>DESIGN.maxPenAcceleration){this.trip(speed>DESIGN.maxPenSpeed?'Pensnelheid > '+DESIGN.maxPenSpeed+' mm/s':'Penversnelling > '+DESIGN.maxPenAcceleration+' mm/s²');return false;}
  const angularAcceleration=Object.fromEntries(['A','B','C'].map(k=>[k,(velocity[k]-this.velocity[k])/dt]));
  for(const key of ['A','B','C'])if(Math.abs(velocity[key])*60/TAU>(key==='C'?DESIGN.maxPaperRPM:DESIGN.maxRPM)+1e-8||Math.abs(angularAcceleration[key])>(key==='C'?DESIGN.paperAcceleration:DESIGN.acceleration)+1e-6){
   this.trip('Motor '+key+': snelheid of versnelling buiten prototypebereik');return false;
  }
  const drive=DESIGN.motorCurveConditionsConfirmed?window.MotioMotor.analyze(DESIGN,candidate,velocity,angularAcceleration):{};
  for(const key of ['A','B','C'])if(drive[key]?.qualified&&drive[key].safetyFactor<1){
   this.trip('Motor '+key+': berekende last groter dan beschikbaar curvekoppel');return false;
  }
  this.angularAcceleration=angularAcceleration;
  this.q=q;this.velocity=velocity;this.penVelocity=pv;this.penSpeed=speed;this.penAcceleration=acceleration;this.setPose(candidate);this.recordTrace();return true;
 }
 update(dt) {
  if(!Number.isFinite(dt)||dt<=0)return;
  // All caller intervals are subdivided; no large step may jump across a forbidden pose.
  let remaining=dt;
  // SAMENVATTING: ook HOME in stappen van 0,01 s (origineel 0,002 s).
  while(remaining>1e-10&&(this.homing||this.running)){const step=Math.min(this.pattern ? .01 : .002,remaining);this.step(step);remaining-=step;}
 }
 step(dt) {
  const DESIGN=this.geometry;
  if(this.homing) {
   this.homeElapsed=Math.min(this.homeDuration,this.homeElapsed+dt);
   if(this.homeDuration-this.homeElapsed<1e-9)this.homeElapsed=this.homeDuration;
   const t=this.homeElapsed/this.homeDuration,s=t*t*t*(10+t*(-15+6*t)),ds=30*t*t*(1-t)**2/this.homeDuration,q={},velocity={};
   for(const key of ['A','B','C']){q[key]=this.homeStart[key]+(this.homeTarget[key]-this.homeStart[key])*s;velocity[key]=(this.homeTarget[key]-this.homeStart[key])*ds;}
   if(!this.advance(q,velocity,dt))return;
   if(t>=1&&this.homingFixed){this.homing=false;this.homingFixed=false;this.homed=false;this.message='In vaste home';return;} // SAMENVATTING
   if(t>=1){this.homing=false;this.homed=true;this.time=0;this.patternTime=0;this.patternPhase=0;this.patternClockRate=1;this.patternComplete=false;this.patternCOrigin=this.q.C;this.message='Virtuele Home voltooid · sensoren vereist bij echte bouw';}
   return;
  }
  if(!this.running||!this.powered||!this.homed)return;
  if(this.pattern){this.stepPattern(dt);return;}
  const q={},velocity={};
  for(const key of ['A','B','C']) {
   velocity[key]=approach(this.velocity[key],this.stopping?0:this.config['rpm'+key]*TAU/60,(key==='C'?DESIGN.paperAcceleration:DESIGN.acceleration)*dt);
   q[key]=this.q[key]+(this.velocity[key]+velocity[key])/2*dt;
  }
  if(!this.advance(q,velocity,dt))return;
  this.time+=dt;
  if(this.stopping&&Object.values(velocity).every(v=>Math.abs(v)<1e-10)) {
   const goHome=this.afterStopHome;this.halt();this.message='Gestopt op actuele positie · pen blijft op papier';if(goHome)this.home();return;
  }
 }
 stepPattern(dt) {
  // Slow the profile clock to pause on the same curve; resuming introduces no
  // jump in position. The physical pen remains down throughout.
  const rate=approach(this.patternClockRate,this.stopping?0:1,(window.MotioPatterns.isText(this.pattern)?.25:.5)*dt);
  const t=this.patternTime+(this.patternClockRate+rate)*dt/2;
  const profile=window.MotioPatterns.timing(this.config,this.pattern,t);
  const next=window.MotioPatterns.pose(this.config,this.pattern,profile.phase,this.pose);
  if(!next.valid){this.trip('Patroonstand onbereikbaar: '+next.reason);return;}
  next.q.C=this.patternCOrigin+next.paperDelta;
  const angle=this.geometry.reachAngle*Math.PI/180,speed=next.r.derivative*profile.speed*rate;
  const px=Math.cos(angle)*speed,py=Math.sin(angle)*speed,J=next.pose.J,det=J.ax*J.by-J.ay*J.bx;
  const velocity={A:(J.by*px-J.bx*py)/det,B:(J.ax*py-J.ay*px)/det,C:next.paperDerivative*profile.speed*rate};
  if(!this.advance(next.q,velocity,dt))return;
  this.patternTime=t;this.patternPhase=profile.phase;this.patternClockRate=rate;this.time+=dt;
  if(profile.complete){this.recordTrace(true);this.halt();this.patternComplete=true;this.message=this.pattern.name+' voltooid · Reset → Home om opnieuw te tekenen';return;}
  if(this.stopping&&rate===0){const goHome=this.afterStopHome;this.halt();this.message='Gepauzeerd op het patroon · Play hervat';if(goHome)this.home();}
 }
 recordTrace(force=false) {
  if(!this.insideSafe||!this.safe){this.strokeBreak=true;return;}
  const previous=this.trace[this.trace.length-1];
  if(this.strokeBreak||!previous||distance(this.penLocal,previous)>=(force?1e-9:.16)){this.trace.push({...this.penLocal,break:this.strokeBreak});this.strokeBreak=false;}
  if(this.trace.length>150000){this.trace.splice(0,25000);this.trace[0].break=true;}
 }
}
window.MotioSimulation={Simulation};
})();

// ---------- Simulator/js/renderers.js ----------
(function () {
'use strict';

const {TAU}=window.MotioMath;
const colors={A:'#b9a0ff',B:'#64d8a1',C:'#f4c367'};
const n=v=>Number(v).toFixed(2);
const line=(a,b,color,width=2,dash='')=>`<line x1="${n(a.x)}" y1="${n(a.y)}" x2="${n(b.x)}" y2="${n(b.y)}" stroke="${color}" stroke-width="${width}" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
const circle=(p,r,fill,stroke='#a9becd',w=1.5)=>`<circle cx="${n(p.x)}" cy="${n(p.y)}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${w}"/>`;
const text=(str,x,y,color='#b5c7d7',size=11)=>`<text x="${n(x)}" y="${n(y)}" fill="${color}" font-size="${size}" font-family="Consolas,monospace">${str}</text>`;
function tracePath(trace,limit=12000) {
 let s='';
 for(let i=Math.max(0,trace.length-limit);i<trace.length;i++){const p=trace[i];s+=(p.break||i===Math.max(0,trace.length-limit)?'M':'L')+n(p.x)+','+n(p.y);}
 return s;
}
function mechanismSVG(sim,technical=false,mode='assembly') {
 const d=sim.geometry,p=sim.pose,c=sim.config,b=d.base,paper=d.paper;
 const vb=[b.x-25,b.y-25,b.width+50,b.height+90];
 let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+vb.join(' ')+'" role="img"><title>SIMV7 · drie directe aandrijvingen</title>';
 s+='<rect x="'+b.x+'" y="'+b.y+'" width="'+b.width+'" height="'+b.height+'" fill="#b89b6b" stroke="#725a39"/>';
 s+='<rect x="'+(b.x+d.box.wall)+'" y="'+(b.y+d.box.wall)+'" width="'+(b.width-2*d.box.wall)+'" height="'+(b.height-2*d.box.wall)+'" fill="none" stroke="#d8be95" stroke-width=".7"/>';
 const exposed=mode==='drive'||mode==='bearing';
 if(!exposed) {
  s+=circle(paper,paper.radius,'#334650cc','#899eae',2);
  s+='<g transform="translate('+paper.x+' '+paper.y+') rotate('+n(sim.q.C*180/Math.PI)+')">'+circle({x:0,y:0},paper.radius,'#f4f0e7','#a7bccb',.7)+'<circle r="'+paper.safeRadius+'" fill="none" stroke="#b5a284" stroke-width=".7" stroke-dasharray="3 4"/>';
  s+=circle({x:paper.radius-paper.margin/2,y:0},1.5,'#b5a284','none',0);
  if(!technical)s+='<path d="'+tracePath(sim.trace)+'" fill="none" stroke="#263846" stroke-width=".8"/>';
  s+='</g>';
 }
 if(sim.showWorkspace&&sim.workspace) {
  s+='<g opacity=".26" pointer-events="none">';
  for(const cell of sim.workspace.cells){const color={SAFE:'#64d8a1',CAUTION:'#f4c367',CRITICAL:'#ed6778',UNREACHABLE:'#b44455'}[cell.state];s+='<rect x="'+(cell.x-sim.workspace.step/2)+'" y="'+(cell.y-sim.workspace.step/2)+'" width="'+sim.workspace.step+'" height="'+sim.workspace.step+'" fill="'+color+'"/>';}
  s+='</g>';
 }
 for(const key of ['A','B','C']) {
  const a=d[key],m=a.motor,o=a.pivot,color=colors[key];
  const mw=d.motor.width,hole=d.motor.mountingPitch/2,hidden=!exposed;
  s+='<g '+(hidden?'opacity=".45"':'')+'><g data-bom="MOTOR" tabindex="0" role="button" aria-label="Motor '+key+'"><rect x="'+n(m.x-mw/2)+'" y="'+n(m.y-mw/2)+'" width="'+mw+'" height="'+mw+'" fill="'+(hidden?'none':'#263443')+'" stroke="'+color+'" '+(hidden?'stroke-dasharray="3 4"':'')+'/>';
  for(const x of [-hole,hole])for(const y of [-hole,hole])s+=circle({x:m.x+x,y:m.y+y},1.5,hidden?'none':'#0d1621',color,.5);
  s+=text('M-'+key,m.x-mw/2,m.y-mw/2-9,color,12)+'</g>';
  s+='<g data-bom="HUB" tabindex="0" role="button" aria-label="Naaf '+key+'">'+circle(o,d.hub.radius,'none',color,.7)+'</g></g>';
  if(key!=='C')s+=circle(o,4,'#c6d4de',color);
 }
 if(!exposed)for(const key of ['A','B']) {
  const o=d[key].pivot,e=key==='A'?p.a:p.b,color=colors[key];if(!e)continue;
  s+='<g data-bom="K-'+key+'" tabindex="0" role="button">'+line(o,e,'#071019',d.crankWidth+3)+line(o,e,color,d.crankWidth)+'</g>';
  if(p.valid)s+='<g data-bom="L-'+key+'" tabindex="0" role="button">'+line(e,p.pen,'#071019',d.rodWidth+4)+line(e,p.pen,color,d.rodWidth)+line(e,p.pen,'#e4edf4',1)+'</g>';
  s+=circle(o,4,'#c6d4de')+circle(e,11,'#dce5eb',color,2)+circle(e,4,'#273a49');
 }
 if(p.valid&&!exposed){
  s+='<g data-bom="PEN" tabindex="0" role="button">'+circle(p.pen,d.pen.jointRadius,'#273a49','#d9e6ed',2)+circle(p.pen,d.pen.boreRadius,'#09121b')+circle(p.pen,d.pen.radius,'#f4c367');
  s+=line({x:p.pen.x+d.pen.radius,y:p.pen.y},{x:p.pen.x+29,y:p.pen.y},'#a8cbd2',4)+'<rect x="'+(p.pen.x+26)+'" y="'+(p.pen.y-8)+'" width="6" height="16" fill="#62d7dc"/>'+text('Pen',p.pen.x+22,p.pen.y-23,'#62d7dc',11)+'</g>';
 }
 if(technical){
  s+=text('A '+c.lengthA+' / B '+c.lengthB+' mm h.o.h. · krukken '+c.radiusA+' / '+c.radiusB+' mm',b.x+20,b.y+30,'#62d7dc',12);
  s+=text('BOX '+b.width+' × '+b.height+' × '+d.box.height+' mm · plaat '+b.thickness+' mm MDF · plateau Ø'+2*paper.radius,b.x+10,b.y+b.height+26,'#b5c7d7',10);
  s+=text('Papier Ø'+2*paper.radius+' · tekenzone Ø'+2*paper.safeRadius+' · direct 1:1 · microsteps 1/'+d.motorStepsPerFullStep,b.x+10,b.y+b.height+45,'#b5c7d7',10);
 }
 return s+'</svg>';
}
// Real axial section: holes subtract material in the actual cut plane.
function sectionBody(b,focus){
 const offset=b.x-focus.x,w=b.w||2*b.r,h=b.h,lo=-b.z-h/2;
 if(b.shape==='beam'||b.axis==='x')return '';
 const rect=(x,y,w,h)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'"/>';
 const mask='cut-'+b.id;
 let holes=b.inner?rect(offset-b.inner,lo-.01,2*b.inner,h+.02):'';
 for(const c of b.holes||[]){
  if(c.axis==='x')continue;
  const dy=focus.y-b.y-(c.y||0);if(Math.abs(dy)>=c.r)continue;
  const dx=Math.sqrt(c.r*c.r-dy*dy),z=b.z+(c.z||0),H=c.h||h+2;
  holes+=rect(offset+(c.x||0)-dx,-z-H/2,2*dx,H);
 }
 const color=b.bom==='BASE'||b.bom==='PL'?'#c7ac7e':b.bom==='MOTOR'?'#657a8c':b.bom==='HUB'?'#f4c367':b.bom==='REINF'?'#bac9d4':b.group==='pen'?'#77b4c0':'#c9d6df';
 return '<defs><mask id="'+mask+'" maskUnits="userSpaceOnUse" x="-500" y="-500" width="1000" height="1000"><g fill="white">'+rect(offset-w/2,lo,w,h)+'</g><g fill="black">'+holes+'</g></mask></defs><g fill="'+color+'" stroke="#40576a" stroke-width=".35" mask="url(#'+mask+')">'+rect(offset-w/2,lo,w,h)+'</g>';
}
function detailSVG(sim,kind){
 const g=sim.geometry,p=sim.pose,pen=kind==='pen';
 if(pen&&!p.valid)return '<p>Ongeldige ketensluiting</p>';
 const focus=pen?p.pen:g.paper;
 const parts=window.MotioGeometry.bodies(g,p).filter(b=>pen?b.group==='pen'||b.id.startsWith('endP')||b.id.startsWith('jointP')||b.id.startsWith('armShoulderP'):['BASE','stiffenerC','motorC','motorShaftC','motorBossC','hubC','hubPilotC','platter'].includes(b.id));
 let svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+(pen?'-40 -130 210 125':'-120 -55 300 110')+'"><title>SIMV7 · '+(pen?'bovenliggende penklem':'motor C direct onder bovenplaat')+'</title>';
 for(const b of parts)svg+=sectionBody(b.id==='BASE'?{...b,x:focus.x,w:235,holes:b.holes.map(h=>({...h,x:h.x+b.x-focus.x}))}:b,focus);
 svg+=line({x:0,y:pen?-125:-50},{x:0,y:pen?-10:45},'#62d7dc',.35,'2 2');
 const labels=pen?[[g.pen.clampZ,'M4 handklem boven armen'],[g.pen.clampZ-9,'M3-klem om gladde PLA-penas'],[g.B.rodZ,'B · 6804 + bovenste borging'],[(g.A.rodZ+g.B.rodZ)/2,'Holle PLA Ø19,9/13 + binnenringbus'],[g.A.rodZ,'A · 6804 + onderste borging']]:[[32,'Plateau Ø210 × 6; onderzijde z=20'],[22,'Pololu Ø19/5 × 5; 4× M3×10'],[12,'As 24 ±1 vanaf motorflens'],[5.5,'6 mm MDF + twee gelijmde ribben'],[-7,'Flens rechtstreeks tegen z=0'],[-27,'SY42STH38-1684A · 42,3 × 38']];
 for(const [z,label] of labels)svg+=text(label,pen?28:31,-z,pen?'#c2d6e4':'#b5c7d7',pen?4:4.2);
 return svg+'</svg>';
}
function mountingSVG(sim){
 const g=sim.geometry;
 let svg='<svg xmlns="http://www.w3.org/2000/svg" width="297mm" height="170mm" viewBox="0 0 390 225"><rect width="390" height="225" fill="#fff"/><g font-family="Arial" fill="#172d3c"><text x="12" y="15" font-size="9">MOTIO SIMV7 · motorflens direct onder MDF · maten mm</text>';
 for(const [i,key] of ['A','B','C'].entries()){
  const x=60+i*125,d=g[key],z0=115;
  svg+='<g transform="translate('+x+' '+z0+')">';
  for(const b of window.MotioGeometry.bodies(g,sim.pose).filter(b=>['motor'+key,'motorBoss'+key,'motorShaft'+key,'stiffener'+key,'hub'+key,'hubPilot'+key].includes(b.id)))svg+=sectionBody(b,d.pivot);
  svg+='<path d="M-42 0 H-11.25 V-6 H-42 Z M11.25 0 H42 V-6 H11.25 Z" fill="#d4bb91" stroke="#172d3c" stroke-width=".4"/>';
  for(const left of [-17,2.8])svg+='<rect x="'+left+'" y="'+(-(key==='C'?g.paper.z+g.paper.thickness/2:d.crankZ+g.crankHeight/2))+'" width="14.2" height="'+(key==='C'?g.paper.thickness:g.crankHeight)+'" fill="#a4bbcb" stroke="#172d3c" stroke-width=".4"/>';
  if(key==='B')svg+='<rect x="-14" y="-27" width="11.2" height="4" fill="#a4bbcb"/><rect x="2.8" y="-27" width="11.2" height="4" fill="#a4bbcb"/>';
  svg+='<g font-size="5"><text x="-42" y="-63">'+key+' · naaf '+d.hubBottom+'…'+d.hubTop+'</text><text x="-42" y="-53">'+(key==='C'?'Plateau': 'Kruk')+' onderkant z='+d.hubTop+'</text><text x="-42" y="-43">Armlaag '+(d.rodZ??'—')+'</text><text x="-42" y="52">Montagevlak z=0</text></g></g>';
 }
 svg+='<g font-size="5.4"><text x="12" y="184">M3×10 − ring 0,8 − MDF 6 → 3,2 mm draad (motor max. 4,5).</text><text x="12" y="195">Motoras min. 23; alle Pololu-naven volledig 5 mm op de as. Papier boven z=26.</text><text x="12" y="206">PLA-krukken; M8-scharnieren; PLA-penas zonder draad. Fysieke passing en warmte testen.</text></g></g></svg>';
 return svg;
}
function sectionSVG(sim,exploded=false){return detailSVG(sim,'spindle',exploded);}
class PaperRenderer {
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.cache=document.createElement('canvas');this.cacheContext=this.cache.getContext('2d');this.lastTrace=null;this.count=0;}
 render(sim) {
  const paper=sim.geometry.paper;const rect=this.canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
  const dpr=Math.min(window.devicePixelRatio||1,2),ctx=this.ctx;
  if(this.canvas.width!==Math.round(rect.width*dpr)||this.canvas.height!==Math.round(rect.height*dpr)){this.canvas.width=Math.round(rect.width*dpr);this.canvas.height=Math.round(rect.height*dpr);}
  if(this.lastTrace!==sim.trace||sim.trace.length<this.count||this.cache.width!==paper.width*2||this.cache.height!==paper.height*2){this.cache.width=paper.width*2;this.cache.height=paper.height*2;this.cacheContext.clearRect(0,0,this.cache.width,this.cache.height);this.count=0;this.lastTrace=sim.trace;}
  const cc=this.cacheContext;cc.setTransform(2,0,0,2,0,0);cc.strokeStyle='#233b50';cc.lineWidth=.55;cc.beginPath();
  if(this.count>0){const p=sim.trace[this.count-1];cc.moveTo(p.x+paper.width/2,p.y+paper.height/2);}
  for(let i=this.count;i<sim.trace.length;i++){const p=sim.trace[i];if(p.break||i===0)cc.moveTo(p.x+paper.width/2,p.y+paper.height/2);else cc.lineTo(p.x+paper.width/2,p.y+paper.height/2);}
  cc.stroke();this.count=sim.trace.length;
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);
  const scale=Math.min((rect.width-32)/paper.width,(rect.height-32)/paper.height),ox=(rect.width-paper.width*scale)/2,oy=(rect.height-paper.height*scale)/2;
  ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);ctx.beginPath();ctx.arc(paper.radius,paper.radius,paper.radius,0,TAU);ctx.fillStyle='#f4f0e7';ctx.fill();ctx.clip();
  if(sim.showPreview&&sim.patternPreview.length){ctx.beginPath();for(const [i,p] of sim.patternPreview.entries()){if(i===0)ctx.moveTo(p.x+paper.radius,p.y+paper.radius);else ctx.lineTo(p.x+paper.radius,p.y+paper.radius);}ctx.strokeStyle='#c8b48e';ctx.lineWidth=1/scale;ctx.stroke();}
  ctx.drawImage(this.cache,0,0,paper.width,paper.height);ctx.strokeStyle='#b5a284';ctx.lineWidth=1/scale;ctx.setLineDash([3,4]);ctx.beginPath();ctx.arc(paper.radius,paper.radius,paper.safeRadius,0,TAU);ctx.stroke();ctx.setLineDash([]);
  if(sim.penLocal&&sim.insidePaper){ctx.beginPath();ctx.arc(sim.penLocal.x+paper.width/2,sim.penLocal.y+paper.height/2,3/scale,0,TAU);ctx.fillStyle='#44788c';ctx.fill();}
  ctx.restore();
 }
}
window.MotioRenderers={mechanismSVG,sectionSVG,detailSVG,mountingSVG,PaperRenderer,colors};
})();
'''

# ---------- einde van de samenvatting van de simulatie ----------


# ############################################################
#
#   DEEL 3 · INTERFACE (800 x 600 touchscreen)
#
# ############################################################

PAGINA = r"""<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=800,height=600,initial-scale=1,user-scalable=no">
<title>MOTIO</title>
<style>
:root{--bg:#0a0f15;--panel:#121b26;--rand:#293747;--tekst:#e4edf4;--grijs:#94a8ba;
 --cyaan:#62d7dc;--groen:#64d8a1;--geel:#f4c367;--rood:#ef5b5b;--a:#b9a0ff;--b:#64d8a1;--c:#f4c367}
*{box-sizing:border-box;margin:0;-webkit-tap-highlight-color:transparent}
/* Past zich aan de schermhoogte aan: 800x600, 800x480, of met browserbalk. */
html,body{width:100%;height:100%;overflow:hidden;background:var(--bg);color:var(--tekst);
 font:15px/1.3 system-ui,"Segoe UI",Roboto,sans-serif;user-select:none;touch-action:manipulation}
body{display:flex;flex-direction:column}
button{font:inherit;color:inherit;background:var(--panel);border:2px solid var(--rand);border-radius:10px;cursor:pointer}
button:active:not(:disabled){transform:scale(.96);background:#1b2837}
button:disabled{opacity:.35}
svg{display:block;width:100%;height:100%}

/* ---- kopbalk ---- */
header{flex:none;height:46px;display:flex;align-items:center;gap:8px;padding:0 8px;border-bottom:1px solid var(--rand)}
header h1{font-size:21px;letter-spacing:3px;color:var(--cyaan);margin-right:auto}
.badge{padding:5px 11px;border-radius:20px;font-weight:700;font-size:13px;background:#1b2837;border:1px solid var(--rand);white-space:nowrap}
.badge.ok{background:#14382b;border-color:var(--groen);color:var(--groen)}
.badge.warn{background:#3b3017;border-color:var(--geel);color:var(--geel)}
.badge.bad{background:#401c1f;border-color:var(--rood);color:var(--rood)}
#knop-exit{height:36px;padding:0 12px;font-size:13px}

/* ---- bedieningsknoppen BOVENAAN ----
   Volgorde = volgorde van gebruik:  AAN | START  PAUZE  HOME/WIS | STOP
   AAN staat apart links, STOP altijd apart helemaal rechts. */
#knoppen{flex:none;height:78px;display:flex;gap:6px;padding:6px 8px 0}
#knoppen button{flex:1;font-size:14px;font-weight:700;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}
#knoppen button b{font-size:20px;line-height:1}
.scheiding{flex:none;width:2px;margin:8px 3px;background:var(--rand);border-radius:1px}
#knop-aan{flex:1.1!important}
#knop-start{flex:2.4!important;flex-direction:row!important;gap:10px!important;font-size:26px!important;
 background:#14382b;border:3px solid var(--groen)!important;color:var(--groen)}
#knop-start b{font-size:30px!important}
.klein{flex:1;display:flex;flex-direction:column;gap:4px}
.klein button{flex-direction:row!important;gap:6px!important;font-size:13px!important}
#noodstop{flex:1.6!important;flex-direction:row!important;gap:8px!important;font-size:22px!important;background:#5a1a1f;border:3px solid var(--rood)!important;color:#fff}
/* de knop die je nu moet indrukken */
#knoppen .volgende{border:3px solid var(--cyaan)!important;color:var(--cyaan)!important;background:#11303a!important}
/* niet beschikbaar = volledig grijs, ook START en STOP */
#knoppen button:disabled{opacity:1;background:#141b24!important;border:2px solid #222c38!important;color:#46525f!important}
#bericht{flex:none;height:24px;line-height:24px;font-size:14px;color:var(--grijs);padding:0 12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* ---- midden: papier + tabbladen, vult de rest van het scherm ---- */
main{flex:1;min-height:0;display:flex;gap:8px;padding:0 8px 8px}
#papier-vak{width:400px;flex:none;position:relative;background:var(--panel);border:1px solid var(--rand);border-radius:12px}
#papier{position:absolute;inset:0;width:100%;height:100%;display:block}
#patroon-naam{position:absolute;left:12px;top:10px;font-size:13px;color:var(--grijs)}
#knop-voorbeeld{position:absolute;right:8px;top:8px;height:38px;padding:0 12px;font-size:13px}
#knop-voorbeeld[aria-pressed=true]{border-color:var(--cyaan);color:var(--cyaan)}

#paneel{flex:1;min-width:0;display:flex;flex-direction:column;background:var(--panel);border:1px solid var(--rand);border-radius:12px;overflow:hidden}
#tabs{flex:none;display:flex;border-bottom:1px solid var(--rand)}
#tabs button{flex:1;height:44px;border:0;border-radius:0;background:none;font-weight:600;color:var(--grijs)}
#tabs button[aria-selected=true]{color:var(--cyaan);box-shadow:inset 0 -3px var(--cyaan)}
.tab{flex:1;min-height:0;overflow-y:auto;padding:8px}
#tab-patronen{overflow-y:scroll}
.tab[hidden]{display:none!important}
/* brede scrollbalk, makkelijk met de vinger te pakken */
.tab::-webkit-scrollbar{width:26px}
.tab::-webkit-scrollbar-track{background:var(--bg);border-radius:13px}
.tab::-webkit-scrollbar-thumb{background:#4a6278;border-radius:13px;border:4px solid var(--bg);min-height:60px}
.tab::-webkit-scrollbar-thumb:active{background:var(--cyaan)}

/* patronen */
#tab-patronen{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;align-content:start}
.patroon{height:112px;padding:6px;display:flex;flex-direction:column;gap:4px;min-width:0}
.patroon svg{flex:1;min-height:0}
.patroon span{font-size:11px;color:var(--grijs);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.patroon[aria-pressed=true]{border-color:var(--cyaan);background:#11303a}

/* woord: past zonder scrollen; het voorbeeld krijgt de ruimte die overblijft */
#tab-woord{display:flex;flex-direction:column;gap:6px;overflow:hidden}
.woord-rij{display:flex;gap:6px;flex:none}
#woord-tekst{flex:1;min-width:0;height:46px;display:flex;align-items:center;padding:0 10px;font-size:24px;font-weight:700;
 letter-spacing:3px;background:var(--bg);border:2px solid var(--rand);border-radius:10px}
#woord-gebruik{width:96px;font-weight:700;border-color:var(--cyaan);color:var(--cyaan)}
#woord-voorbeeld{flex:1;min-height:40px;background:var(--bg);border-radius:10px;padding:3px}
#toetsen{flex:none;display:grid;grid-template-columns:repeat(9,1fr);gap:4px}   /* 26 letters + ⌫ = 3 × 9 */
#toetsen button{height:40px;padding:0;font-size:17px;font-weight:600;border-radius:8px}

/* eigen ontwerp: 6 instellingen in 2 kolommen + voorbeeld en knop, past zonder scrollen */
#tab-eigen{display:flex;flex-direction:column;gap:6px;overflow:hidden}
#instel{flex:none;display:grid;grid-template-columns:1fr 1fr;gap:5px}
.regel{background:var(--bg);border-radius:8px;padding:3px 5px 5px}
.regel small{display:block;font-size:11px;color:var(--grijs);padding-left:2px}
.stel{display:flex;align-items:center;gap:4px}
.stel button{width:40px;height:38px;padding:0;font-size:20px;font-weight:700;flex:none}
.stel span{flex:1;text-align:center;font-size:16px;font-weight:700}
#eigen-richting{width:100%;height:38px;font-weight:700}
.eigen-onder{flex:1;min-height:60px;display:flex;gap:6px}
#eigen-voorbeeld{aspect-ratio:1;height:100%;flex:none;background:var(--bg);border-radius:10px;padding:2px}
#eigen-gebruik{flex:1;font-weight:700;font-size:16px;border-color:var(--cyaan);color:var(--cyaan);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}
#eigen-gebruik small{font-size:11px;font-weight:400;color:var(--grijs)}

/* machine: testpatroon */
#test-vak{flex:none;display:flex;gap:8px;align-items:center;background:var(--bg);border-radius:10px;padding:6px;font-size:12px;line-height:1.35;color:var(--grijs)}
#test-vak b{color:var(--tekst)}
#knop-test{flex:none;width:130px;height:52px;font-weight:700;font-size:13px;border-color:var(--cyaan);color:var(--cyaan)}

/* machine: uitleg vaste home */
#home-info{background:var(--bg);border-radius:10px;padding:8px 10px;font-size:13px;line-height:1.45;color:var(--grijs)}
#home-info strong{color:var(--tekst)}
#home-staat.ok{color:var(--groen)}#home-staat.nee{color:var(--geel)}

/* machine */
#tab-machine{display:flex;flex-direction:column;gap:8px}
#mechanisme{flex:none;height:170px;background:var(--bg);border-radius:10px}
#live{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.motor{background:var(--bg);border-radius:8px;padding:6px 8px;font-size:13px}
.motor strong{display:block}.motor.a strong{color:var(--a)}.motor.b strong{color:var(--b)}.motor.c strong{color:var(--c)}
#pen{font-size:13px;color:var(--grijs)}

/* exit */
#exit-scherm,#home-scherm{position:fixed;inset:0;background:rgba(5,8,12,.94);display:flex;align-items:center;justify-content:center}
#exit-scherm[hidden],#home-scherm[hidden]{display:none}
#home-scherm .exit-doos{width:420px;gap:12px}
#home-vraag{font-size:20px;font-weight:700}
#home-uitleg{color:var(--grijs);line-height:1.5}
#home-ja{height:64px;font-size:18px;font-weight:700;background:#14382b;border:3px solid var(--groen);color:var(--groen)}
#home-nee{height:48px}
.exit-doos{width:300px;display:flex;flex-direction:column;gap:8px;text-align:center}
#exit-code{height:46px;font-size:30px;letter-spacing:8px;background:var(--panel);border-radius:10px;line-height:46px}
#exit-melding{height:18px;color:var(--rood);font-size:13px}
#cijfers{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
#cijfers button{height:52px;font-size:24px}
#exit-ok{height:52px;font-weight:700;background:#5a1a1f;border-color:var(--rood)}
</style>
</head>
<body>
<header>
 <h1>MOTIO</h1>
 <span id="verbinding" class="badge bad">GEEN MOTOREN</span>
 <span id="status" class="badge">UIT</span>
 <button id="knop-exit">EXIT</button>
</header>

<div id="knoppen">
 <button id="knop-aan"><b>⏻</b><span>AAN</span></button>
 <div class="scheiding"></div>
 <button id="knop-start"><b>▶</b>START</button>
 <button id="knop-pauze"><b>❚❚</b>PAUZE</button>
 <div class="klein">
  <button id="knop-home"><b>⌂</b>HOME</button>
  <button id="knop-wis"><b>⌫</b>WIS</button>
 </div>
 <div class="scheiding"></div>
 <button id="noodstop"><b>■</b>STOP</button>
</div>
<div id="bericht"></div>

<main>
 <section id="papier-vak">
  <canvas id="papier"></canvas>
  <span id="patroon-naam"></span>
  <button id="knop-voorbeeld" aria-pressed="true">Voorbeeld</button>
 </section>

 <section id="paneel">
  <nav id="tabs">
   <button data-tab="patronen" aria-selected="true">Patronen</button>
   <button data-tab="woord" aria-selected="false">Woord</button>
   <button data-tab="eigen" aria-selected="false">Eigen</button>
   <button data-tab="machine" aria-selected="false">Machine</button>
  </nav>
  <div id="tab-patronen" class="tab"></div>
  <div id="tab-woord" class="tab" hidden>
   <div class="woord-rij"><div id="woord-tekst"></div><button id="woord-gebruik">Gebruik</button></div>
   <div id="woord-voorbeeld"></div>
   <div id="toetsen"></div>
  </div>
  <div id="tab-eigen" class="tab" hidden>
   <div id="instel"></div>
   <div class="eigen-onder">
    <div id="eigen-voorbeeld"></div>
    <button id="eigen-gebruik">Gebruik ontwerp<small id="eigen-info"></small></button>
   </div>
  </div>
  <div id="tab-machine" class="tab" hidden>
   <div id="test-vak">
    <button id="knop-test">📏 Testpatroon: rechte lijnen</button>
    <div>Tekent een <b>+</b>: 4 rechte lijnen van <b>90 mm</b> vanuit het midden, exact <b>90°</b> uit elkaar.
    Meet na: lengte, rechtheid en hoeken.</div>
   </div>
   <div id="mechanisme"></div>
   <div id="live"></div>
   <div id="pen"></div>
   <div id="home-info">
    <strong>Vaste home</strong> · <span id="home-staat"></span><br>
    Pen precies in het <strong>midden van het papier</strong> (de cyaan ring),
    plateau-markering op <strong>0°</strong> (wijst naar rechts) · <span id="home-hoeken"></span>.<br>
    Zet de machine <strong>met de hand</strong> in home terwijl ze UIT staat (de krukken draaien dan vrij),
    en bevestig bij <strong>AAN</strong>. Zo begint elke tekening vanuit een gecontroleerde stand,
    ook na lang gebruik. De knop HOME rijdt naar waar MOTIO dénkt dat home is: staat de pen dan
    niet op de markering, dan zijn er stappen verloren.
   </div>
  </div>
 </section>
</main>

<div id="home-scherm" hidden>
 <div class="exit-doos">
  <div id="home-vraag">Staat de machine in de vaste home?</div>
  <div id="home-uitleg">Pen precies in het <b>midden van het papier</b><br>plateau-markering op <b>0°</b> (wijst naar rechts)</div>
  <button id="home-ja">JA · MOTOREN AAN</button>
  <button id="home-nee">Nee, ik zet hem eerst goed</button>
 </div>
</div>

<div id="exit-scherm" hidden>
 <div class="exit-doos">
  <div>Code om af te sluiten</div>
  <div id="exit-code"></div>
  <div id="exit-melding"></div>
  <div id="cijfers"></div>
  <button id="exit-ok">AFSLUITEN</button>
 </div>
</div>

<script>
%SIMULATIE%
</script>
<script>
(function(){
'use strict';
const $=id=>document.getElementById(id);
const AXES=['A','B','C'],TAU=Math.PI*2;
const P=window.MotioPatterns;
const sim=new window.MotioSimulation.Simulation();
const paper=new window.MotioRenderers.PaperRenderer($('papier'));
const STATUS={'POWER OFF':'UIT',INTERLOCK:'GESTOPT',HOMING:'NAAR HOME','NOT HOMED':'HOME NODIG',
 BRAKING:'AFREMMEN',RUNNING:'TEKENEN',PAUSED:'GEPAUZEERD',HOMED:'OP STARTPUNT',COMPLETE:'KLAAR ✓'};
let pi=null,piFout='',bezig=false,afgesloten=false;
let woord=sim.config.wordText||'MOTIO';
let tempo=1;     // hoe snel de simulatie echt loopt (1 = realtime); trager toestel = < 1
let starten=0;   // START-volgorde: 0 niets, 1 wacht op motoren, 2 naar startpunt
let uitzetten=0; // UIT-volgorde:   0 niets, 1 wacht tot stil,   2 naar vaste home

// ---------- vaste home ----------
// Zonder eindschakelaars weet de Pi niet waar de krukken staan, en stappenmotoren
// kunnen na lang gebruik stappen verliezen. Daarom is er één vaste, met het oog
// controleerbare stand: pen in het midden van het papier, plateau-markering op 0°.
// De gebruiker zet de machine daar MET DE HAND in (bij UIT draaien de krukken vrij)
// en bevestigt dat bij AAN. Er wordt nooit automatisch naar home gereden.
//
// HOME_AFSTAND: mm vanaf het midden van het papier. 0 = precies in het midden
//   (getest: veilig, heen en terug werkt voor alle patronen).
//   Liever aan de rand? Gebruik HOME_RICHTING 230 (linksboven, langs de tekenarm)
//   met een afstand van max. 95 mm. Andere richtingen zijn niet veilig getest.
const HOME_RICHTING=230,HOME_AFSTAND=0;
const D=window.MotioGeometry.DEFAULT_CONFIG,G0=window.MotioGeometry.build(window.MotioGeometry.normalize(D));
const HOME_PEN={x:G0.paper.x+HOME_AFSTAND*Math.cos(HOME_RICHTING*Math.PI/180),y:G0.paper.y+HOME_AFSTAND*Math.sin(HOME_RICHTING*Math.PI/180)};
const homeIK=window.MotioKinematics.inverse(D,HOME_PEN,window.MotioKinematics.solve(D,{A:D.phaseA*Math.PI/180,B:D.phaseB*Math.PI/180,C:0}),true);
const VASTE_HOME={A:homeIK.q.A,B:homeIK.q.B,C:0};
const hoekVerschil=v=>Math.abs((((v+Math.PI)%TAU)+TAU)%TAU-Math.PI);
const inHome=()=>AXES.every(k=>hoekVerschil(sim.q[k]-VASTE_HOME[k])<1e-3);
function zetInHome(){sim.q={...VASTE_HOME};sim.setPose(window.MotioMechanics.inspect(sim.config,sim.q));}

// ---------- verbinding met de motoren ----------
// Motorhoek = hoek van de uitgangsas × overbrenging × draairichting van de motor.
const motorHoek=k=>sim.geometry[k].motorSign*sim.geometry[k].ratio*sim.q[k];
const motorSnelheid=k=>sim.geometry[k].motorSign*sim.geometry[k].ratio*sim.velocity[k];
// Fout op de Pi: de echte stand is niet meer zeker, dus met de hand terug naar home.
function uit(reden){starten=0;uitzetten=0;sim.trip(reden);sim.powered=false;sim.message=reden+' · krukken vrij: zet de pen met de hand in het midden en druk AAN';}
async function zend(){
 if(bezig||afgesloten)return;bezig=true;
 // Loopt de simulatie trager dan realtime, dan krijgen de motoren ook een
 // lagere snelheid door, zodat ze niet voorlopen en terug moeten.
 const assen={};for(const k of AXES)assen[k]=[motorHoek(k),motorSnelheid(k)*tempo];
 try{
  const res=await fetch('/api/motoren',{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({aan:sim.powered,assen})});
  if(!res.ok)throw Error('HTTP '+res.status);
  pi=await res.json();piFout='';
  if(pi.fout&&sim.powered)uit(pi.fout);   // fout op de Pi stopt ook de simulator
 }catch(e){
  pi=null;piFout='Geen verbinding met de motoren · start python3 dev.py';
  if(sim.powered)uit('Verbinding met de motoren verloren');
 }finally{bezig=false;}
}
setInterval(zend,40);

// ---------- patroon kiezen ----------
// De echte machine staat nog waar ze stond: de huidige hoeken blijven behouden,
// HOME rijdt daarna naar de startstand van het nieuwe patroon.
function kies(config){
 if(sim.running||sim.homing||sim.stopping)return 'Pauzeer eerst de tekening';
 const q={...sim.q},powered=sim.powered;
 try{sim.configure(config);}catch(e){return e.message;}
 sim.powered=powered;sim.q=q;sim.setPose(window.MotioMechanics.inspect(sim.config,q));
 sim.message=(sim.pattern?.id==='word'?sim.config.wordText:sim.pattern?.name)+' staat klaar · druk '+(powered?'START':'AAN en dan START');
 tekenPatronen();return '';
}
function tekenPatronen(){
 const vak=$('tab-patronen');vak.innerHTML='';
 for(const p of P.list){
  const b=document.createElement('button');b.className='patroon';
  b.setAttribute('aria-pressed',String(sim.pattern?.id===p.id));
  b.innerHTML=P.svg(sim.geometry,P.preview(sim.config,p),p.name)+'<span>'+p.name+'</span>';
  b.onclick=()=>{sim.message=kies({...sim.config,patternId:p.id,rpmC:-p.rpm})||sim.message;};
  vak.append(b);
 }
}

// ---------- eigen woord ----------
function tekenWoord(){
 $('woord-tekst').textContent=woord;$('woord-gebruik').disabled=!woord;
 $('woord-voorbeeld').innerHTML=woord?P.svg(sim.geometry,P.preview({...sim.config,wordText:woord},P.get('word')),woord):'';
}
for(const t of [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ','⌫']){
 const b=document.createElement('button');b.textContent=t;
 b.onclick=()=>{woord=t==='⌫'?woord.slice(0,-1):(woord+t).slice(0,8);tekenWoord();};
 $('toetsen').append(b);
}
$('woord-gebruik').onclick=()=>{
 const fout=kies({...sim.config,patternId:'word',wordText:woord,rpmC:-P.get('word').rpm});
 if(fout)sim.message=fout;
};

// ---------- eigen ontwerp ----------
// Zelfde soort beweging als de patronen: de pen gaat heen en weer langs de veilige
// tekenroute (tussen binnen en buiten) terwijl het papier draait. Zo kan het
// ontwerp nooit tegen de kast of het plateau lopen. De papiersnelheid wordt bij
// Gebruik automatisch begrensd tot wat de motoren veilig aankunnen.
const RAND=G0.paper.safeRadius;   // 95 mm
const eigen={binnen:20,buiten:85,golven:4,rondes:1,rpm:3,richting:-1};
const INSTEL=[
 ['binnen','Binnen · mm',5,0,90,v=>v],
 ['buiten','Buiten · mm',5,10,95,v=>v],
 ['golven','Golven per ronde',.5,0,15,v=>v],
 ['rondes','Rondes',1,1,20,v=>v],
 ['rpm','Papier · RPM',.5,.5,8,v=>v.toFixed(1)]];
function eigenProfiel(){
 return {min:Math.min(eigen.binnen,eigen.buiten)/RAND,max:eigen.buiten/RAND,frequency:eigen.golven,turns:eigen.rondes,rpm:eigen.rpm};
}
function tekenEigen(){
 for(const [k,,,,,f] of INSTEL)$('eigen-'+k).textContent=f(eigen[k]);
 $('eigen-richting').textContent=eigen.richting<0?'↺ Linksom':'↻ Rechtsom';
 const p={id:'voorbeeld',...eigenProfiel()};
 $('eigen-voorbeeld').innerHTML=P.svg(sim.geometry,P.preview({...sim.config,phaseC:0,rpmC:eigen.richting*eigen.rpm},p),'eigen ontwerp');
 $('eigen-info').textContent=eigen.rondes+(eigen.rondes>1?' rondes':' ronde')+' · '+eigen.golven+' golven';
}
for(const [k,label,stap,min,max] of INSTEL){
 const r=document.createElement('div');r.className='regel';
 r.innerHTML='<small>'+label+'</small><div class="stel"><button>−</button><span id="eigen-'+k+'"></span><button>+</button></div>';
 const [min_,plus]=r.querySelectorAll('button');
 const zet=d=>{eigen[k]=Math.round(Math.min(max,Math.max(min,eigen[k]+d))*100)/100;
  if(eigen.binnen>eigen.buiten-5){if(k==='binnen')eigen.buiten=Math.min(95,eigen.binnen+5);else eigen.binnen=Math.max(0,eigen.buiten-5);}
  tekenEigen();};
 min_.onclick=()=>zet(-stap);plus.onclick=()=>zet(stap);
 $('instel').append(r);
}
{const r=document.createElement('div');r.className='regel';
 r.innerHTML='<small>Draairichting papier</small><button id="eigen-richting"></button>';
 $('instel').append(r);
 $('eigen-richting').onclick=()=>{eigen.richting*=-1;tekenEigen();};}
$('eigen-gebruik').onclick=()=>{
 P.setEigen(eigenProfiel());
 const gevraagd=eigen.rpm,fout=kies({...sim.config,patternId:'eigen',rpmC:eigen.richting*eigen.rpm});
 if(fout){sim.message=fout;return;}
 const echt=Math.abs(sim.config.rpmC),duur=P.timing(sim.config,sim.pattern,0).duration;
 sim.message='Eigen ontwerp klaar · ≈ '+Math.max(1,Math.round(duur/60))+' min'+
  (echt<gevraagd-1e-6?' · papier begrensd tot '+echt.toFixed(2)+' RPM (veilig voor de motoren)':'')+
  ' · druk '+(sim.powered?'START':'AAN en dan START');
};

// ---------- testpatroon: rechte lijnen ----------
$('knop-test').onclick=()=>{
 const fout=kies({...sim.config,patternId:'kruis',rpmC:-2});
 sim.message=fout||'Testpatroon klaar: + met 4 lijnen van 90 mm · druk '+(sim.powered?'START':'AAN en dan START');
};

// ---------- knoppen ----------
// AAN: eerst bevestigen dat de machine met de hand in de vaste home staat.
$('knop-aan').onclick=()=>{
 starten=0;
 if(!sim.powered){if(pi)$('home-scherm').hidden=false;}
 else{uitzetten=1;sim.message='Afremmen, daarna uit…';}
};
$('home-ja').onclick=()=>{
 $('home-scherm').hidden=true;
 if(sim.powered||!pi)return;
 zetInHome();sim.power();   // deze stand wordt het nulpunt voor de motoren
 sim.message='Motoren aan · vanuit vaste home · druk START';
};
$('home-nee').onclick=()=>{
 $('home-scherm').hidden=true;
 sim.message='Draai de krukken met de hand tot de pen in het midden staat · druk dan AAN';
};
$('knop-home').onclick=()=>{starten=0;sim.home(VASTE_HOME);};
$('knop-pauze').onclick=()=>{starten=0;sim.pause();};
$('knop-wis').onclick=()=>sim.clearTrace();
$('noodstop').onclick=()=>{starten=0;uitzetten=0;sim.trip('STOP ingedrukt · START gaat verder · UIT zet de drivers uit');};

// UIT: tijdens het tekenen eerst rustig afremmen, dan de drivers uit.
// Daarna draaien de krukken vrij en kun je de machine met de hand in home zetten.
function uitVolgorde(){
 if(!uitzetten)return;
 if(!sim.powered){uitzetten=0;return;}
 if(sim.running&&!sim.stopping)sim.pause();
 if(sim.running||sim.stopping)return;
 uitzetten=0;sim.power();
 sim.message='Uit · krukken vrij: zet de pen met de hand in het midden en druk AAN';
}

// Na een tekening alleen een tip tonen; er wordt niets vanzelf bewogen.
let klaarGemeld=false;
function naTekening(){
 if(!sim.patternComplete){klaarGemeld=false;return;}
 if(klaarGemeld)return;
 klaarGemeld=true;
 sim.message=(sim.pattern?.id==='word'?sim.config.wordText:sim.pattern.name)+
  ' klaar · voor de beste nauwkeurigheid: UIT, pen met de hand in het midden, AAN';
}

// START (na AAN) doet de rest: HOME indien nodig → tekenen.
$('knop-start').onclick=()=>{
 if(!sim.powered)return;
 starten=1;sim.message='Starten…';
};
function startVolgorde(){
 if(!starten)return;
 if(!sim.powered){starten=0;return;}
 if(starten===1){
  if(!pi?.aan)return;   // wacht tot de motoren echt aan staan
  if(sim.homed&&!sim.fault&&!sim.patternComplete){sim.play();starten=0;return;}
  sim.home();starten=sim.homing?2:0;   // HOME mislukt = melding blijft staan
  return;
 }
 if(!sim.homing){if(sim.homed)sim.play();starten=0;}
}
$('knop-voorbeeld').onclick=()=>{sim.showPreview=!sim.showPreview;};
for(const tab of document.querySelectorAll('#tabs button'))tab.onclick=()=>{
 for(const t of document.querySelectorAll('#tabs button')){
  const aan=t===tab;t.setAttribute('aria-selected',String(aan));$('tab-'+t.dataset.tab).hidden=!aan;
 }
};

// ---------- EXIT met code (gecontroleerd door de server) ----------
let code='';
const toonCode=()=>{$('exit-code').textContent='•'.repeat(code.length);};
for(const t of ['1','2','3','4','5','6','7','8','9','✕','0','⌫']){
 const b=document.createElement('button');b.textContent=t;
 b.onclick=()=>{
  if(t==='✕'){$('exit-scherm').hidden=true;return;}
  code=t==='⌫'?code.slice(0,-1):(code+t).slice(0,8);$('exit-melding').textContent='';toonCode();
 };
 $('cijfers').append(b);
}
$('knop-exit').onclick=()=>{code='';toonCode();$('exit-melding').textContent='';$('exit-scherm').hidden=false;};
$('exit-ok').onclick=async()=>{
 try{
  const res=await fetch('/api/afsluiten',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});
  if(!(await res.json()).ok){code='';toonCode();$('exit-melding').textContent='Verkeerde code';return;}
  afgesloten=true;
  document.body.innerHTML='<p style="padding:260px 0;text-align:center;font-size:24px">MOTIO is afgesloten · motoren uit</p>';
 }catch(e){$('exit-melding').textContent='Geen verbinding met de server';}
};

// ---------- weergave ----------
// Cyaan ring op het papier waar de pen in de vaste home hoort (zelfde schaal als PaperRenderer).
function tekenHomeMarkering(s){
 const c=$('papier'),ctx=c.getContext('2d'),r=c.getBoundingClientRect(),pp=s.geometry.paper;
 const schaal=Math.min((r.width-32)/pp.width,(r.height-32)/pp.height),ox=(r.width-pp.width*schaal)/2,oy=(r.height-pp.height*schaal)/2;
 const h=window.MotioPaper.machineToPaper(HOME_PEN,s.q.C,s.geometry);
 const x=ox+(h.x+pp.radius)*schaal,y=oy+(h.y+pp.radius)*schaal;
 ctx.save();ctx.strokeStyle='#62d7dc';ctx.fillStyle='#62d7dc';ctx.lineWidth=2;
 ctx.beginPath();ctx.arc(x,y,8,0,TAU);ctx.stroke();
 ctx.font='bold 11px system-ui,sans-serif';ctx.fillText('HOME',x+11,y-8);ctx.restore();
}
const fmt=(v,d=1)=>Number.isFinite(v)?v.toFixed(d):'—';
function toon(){
 const s=sim;
 const thuis=inHome();
 $('status').textContent=s.homing?(s.homingFixed?'NAAR HOME':'NAAR START'):
  s.powered&&!s.fault&&!s.running&&!s.stopping&&thuis?(s.patternComplete?'KLAAR ✓ · IN HOME':'IN HOME'):STATUS[s.state]||s.state;
 $('status').className='badge '+(s.fault||!s.safe?'bad':s.running?'ok':s.homing||s.stopping?'warn':'');
 const bezigMet=s.running||s.homing||s.stopping||starten>0||uitzetten>0;
 $('knop-aan').querySelector('span').textContent=s.powered?'UIT':'AAN';
 // UIT: alles grijs behalve AAN. AAN: START groen, STOP rood.
 $('knop-aan').disabled=(!s.powered&&!pi)||uitzetten>0;
 $('knop-start').disabled=!s.powered||bezigMet;
 $('knop-pauze').disabled=!s.running||s.stopping;
 $('knop-home').disabled=!s.powered||bezigMet||thuis;
 $('knop-wis').disabled=!s.powered||!s.trace.length;
 $('noodstop').disabled=!s.powered;
 $('knop-aan').classList.toggle('volgende',!s.powered&&!!pi);
 $('bericht').textContent=piFout||s.message+(tempo<.9&&(s.running||s.homing)?' · rekent aan '+Math.round(tempo*100)+'%':'');
 // Groen = echte motoren, geel = demo (niets beweegt), rood = geen verbinding
 const v=$('verbinding'),soorten=pi?[...new Set(Object.values(pi.motoren).map(m=>m.soort))]:[];
 const demo=soorten.includes('demo');
 v.className='badge '+(!pi?'bad':demo?'warn':'ok');
 v.textContent=!pi?'GEEN MOTOREN':demo?'DEMO · geen echte motoren':'MOTOREN '+(s.powered?'AAN':'klaar')+' · '+soorten.join(', ');
 $('patroon-naam').textContent=s.pattern?(s.pattern.id==='word'?s.config.wordText:s.pattern.name):'Geen patroon';
 $('knop-voorbeeld').setAttribute('aria-pressed',String(!!s.showPreview));
 // Papier alleen opnieuw tekenen als er iets veranderd is
 const doek=$('papier');
 const sleutel=[s.trace.length,s.q.A,s.q.B,s.q.C,s.showPreview,s.pattern?.id,s.config.wordText,doek.clientWidth,doek.clientHeight].join();
 if(sleutel!==vorigPapier){paper.render(s);tekenHomeMarkering(s);vorigPapier=sleutel;}
 if(!$('tab-machine').hidden){
  $('mechanisme').innerHTML=window.MotioRenderers.mechanismSVG(s);
  const g=s.geometry;
  $('live').innerHTML=AXES.map(k=>{
   const hoek=((motorHoek(k)*180/Math.PI)%360+360)%360,rpm=motorSnelheid(k)*60/TAU;
   return '<div class="motor '+k.toLowerCase()+'"><strong>Motor '+k+'</strong>'+fmt(hoek)+'°<br>'+fmt(rpm,2)+' RPM</div>';
  }).join('');
  $('pen').textContent=s.penLocal?'Pen op papier: X '+fmt(s.penLocal.x)+' · Y '+fmt(s.penLocal.y)+' mm · '+s.trace.length+' punten':'Pen: —';
  $('home-staat').textContent=thuis?'machine staat in home':'machine staat niet in home';
  $('home-staat').className=thuis?'ok':'nee';
  $('home-hoeken').textContent='kruk A '+fmt(VASTE_HOME.A*180/Math.PI)+'° · kruk B '+fmt(VASTE_HOME.B*180/Math.PI)+'°';
 }
}

// ---------- animatielus ----------
// Vaste stap van 0,01 s, maximaal 1× realtime (de echte motoren volgen).
// Per beeld mag de simulatie hoogstens BUDGET ms rekenen: is het toestel te
// traag, dan loopt de machine wat trager maar blijft het scherm reageren.
const STAP=.01,BUDGET=25;
let vorige=performance.now(),acc=0,laatst=0,vorigPapier='',gemeten=1;
function frame(nu){
 const dt=Math.min(Math.max(0,(nu-vorige)/1000),.1);vorige=nu;
 startVolgorde();uitVolgorde();naTekening();
 if(sim.running||sim.homing){
  acc+=dt;let gedaan=0;const einde=performance.now()+BUDGET;
  while(acc>=STAP&&(sim.running||sim.homing)&&performance.now()<einde){sim.update(STAP);acc-=STAP;gedaan+=STAP;}
  acc=Math.min(acc,STAP*2);                          // achterstand niet opsparen
  if(dt>0)gemeten+=(gedaan/dt-gemeten)*.05;   // afgevlakt over ~20 beelden
  tempo=Math.min(1,gemeten);
 }else{acc=0;tempo=1;gemeten=1;}
 if(nu-laatst>=100){toon();laatst=nu;}
 if(!afgesloten)requestAnimationFrame(frame);
}
zetInHome();
sim.message='Zet de pen in het midden · druk AAN · kies een patroon · START';
tekenPatronen();tekenWoord();tekenEigen();requestAnimationFrame(frame);
})();
</script>
</body>
</html>
"""


def maak_pagina():
    return PAGINA.replace("%SIMULATIE%", SIMULATIE).encode("utf-8")


# ############################################################
#
#   DEEL 4 · WEBSERVER
#
# ############################################################

machine = None
server = None
browser = None


def afsluiten():
    """EXIT-knop: motoren uit, browser dicht, server stoppen."""
    time.sleep(0.5)   # het antwoord moet eerst nog bij de browser raken
    print("Afsluiten via de EXIT-knop")
    if browser is not None:
        browser.terminate()
    server.shutdown()


class Bediening(BaseHTTPRequestHandler):

    def log_message(self, *_args):
        pass   # geen regel per verzoek in de terminal

    def _stuur(self, inhoud, soort):
        self.send_response(200)
        self.send_header("Content-Type", soort)
        self.send_header("Content-Length", str(len(inhoud)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(inhoud)

    def do_GET(self):
        if self.path.split("?")[0] in ("/", "/index.html"):
            self._stuur(maak_pagina(), "text/html; charset=utf-8")
        else:
            self.send_error(404)

    def do_POST(self):
        try:
            lengte = int(self.headers.get("Content-Length", 0))
            data = json.loads(self.rfile.read(lengte))
            if self.path == "/api/motoren":
                antwoord = machine.bericht(data)
            elif self.path == "/api/afsluiten":
                ok = str(data.get("code")) == AFSLUIT_CODE
                antwoord = {"ok": ok}
                if ok:
                    threading.Thread(target=afsluiten, daemon=True).start()
            else:
                self.send_error(404)
                return
            self._stuur(json.dumps(antwoord).encode(), "application/json")
        except (ValueError, KeyError, TypeError) as fout:
            self.send_error(400, str(fout))


def open_browser(url):
    """Opent Chromium schermvullend (kiosk) op het touchscreen van de Pi."""
    if os.name != "nt" and not (os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY")):
        print(f"Geen scherm gevonden (SSH?). Open zelf: {url}")
        return None
    for naam in ("chromium-browser", "chromium"):
        try:
            return subprocess.Popen(
                [naam, "--kiosk", "--noerrdialogs", "--disable-infobars",
                 "--password-store=basic", url],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except OSError:
            continue
    print(f"Chromium niet gevonden. Open zelf: {url}")
    return None


def test_omwenteling(naam):
    """Draait één motor traag precies 1 omwenteling vooruit (zoals in motio.py).

    Draait de as minder dan een volle toer, dan staan de drivers op meer
    microstappen dan MICROSTAPPEN (bv. half = dubbel zoveel). Meer dan een
    toer: minder microstappen. Pas MICROSTAPPEN aan tot het klopt."""
    m = Machine()
    a = m.assen[naam]
    stappen = round(STAPPEN_PER_RAD * 2 * math.pi)
    duur = 4.0
    print(f"Motor {naam}: {stappen} stappen = 1 omwenteling in {duur:.0f} s "
          f"({a.stappen.soort}-pulsen, MICROSTAPPEN = {MICROSTAPPEN})")
    # In de simulator is een positieve hoek MET DE KLOK MEE, van bovenaf gezien.
    print(f"Kijk van BOVENAF: de {'plateau' if naam == 'C' else 'kruk'} moet MET DE KLOK MEE (rechtsom) draaien.")
    print(f"Draait hij tegen de klok in? Zet dan bovenaan OMKEREN['{naam}'] = "
          f"{not OMKEREN[naam]} (nu {OMKEREN[naam]}).")
    with m.slot:
        a.synchroniseer(0.0)
        m._drivers(True)
        m.aan = True
    begin = time.monotonic()
    try:
        while True:
            t = min(duur, time.monotonic() - begin)
            with m.slot:
                m.laatste_bericht = time.monotonic()
                a.nieuw_doel(2 * math.pi * t / duur, 2 * math.pi / duur if t < duur else 0.0)
            if t >= duur and abs(a.positie - stappen) < 2:
                break
            if time.monotonic() - begin > duur + 5:
                print("Haalt de omwenteling niet op tijd")
                break
            time.sleep(0.02)
        time.sleep(0.5)
        print(f"Klaar: {a.positie:.0f} stappen geteld. Staat de as terug in dezelfde stand?")
    finally:
        m.sluit()


def main():
    global DEMO, machine, server, browser
    p = argparse.ArgumentParser(description="MOTIO touchscreen-bediening")
    p.add_argument("--poort", type=int, default=8080)
    p.add_argument("--host", default="127.0.0.1",
                   help="0.0.0.0 = ook bedienen vanaf een ander toestel")
    p.add_argument("--demo", action="store_true",
                   help="zonder GPIO, om de interface op een laptop te testen")
    p.add_argument("--test", choices=["A", "B", "C"],
                   help="draai deze motor precies 1 omwenteling (controle microstappen)")
    p.add_argument("--geen-browser", action="store_true",
                   help="Chromium niet automatisch openen")
    args = p.parse_args()
    DEMO = args.demo

    # Zonder --demo sturen we de echte motoren aan via gpiozero (zoals motio.py).
    if not DEMO:
        try:
            import gpiozero  # noqa: F401
        except ImportError:
            print("gpiozero niet gevonden: dit is geen Raspberry Pi (of gpiozero ontbreekt).")
            print("Op de Pi:      sudo apt install python3-gpiozero")
            print("Op een laptop: python dev.py --demo")
            return

    # De motortest gebruikt de machine rechtstreeks en start daarom geen webserver.
    if args.test:
        test_omwenteling(args.test)
        return

    try:
        server = ThreadingHTTPServer((args.host, args.poort), Bediening)
    except OSError:
        print(f"Poort {args.poort} is bezet. Draait MOTIO al? Of kies --poort 8081")
        return
    machine = Machine()
    print("Motoren:", ", ".join(f"{n} = {a.stappen.soort}" for n, a in machine.assen.items()))
    url = f"http://localhost:{args.poort}/"
    print(f"MOTIO bediening: {url}   (stoppen: Ctrl+C)")
    if not args.geen_browser:
        browser = open_browser(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        machine.sluit()
        print("Motoren uit")


if __name__ == "__main__":
    main()
