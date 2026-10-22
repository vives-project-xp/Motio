"""Controleert dat de wig, de sleuven in de case en het kabelgat op elkaar aansluiten. Start: python -m unittest"""
import importlib.util
import unittest
from pathlib import Path

import paneel_maten as maten
from achterwand import maakAchterwand
from bodem import maakBodem
from bovenplaat import maakBovenplaat
import scherm
from steunplaat import maakSteunplaat
from zijkant import maakZijkant

CONCEPT_MAP = Path(__file__).resolve().parents[2] / "Research" / "concept" / "v3"
CASE_MAP = CONCEPT_MAP / "fusion" / "CycloidDrawerV3" / "cycloid" / "box_design"
LASER_MAP = CONCEPT_MAP / "lasersnij" / "generator" / "box_design"


def laadModule(naam, map=CASE_MAP):
    spec = importlib.util.spec_from_file_location(naam, map / f"{naam}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


CASE_BREEDTE = laadModule("spec").BoxSpec().width


def laadPlaatsing():
    module = laadModule("wedge_placement")
    delen, breedte, vloer = module.load_wedge_parts()
    return delen, module.WedgePlacement(CASE_BREEDTE, breedte, vloer)


def hoekenInCase(onderdeel, plaats, plaatsing):
    return [plaatsing.case_point(plaats(punt, laag)) for punt in onderdeel.omtrek for laag in (0.0, onderdeel.dikte)]


class TestWigOpCase(unittest.TestCase):
    def setUp(self):
        self.montage = laadModule("wedge_mount").WedgeMount()
        self.case = laadModule("spec").BoxSpec()

    def test_maten_van_de_case_komen_overeen_met_de_wig(self):
        self.assertEqual(self.montage.wedge_width, maten.PLAAT_BREEDTE)
        self.assertEqual(self.montage.side_x, (maten.ZIJKANT_X_LINKS, maten.ZIJKANT_X_RECHTS))
        self.assertEqual(self.montage.side_thickness, maten.MDF_DIKTE)
        self.assertEqual(self.montage.hook_height, maten.CASE_HAAK_HOOGTE)
        self.assertEqual(self.montage.head_width, maten.HAAK_KOP_BREEDTE)
        self.assertEqual(self.montage.slot_height, maten.SLEUF_BREEDTE)

    def test_laserversie_van_de_haakmaten_is_gelijk_aan_de_fusionversie(self):
        laser = laadModule("wedge_mount", LASER_MAP).WedgeMount()
        self.assertEqual(vars(laser), vars(self.montage))

    def test_wig_past_op_de_case(self):
        self.assertLessEqual(maten.PLAAT_BREEDTE, CASE_BREEDTE)
        self.assertLess(maten.ZIJKANT_HOOGTE + maten.MDF_DIKTE, self.case.lid_z)

    def test_haakkop_zit_tussen_tussenschot_en_deksel(self):
        halve_kop = maten.HAAK_KOP_BREEDTE / 2
        onderkant, bovenkant = maten.CASE_HAAK_HOOGTE - halve_kop, maten.CASE_HAAK_HOOGTE + halve_kop
        self.assertGreater(onderkant, self.case.divider_z + self.case.thickness)
        self.assertLess(bovenkant, self.case.lid_z)

    def test_sleuven_liggen_in_de_bovenste_voorwand(self):
        for lus in self.montage.slot_loops(CASE_BREEDTE):
            xs, zs = [x for x, _ in lus], [z for _, z in lus]
            self.assertGreater(min(zs), self.case.lower_height)
            self.assertLess(max(zs), self.case.top_z)
            self.assertGreater(min(xs), self.case.thickness)
            self.assertLess(max(xs), CASE_BREEDTE - self.case.thickness)

    def test_haak_past_door_de_sleuf(self):
        lus = self.montage.slot_loops(CASE_BREEDTE)[0]
        lengte = max(x for x, _ in lus) - min(x for x, _ in lus)
        self.assertGreaterEqual(lengte, maten.HAAK_KOP_BREEDTE)
        hoogte = max(z for _, z in lus) - min(z for _, z in lus)
        self.assertGreaterEqual(hoogte, maten.SLEUF_BREEDTE)

    def test_kabelgat_ligt_voor_de_langere_sleuf(self):
        kabelkant = self.montage.slot_loops(CASE_BREEDTE)[0]
        rand = maten.ZIJKANT_X_LINKS + maten.MDF_DIKTE
        verste_x_wig = rand + maten.KABELGAT_AFSTAND_ZIJKANT + maten.KABELGAT_BREEDTE
        verste_x_case = self.montage.box_x(CASE_BREEDTE, verste_x_wig)
        self.assertLessEqual(min(x for x, _ in kabelkant), verste_x_case)

    def test_kabelgat_ligt_op_hoogte_van_de_sleuf(self):
        gat = maakAchterwand().gaten[0]
        midden_y = (min(y for _, y in gat) + max(y for _, y in gat)) / 2
        midden_z = maten.ZIJKANT_HOOGTE - maten.ACHTERWAND_TOP - midden_y + maten.MDF_DIKTE
        self.assertAlmostEqual(midden_z, maten.CASE_HAAK_HOOGTE, places=3)


class TestWigInFusion(unittest.TestCase):
    def setUp(self):
        self.delen, self.plaatsing = laadPlaatsing()

    def test_alle_onderdelen_zijn_aanwezig(self):
        namen = sorted(onderdeel.naam for onderdeel, _ in self.delen)
        self.assertEqual(namen, ["achterwand", "bodem", "bovenplaat", "glas", "module", "pi", "printplaat",
                                 "steunplaat", "vulring", "zijkant", "zijkant"])

    def test_assen_zijn_rechtshandig_en_eenheid(self):
        for onderdeel, plaats in self.delen:
            _, u, v, w = self.plaatsing.axes(plaats, onderdeel.dikte)
            for as_ in (u, v, w):
                self.assertAlmostEqual(sum(c * c for c in as_), 1.0)
            kruis = (u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0])
            for kruis_c, w_c in zip(kruis, w):
                self.assertAlmostEqual(kruis_c, w_c)

    def test_wig_staat_op_de_vloer_en_voor_de_case(self):
        for onderdeel, plaats in self.delen:
            for x, y, z in hoekenInCase(onderdeel, plaats, self.plaatsing):
                self.assertGreaterEqual(z, -1e-6)
                if onderdeel.naam != "zijkant":
                    self.assertLessEqual(y, 1e-6)

    def test_glas_ligt_gelijk_met_de_bovenplaat(self):
        bovenkant_glas = scherm.GLAS_ONDERKANT + maten.GLAS_DIKTE
        self.assertAlmostEqual(bovenkant_glas, maten.BOVENPLAAT_DIKTE)

    def test_scherm_en_pi_passen_in_de_wig(self):
        binnen_x = (maten.ZIJKANT_X_LINKS + maten.MDF_DIKTE, maten.ZIJKANT_X_RECHTS)
        achterwand_voorkant = maten.ACHTERWAND_AFSTAND + maten.MDF_DIKTE
        for onderdeel, plaats in self.delen:
            if onderdeel.naam not in ("module", "printplaat", "pi"):
                continue
            for punt in onderdeel.omtrek:
                for laag in (0.0, onderdeel.dikte):
                    x, y, z = plaats(punt, laag)
                    self.assertGreaterEqual(x, binnen_x[0], onderdeel.naam)
                    self.assertLessEqual(x, binnen_x[1], onderdeel.naam)
                    self.assertGreaterEqual(y, achterwand_voorkant, onderdeel.naam)
                    self.assertGreaterEqual(z, 0.0, onderdeel.naam)

    def test_haken_gaan_door_de_voorwand_op_de_plek_van_de_sleuf(self):
        sleuven = laadModule("wedge_mount").WedgeMount().neck_positions(CASE_BREEDTE)
        halsen = []
        for onderdeel, plaats in self.delen:
            if onderdeel.naam == "zijkant":
                midden = (-maten.HAAK_HALS_LENGTE / 2, maten.HAAK_MIDDEN_Y)
                halsen.append(self.plaatsing.case_point(plaats(midden, maten.MDF_DIKTE / 2)))
        self.assertEqual(sorted(round(x, 3) for x, _, _ in halsen), sorted(round(x, 3) for x in sleuven))
        for _, y, z in halsen:
            self.assertGreater(y, 0.0)
            self.assertLess(y, maten.WAND_DIKTE)
            self.assertAlmostEqual(z, maten.CASE_HAAK_HOOGTE, places=3)


class TestSymmetrie(unittest.TestCase):
    def test_haak_zit_binnen_de_zijkant(self):
        for x, y in maakZijkant().omtrek:
            self.assertTrue(0 <= y <= maten.ZIJKANT_HOOGTE + maten.MDF_DIKTE)

    def test_boven_en_steunplaat_hebben_gelijke_sleuven_voor_de_zijkanten(self):
        boven, steun = maakBovenplaat(), maakSteunplaat()
        self.assertEqual(boven.gaten[1:], steun.gaten[1:])

    def test_bodem_en_platen_zijn_even_breed(self):
        for onderdeel in (maakBovenplaat(), maakSteunplaat(), maakBodem()):
            xs = [x for x, _ in onderdeel.omtrek]
            self.assertAlmostEqual(max(xs) - min(xs), maten.PLAAT_BREEDTE)


if __name__ == "__main__":
    unittest.main()
