#!/usr/bin/env python3
"""Grow the approved BioBes Excel model from 8 to 12 employee rows.

The workbook is edited at the OOXML level so the cell styles, borders, the logo
drawing and every formula survive:

* four rows are inserted after row 19, so the employee block becomes 12..23;
* everything from the old row 20 down shifts by +4 (cells, formulas, merged
  ranges, the logo anchor on the back page and both print ranges);
* the employee rows and the 25 weighing rows on both pages take the row pitch
  the printed PDF uses, so paper and Excel stay visually identical.

Run from the package root against the 8-row master; the result is what
Modele_Bosh/Model_25_Rreshta_2_Faqe.xlsx ships today.

    python3 tools/build_model_xlsx.py /path/to/8-row-master.xlsx Modele_Bosh/Model_25_Rreshta_2_Faqe.xlsx
"""
import re
import sys
import zipfile

FIRST_EMP = 12
LAST_EMP_OLD = 19
EMP_ROWS_NEW = 12
SHIFT = 4
FRONT_LAST_OLD = 49
BACK_FIRST_OLD = 51
BACK_LAST_OLD = 102
EMP_HEIGHT = 13.4
WEIGH_HEIGHT = 13.9444
FRONT_DATA_OLD = (23, 47)
BACK_DATA_OLD = (57, 81)
FIRST_SHIFTED = 20          # the old "3. PESHAT" caption row

REL_REF = re.compile(r'(\$?[A-Z]{1,3}\$?)(\d{1,7})')
ABS_REF = re.compile(r'(\$[A-Z]{1,3}\$)(\d{1,7})')
ROW = re.compile(r'<row r="(\d+)"(?:[^>]*/>|[^>]*>.*?</row>)', re.S)


def moved(row, threshold=FIRST_SHIFTED):
    return row + SHIFT if row >= threshold else row


def shift_rel(text):
    return REL_REF.sub(lambda m: '%s%d' % (m.group(1), moved(int(m.group(2)))), text)


def rewrite_row(fragment):
    """Move one whole <row> element down by SHIFT rows, cells and formulas."""
    fragment = re.sub(r'(<row r=")(\d+)(")',
                      lambda m: '%s%d%s' % (m.group(1), int(m.group(2)) + SHIFT, m.group(3)), fragment)
    fragment = re.sub(r'(<c r="[A-Z]{1,3})(\d+)(")',
                      lambda m: '%s%d%s' % (m.group(1), int(m.group(2)) + SHIFT, m.group(3)), fragment)
    fragment = re.sub(r'(<f[^>]*>)([^<]*)(</f>)',
                      lambda m: '%s%s%s' % (m.group(1), shift_rel(m.group(2)), m.group(3)), fragment)
    return fragment


def clone_row(source, source_index, new_index, value):
    """Copy a template row, retargeting every reference to `new_index`."""
    fragment = source.replace('<row r="%d"' % source_index, '<row r="%d"' % new_index, 1)
    fragment = re.sub(r'(<c r="[A-Z]{1,3})%d(")' % source_index,
                      lambda m: '%s%d%s' % (m.group(1), new_index, m.group(2)), fragment)
    formula_ref = re.compile(r'([A-Z]{1,3})%d(?![0-9])' % source_index)

    def retarget(match):
        body = formula_ref.sub(lambda ref: ref.group(1) + str(new_index), match.group(2))
        return '%s%s%s' % (match.group(1), body, match.group(3))

    fragment = re.sub(r'(<f[^>]*>)([^<]*)(</f>)', retarget, fragment)
    fragment = re.sub(r'(<c r="A%d"[^>]*>)(?:<v>[^<]*</v>)?' % new_index,
                      lambda m: '%s<v>%d</v>' % (m.group(1), value), fragment)
    return fragment


def set_height(fragment, height):
    if ' ht="' not in fragment:
        return fragment.replace('<row ', '<row ht="%s" customHeight="1" ' % height, 1)
    return re.sub(r'(<row r="\d+"[^>]*?) ht="[^"]*"( customHeight="1")?',
                  lambda m: '%s ht="%s" customHeight="1"' % (m.group(1), height), fragment)


def employee_row_merges(merges, row_index):
    pattern = re.compile(r'^([A-Z]{1,3})%d:([A-Z]{1,3})%d$' % (row_index, row_index))
    return [m for m in merges if pattern.match(m)]


def build(src_path, out_path):
    with zipfile.ZipFile(src_path) as zf:
        parts = {name: zf.read(name) for name in zf.namelist()}

    sheet = parts['xl/worksheets/sheet1.xml'].decode('utf-8')
    if 'A1:AC%d' % (BACK_LAST_OLD + SHIFT) in sheet:
        raise SystemExit(f'{src_path} is already the {EMP_ROWS_NEW}-row model. Run this generator '
                         'once, against the 8-row master kept in git history.')
    found = {}
    for match in ROW.finditer(sheet):
        found[int(match.group(1))] = match.group(0)
    head = sheet[:sheet.index('<sheetData>') + len('<sheetData>')]
    tail = sheet[sheet.index('</sheetData>'):]

    middle, last = found[13], found[LAST_EMP_OLD]
    rows = []
    index = 1
    while index <= BACK_LAST_OLD + SHIFT:
        if index < FIRST_EMP:
            rows.append(found[index])
            index += 1
            continue
        if index == FIRST_EMP:
            for n in range(FIRST_EMP, LAST_EMP_OLD):                                  # 12..18
                rows.append(set_height(found[n], EMP_HEIGHT))
            rows.append(set_height(clone_row(middle, 13, LAST_EMP_OLD, 8), EMP_HEIGHT))
            for offset in range(1, EMP_ROWS_NEW - (LAST_EMP_OLD - FIRST_EMP)):        # 20..23
                value = 8 + offset
                is_last = value == EMP_ROWS_NEW
                rows.append(set_height(clone_row(last if is_last else middle,
                                                  LAST_EMP_OLD if is_last else 13,
                                                  LAST_EMP_OLD + offset, value), EMP_HEIGHT))
            index = FIRST_EMP + EMP_ROWS_NEW                                          # continue at 24
            continue
        source = index - SHIFT
        fragment = rewrite_row(found[source])
        if FRONT_DATA_OLD[0] <= source <= FRONT_DATA_OLD[1] or BACK_DATA_OLD[0] <= source <= BACK_DATA_OLD[1]:
            fragment = set_height(fragment, WEIGH_HEIGHT)
        rows.append(fragment)
        index += 1

    sheet = head + ''.join(rows) + tail
    sheet = sheet.replace('<dimension ref="A1:AC%d"/>' % BACK_LAST_OLD,
                          '<dimension ref="A1:AC%d"/>' % (BACK_LAST_OLD + SHIFT))

    merges = re.findall(r'<mergeCell ref="([A-Z]{1,3}\d+:[A-Z]{1,3}\d+)"/>', sheet)
    shifted = []
    for ref in merges:
        left, right = ref.split(':')
        shifted.append('%s:%s' % (shift_rel(left), shift_rel(right)))
    middle_pat = employee_row_merges(merges, 13)
    last_pat = employee_row_merges(merges, LAST_EMP_OLD)
    extra = []
    for offset in range(1, EMP_ROWS_NEW - (LAST_EMP_OLD - FIRST_EMP)):
        target, is_last = LAST_EMP_OLD + offset, (8 + offset) == EMP_ROWS_NEW
        source = LAST_EMP_OLD if is_last else 13
        for rng in (last_pat if is_last else middle_pat):
            extra.append(rng.replace(str(source), str(target)))
    every = shifted + extra
    sheet = re.sub(r'<mergeCells count="\d+">.*?</mergeCells>',
                   '<mergeCells count="%d">%s</mergeCells>' % (len(every), ''.join('<mergeCell ref="%s"/>' % m for m in every)),
                   sheet, flags=re.S)
    parts['xl/worksheets/sheet1.xml'] = sheet.encode('utf-8')

    workbook = ABS_REF.sub(lambda m: '%s%d' % (m.group(1), moved(int(m.group(2)))),
                           parts['xl/workbook.xml'].decode('utf-8'))
    parts['xl/workbook.xml'] = workbook.encode('utf-8')

    # Drawing anchors are zero based, so the logo anchored on row 51 (index 50)
    # follows the same +4 shift as its row.
    drawing = re.sub(r'(<row>)(\d+)(</row>)',
                     lambda m: '%s%d%s' % (m.group(1), moved(int(m.group(2)) + 1) - 1, m.group(3)),
                     parts['xl/drawings/drawing1.xml'].decode('utf-8'))
    parts['xl/drawings/drawing1.xml'] = drawing.encode('utf-8')

    with zipfile.ZipFile(out_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for name, data in parts.items():
            zf.writestr(name, data)

    print('rows written: %d (template had %d)' % (len(rows), len(found)))
    print('employee block: rows %d..%d' % (FIRST_EMP, FIRST_EMP + EMP_ROWS_NEW - 1))
    print('weighing rows: front %d..%d, back %d..%d' % (FRONT_DATA_OLD[0] + SHIFT, FRONT_DATA_OLD[1] + SHIFT,
                                                         BACK_DATA_OLD[0] + SHIFT, BACK_DATA_OLD[1] + SHIFT))
    print('merged ranges: %d -> %d' % (len(merges), len(every)))
    print('print areas: $A$1:$AC$%d and $A$%d:$AC$%d' % (FRONT_LAST_OLD + SHIFT, BACK_FIRST_OLD + SHIFT, BACK_LAST_OLD + SHIFT))


if __name__ == '__main__':
    src = sys.argv[1] if len(sys.argv) > 1 else 'Modele_Bosh/Model_25_Rreshta_2_Faqe.xlsx'
    dst = sys.argv[2] if len(sys.argv) > 2 else '/tmp/model_new.xlsx'
    build(src, dst)
    print('wrote', dst)
