#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Teste per parapranuesin OCR (tools/ocr_prepass.py).

Nuk kerkojne OCR, cv2 apo rapidocr: kontrollojne vetem logjiken e pastrimit,
klasifikimit te faqeve, grupimit te formulareve dhe kufijte e hints.

Perdorimi:
  python3 tests/ocr_prepass_test.py
"""
import importlib.util
import os
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPEC = importlib.util.spec_from_file_location("ocr_prepass", os.path.join(ROOT, "tools", "ocr_prepass.py"))
assert SPEC and SPEC.loader
ocr = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = ocr
SPEC.loader.exec_module(ocr)


def line(text, conf=0.95, y=100):
    return {"text": text, "conf": conf, "box": [10, y, 200, y + 20]}


def page(number, kind, labels=None):
    return {"page": number, "type": kind, "labels": labels or [], "quality": {"score": 90, "issues": []}}


class NormalizationTest(unittest.TestCase):
    def test_diacritics_removed(self):
        self.assertEqual(ocr.norm("Përgjegjësja"), "pergjegjesja")
        self.assertEqual(ocr.norm("Ç"), "c")
        self.assertEqual(ocr.norm("KOMENTE DHE PESHAT"), "komentedhepeshat")

    def test_spaced_normalization_keeps_words(self):
        self.assertEqual(ocr.norm_spaced("Fillim  Pune (ora)"), "fillim pune ora")


class LabelTest(unittest.TestCase):
    def test_finds_printed_labels(self):
        lines = [line("PËRGJEGJËSJA:"), line("PUNONJËSIT"), line("PESHIMI 1 -"), line("THAS."), line("KG")]
        found = ocr.find_labels(lines, ocr.FRONT_LABELS)
        self.assertIn("PUNONJESIT", found)
        self.assertIn("PESHIMI 1", found)
        self.assertIn("THAS.", found)

    def test_ignores_handwriting_fragments(self):
        lines = [line("KONv", 0.5), line("dende", 0.6), line("SHKOP", 0.55)]
        self.assertEqual(ocr.find_labels(lines, ocr.FRONT_LABELS), [])


class PageTypeTest(unittest.TestCase):
    def test_front_page(self):
        lines = [line("PLANI I PUNËS"), line("PUNONJËSIT")]
        self.assertEqual(ocr.classify_page(["PLANI I PUNES"], [], lines), "front")

    def test_back_page(self):
        lines = [line("KOMENTE DHE PESHAT"), line("KOMENTE:")]
        self.assertEqual(ocr.classify_page([], ["KOMENTE DHE PESHAT"], lines), "back")

    def test_unknown_page(self):
        self.assertEqual(ocr.classify_page([], [], [line("diçka tjetër")]), "unknown")


class GroupingTest(unittest.TestCase):
    def test_pairs_fourteen_pages(self):
        pages = [page(i, "front" if i % 2 else "back") for i in range(1, 15)]
        forms, warnings = ocr.group_forms(pages)
        self.assertEqual(len(forms), 7)
        self.assertEqual(warnings, [])
        self.assertTrue(all(f["complete"] for f in forms))
        self.assertEqual(forms[0], {"formNumber": 1, "front": 1, "back": 2, "complete": True})

    def test_missing_back_page_is_reported(self):
        pages = [page(1, "front"), page(2, "front"), page(3, "back")]
        forms, warnings = ocr.group_forms(pages)
        self.assertEqual(len(forms), 2)
        self.assertFalse(forms[0]["complete"])
        self.assertTrue(any("faqe PAS mungon" in w for w in warnings))

    def test_back_without_front_is_reported(self):
        pages = [page(1, "back")]
        forms, warnings = ocr.group_forms(pages)
        self.assertEqual(len(forms), 1)
        self.assertIsNone(forms[0]["front"])
        self.assertTrue(any("pa faqe PARA" in w for w in warnings))

    def test_unknown_page_attaches_to_open_form(self):
        pages = [page(1, "front"), page(2, "unknown")]
        forms, warnings = ocr.group_forms(pages)
        self.assertEqual(len(forms), 1)
        self.assertEqual(forms[0]["back"], 2)
        self.assertTrue(any("nuk u dallua" in w for w in warnings))

    def test_never_merges_two_fronts(self):
        pages = [page(1, "front"), page(2, "front")]
        forms, _ = ocr.group_forms(pages)
        self.assertEqual([f["front"] for f in forms], [1, 2])
        self.assertTrue(all(f["back"] is None for f in forms))


class HintsTest(unittest.TestCase):
    def test_hints_are_small_and_carry_no_values(self):
        doc = {
            "pageCount": 2,
            "forms": [{"formNumber": 1, "front": 1, "back": 2, "complete": True}],
            "pages": [page(1, "front", ["PUNONJESIT", "PESHIMI 1"]), page(2, "back", ["KOMENTE"])],
            "warnings": [],
        }
        hints = ocr.build_hints(doc)
        self.assertEqual(hints["formCount"], 1)
        self.assertEqual(hints["pages"][0]["labels"], ["PUNONJESIT", "PESHIMI 1"])
        text = ocr.hints_text(hints)
        self.assertIn("PARAPRANUES LOKAL OCR", text)
        self.assertIn("faqja 1: front", text)
        self.assertIn("beso figures", text)
        self.assertLess(len(text), 4000)

    def test_hints_text_is_bounded_for_thirty_pages(self):
        doc = {
            "pageCount": 30,
            "forms": [],
            "pages": [page(i, "front", [f"ETIKETA {j}" for j in range(14)]) for i in range(1, 31)],
            "warnings": [f"paralajmerim {i}" for i in range(20)],
        }
        text = ocr.hints_text(ocr.build_hints(doc))
        self.assertLess(len(text), 12000)


if __name__ == "__main__":
    unittest.main(verbosity=2)
