# -----------------------------------
# VOORLOPIGE VERSIE
# -----------------------------------

# MOTIO op de Raspberry Pi 5

*Handleiding: opstarten, bedienen en problemen oplossen*

## 1. Kort samengevat

Het enige wat je op de Pi nodig hebt, is **één bestand: motio.py**. Daarin zit alles: de webserver, de motorbesturing, de simulator (SIMV5) en de volledige bedieningspagina (ingepakt in de code). Je hoeft dus geen aparte HTML- of JavaScript-bestanden mee te kopiëren.

Opstarten komt neer op:

```bash
python3 motio.py
```

De server start, Chromium opent schermvullend de bedieningspagina, en de machine is klaar voor gebruik.

## 2. Wat doet het programma?

motio.py doet twee dingen tegelijk:

- **Bedieningspagina tonen.** Er draait een kleine webserver (standaard op poort 8080) die de pagina pi.html met de SIMV5-simulator in de browser zet.

- **Motoren aansturen.** De simulator in de browser berekent voor elke as (A, B en C) een hoek en een hoeksnelheid en stuurt die naar de Pi. De Pi zet die om in step-pulsen voor de drivers.

De simulator blijft de baas: patronen, Home, veiligheidscontroles en afremmen komen allemaal uit SIMV5. De Python-code volgt alleen en grijpt in als iets misloopt (bv. een motor die niet kan volgen of een verbroken verbinding).

## 3. Wat heb je nodig?

### Hardware

- Raspberry Pi 5 met Raspberry Pi OS (met bureaublad) en een aangesloten scherm

- 3 stappenmotoren (SY42STH38-1684A, 1,8° per stap) met elk een stepper-driver

- Drivers ingesteld op 16 microstappen (moet overeenkomen met MICROSTAPPEN in de code)

- Voeding voor de motoren/drivers

### Software

Op een standaard Raspberry Pi OS is alles normaal al aanwezig:

- **Python 3** (standaard geïnstalleerd)

- **gpiozero** voor de DIR- en ENABLE-pinnen (standaard geïnstalleerd)

- **pinctrl** om de step-pinnen in PWM-modus te zetten (standaard op de Pi 5)

- **Chromium** voor de bedieningspagina (standaard op de desktopversie)

Ontbreekt er toch iets, installeer het dan met:

```bash
sudo apt update
sudo apt install python3-gpiozero chromium-browser
```

## 4. Bedrading

Elke as heeft een STEP- en een DIR-pin. Alle drivers delen één ENABLE-pin (laag = drivers aan).

| **As** | **Taak**                        | **STEP**         | **DIR**          | **Motor** |
|--------|---------------------------------|------------------|------------------|-----------|
| A      | Kruk A · beweegt de penarm      | GPIO 12 (pin 32) | GPIO 5 (pin 29)  | 1 / X     |
| B      | Kruk B · beweegt de penarm      | GPIO 13 (pin 33) | GPIO 6 (pin 31)  | 2 / Y     |
| C      | Draaischijf · draait het papier | GPIO 18 (pin 12) | GPIO 23 (pin 16) | 3 / Z     |
| –      | ENABLE (alle drivers)           | GPIO 22 (pin 15) | –                | –         |

> **Tip:** vergeet niet de GND van de Pi te verbinden met de GND van de drivers.

## 5. Hardware-PWM aanzetten

De step-pulsen komen het best uit de hardware-PWM van de Pi 5. Die zet je één keer aan; daarna regelt motio.py alles zelf (de juiste chip zoeken, de pinnen 12, 13 en 18 op PWM zetten en de snelheid sturen).

1.  Open het configuratiebestand:

```bash
sudo nano /boot/firmware/config.txt
```

2.  Zet onderaan, onder \[all\], deze regel:

```text
dtoverlay=pwm-2chan,pin=12,func=4,pin2=13,func2=4
```

3.  Sla op (Ctrl+O, Enter, Ctrl+X) en herstart de Pi:

```bash
sudo reboot
```

Klaar. Bij het opstarten van MOTIO zie je in de terminal Hardware-PWM gevonden: .... Staat er software-pulsen worden gebruikt, dan is de regel niet goed toegevoegd of heb je nog niet herstart. MOTIO werkt dan wel, maar minder nauwkeurig bij hoge snelheden.

## 6. Opstarten

### Stap voor stap

1.  Kopieer **motio.py** naar de Pi, naar /home/motio/motio.py (een USB-stick of scp werkt prima).

2.  Zet de voeding van de motoren aan.

3.  Open een terminal op de Pi en ga naar de map van het project.

4.  Start het programma:

```bash
cd /home/motio
python3 motio.py
```

5.  Chromium opent vanzelf schermvullend de bedieningspagina. In de terminal staat iets als:

```text
Hardware-PWM gevonden: /sys/class/pwm/pwmchip0
MOTIO bediening: http://localhost:8080/pi.html (stoppen: Ctrl+C)
```

6.  Druk in de simulator op Power on. Op dat moment neemt de Pi de huidige simulatorstand over als startpunt en worden de drivers ingeschakeld. Daarna volgen de motoren de simulator.

> **Let op:** bij Power on gaat de Pi ervan uit dat de machine fysiek in de stand staat die de simulator toont. Zet de krukken dus in de juiste beginstand voordat je inschakelt.
>
> **Toegangsfout?** Krijg je een "Permission denied" bij /sys/class/pwm, start het programma dan eenmalig met sudo, of voeg je gebruiker toe aan de groep gpio.

### Automatisch starten bij het opstarten van de Pi

MOTIO start automatisch mee met de Pi via het bestand ~/.config/autostart/motio.desktop. Bekijken of aanpassen doe je met:

```bash
nano ~/.config/autostart/motio.desktop
```

De inhoud ziet er zo uit:

```ini
[Desktop Entry]
Type=Application
Name=MOTIO
Exec=bash -c "sleep 5; cd /home/motio && python3 /home/motio/motio.py >> /home/motio/motio.log 2>&1"
X-GNOME-Autostart-enabled=true
```

Wat de Exec-regel doet:

- sleep 5: wacht 5 seconden tot het bureaublad volledig opgestart is.

- cd /home/motio: gaat naar de map waar motio.py staat.

- \>\> /home/motio/motio.log 2\>&1: schrijft alle meldingen (ook fouten) weg in motio.log, omdat er bij autostart geen terminal open is.

Start MOTIO niet vanzelf, kijk dan in het logbestand wat er misliep:

```bash
tail -n 30 /home/motio/motio.log
```
> **Let op:** de bestandsnaam in de Exec-regel moet exact overeenkomen met het echte bestand. Hernoem je motio.py, pas dan ook deze regel aan.

### Opstartopties

| **Optie**      | **Wat het doet**                                                                                            |
|----------------|-------------------------------------------------------------------------------------------------------------|
| --poort 8081   | Andere poort gebruiken (standaard 8080). Handig als poort 8080 bezet is.                                    |
| --host 0.0.0.0 | Ook bedienen vanaf een ander toestel in het netwerk (bv. laptop of tablet) via http://\<ip-van-de-pi\>:8080 |
| --geen-browser | Chromium niet automatisch openen                                                                            |
| --demo         | Zonder GPIO: de motoren worden alleen nagebootst. Om de interface op een laptop te testen.                  |

Voorbeeld: de interface uitproberen op je laptop, zonder motoren:

```bash
python3 motio.py --demo
```

## 7. Afsluiten

- **Via het scherm:** druk rechtsboven op EXIT en voer code **1234** in. De motoren worden uitgeschakeld, Chromium sluit en de server stopt.

- **Via de terminal:** druk Ctrl+C. Ook dan worden de motoren netjes uitgeschakeld ("Motoren uit").

## 8. Testmodus (voor de devs)

Druk rechtsboven op **TEST** en voer code **4321** in. Hier kun je elke motor apart laten draaien, zonder simulator.

- **Motor per motor testen:** laat één motor een aantal graden draaien (standaard 360°, aan 90°/s).

- **Handmatig draaien:** kies zelf start, stop, richting en snelheid. De snelheid verandert geleidelijk zodat de motor geen stappen mist.

- **Snelheden:** van 1 microstap per seconde (± 0,11°/s) tot ongeveer 202°/s.

> **Voorwaarde:** de testmodus werkt alleen als de machine uit staat (simulator op Power off).

### Microstappen controleren

Laat in de testmodus een motor 360° draaien. Draait de as precies één volle toer, dan klopt de instelling. Anders:

- Minder dan een toer (bv. een halve): de drivers staan op méér microstappen dan 16 (bv. 32).

- Meer dan een toer: de drivers staan op minder microstappen.

Pas dan de dipswitches op de drivers aan, of zet MICROSTAPPEN in de code op de juiste waarde.

## 9. Veiligheid

De Pi stopt alle motoren en schakelt de drivers uit in deze gevallen:

- **Motor kan niet volgen:** een motor loopt meer dan ± 35° achter op de simulator (bv. omdat hij blokkeert of te snel moet).

- **Verbinding verloren:** er komt meer dan 1 seconde geen bericht van de bedieningspagina terwijl de machine beweegt.

Staat de machine stil, dan blijven de drivers gewoon vasthouden, ook als er even geen berichten komen. Na een fout druk je in de simulator op Power off (dat wist de fout) en daarna opnieuw op Power on.

## 10. Problemen oplossen

| **Melding / probleem**                | **Oplossing**                                                                                                                  |
|---------------------------------------|--------------------------------------------------------------------------------------------------------------------------------|
| Poort 8080 is bezet. Draait MOTIO al? | MOTIO draait waarschijnlijk al (bv. via autostart). Sluit die eerst af, of start met --poort 8081.                             |
| Geen scherm gevonden (SSH?)           | Je start via SSH. Open de getoonde URL zelf in een browser, of start het programma op de Pi zelf.                              |
| Chromium niet gevonden                | Installeer Chromium, of open de getoonde URL in een andere browser.                                                            |
| Een motor draait de verkeerde kant op | Zet die motor in OMKEREN op True in de code (bv. "B": True).                                                                   |
| Motor X kan de simulator niet volgen  | Controleer bedrading, voeding en of de as vrij kan draaien. Kijk of de microstappen kloppen. Power off en opnieuw Power on.    |
| Verbinding met de bediening verloren  | De browser is vastgelopen of gesloten. Herlaad de pagina, Power off en opnieuw Power on.                                       |
| Motoren bewegen niet, geen fout       | Controleer de ENABLE-draad (GPIO 22), de voeding van de drivers en de gedeelde GND.                                            |
| Software-pulsen worden gebruikt       | Hardware-PWM werkt niet. Controleer config.txt en pinctrl funcs 12/13/18. Het programma blijft werken, maar minder nauwkeurig. |

## 11. Belangrijke instellingen in de code

Bovenaan motio.py staan de instellingen die je eventueel kunt aanpassen:

| **Instelling**  | **Standaard** | **Betekenis**                                            |
|-----------------|---------------|----------------------------------------------------------|
| PINNEN / ENABLE | zie H4        | Welke GPIO-pinnen gebruikt worden                        |
| OMKEREN         | False         | Draairichting per motor omkeren                          |
| MICROSTAPPEN    | 16            | Moet gelijk zijn aan de instelling op de drivers         |
| STAPHOEK        | 1,8°          | Staphoek van de motor                                    |
| MAX_FREQ        | 2000          | Maximaal aantal stappen per seconde                      |
| MAX_ACHTERSTAND | 0,6 rad       | Hoeveel een motor mag achterlopen voor hij stopt (± 35°) |
| WATCHDOG        | 1,0 s         | Tijd zonder bericht voor alles stopt                     |
| AFSLUIT_CODE    | 1234          | Code voor de EXIT-knop                                   |
| TEST_CODE       | 4321          | Code voor de TEST-knop                                   |