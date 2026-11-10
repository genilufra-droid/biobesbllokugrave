"""Create image-only 2-page synthetic PDF for mock mapping tests, not real OCR."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
root=Path(__file__).resolve().parent.parent
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
images=[]
for side in ('PARA','PAS'):
    image=Image.new('RGB',(1240,1754),'#f0efeb');d=ImageDraw.Draw(image)
    large=ImageFont.truetype(font,40);regular=ImageFont.truetype(font,27)
    d.rectangle((55,55,1185,1695),outline='#555555',width=3)
    for pos,text in [((100,100),'BIOBES — FORMULAR SINTETIK / MOCK'),((100,185),f'Faqja {side}  |  Nr. 042'),((100,245),'Data: 6.11.26 (e paqarte)'),((100,330),'Keto te dhena jane te trilluara.')]: d.text(pos,text,font=regular,fill='#303030')
    d.text((100,430),'PESHIMI 4' if side=='PAS' else 'PESHIMI 1',font=large,fill='#303030')
    d.rectangle((100,520,1120,810),outline='#555555',width=2)
    for y in [590,660,730]:d.line((100,y,1120,y),fill='#777777',width=2)
    d.text((130,540),'Rreshti   |   Kg          |   Ambalazh  |  Shuma',font=regular,fill='#303030')
    if side=='PAS':d.text((130,750),'25           |   1.250,5    |       1         |  1.251,5',font=regular,fill='#303030')
    images.append(image.filter(ImageFilter.GaussianBlur(.35)))
images[0].save(root/'tests/fixtures/ocr_synthetic_scan.pdf',save_all=True,append_images=images[1:],resolution=150.0)
