# MOTIO Live Simulator V1

Een lokale, dependency-vrije browserapp die de gekoppelde beweging van één driver, een roterend A3-blad en twee extern gemonteerde tekenarmen live simuleert.

## Starten

Open `index.html` rechtstreeks in een recente versie van Chrome, Edge of Firefox. Er is geen installatie, build-stap of backend nodig.

## V1-mechanisme

**ASSUMPTION V1:** de driver stuurt drie onafhankelijke uitgangen aan. De eerste roteert het A3-papier rond zijn centrum. Arm A wordt door een excentrische kruk rechts buiten het blad aangedreven; Arm B door een tweede excentrische kruk boven het blad. Beide stijve armen ontmoeten elkaar in één penwagen. De penpositie wordt exact berekend als het geometrische snijpunt van twee cirkels rond de actuele krukpennen. Geen enkel draaipunt of geleiding is aan het papier bevestigd.

Voor een direct tandwielpaar geldt `ratio = -driver_teeth / output_teeth`. De pen wordt eerst in wereldcoördinaten berekend. Daarna wordt de inverse papierrotatie toegepast en wordt het spoor in lokale A3-coördinaten opgeslagen. Daardoor draait het getekende spoor in Machine View correct mee met het papier en blijft het in Paper View vast staan.

## Aanbevolen eerste test

1. Gebruik `Dual arm test · 20 / 60 / 37 / 53`.
2. Klik **Play** en bekijk beide views.
3. Klik **Pause**.
4. Wijzig Arm A teeth van `37` naar `41` (de simulatie reset automatisch).
5. Klik **Play** en vergelijk het nieuwe patroon en de exacte repeat-periode.

## Bestanden

- `index.html` — interface en semantische structuur
- `style.css` — responsieve technische vormgeving
- `js/math.js` — breuken, GGD/KGV en coördinatentransformaties
- `js/simulation.js` — tandwielen, tijdstap, kinematica en trace
- `js/renderers.js` — Machine View en Paper View
- `js/ui.js` — controls en live datapanel
- `js/app.js` — vaste simulation timestep en renderloop
- `tests/logic.test.js` — automatische tests voor ratios, transformaties en live trace

De scripts worden bewust als gewone lokale scripts geladen (niet als ES-modules), zodat de app ook via een `file:///`-adres werkt en geen lokale webserver vereist.

Optioneel kan de logica worden gecontroleerd met `node tests/logic.test.js`.
