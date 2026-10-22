"""Alle maten van het bedieningspaneel (mm). Bron schermmaten: Waveshare 10.1inch DSI LCD (C), 2D-tekening."""
from math import radians, sin

MDF_DIKTE = 4.0
SLEUF_BREEDTE = 4.3
HELLINGSHOEK_GRADEN = 45

# Officieel Raspberry Pi Touch Display 7" (v1.1, 2015); maten uit de mechanische tekening RP-008246-DS-1-7-inch-display.
# Glasplaat (lens) met erachter de LCD-module. De FPC-kabel komt uit de onderkant van de module (beeld rechtop gezien).
GLAS_BREEDTE = 192.96
GLAS_HOOGTE = 110.76
GLAS_DIKTE = 0.7
MODULE_BREEDTE = 166.2
MODULE_HOOGTE = 100.6
MODULE_DIKTE = 5.96 - GLAS_DIKTE
# De tekening geeft de module-rand tot de glasrand niet eenduidig; horizontaal gecentreerd, verticaal volgens de tekening
MODULE_RAND_ZIJKANT = (GLAS_BREEDTE - MODULE_BREEDTE) / 2
MODULE_RAND_ONDER = 3.53       # kabelkant, vanaf de onderrand van het glas
MODULE_RAND_BOVEN = GLAS_HOOGTE - MODULE_HOOGTE - MODULE_RAND_ONDER
GLAS_SPELING = 0.25
MODULE_SPELING = 1.0           # ruim, omdat de positie van de module niet exact uit de tekening volgt

# De Pi hangt met vier M2.5-gaten (58 x 49 mm) aan de module; de gaten staan op deze afstand van de module-rand (van voren gezien)
PI_GAT_AFSTAND_LINKS = MODULE_BREEDTE - 126.45
PI_GAT_AFSTAND_ONDER = 30.8
PI_GAT_STEEKMAAT_X = 58.0
PI_GAT_STEEKMAAT_Y = 49.0
PI_BREEDTE = 85.0
PI_HOOGTE = 56.0
PI_DIKTE = 18.6                # printplaat plus de hoogste onderdelen (USB, koeler)
PI_AFSTANDHOUDER = 8.0
PI_GAT_RAND = 3.5              # schroefgat tot de rand van de Pi
# De stuurprint van het scherm is niet getekend; aangenomen: even groot als de Pi
PCB_BREEDTE = PI_BREEDTE
PCB_HOOGTE = PI_HOOGTE
PCB_DIKTE = 1.5

# De bovenplaat bestaat uit twee lagen: de steunplaat draagt het glas, de bovenplaat vormt de rand rond het glas
BOVENPLAAT_LAGEN = 2
BOVENPLAAT_DIKTE = BOVENPLAAT_LAGEN * MDF_DIKTE
# Het glas moet gelijk liggen met de bovenkant van de bovenplaat: de vulring tilt het glas op de steunplaat omhoog
VULRING_DIKTE = BOVENPLAAT_DIKTE - MDF_DIKTE - GLAS_DIKTE
GLASVAK_BREEDTE = GLAS_BREEDTE + 2 * GLAS_SPELING
GLASVAK_HOOGTE = GLAS_HOOGTE + 2 * GLAS_SPELING
# Brede randen rond het glasvak, zodat de platen stevig blijven
RAND_ZIJKANT = 6.0
PLAAT_RAND_VOOR_EN_ACHTER = 20.0

# Tussen de zijkanten past het glasvak plus een rand naast het vak; de platen steken er aan beide kanten overheen
BINNENBREEDTE = GLASVAK_BREEDTE + 2 * RAND_ZIJKANT
PLAAT_OVERSTEEK = MDF_DIKTE
ZIJKANT_X_LINKS = PLAAT_OVERSTEEK
ZIJKANT_X_RECHTS = ZIJKANT_X_LINKS + MDF_DIKTE + BINNENBREEDTE
PLAAT_BREEDTE = ZIJKANT_X_RECHTS + MDF_DIKTE + PLAAT_OVERSTEEK
PLAAT_DIEPTE = GLASVAK_HOOGTE + 2 * PLAAT_RAND_VOOR_EN_ACHTER

# Zijkant: rechthoekige driehoek, de schuine zijde draagt de bovenplaat
ZIJKANT_HOOGTE = PLAAT_DIEPTE * sin(radians(HELLINGSHOEK_GRADEN))

# Haak op de verticale kant: een T-vormige nok. De dunne hals gaat plat door de sleuf in de case,
# na een kwartslag valt de bredere kop achter de wand.
WAND_DIKTE = MDF_DIKTE
HAAK_SPELING = 0.2
HAAK_HALS_BREEDTE = 4.0
HAAK_HALS_LENGTE = WAND_DIKTE + HAAK_SPELING
HAAK_KOP_BREEDTE = 30.0
HAAK_KOP_DIKTE = MDF_DIKTE
# Midden van de haak boven de ondergrond van de case; zo valt hij in de bovenste helft van de voorwand
CASE_HAAK_HOOGTE = 84.0
HAAK_MIDDEN_Y = ZIJKANT_HOOGTE - (CASE_HAAK_HOOGTE - MDF_DIKTE)

# Achterwand staat tussen de zijkanten, vlak onder de bovenplaat
ACHTERWAND_AFSTAND = 6.0
ACHTERWAND_TOP = ACHTERWAND_AFSTAND + MDF_DIKTE
ACHTERWAND_HOOGTE = ZIJKANT_HOOGTE - ACHTERWAND_TOP

# Kabelgat in de achterwand: alle bekabeling gaat door de sleuf in de case, aan de rechterkant gezien van voren.
# Het gat ligt op dezelfde hoogte als die sleuf.
KABELGAT_BREEDTE = 40.0
KABELGAT_HOOGTE = 12.0
KABELGAT_AFSTAND_ZIJKANT = 15.0
KABELGAT_MIDDEN_Z = CASE_HAAK_HOOGTE - MDF_DIKTE

# Nokken waarmee de vulring in het glasvak vastzit
NOK_LENGTE = 20.0
NOK_DIEPTE = 3.0

# Vingerverbindingen
VINGER_SPELING = 0.1
TAND_LENGTE = 15.0
