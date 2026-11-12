# Testcode Raspberry Pi 5

## Wat is dit?
[testcode_rpi5.py](testcode_rpi5.py): een klein Python-programma met een venster (tkinter) om de drie motoren handmatig te laten draaien. De STEP-pulsen komen uit de hardware-PWM van de Pi. Lukt dat niet, dan valt het terug op software-pulsen.

## Gebruik
Op de Pi: `python3 testcode_rpi5.py`.

Hardware-PWM moet eerst één keer aangezet worden, zie [de opstartgids](../../../Documentation/Pi-opstarten.md#5-hardware-pwm-aanzetten). Pinnen en bedrading staan in [Hardware/Schemas](../../../Hardware/Schemas/README.md).

## Let op
Het bestand heette vroeger `motio.py`. Op de Pi kan het nog zo heten, de echte applicatie is [Pi-Interface/motio.py](../../Pi-Interface/motio.py).
