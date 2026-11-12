# Testcode Arduino

## Wat is dit?
[Arduino.ino](Arduino.ino): Arduino-programma dat de drie stappenmotoren via de gShield aanstuurt. Commando's komen binnen via de seriële poort (UART-buffer van 64 tekens).

## Waarom bestaat dit?
De gShield is ontworpen als Arduino-shield. Dit was de eerste manier om te testen of de motoren en drivers werken, voor we overstapten op de Raspberry Pi 5.

## Gebruik
Open [Arduino.ino](Arduino.ino) in de Arduino IDE en upload. De pinnen (STEP en DIR per as) staan bovenaan in het bestand.
