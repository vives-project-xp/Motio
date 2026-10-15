# MOTIO · los bestand voor de Raspberry Pi 5 (gemaakt met pi/maak_motio.py).
# Starten:  python3 motio.py

# MOTIO op de Raspberry Pi 5: de SIMV5-simulator stuurt de echte motoren.
#
# Deze server doet twee dingen:
#   1. Hij toont de bedieningspagina (pi.html) en de SIMV5-code in de browser.
#   2. Hij ontvangt van die pagina de motorstanden die de simulator berekent
#      (hoek + hoeksnelheid van A, B en C) en zet ze om in step-pulsen.
#
# De simulator blijft dus de baas: patronen, Home, veiligheidscontroles en
# afremmen komen allemaal uit SIMV5. Deze code volgt alleen.
#
# Starten op de Pi:   python3 pi/motio_pi.py   (opent zelf Chromium schermvullend)
# Testen zonder Pi:   python pi/motio_pi.py --demo
# Controle motor:     python3 motio.py --test C   (precies 1 omwenteling)
# Eén los bestand maken voor de Pi:  python pi/maak_motio.py  ->  pi/motio.py

import argparse
import glob
import json
import math
import os
import subprocess
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

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
                for naam, a in self.assen.items():
                    a.synchroniseer(float(assen[naam][0]))
                self._drivers(True)
                self.aan = True
            else:
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


# ============================================================
# WEBSERVER
# ============================================================

MAP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # SIMV5
machine = None
server = None
browser = None

# In het losse bestand (motio.py) zit de volledige pagina hier ingepakt.
# Is dit None, dan worden pi.html en js/ uit de SIMV5-map gebruikt.
PAGINA = """
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
Mogyvvlw9A54wMMRz028gcxIJTlMWKGJiSlY2nfT2lwiGR9Tixj6hnrPZKLJ/wyNxuffEQsNWwGxyAH4pn5Pzs4GPWzCezDBvFrH
2AwYWfsHsAS07PshXtsgGyD9zZiqiMMGWB7+h7miWUDuSyvADl5YBxM23swUJVaDjwObsiG5b2yWVnABZmC5VSf4RCuTekWH+ZWn
vmFoknYAWVklbdSFa6mpegj9FSMG5GbSYPsilDDXZL32aJCmTuZ6K5euC9SZgc5A3wn4w2TKHcUCcslOF8IxUDRJ5x8SqM2ltg5o
Xhn4P05opIjiASXoZCiUKswASekUC/cwOcC8AHrfQv1W28wl/oBpBi48SyC/C7etNTuNeysPIz2Jxsm192sSX76Lp2VXnh3DfgbV
M9bCwRiTKLq7dyTAXnRXr9ezK2iAFM6KxZ5mwRtWLWKqyZTqESM8X8zUknxJkw1zYDDTk00RfrrtTbrACAaaBSIkcXWETB79VE84
jCaY1QLLf+y5Y0AfJqgbux2Z4TWeWh7oO5XJDqGhLB259CZn3knJEY32S4H7epB9PcSrFbXwQiC+Y2FKf/lWc5X9lZSDlZRDVYWa
H6VTH3tT6nrv5PJ0ewVSJaRcJsu0nMW+70MKfn5SMnILKtbySukUA9MbLvpJWr70X758/tNiBKVNfZB+R45tSZka8/35xQxs6vVs
hjZL78fnpHY8TyziQ69UvVSiPPneAZ5eXbfxPIpKJLWNz0vZir6Xjb7XhPQ197Y8MXSkXnn/P/7lv//h10tUo60nso91VDcq+zAF
/AyF3+wQK0lZNf987Z9P9mt/nN41g637/7JWp3lUtiX9rwIhwKadNQOYmvNBkhKilSpVoHP7a/DrdPjz57Lz4eVLV6Y+kuQUWC9K
rp8nc7ewvzIMXdqw9z1ltWJ4VshXyYsYciUu4klJi+aJ0hwJT7+Z1VcnEFemipSoIY+yZKtk8DSiYy1o4FlJGXiya4bQn2V3eDeC
gno2tWaEBHrXQgJV4ooIBKRdKvCWlTmdBFM+K3DqBCXQ6Vcl9OlXDaQjT5qaXHFSJ1px0m3QFQ8xsUFFNM92okZmiC+rJXBAUo8z
50/OvNvBp7Gmu14928OdyCgFNoJefRWktZb/+bMtJWjYaWbbLP04wYyi76EH8yHp6KFwgE9Bf8JOBXArww71kgmH+WaCLZ4G6flJ
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
K3Vzoz5PIjz9fTc9PVn/4v8DaLI7GA==
"""


def pagina():
    if PAGINA is None:
        return None
    import base64
    import zlib
    return zlib.decompress(base64.b64decode(PAGINA))


def open_browser(url):
    """Opent Chromium schermvullend op het scherm van de Pi."""
    if not (os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY")):
        print(f"Geen scherm gevonden (SSH?). Open zelf: {url}")
        return
    for naam in ("chromium-browser", "chromium"):
        try:
            return subprocess.Popen(
                [naam, "--kiosk", "--noerrdialogs", "--disable-infobars",
                 "--password-store=basic", url],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
            )
        except OSError:
            continue
    print(f"Chromium niet gevonden. Open zelf: {url}")


def afsluiten(url):
    """EXIT-knop: motoren uit, Chromium dicht, server stoppen."""
    time.sleep(0.5)   # het antwoord moet eerst nog bij de browser raken
    print("Afsluiten via de EXIT-knop")
    if browser is not None:
        browser.terminate()
    try:
        subprocess.run(["pkill", "-f", url], capture_output=True)
    except OSError:
        pass   # geen pkill (bv. Windows)
    server.shutdown()


class Bediening(SimpleHTTPRequestHandler):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=MAP, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *_args):
        pass   # geen regel per verzoek in de terminal

    def _json(self, data):
        body = json.dumps(data).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/api/status":
            with machine.slot:
                self._json(machine.status())
            return
        if self.path in ("/", ""):
            self.send_response(302)
            self.send_header("Location", "/pi.html")
            self.end_headers()
            return
        inhoud = pagina()
        if inhoud is not None:
            if self.path.split("?")[0] != "/pi.html":
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(inhoud)))
            self.end_headers()
            self.wfile.write(inhoud)
            return
        super().do_GET()

    def do_POST(self):
        if self.path not in ("/api/motoren", "/api/afsluiten"):
            self.send_error(404)
            return
        try:
            lengte = int(self.headers.get("Content-Length", 0))
            data = json.loads(self.rfile.read(lengte))
            if self.path == "/api/afsluiten":
                ok = str(data.get("code")) == AFSLUIT_CODE
                self._json({"ok": ok})
                if ok:
                    host, poort = self.server.server_address[:2]
                    url = f"localhost:{poort}/pi.html"
                    threading.Thread(target=afsluiten, args=(url,), daemon=True).start()
                return
            self._json(machine.bericht(data))
        except (ValueError, KeyError, TypeError) as fout:
            self.send_error(400, str(fout))


def test_omwenteling(naam):
    """Draait één motor traag precies 1 omwenteling vooruit.

    Draait de as minder dan een volle toer, dan staan de drivers op meer
    microstappen dan MICROSTAPPEN (bv. half = dubbel zoveel). Meer dan een
    toer: minder microstappen. Pas MICROSTAPPEN aan tot het klopt."""
    m = Machine()
    a = m.assen[naam]
    stappen = round(STAPPEN_PER_RAD * 2 * math.pi)
    duur = 4.0
    print(f"Motor {naam}: {stappen} stappen = 1 omwenteling in {duur:.0f} s "
          f"({a.stappen.soort}-pulsen, MICROSTAPPEN = {MICROSTAPPEN})")
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
    p = argparse.ArgumentParser(description="MOTIO SIMV5 op de Raspberry Pi")
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

    if args.test:
        test_omwenteling(args.test)
        return

    try:
        server = ThreadingHTTPServer((args.host, args.poort), Bediening)
    except OSError:
        print(f"Poort {args.poort} is bezet. Draait MOTIO al? Of kies --poort 8081")
        return
    machine = Machine()
    url = f"http://localhost:{args.poort}/pi.html"
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
