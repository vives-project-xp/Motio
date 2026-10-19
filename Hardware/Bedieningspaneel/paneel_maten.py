"""Alle maten van het bedieningspaneel (mm). Bron schermmaten: Waveshare 10.1inch DSI LCD (C), 2D-tekening."""
from math import radians, sin

MDF_DIKTE = 4.0
SLEUF_BREEDTE = 4.3
HELLINGSHOEK_GRADEN = 45

# Het scherm met zijn elektronica en de Pi, voor de 3D-weergave (maten uit de Waveshare-tekening)
MODULE_DIKTE = 4.8
PCB_BREEDTE = 110.0
PCB_HOOGTE = 76.0
PCB_DIKTE = 1.5
PCB_AFSTAND_KABELKANT = 62.5   # van de rand van het glas tot de rand van de printplaat, aan de kabelkant
PI_BREEDTE = 85.0
PI_HOOGTE = 56.0
PI_DIKTE = 18.6                # printplaat plus de hoogste onderdelen (USB, koeler)
PI_AFSTANDHOUDER = 8.0
PI_GAT_AFSTAND_KABELKANT = 100.5   # eerste Pi-schroefgat, van de glasrand aan de kabelkant
PI_GAT_AFSTAND_ONDERKANT = 49.0
PI_GAT_RAND = 3.5              # schroefgat tot de rand van de Pi

# Het scherm bestaat uit een glasplaat (lens) met erachter de LCD-module (maten uit de Waveshare-tekening)
GLAS_BREEDTE = 239.0
GLAS_HOOGTE = 147.0
MODULE_BREEDTE = 228.6
MODULE_HOOGTE = 143.0
# De module zit niet gecentreerd achter het glas: aan de kabelkant is de rand maar 2,42 mm, aan de andere kant 7,98 mm
MODULE_RAND_KABELKANT = 2.42
GLAS_DIKTE = 1.1
GLAS_SPELING = 0.25
MODULE_SPELING = 0.2

# De bovenplaat bestaat uit twee lagen: de steunplaat draagt het glas, de bovenplaat vormt de rand rond het glas
BOVENPLAAT_LAGEN = 2
BOVENPLAAT_DIKTE = BOVENPLAAT_LAGEN * MDF_DIKTE
# Het glas moet gelijk liggen met de bovenkant van de bovenplaat: de vulring tilt het glas op de steunplaat omhoog
VULRING_DIKTE = BOVENPLAAT_DIKTE - MDF_DIKTE - GLAS_DIKTE
GLASVAK_BREEDTE = GLAS_BREEDTE + 2 * GLAS_SPELING
GLASVAK_HOOGTE = GLAS_HOOGTE + 2 * GLAS_SPELING
# Brede randen rond het glasvak, zodat de platen stevig blijven
RAND_ZIJKANT = 6.0
PLAAT_RAND_VOOR_EN_ACHTER = 10.0

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
HAAK_KOP_BREEDTE = 40.0
HAAK_KOP_DIKTE = MDF_DIKTE
# Midden van de haak boven de ondergrond van de case; zo valt hij in de bovenste helft van de voorwand
CASE_HAAK_HOOGTE = 94.0
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
