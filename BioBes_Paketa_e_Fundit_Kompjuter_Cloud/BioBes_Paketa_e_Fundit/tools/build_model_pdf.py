#!/usr/bin/env python3
"""Build the approved BioBes model PDF with 12 employee rows (was 8).

The template is re-laid-out by copying the original page bands (so every glyph,
logo and box keeps its original rendering) and re-tiling only the two tables
that change: the "2. PUNONJËSIT" block grows from 8 to 12 rows and the weighing
grid absorbs the space by a slightly tighter row pitch.

Run from the package root against the 8-row master; the result is what
Modele_Bosh/Model_25_Rreshta_2_Faqe.pdf ships today.

    python3 tools/build_model_pdf.py /path/to/8-row-master.pdf Modele_Bosh/Model_25_Rreshta_2_Faqe.pdf

Requires PyMuPDF. All y values below are top-down PDF points on a 595.2756 x
841.8898 (A4) page, which is the coordinate space app.js uses before flipping.
"""
import sys

import pymupdf

SRC = 'Modele_Bosh/Model_25_Rreshta_2_Faqe.pdf'

# Original geometry (front page).
EMP_TOP = 263.3914          # first employee row top == bottom of the header row
EMP_PITCH = 13.0
EMP_ROWS_OLD = 8
EMP_BOTTOM = EMP_TOP + EMP_ROWS_OLD * EMP_PITCH          # 367.3914
SECTION_BAND_TOP = 234.73                                 # "2. PUNONJËSIT" box top
PESH_TOP = EMP_BOTTOM                                      # "3. PESHAT" band top
PESH_HEADER_BOTTOM = 431.8788                              # first weighing row top
PESH_BOTTOM = 784.1343                                     # last weighing row bottom
PAGE_BOTTOM_OF_CONTENT = 841.8898
SIGMA_HEIGHT = 803.8388 - PESH_BOTTOM   # 19.7045

EMP_ROWS_NEW = 12
EMP_PITCH_NEW = 12.0
EMP_BOTTOM_NEW = EMP_TOP + EMP_ROWS_NEW * EMP_PITCH_NEW    # 407.3914
SHIFT = EMP_BOTTOM_NEW - EMP_BOTTOM                        # 40.0 (absorbed by the grid)

PESH_PITCH_OLD = (PESH_BOTTOM - PESH_HEADER_BOTTOM) / 25   # 14.0902
PESH_PITCH_NEW = PESH_PITCH_OLD - SHIFT / 25.0             # 12.4902

BACK_PESH_TOP = 84.0
BACK_HEADER_BOTTOM = BACK_PESH_TOP + (PESH_HEADER_BOTTOM - PESH_TOP)   # 148.4874
BACK_DATA_BOTTOM = BACK_HEADER_BOTTOM + 25 * PESH_PITCH_OLD            # 500.7429
BACK_SIGMA_BOTTOM = BACK_DATA_BOTTOM + SIGMA_HEIGHT


def bands_front(src):
    """(clip rect, target rect) pairs copied verbatim around the rebuilt block."""
    W = src.rect.width
    H = src.rect.height
    return [
        ((0, 0, W, SECTION_BAND_TOP), (0, 0, W, SECTION_BAND_TOP)),
        ((0, SECTION_BAND_TOP, W, EMP_TOP), (0, SECTION_BAND_TOP, W, EMP_TOP)),
        ((0, PESH_TOP, W, PESH_HEADER_BOTTOM),
         (0, PESH_TOP + SHIFT, W, PESH_HEADER_BOTTOM + SHIFT)),
        ((0, PESH_HEADER_BOTTOM, W, PESH_BOTTOM),
         (0, PESH_HEADER_BOTTOM + SHIFT, W, PESH_BOTTOM)),
        ((0, PESH_BOTTOM, W, H), (0, PESH_BOTTOM, W, H)),
    ]


def bands_back(src):
    W = src.rect.width
    H = src.rect.height
    # The 2.25pt box stroke that closes the weighing tables sits on the sigma row
    # border, so the split plane moves a few points below it to avoid leaving a
    # duplicate edge behind when the sigma row is pulled up.
    split = BACK_SIGMA_BOTTOM + 4.0
    sigma_h = BACK_SIGMA_BOTTOM - BACK_DATA_BOTTOM
    return [
        ((0, 0, W, BACK_HEADER_BOTTOM), (0, 0, W, BACK_HEADER_BOTTOM)),
        ((0, BACK_HEADER_BOTTOM, W, BACK_DATA_BOTTOM),
         (0, BACK_HEADER_BOTTOM, W, BACK_HEADER_BOTTOM + 25 * PESH_PITCH_NEW)),
        ((0, BACK_DATA_BOTTOM, W, split),
         (0, BACK_HEADER_BOTTOM + 25 * PESH_PITCH_NEW, W,
          BACK_HEADER_BOTTOM + 25 * PESH_PITCH_NEW + sigma_h + (split - BACK_SIGMA_BOTTOM))),
        ((0, split, W, H), (0, split, W, H)),
    ]


def employee_rows_inventory(page):
    """Exact line inventory of the employee row area, plus the digit glyphs."""
    h_lines, v_lines = [], []
    for d in page.get_drawings():
        w = round(d.get('width') or 0.0, 4)
        col = d.get('color') or (0.0, 0.0, 0.0)
        for item in d['items']:
            if item[0] == 'l':
                (x0, y0), (x1, y1) = item[1], item[2]
                if abs(y0 - y1) < 0.5 and EMP_TOP - 0.6 < y0 < EMP_BOTTOM + 0.6:
                    h_lines.append((round(min(x0, x1), 4), round(max(x0, x1), 4), w, tuple(round(c, 3) for c in col)))
    # The printed column rules follow the same edges the app writes into (sl).
    v_lines = [(25.5118, 0.75), (59.204, 0.75), (207.9658, 0.75), (240.1026, 0.75),
               (282.08775, 0.75), (321.1854, 0.75), (479.174, 0.75), (569.7638, 0.75),
               (569.7638, 2.25)]
    return h_lines, v_lines


def digit_shapes(page):
    """Return [(text, bbox)] for the row numbers of the employee and weighing tables."""
    emp, pesh = {}, {}
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines', []):
            for span in line.get('spans', []):
                text = span['text'].strip()
                x0, y0, x1, y1 = span['bbox']
                if not text.isdigit():
                    continue
                if 30 < x0 < 50 and EMP_TOP < y0 < EMP_BOTTOM:
                    emp[int(text)] = (x0, y0, x1, y1)
                elif x0 < 41 and PESH_HEADER_BOTTOM < y0 < PESH_BOTTOM:
                    pesh[int(text)] = (x0, y0, x1, y1)
    return emp, pesh


def draw_employee_rows(page, src, h_lines, v_lines, emp, pesh):
    page.draw_rect(pymupdf.Rect(25.0, EMP_TOP - 0.9, 570.3, EMP_BOTTOM_NEW + 0.9),
                   color=None, fill=(1, 1, 1), width=0)
    thick = [h for h in h_lines if h[2] >= 2.0]
    thin = [h for h in h_lines if h[2] < 2.0] or [(25.5118, 569.7638, 0.75, (0.0, 0.0, 0.0))]
    for x0, x1, w, col in sorted(set(thin)):
        for k in range(EMP_ROWS_NEW + 1):
            y = EMP_TOP + k * EMP_PITCH_NEW
            page.draw_line((x0, y), (x1, y), color=col, width=w)
    for x0, x1, w, col in thick:
        page.draw_line((x0, EMP_BOTTOM_NEW), (x1, EMP_BOTTOM_NEW), color=col, width=w)
    for x, w in v_lines:
        page.draw_line((x, EMP_TOP), (x, EMP_BOTTOM_NEW), color=(0.0, 0.0, 0.0), width=w)
    # Re-use the printed digits so the numbering keeps the template font.
    for i in range(EMP_ROWS_NEW):
        n = i + 1
        center_y = EMP_TOP + i * EMP_PITCH_NEW + EMP_PITCH_NEW / 2
        box = emp.get(n) or pesh.get(n)
        if not box:
            continue
        sx0, sy0, sx1, sy1 = box
        if n in emp:
            k = 1.0
        else:
            k = 8.5 / 7.4
        w, h = (sx1 - sx0) * k, (sy1 - sy0) * k
        cx = (sx0 + sx1) / 2 if n in emp else 42.36
        rect = (cx - w / 2, center_y - h / 2, cx + w / 2, center_y + h / 2)
        page.show_pdf_page(pymupdf.Rect(rect), src, 0,
                           clip=pymupdf.Rect(sx0 - 0.4, sy0 - 0.4, sx1 + 0.4, sy1 + 0.4),
                           keep_proportion=False)


def build(src_path, out_path):
    src = pymupdf.open(src_path)
    out = pymupdf.open()
    out.set_metadata({k: v for k, v in src.metadata.items() if k in ('title', 'author', 'subject', 'keywords', 'creator', 'producer')})
    fw, fh = src[0].rect.width, src[0].rect.height
    h_lines, v_lines = employee_rows_inventory(src[0])
    emp_digits, pesh_digits = digit_shapes(src[0])
    if set(emp_digits) != set(range(1, EMP_ROWS_OLD + 1)):
        raise SystemExit(f'{src_path} is not the 8-row master (its staff column numbers '
                         f'{sorted(emp_digits)}). Run this generator once, against the '
                         'un-numbered template kept in git history, not against the '
                         'regenerated model.')
    for index, page_src in enumerate(src):
        page = out.new_page(width=fw, height=fh)
        page.draw_rect(page.rect, color=None, fill=(1, 1, 1), width=0)
        for clip, target in (bands_front(page_src) if index == 0 else bands_back(page_src)):
            # keep_proportion=False: the weighing grid is deliberately squeezed
            # vertically only, so the printed column rules stay on the exact
            # x edges that app.js writes into.
            page.show_pdf_page(pymupdf.Rect(target), src, index,
                               clip=pymupdf.Rect(clip), keep_proportion=False)
        if index == 0:
            draw_employee_rows(page, src, h_lines, v_lines, emp_digits, pesh_digits)
    out.save(out_path, garbage=4, deflate=True)
    print(f'bands front={len(bands_front(src[0]))} back={len(bands_back(src[1]))}')
    print(f'employee rules: {len(v_lines)} verticals, {len(h_lines)} horizontal styles')
    print(f'digits reused: table={len(emp_digits)} weighing={len(pesh_digits)}')
    print(f'pitches: employees {EMP_PITCH}->{EMP_PITCH_NEW}, weighings {PESH_PITCH_OLD:.4f}->{PESH_PITCH_NEW:.4f}')
    print(f'shift absorbed on the front page: {SHIFT:.4f} pt; front grid bottom stays {PESH_BOTTOM:.4f}')


if __name__ == '__main__':
    src = sys.argv[1] if len(sys.argv) > 1 else SRC
    dst = sys.argv[2] if len(sys.argv) > 2 else '/tmp/model_new.pdf'
    build(src, dst)
    print('wrote', dst)
