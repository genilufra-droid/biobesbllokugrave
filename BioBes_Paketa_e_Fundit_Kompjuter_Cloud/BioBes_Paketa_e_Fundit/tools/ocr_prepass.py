#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BioBes OCR pre-pass (parapranues lokal i skanimeve).

Qellimi: para se nje skanim t'i dergohet Gemini-t, ky mjet:
  1. e kthen PDF-ne ne figura (200-300 DPI),
  2. lexon tekstin e shtypur me PP-OCR (RapidOCR, ONNX, pa GPU, pa Torch),
  3. klasifikon faqen PARA / PAS sipas etiketave te shtypura,
  4. grupon faqet ne formulare (PARA + PAS),
  5. mat cilesine e skanimit (DPI, anim, turbullim, boje, besueshmeri),
  6. shkruan nje skedar "hints" te vogel qe mund t'i bashkengjitet kerkeses.

Nuk lexon shkrim dore: ai mbetet detyre e modelit vizual (Gemini ose VLM).
Mjeti nuk dergon asgje ne internet; te dhenat mbeten lokale.

Shenim: skedari hints permban vetem etiketa te shtypura dhe masa cilesie,
jo emra punonjesish, pesha apo komente.

Perdorimi:
  python3 tools/ocr_prepass.py skanim.pdf --out hints.json
  python3 tools/ocr_prepass.py skanim.pdf --dpi 300 --pages 1-4 --verbose
  python3 tools/ocr_prepass.py skanim.pdf --hints-only --out hints.json

Kerkon: poppler-utils (pdftoppm), rapidocr_onnxruntime, numpy, opencv-python.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import statistics
import subprocess
import sys
import tempfile
import time
import unicodedata
from dataclasses import dataclass, field
from typing import Any

TOOL_NAME = "biobes-ocr-prepass"
TOOL_VERSION = "1.0.0"

# ---------------------------------------------------------------------------
# Etiketat e shtypura te modelit BioBes (A4, PARA / PAS).
# Krahasimi behet mbi tekst te normalizuar: pa diakritika, pa shenja, i vogel.
# ---------------------------------------------------------------------------
FRONT_LABELS = [
    "Nr.", "Data", "Dita", "Java", "Dhoma", "Pergjegjesja", "Ndihmes Pergjegjesja",
    "Firma", "PLANI I PUNES", "Produkti", "Statusi", "Sasia", "Lloji i Paketimit",
    "Klienti", "Komente", "PUNONJESIT", "Emri e Mbiemri", "Fillim Pune",
    "Mbarim Pune", "Ore Gjithsej", "Firma e Punonjesit", "PESHAT", "PESHIMI 1",
    "PESHIMI 2", "PESHIMI 3", "THAS.", "KG", "AMBALAZHI", "SHUMA", "Gjithsej",
]
BACK_LABELS = [
    "Nr.", "KOMENTE DHE PESHAT", "KOMENTE", "PESHAT", "PESHIMI 1", "PESHIMI 2",
    "PESHIMI 3", "NR.", "THAS.", "KG", "AMBALAZHI", "SHUMA", "SH",
]

# Etiketa qe deshmojne nje faqe PARA / PAS.
FRONT_MARKERS = ("plani i punes", "punonjesit")
BACK_MARKERS = ("komente dhe peshat", "komente:")

# Nen kete prag nje rresht konsiderohet i pasigurt (shpesh shkrim dore).
LOW_CONF = 0.75

# ---------------------------------------------------------------------------
# Normalizim
# ---------------------------------------------------------------------------

_DIACRITICS = {"ë": "e", "ç": "c", "Ë": "E", "Ç": "C"}


def strip_diacritics(text: str) -> str:
    for a, b in _DIACRITICS.items():
        text = text.replace(a, b)
    text = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in text if not unicodedata.combining(ch))


def norm(text: str) -> str:
    """Normalizon tekstin per krahasim etiketash."""
    return re.sub(r"[^a-z0-9]", "", strip_diacritics(str(text)).lower())


def norm_spaced(text: str) -> str:
    """Normalizon tekstin duke i mbajtur hapesirat (per etiketa me dy fjale)."""
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", strip_diacritics(str(text)).lower())).strip()


# ---------------------------------------------------------------------------
# PDF -> figura
# ---------------------------------------------------------------------------

def rasterize(pdf: str, dpi: int, pages: str | None, workdir: str) -> list[str]:
    cmd = ["pdftoppm", "-r", str(dpi), "-png"]
    if pages:
        first, _, last = pages.partition("-")
        cmd += ["-f", first, "-l", last or first]
    cmd += [pdf, os.path.join(workdir, "page")]
    try:
        subprocess.run(cmd, check=True, capture_output=True)
    except FileNotFoundError as exc:
        raise SystemExit("pdftoppm nuk u gjet. Instalo poppler-utils.") from exc
    except subprocess.CalledProcessError as exc:
        raise SystemExit(f"PDF-ja nuk u hap: {exc.stderr.decode('utf-8', 'ignore')[:200]}") from exc
    return sorted(os.path.join(workdir, n) for n in os.listdir(workdir) if n.endswith(".png"))


# ---------------------------------------------------------------------------
# Matje cilesie
# ---------------------------------------------------------------------------

@dataclass
class Quality:
    width: int = 0
    height: int = 0
    dpi: int = 0
    skew_deg: float = 0.0
    blur: float = 0.0
    ink_ratio: float = 0.0
    mean_conf: float = 0.0
    low_conf_ratio: float = 0.0
    score: int = 100
    issues: list[str] = field(default_factory=list)


def measure_quality(img_path: str, lines: list[dict[str, Any]], target_dpi: int) -> Quality:
    import cv2  # import i vone: mjeti punon edhe pa matje nese cv2 mungon
    import numpy as np

    q = Quality()
    gray = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
    if gray is None:
        q.issues.append("figura nuk u lexua")
        q.score = 0
        return q

    h, w = gray.shape[:2]
    q.width, q.height = w, h
    # A4 ne orientim portret eshte 8.27 inç i gjere.
    q.dpi = int(round(w / 8.27)) if h >= w else int(round(h / 8.27))

    # Kontrast dhe turbullim (varianca e Laplacian-it).
    q.blur = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    # Boja: perqindja e pikselave te erret.
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    q.ink_ratio = float(np.count_nonzero(binary == 0)) / float(binary.size)

    # Anim: kerkim i kendit qe maksimizon variancen e profilit horizontal.
    small = cv2.resize(gray, (w // 4 or 1, h // 4 or 1), interpolation=cv2.INTER_AREA)
    _, small_bin = cv2.threshold(small, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    best_angle, best_score = 0.0, -1.0
    for angle in [x / 2.0 for x in range(-12, 13)]:
        matrix = cv2.getRotationMatrix2D((small_bin.shape[1] / 2, small_bin.shape[0] / 2), angle, 1.0)
        rotated = cv2.warpAffine(small_bin, matrix, (small_bin.shape[1], small_bin.shape[0]),
                                 flags=cv2.INTER_NEAREST, borderValue=0)
        profile = rotated.sum(axis=1, dtype=np.float64)
        score = float(np.var(profile))
        if score > best_score:
            best_angle, best_score = angle, score
    q.skew_deg = round(best_angle, 1)

    # Besueshmeria e leximit te shtypur.
    confs = [float(l["conf"]) for l in lines if l.get("conf") is not None]
    if confs:
        q.mean_conf = round(statistics.fmean(confs), 3)
        q.low_conf_ratio = round(sum(1 for c in confs if c < LOW_CONF) / len(confs), 3)

    # Piketime dhe problemet.
    if q.dpi < 150:
        q.issues.append(f"rezolucion i ulet ({q.dpi} DPI)")
        q.score -= 30
    elif q.dpi < 200:
        q.issues.append(f"rezolucion mesatar ({q.dpi} DPI)")
        q.score -= 12
    if q.blur < 60:
        q.issues.append("skanim i turbullt")
        q.score -= 25
    elif q.blur < 120:
        q.issues.append("skanim pak i turbullt")
        q.score -= 10
    if abs(q.skew_deg) >= 2.0:
        q.issues.append(f"anim {q.skew_deg:+.1f} grade")
        q.score -= min(20, int(abs(q.skew_deg) * 4))
    if q.ink_ratio < 0.005:
        q.issues.append("faqe pothuajse bosh")
        q.score -= 40
    elif q.ink_ratio > 0.35:
        q.issues.append("boje shume e dendur (fotokopje e erret)")
        q.score -= 15
    if q.mean_conf and q.mean_conf < 0.75:
        q.issues.append("teksti i shtypur lexohet dobët")
        q.score -= 15
    q.score = max(0, min(100, q.score))
    return q


# ---------------------------------------------------------------------------
# OCR
# ---------------------------------------------------------------------------

_ENGINE = None


def ocr_lines(img_path: str) -> list[dict[str, Any]]:
    """Kthen rreshtat me tekst, besueshmeri dhe kuti, te renditur si ne leter."""
    global _ENGINE
    if _ENGINE is None:
        from rapidocr_onnxruntime import RapidOCR
        _ENGINE = RapidOCR()
    result, _ = _ENGINE(img_path)
    lines: list[dict[str, Any]] = []
    for box, text, score in (result or []):
        xs = [p[0] for p in box]
        ys = [p[1] for p in box]
        lines.append({
            "text": str(text).strip(),
            "conf": round(float(score), 4),
            "box": [int(min(xs)), int(min(ys)), int(max(xs)), int(max(ys))],
        })
    lines.sort(key=lambda l: (round(l["box"][1] / 24), l["box"][0]))
    return [l for l in lines if l["text"]]


# ---------------------------------------------------------------------------
# Etiketa dhe tip faqe
# ---------------------------------------------------------------------------

def find_labels(lines: list[dict[str, Any]], candidates: list[str]) -> list[str]:
    """Gjen etiketat e shtypura qe duken ne faqe (krahasim i normalizuar)."""
    page_text = norm_spaced(" ".join(l["text"] for l in lines))
    compact = norm(page_text)
    found: list[str] = []
    for label in candidates:
        n = norm(label)
        if not n:
            continue
        if n in compact:
            found.append(label)
            continue
        # Etiketa me dy fjale: kerko ne tekstin me hapesira.
        spaced = norm_spaced(label)
        if " " in spaced and spaced in page_text:
            found.append(label)
    return found


def classify_page(front_hits: list[str], back_hits: list[str], lines: list[dict[str, Any]]) -> str:
    text = norm_spaced(" ".join(l["text"] for l in lines))
    front = sum(1 for m in FRONT_MARKERS if m in text) + (2 if "PLANI I PUNES" in front_hits else 0)
    back = sum(1 for m in BACK_MARKERS if m in text) + (2 if "KOMENTE DHE PESHAT" in back_hits else 0)
    if front > back:
        return "front"
    if back > front:
        return "back"
    return "unknown"


def group_forms(pages: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[str]]:
    """Grupon faqet ne formulare PARA/PAS pa i perzier te dhenat."""
    forms: list[dict[str, Any]] = []
    warnings: list[str] = []
    current: dict[str, Any] | None = None

    for page in pages:
        kind = page["type"]
        if kind == "front":
            if current is not None and current["back"] is None and not current.get("closed"):
                # Dy faqe PARA rresht: formulari i mesiperm mbetet pa faqe PAS.
                current["closed"] = True
                warnings.append(f"formulari {current['formNumber']}: faqe PAS mungon (faqe {current['front']})")
            current = {"formNumber": len(forms) + 1, "front": page["page"], "back": None, "closed": False}
            forms.append(current)
        elif kind == "back":
            if current is None or current["back"] is not None or current.get("closed"):
                if current is not None and current["back"] is None:
                    current["back"] = page["page"]
                    continue
                warnings.append(f"faqe {page['page']}: faqe PAS pa faqe PARA perpara")
                current = {"formNumber": len(forms) + 1, "front": None, "back": page["page"], "closed": False}
                forms.append(current)
            else:
                current["back"] = page["page"]
        else:
            if current is None:
                current = {"formNumber": len(forms) + 1, "front": page["page"], "back": None, "closed": False}
                forms.append(current)
                warnings.append(f"faqe {page['page']}: tipi i faqes nuk u dallua; u trajtua si PARA")
            elif current["back"] is None:
                current["back"] = page["page"]
                warnings.append(f"faqe {page['page']}: tipi i faqes nuk u dallua; u bashkangjit formularit {current['formNumber']} si PAS")
            else:
                current = {"formNumber": len(forms) + 1, "front": page["page"], "back": None, "closed": False}
                forms.append(current)
                warnings.append(f"faqe {page['page']}: tipi i faqes nuk u dallua; formulari i ri {current['formNumber']}")

    for form in forms:
        form.pop("closed", None)
        form["complete"] = form["front"] is not None and form["back"] is not None
    return forms, warnings


# ---------------------------------------------------------------------------
# Ndertimi i hints
# ---------------------------------------------------------------------------

def build_hints(doc: dict[str, Any]) -> dict[str, Any]:
    """Hints kompakte per Gemini: vetem tipi i faqes, etiketat dhe cilesia."""
    return {
        "tool": TOOL_NAME,
        "version": TOOL_VERSION,
        "pageCount": doc["pageCount"],
        "formCount": len(doc["forms"]),
        "pages": [
            {
                "page": p["page"],
                "type": p["type"],
                "quality": p["quality"]["score"],
                "issues": p["quality"]["issues"][:4],
                "labels": p["labels"][:14],
            }
            for p in doc["pages"]
        ],
        "forms": doc["forms"],
        "warnings": doc["warnings"],
    }


def hints_text(hints: dict[str, Any]) -> str:
    """Nje bllok i shkurter teksti qe mund t'i shtohet kerkeses drejt Gemini-t."""
    parts = [
        "PARAPRANUES LOKAL OCR (i pabesueshem: vetem ndihme, jo burim i vertete).",
        f"Faqe: {hints['pageCount']}, formulare te pritura: {hints['formCount']}.",
    ]
    for p in hints["pages"]:
        label = f"faqja {p['page']}: {p['type']}"
        if p["labels"]:
            label += " | etiketa: " + ", ".join(p["labels"][:10])
        if p["issues"]:
            label += " | cilesi: " + "; ".join(p["issues"][:3])
        parts.append(label)
    if hints["warnings"]:
        parts.append("Paralajmerime: " + "; ".join(hints["warnings"][:6]))
    parts.append("Lexo gjithmone vet dokumentin; nese hints kundershton figures, beso figures.")
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Programi kryesor
# ---------------------------------------------------------------------------

def run(pdf: str, dpi: int, pages: str | None, verbose: bool) -> dict[str, Any]:
    started = time.time()
    with tempfile.TemporaryDirectory(prefix="biobes_ocr_") as workdir:
        images = rasterize(pdf, dpi, pages, workdir)
        if not images:
            raise SystemExit("PDF-ja nuk dha asnje faqe.")
        doc_pages: list[dict[str, Any]] = []
        for index, img in enumerate(images, 1):
            page_started = time.time()
            lines = ocr_lines(img)
            quality = measure_quality(img, lines, dpi)
            front_hits = find_labels(lines, FRONT_LABELS)
            back_hits = find_labels(lines, BACK_LABELS)
            page_type = classify_page(front_hits, back_hits, lines)
            labels = sorted(set(front_hits + back_hits))
            uncertain = [
                {"text": l["text"], "conf": l["conf"], "box": l["box"]}
                for l in lines if l["conf"] < LOW_CONF
            ]
            doc_pages.append({
                "page": index,
                "type": page_type,
                "labels": labels,
                "quality": {
                    "score": quality.score,
                    "issues": quality.issues,
                    "dpi": quality.dpi,
                    "skewDeg": quality.skew_deg,
                    "blur": round(quality.blur, 1),
                    "inkRatio": round(quality.ink_ratio, 4),
                    "meanConf": quality.mean_conf,
                    "lowConfRatio": quality.low_conf_ratio,
                },
                "uncertainCount": len(uncertain),
                "uncertain": uncertain[:40],
                "lines": [{"text": l["text"], "conf": l["conf"], "box": l["box"]} for l in lines],
                "text": "\n".join(l["text"] for l in lines),
                "seconds": round(time.time() - page_started, 2),
            })
            if verbose:
                print(f"  faqe {index}: {page_type}, {len(lines)} rreshta, "
                      f"cilesi {quality.score}, {doc_pages[-1]['seconds']}s", file=sys.stderr)

    forms, warnings = group_forms(doc_pages)

    # Kontrolle kryq: numri i formulareve dhe cilesia e faqeve.
    if len(images) % 2 == 0 and len(forms) != len(images) // 2:
        warnings.append(
            f"{len(images)} faqe japin {len(forms)} formulare; pritej {len(images) // 2}. Kontrollo ndarjen PARA/PAS."
        )
    for page in doc_pages:
        if page["quality"]["score"] < 50:
            warnings.append(f"faqe {page['page']}: cilesi e ulet ({page['quality']['score']}); skano perseri nese leximi del i pasigurt.")
        if page["type"] == "unknown":
            warnings.append(f"faqe {page['page']}: tipi PARA/PAS nuk u dallua nga etiketat e shtypura.")

    return {
        "tool": TOOL_NAME,
        "version": TOOL_VERSION,
        "file": os.path.basename(pdf),
        "dpi": dpi,
        "pageCount": len(doc_pages),
        "formCount": len(forms),
        "forms": forms,
        "pages": doc_pages,
        "warnings": warnings,
        "totalSeconds": round(time.time() - started, 2),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="BioBes OCR parapranues lokal (PP-OCR/RapidOCR).")
    parser.add_argument("pdf", help="skedari PDF ose foto")
    parser.add_argument("--out", default=None, help="skedari JSON i rezultatit")
    parser.add_argument("--dpi", type=int, default=200, help="rezolucioni i rasterizimit (200 ose 300)")
    parser.add_argument("--pages", default=None, help="vetem disa faqe, p.sh. 1-4")
    parser.add_argument("--hints-only", action="store_true", help="shkruaj vetem hints kompakte")
    parser.add_argument("--text", action="store_true", help="shkruaj edhe tekstin e lexuar")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args(argv)

    if not os.path.exists(args.pdf):
        print(f"Skedari nuk u gjet: {args.pdf}", file=sys.stderr)
        return 2

    doc = run(args.pdf, args.dpi, args.pages, args.verbose)
    hints = build_hints(doc)
    payload = hints if args.hints_only else doc
    out = args.out or os.path.splitext(args.pdf)[0] + ".ocr.json"
    with open(out, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)

    if args.text:
        text_path = os.path.splitext(out)[0] + ".txt"
        with open(text_path, "w", encoding="utf-8") as handle:
            for page in doc["pages"]:
                handle.write(f"\n===== FAQE {page['page']} ({page['type']}) =====\n")
                handle.write(page["text"] + "\n")
        print(f"teksti: {text_path}", file=sys.stderr)

    print(f"{len(doc['pages'])} faqe, {len(doc['forms'])} formulare, {doc['totalSeconds']}s -> {out}", file=sys.stderr)
    for warning in doc["warnings"]:
        print(f"  ! {warning}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
