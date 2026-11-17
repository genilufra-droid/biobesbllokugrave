#!/usr/bin/env python3
"""Ndërton fletën A4 të udhëzimit të dorëshkrimit për punonjësit.

Fleta është ndihmëse: modeli i miratuar i formularit NUK ndryshohet. Ajo
përmban rregullat që ndikojnë drejtpërdrejt në leximin automatik, shembujt
mirë / keq të nxjerrë nga formularët realë dhe protokollin e fotografimit.
"""
import os

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, Frame, PageTemplate, Paragraph,
                                Spacer, Table, TableStyle)

FONT_DIR = '/usr/share/fonts/truetype/dejavu'
pdfmetrics.registerFont(TTFont('DV', os.path.join(FONT_DIR, 'DejaVuSans.ttf')))
pdfmetrics.registerFont(TTFont('DVB', os.path.join(FONT_DIR, 'DejaVuSans-Bold.ttf')))

W, H = A4
MARGIN = 13 * mm
GREEN = colors.HexColor('#1f6b4f')
GREY = colors.HexColor('#5b6770')
LIGHT = colors.HexColor('#eef4f1')
BAD = colors.HexColor('#b3261e')
WARN = colors.HexColor('#8a6520')

title = ParagraphStyle('t', fontName='DVB', fontSize=15.2, leading=18.5, textColor=GREEN, spaceAfter=2)
sub = ParagraphStyle('s', fontName='DV', fontSize=8.2, leading=10.8, textColor=GREY, spaceAfter=5)
h2 = ParagraphStyle('h2', fontName='DVB', fontSize=10.0, leading=12.2, textColor=colors.black, spaceBefore=5, spaceAfter=2.2)
body = ParagraphStyle('b', fontName='DV', fontSize=8.2, leading=10.8)
cell = ParagraphStyle('c', fontName='DV', fontSize=7.8, leading=9.9)
cellb = ParagraphStyle('cb', fontName='DVB', fontSize=7.8, leading=9.9)
head = ParagraphStyle('hd', fontName='DVB', fontSize=8.2, leading=10.6, textColor=colors.white)
small = ParagraphStyle('sm', fontName='DV', fontSize=7.4, leading=9.6, textColor=GREY)


def p(txt, style=body):
    return Paragraph(txt, style)


def table(data, widths, header=True, zebra=True, align=('LEFT', 'LEFT')):
    t = Table(data, colWidths=widths, hAlign='LEFT')
    style = [('VALIGN', (0, 0), (-1, -1), 'TOP'),
             ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#c9d3cf')),
             ('LEFTPADDING', (0, 0), (-1, -1), 4),
             ('RIGHTPADDING', (0, 0), (-1, -1), 4),
             ('TOPPADDING', (0, 0), (-1, -1), 2.0),
             ('BOTTOMPADDING', (0, 0), (-1, -1), 2.0)]
    if header:
        style += [('BACKGROUND', (0, 0), (-1, 0), GREEN)]
    if zebra:
        for i in range(1 if header else 0, len(data)):
            if (i % 2) == (0 if header else 1):
                style.append(('BACKGROUND', (0, i), (-1, i), LIGHT))
    t.setStyle(TableStyle(style))
    return t


def build(path):
    doc = BaseDocTemplate(path, pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN,
                          topMargin=MARGIN, bottomMargin=16 * mm,
                          title='BioBes — Si të shkruajmë formularin që lexohet saktë',
                          author='BioBes')
    frame = Frame(MARGIN, 16 * mm, W - 2 * MARGIN, H - MARGIN - 16 * mm, id='f',
                  leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)

    def footer(canv, d):
        canv.saveState()
        canv.setFont('DV', 7.2)
        canv.setFillColor(GREY)
        canv.drawString(MARGIN, 9 * mm, 'BioBes — Trust the Nature  ·  Udhëzim për dorëshkrimin  ·  A4, 1 faqe')
        canv.drawRightString(W - MARGIN, 9 * mm, 'Faqe %d' % canv.getPageNumber())
        canv.setStrokeColor(colors.HexColor('#c9d3cf'))
        canv.line(MARGIN, 12.4 * mm, W - MARGIN, 12.4 * mm)
        canv.restoreState()

    doc.addPageTemplates([PageTemplate(id='p', frames=[frame], onPage=footer)])

    F = []
    F.append(p('Si të shkruajmë formularin që lexohet saktë', title))
    F.append(p('Udhëzim për dhomën e punës  ·  vlen për formularët e dorëshkrimit që skanohen dhe lexohen nga sistemi. '
               'Formulari mbetet modeli i miratuar; ky udhëzim nuk e ndryshon atë.', sub))

    F.append(p('1. Tri rregulla që ndikojnë më shumë', h2))
    F.append(table([
        [p('Shkruaj', head), p('Jo', head), p('Pse', head)],
        [p('Shifra të veçanta: <b>1 6 0</b>', cellb), p('Të lidhura: <font color="#b3261e"><b>160</b></font> me vijë', cell),
         p('Zeroja e hapur lexohet si <b>6</b> ose <b>C</b>.', cell)],
        [p('Ora me katër shifra: <b>09:00</b>', cellb), p('<font color="#b3261e"><b>Ore°</b></font>, 9:00', cell),
         p('Shkurtimi nuk njihet si orë.', cell)],
        [p('Brenda qelizës, larg vijave', cellb), p('Mbi vijën e kolonës', cell),
         p('Vija e ndan shifrën në dysh ose e pret.', cell)],
    ], [58 * mm, 52 * mm, 63 * mm]))

    F.append(p('2. Shembuj nga formularët e vërtetë', h2))
    F.append(table([
        [p('Ku', head), p('Si u shkrua', head), p('Çfarë lexon sistemi', head), p('Si duhet', head)],
        [p('SHUMA, peshimi 1', cell), p('<b>160</b> me zero të hapur', cell),
         p('<font color="#b3261e">160 / 100 / 760</font>', cell), p('<b>1 6 0</b>, zero e mbyllur', cell)],
        [p('KG / AMBALAZHI', cell), p('<b>180</b> mbi vijën e kolonës', cell),
         p('<font color="#b3261e">180 ose 130</font>', cell), p('<b>1 8 0</b> në mes të qelizës', cell)],
        [p('Fillim / Mbarim', cell), p('<b>Ore°</b> · <b>16:°°</b>', cell),
         p('<font color="#b3261e">pa orë të vlefshme</font>', cell), p('<b>09:00</b> · <b>16:00</b>', cell)],
        [p('Emri i punonjëses', cell), p('<b>VALMIRA MERKUR</b> deri në vijë', cell),
         p('<font color="#b3261e">MERKUR / MERKIJ</font>', cell), p('<b>VALMIRA MERKURI</b>, bllok, brenda qelizës', cell)],
        [p('Sasia (plani)', cell), p('<b>1500</b>', cell), p('<font color="#8a6520">1500 ✓</font>', cell), p('njësoj — shifra të veçanta', cell)],
        [p('Komente', cell), p('<b>CILESI E MICE</b> pa ë', cell),
         p('<font color="#b3261e">arsyeja “Tjetër”</font>', cell), p('<b>Cilësi e mirë</b> · <b>Cilësi e dobët</b>', cell)],
    ], [33 * mm, 45 * mm, 43 * mm, 52 * mm]))

    F.append(p('3. Shifrat që ngatërrohen', h2))
    F.append(table([
        [p('Ngatërrohen', head), p('Shkruaji kështu', head)],
        [p('1 dhe 7', cell), p('<b>1</b> me majë, <b>7</b> me vizë horizontale', cell)],
        [p('4 dhe 9', cell), p('<b>4</b> e hapur, <b>9</b> me bisht të drejtë poshtë', cell)],
        [p('0 dhe 6', cell), p('<b>0</b> e mbyllur plotësisht, <b>6</b> me lak lart', cell)],
        [p('3 dhe 8', cell), p('<b>3</b> e hapur majtas, <b>8</b> dy lule të mbyllura', cell)],
        [p('5 dhe 6', cell), p('<b>5</b> me krah të drejtë lart, <b>6</b> me lak', cell)],
    ], [40 * mm, 133 * mm]))

    F.append(p('4. Fotografia — kjo vendos saktësinë', h2))
    F.append(table([
        [p('Bëj', head), p('Mos bëj', head)],
        [p('Skano me aplikacion skaneri (Microsoft Lens, Adobe Scan) dhe dërgo <b>PDF</b>', cell),
         p('Mos dërgo foto të zvogëluar nga WhatsApp-i — humbet detaji dhe orientimi', cell)],
        [p('Nëse mbetet foto: faqja të mbushë të gjithë kornizën, telefoni paralel me letrën', cell),
         p('Mos fotografo nga anash ose me hije dore mbi tabelë', cell)],
        [p('Dritë e njëtrajtshme, pa shkëlqim (mos përdor blic direkt mbi letër me shkëlqim)', cell),
         p('Mos fotografo në gjysmëdritë: hija e errët fshin shifrat', cell)],
        [p('Dërgo skedarin origjinal (Dokument / kabllo / cloud)', cell),
         p('Mos e kalo përmes chat-it që e zvogëlon', cell)],
    ], [90 * mm, 83 * mm]))
    F.append(p('Foto e zvogëluar ~1200 px lë penën rreth <b>1 piksel</b> të trashë; skanimi 300 dpi jep 3–4 herë më shumë detaj. '
               'Për tabelat me shkrim dore, skanimi është ndryshimi më i madh që mund të bëhet pa ndryshuar as formularin, as sistemin.', small))

    F.append(p('5. Qelizat boshe dhe anulimet', h2))
    F.append(table([
        [p('Veprimi', head), p('Si bëhet', head)],
        [p('Qelizë e papërdorur', cell), p('Lëre <b>bosh</b>. Mos shkruaj <b>0</b>, <b>—</b> apo <b>/</b>.', cell)],
        [p('Rresht i anuluar', cell), p('Një vijë <b>horizontale</b> nëpër rresht dhe inicialet; jo vijë diagonale nëpër tabelë.', cell)],
        [p('Gabim në një shifër', cell), p('Vijë e shkurtër mbi shifrën e gabuar dhe ajo e saktë pranë saj — jo shkrim mbi shkrim.', cell)],
        [p('Totali (SH)', cell), p('Vetëm totali që shkruhet dorazi te <b>SH</b>; sistemi nuk e llogarit në vend të teje.', cell)],
    ], [40 * mm, 133 * mm]))

    F.append(p('6. Formulari: ku shkruhet çfarë', h2))
    F.append(table([
        [p('Fusha', head), p('Shënim', head)],
        [p('Plan — Sasia / Lloji i Paketimit', cell),
         p('<b>1500</b> te Sasia dhe <b>20</b> te Lloji i Paketimit. Numri i ambalazheve shkruhet në sistem, jo në letër; nëse shkruhet, shkruaje vetëm si numër brenda qelizës së paketimit.', cell)],
        [p('Shënim për arsyen', cell),
         p('Përdor fjalë të njohura: <b>stok</b>, <b>mungesë punëtorësh</b>, <b>pritje</b>, <b>riparim</b>, <b>cilësi e mirë / e dobët</b>, <b>mot</b>, <b>plan i ndryshuar</b>.', cell)],
        [p('Komente (faqja e pasme)', cell),
         p('Shkruaj me shkronja të lexueshme; teksti merret siç është, prandaj një fjalë e palexueshme shënohet për kontroll.', cell)],
    ], [50 * mm, 123 * mm]))

    doc.build(F)
    print('shkruar:', path, os.path.getsize(path), 'bajt')


if __name__ == '__main__':
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out',
                       'BioBes_Udhezim_Doreshkrimi_A4.pdf')
    build(out)
