from pathlib import Path
import re
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

base = Path(__file__).resolve().parent
doc = Document()
# Remove inherited decorative rules from the bundled default template.
for element in doc.styles.element.iter(qn('w:pBdr')):
    element.getparent().remove(element)
sec = doc.sections[0]
sec.page_width = Inches(8.5)
sec.page_height = Inches(11)
sec.top_margin = sec.bottom_margin = Inches(.75)
sec.left_margin = sec.right_margin = Inches(.8)
normal = doc.styles['Normal']
normal.font.name = 'Calibri'
normal.font.size = Pt(11)
normal.paragraph_format.space_after = Pt(7)
normal.paragraph_format.line_spacing = 1.08
for name, size in [('Title',25), ('Heading 1',17), ('Heading 2',12)]:
    s = doc.styles[name]
    s.font.name = 'Calibri'
    s.font.size = Pt(size)
    s.font.color.rgb = RGBColor(0,0,0)
    s.paragraph_format.keep_with_next = True
    s.paragraph_format.space_before = Pt(16 if name != 'Title' else 0)
    s.paragraph_format.space_after = Pt(8)
code_style = doc.styles.add_style('Comandos', 1)
code_style.font.name = 'Consolas'
code_style.font.size = Pt(8.5)
code_style.paragraph_format.space_after = Pt(1)
code_style.paragraph_format.line_spacing = 1
code_style.paragraph_format.keep_with_next = True
code_style.paragraph_format.left_indent = Inches(.12)
footer = sec.footer.paragraphs[0]
footer.alignment = WD_ALIGN_PARAGRAPH.RIGHT
r = footer.add_run('SmartBin | ')
r.font.size = Pt(9)
field = OxmlElement('w:fldSimple'); field.set(qn('w:instr'), 'PAGE')
footer._p.append(field)

def hyperlink(p, text):
    rid = p.part.relate_to(text, 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink', is_external=True)
    link = OxmlElement('w:hyperlink'); link.set(qn('r:id'), rid)
    run = OxmlElement('w:r'); props = OxmlElement('w:rPr')
    color = OxmlElement('w:color'); color.set(qn('w:val'), '185E50'); props.append(color)
    run.append(props); t = OxmlElement('w:t'); t.text = text; run.append(t)
    link.append(run); p._p.append(link)

def inline(p,text):
    for part in re.split(r'(https?://[^\s;]+)',text):
        if part.startswith(('http://','https://')): hyperlink(p,part)
        else: p.add_run(part)

lines = (base/'Manual_SmartBin.md').read_text(encoding='utf-8').splitlines()
i=0
while i < len(lines):
    line=lines[i]
    if not line.strip(): i+=1; continue
    if line.startswith('```'):
        i+=1; block=[]
        while i<len(lines) and not lines[i].startswith('```'):
            block.append(lines[i]); i+=1
        # Wrap long command lines visually without changing copyable text.
        for j,text in enumerate(block):
            p=doc.add_paragraph(style='Comandos'); p.add_run(text)
            p.paragraph_format.keep_with_next=(j != len(block)-1)
        doc.add_paragraph().paragraph_format.space_after=Pt(2)
    elif line.startswith('|'):
        rows=[]
        while i<len(lines) and lines[i].startswith('|'):
            cells=[v.strip() for v in lines[i].strip('|').split('|')]
            if not all(re.fullmatch(r'[-: ]+',v) for v in cells): rows.append(cells)
            i+=1
        i-=1
        table=doc.add_table(rows=0,cols=len(rows[0]))
        table.alignment=WD_TABLE_ALIGNMENT.CENTER
        table.autofit=False
        widths={2:[2.05,4.85],3:[1.7,2.65,2.55],4:[1.7,2.6,1.1,1.5],5:[1.2,2.45,.65,.65,1.95]}.get(len(rows[0]))
        for index,row in enumerate(rows):
            cells=table.add_row().cells
            for k,text in enumerate(row):
                if widths: cells[k].width=Inches(widths[k])
                cells[k].vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
                p=cells[k].paragraphs[0]; inline(p,text)
                if index==0: p.paragraph_format.keep_with_next=True
                p.paragraph_format.space_after=Pt(4); p.paragraph_format.space_before=Pt(4)
                for r in p.runs: r.font.size=Pt(9.5); r.bold=(index==0)
                tcpr=cells[k]._tc.get_or_add_tcPr()
                margin=OxmlElement('w:tcMar')
                for side in ['top','left','bottom','right']:
                    e=OxmlElement('w:'+side); e.set(qn('w:w'),'90'); e.set(qn('w:type'),'dxa'); margin.append(e)
                tcpr.append(margin)
                if index==0:
                    shade=OxmlElement('w:shd');shade.set(qn('w:fill'),'EDF3F0');tcpr.append(shade)
            trpr=table.rows[-1]._tr.get_or_add_trPr()
            dontsplit=OxmlElement('w:cantSplit');trpr.append(dontsplit)
            if index==0: trpr.append(OxmlElement('w:tblHeader'))
        doc.add_paragraph().paragraph_format.space_after=Pt(2)
    elif line.startswith('# '): doc.add_paragraph(line[2:],style='Title')
    elif line.startswith('## '): doc.add_paragraph(line[3:],style='Heading 1')
    elif line.startswith('### '): doc.add_paragraph(line[4:],style='Heading 2')
    else:
        match=re.match(r'^(\d+)\. (.*)',line)
        if match:
            p=doc.add_paragraph(style='Normal')
            p.paragraph_format.left_indent=Inches(.18)
            p.paragraph_format.first_line_indent=Inches(-.18)
        else: p=doc.add_paragraph()
        inline(p,line)
    i+=1

doc.core_properties.title='Manual de funcionamiento instalación y operación de SmartBin'
doc.core_properties.subject='Arquitectura, instalación en Windows y exposición con ESP32 y PCA9685'
doc.core_properties.author=''
doc.core_properties.keywords='SmartBin, AllpaVision, ESP32, PCA9685, MQTT, Flutter'
for element in doc.element.iter(qn('w:pBdr')):
    element.getparent().remove(element)
out=base/'Manual_SmartBin_Instalacion_y_Expo.docx'
doc.save(out)
print(out)
print('Paragraphs:',len(doc.paragraphs),'Tables:',len(doc.tables))
