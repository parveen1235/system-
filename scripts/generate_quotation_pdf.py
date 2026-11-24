#!/usr/bin/env python3
"""
High-Precision Vector PDF Quotation Generator for uPVC & Aluminium CAD Studio.
Built with ReportLab. Outputs 100% genuine vector text, crystal-clear tables,
and crisp CAD elevation drawings.
All text is 100% professional English with standard currency notations (Rs.).
Matches the on-screen Quotation Table design, typography, layout, and colors.
"""

import sys
import os
import io
import re
import json
import base64
from PIL import Image as PILImage

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm, inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
    KeepTogether,
    HRFlowable,
)
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Register TrueType fonts if available
FONT_REGULAR = 'Helvetica'
FONT_BOLD = 'Helvetica-Bold'
FONT_ITALIC = 'Helvetica-Oblique'

try:
    lib_regular = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'
    lib_bold = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'
    lib_italic = '/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf'
    if os.path.exists(lib_regular) and os.path.exists(lib_bold):
        pdfmetrics.registerFont(TTFont('LiberationSans', lib_regular))
        pdfmetrics.registerFont(TTFont('LiberationSans-Bold', lib_bold))
        if os.path.exists(lib_italic):
            pdfmetrics.registerFont(TTFont('LiberationSans-Italic', lib_italic))
        FONT_REGULAR = 'LiberationSans'
        FONT_BOLD = 'LiberationSans-Bold'
        FONT_ITALIC = 'LiberationSans-Italic'
except Exception:
    pass


def clean_str(val) -> str:
    """
    Cleans strings for professional English PDF rendering:
    - Replaces Rupee symbol with 'Rs. '
    - Strips Devanagari Hindi characters so no unprintable boxes appear
    - Cleans up empty parentheses left behind like () or ( )
    """
    if val is None:
        return ''
    s = str(val)
    # Replace Rupee symbols with Rs.
    s = s.replace('\u20b9', 'Rs. ')
    s = s.replace('&#8377;', 'Rs. ')
    # Remove Devanagari Unicode range (\u0900-\u097F)
    s = re.sub(r'[\u0900-\u097F]+', '', s)
    # Clean empty parentheses like () or ( / )
    s = re.sub(r'\(\s*[/\-–]?\s*\)', '', s)
    s = re.sub(r'\s{2,}', ' ', s)
    return s.strip()


def format_currency(val) -> str:
    """Formats numeric or string price safely with 'Rs. ' prefix."""
    s = clean_str(val)
    if not s:
        return 'Rs. 0'
    if s.startswith('Rs.') or s.startswith('INR'):
        return s
    return f"Rs. {s}"


class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to dynamically compute and print 'Page X of Y' on every page."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont(FONT_REGULAR, 7)
        self.setFillColor(colors.HexColor('#64748b'))
        
        # Bottom rule
        self.setStrokeColor(colors.HexColor('#cbd5e1'))
        self.setLineWidth(0.5)
        self.line(10 * mm, 9 * mm, 200 * mm, 9 * mm)
        
        # Footer text - 100% clean English
        footer_text = "uPVC & Aluminium CAD Studio | Manufacturing & Commercial Quotation"
        self.drawString(10 * mm, 6 * mm, footer_text)
        
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(200 * mm, 6 * mm, page_str)
        self.restoreState()


def decode_base64_image(data_uri, max_width_pt=130, max_height_pt=65):
    """Safely decodes a base64 data URI and creates a ReportLab Image with preserved aspect ratio."""
    if not data_uri or not isinstance(data_uri, str):
        return None
    try:
        if ',' in data_uri:
            header, base64_str = data_uri.split(',', 1)
        else:
            base64_str = data_uri
        
        img_bytes = base64.b64decode(base64_str)
        pil_img = PILImage.open(io.BytesIO(img_bytes))
        orig_w, orig_h = pil_img.size
        
        if orig_w <= 0 or orig_h <= 0:
            return None
            
        ratio = min(max_width_pt / orig_w, max_height_pt / orig_h, 1.0)
        final_w = orig_w * ratio
        final_h = orig_h * ratio
        
        buf = io.BytesIO(img_bytes)
        return Image(buf, width=final_w, height=final_h)
    except Exception:
        return None


def generate_quotation_pdf(data: dict) -> bytes:
    """Compiles the quotation JSON into a high-precision vector PDF in 100% clean English matching on-screen design."""
    pdf_buffer = io.BytesIO()
    
    # A4: 210mm x 297mm. Left/right margin 10mm => exactly 190mm printable width
    doc = SimpleDocTemplate(
        pdf_buffer,
        pagesize=A4,
        leftMargin=10 * mm,
        rightMargin=10 * mm,
        topMargin=7 * mm,
        bottomMargin=12 * mm,
    )
    
    styles = getSampleStyleSheet()
    
    # Typography styles
    style_company_name = ParagraphStyle(
        'CompanyTitle',
        parent=styles['Normal'],
        fontName=FONT_BOLD,
        fontSize=13.5,
        leading=16.5,
        textColor=colors.HexColor('#0f172a'),
    )
    style_company_tag = ParagraphStyle(
        'CompanyTag',
        parent=styles['Normal'],
        fontName=FONT_REGULAR,
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#475569'),
    )
    style_company_address = ParagraphStyle(
        'CompanyAddress',
        parent=styles['Normal'],
        fontName=FONT_REGULAR,
        fontSize=7,
        leading=9.5,
        textColor=colors.HexColor('#334155'),
    )
    style_company_contacts = ParagraphStyle(
        'CompanyContacts',
        parent=styles['Normal'],
        fontName=FONT_REGULAR,
        fontSize=7,
        leading=9.5,
        textColor=colors.HexColor('#1e293b'),
    )
    style_quote_box_title = ParagraphStyle(
        'QuoteBoxTitle',
        parent=styles['Normal'],
        fontName=FONT_BOLD,
        fontSize=7.5,
        leading=9.5,
        alignment=2,
        textColor=colors.HexColor('#1d4ed8'),
    )
    style_quote_box_ref = ParagraphStyle(
        'QuoteBoxRef',
        parent=styles['Normal'],
        fontName=FONT_BOLD,
        fontSize=10.5,
        leading=13,
        alignment=2,
        textColor=colors.HexColor('#0f172a'),
    )
    style_quote_box_sub = ParagraphStyle(
        'QuoteBoxSub',
        parent=styles['Normal'],
        fontName=FONT_REGULAR,
        fontSize=7,
        leading=9.5,
        alignment=2,
        textColor=colors.HexColor('#475569'),
    )

    # Client Box Styles
    style_client_head = ParagraphStyle(
        'ClientHead',
        parent=styles['Normal'],
        fontName=FONT_BOLD,
        fontSize=7,
        leading=9,
        textColor=colors.HexColor('#64748b'),
    )
    style_client_title = ParagraphStyle(
        'ClientTitle',
        parent=styles['Normal'],
        fontName=FONT_BOLD,
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#0f172a'),
    )
    style_client_detail = ParagraphStyle(
        'ClientDetail',
        parent=styles['Normal'],
        fontName=FONT_REGULAR,
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#334155'),
    )

    # Table Header & Cell Styles
    style_th = ParagraphStyle(
        'TableHead',
        parent=styles['Normal'],
        fontName=FONT_BOLD,
        fontSize=7,
        leading=8.5,
        alignment=1,
        textColor=colors.HexColor('#0f172a'),
    )
    style_th_blue = ParagraphStyle(
        'TableHeadBlue',
        parent=styles['Normal'],
        fontName=FONT_BOLD,
        fontSize=7,
        leading=8.5,
        alignment=1,
        textColor=colors.HexColor('#1e3a8a'),
    )
    style_td = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName=FONT_REGULAR,
        fontSize=7,
        leading=9,
        textColor=colors.HexColor('#0f172a'),
    )
    style_td_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName=FONT_BOLD,
        fontSize=7,
        leading=9,
        textColor=colors.HexColor('#0f172a'),
    )
    style_td_dim = ParagraphStyle(
        'TableCellDim',
        parent=styles['Normal'],
        fontName=FONT_REGULAR,
        fontSize=6.5,
        leading=8,
        textColor=colors.HexColor('#64748b'),
    )
    style_td_center = ParagraphStyle(
        'TableCellCenter',
        parent=styles['Normal'],
        fontName=FONT_BOLD,
        fontSize=7,
        leading=9,
        alignment=1,
        textColor=colors.HexColor('#0f172a'),
    )
    style_td_right = ParagraphStyle(
        'TableCellRight',
        parent=styles['Normal'],
        fontName=FONT_REGULAR,
        fontSize=7,
        leading=9,
        alignment=2,
        textColor=colors.HexColor('#0f172a'),
    )
    style_td_right_bold = ParagraphStyle(
        'TableCellRightBold',
        parent=styles['Normal'],
        fontName=FONT_BOLD,
        fontSize=7.5,
        leading=9.5,
        alignment=2,
        textColor=colors.HexColor('#0f172a'),
    )

    story = []

    # -------------------------------------------------------------
    # 1. HEADER SECTION (Logo + Company Profile + Quotation Box)
    # -------------------------------------------------------------
    company = data.get('company', {})
    client = data.get('client', {})
    
    comp_name = clean_str(company.get('companyName') or company.get('name') or 'REMIX uPVC WINDOWS & DOORS')
    tagline = clean_str(company.get('tagline') or 'Fabrication, Thermal & Acoustic Glazing Solutions')
    address = clean_str(company.get('address') or '')
    
    contact_parts = []
    if company.get('phone'):
        contact_parts.append(f"<b>Mob:</b> {clean_str(company.get('phone'))}")
    if company.get('phone2'):
        contact_parts.append(f"<b>Mob 2:</b> {clean_str(company.get('phone2'))}")
    if company.get('email'):
        contact_parts.append(f"<b>Email:</b> {clean_str(company.get('email'))}")
    if company.get('gstin'):
        contact_parts.append(f"<b>GSTIN:</b> {clean_str(company.get('gstin'))}")
    
    company_details_flowables = [
        Paragraph(f"<b>{comp_name}</b>", style_company_name),
    ]
    if tagline:
        company_details_flowables.append(Paragraph(tagline, style_company_tag))
    if address:
        company_details_flowables.append(Paragraph(f"<b>Address:</b> {address}", style_company_address))
    if contact_parts:
        company_details_flowables.append(Paragraph(" &nbsp;|&nbsp; ".join(contact_parts), style_company_contacts))
    
    # Right-side Quotation Reference Box (Styled Card matching web UI)
    ref_no = clean_str(client.get('refNo') or 'QT-2026-001')
    quote_date = clean_str(client.get('date') or '')
    valid_until = clean_str(client.get('validUntil') or '15 Days')
    
    quote_box_flowables = [
        Paragraph("DETAILED QUOTATION", style_quote_box_title),
        Paragraph(f"<b># {ref_no}</b>", style_quote_box_ref),
        Paragraph(f"<b>Date:</b> {quote_date}", style_quote_box_sub),
        Paragraph(f"<b>Validity:</b> {valid_until}", style_quote_box_sub),
    ]
    
    quote_box_card = Table([[quote_box_flowables]], colWidths=[52 * mm])
    quote_box_card.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))

    logo_img = decode_base64_image(company.get('logoUrl'), max_width_pt=85, max_height_pt=45)
    
    if logo_img:
        header_table = Table(
            [[logo_img, company_details_flowables, quote_box_card]],
            colWidths=[32 * mm, 104 * mm, 54 * mm]
        )
    else:
        header_table = Table(
            [[company_details_flowables, quote_box_card]],
            colWidths=[136 * mm, 54 * mm]
        )
        
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 1.5 * mm))
    story.append(HRFlowable(width="100%", thickness=0.8, color=colors.HexColor('#cbd5e1'), spaceBefore=0, spaceAfter=2))

    # -------------------------------------------------------------
    # 2. CLIENT / BILLING DETAILS & SITE ADDRESS CARDS (2 Columns)
    # -------------------------------------------------------------
    client_name = clean_str(client.get('name') or 'Valued Client')
    client_phone = clean_str(client.get('phone') or '')
    client_phone2 = clean_str(client.get('phone2') or '')
    client_email = clean_str(client.get('email') or '')
    site_address = clean_str(client.get('address') or '')
    
    client_card_content = [
        Paragraph("CLIENT / BILLING DETAILS:", style_client_head),
        Paragraph(f"<b>{client_name}</b>", style_client_title),
    ]
    c_contacts = []
    if client_phone:
        c_contacts.append(f"<b>Mob:</b> {client_phone}")
    if client_phone2:
        c_contacts.append(f"<b>Mob 2:</b> {client_phone2}")
    if client_email:
        c_contacts.append(f"<b>Email:</b> {client_email}")
    if c_contacts:
        client_card_content.append(Paragraph(" &nbsp;|&nbsp; ".join(c_contacts), style_client_detail))

    site_card_content = [
        Paragraph("SITE / INSTALLATION ADDRESS:", style_client_head),
        Paragraph(site_address if site_address else "Site address as per client layout & delivery specification", style_client_detail),
    ]

    client_billing_box = Table([[client_card_content]], colWidths=[93 * mm])
    client_billing_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))

    site_address_box = Table([[site_card_content]], colWidths=[93 * mm])
    site_address_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))

    client_row_table = Table(
        [[client_billing_box, site_address_box]],
        colWidths=[95 * mm, 95 * mm]
    )
    client_row_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(client_row_table)
    story.append(Spacer(1, 2 * mm))

    # -------------------------------------------------------------
    # 3. QUOTATION SCHEDULE TABLE (Exactly matching web UI columns)
    # Total Printable Width = 190 mm
    # 1. Sr.No. (8mm)
    # 2. Window / Door Design Drawing (CAD) (50mm)
    # 3. Qty (9mm)
    # 4. Drawing Name / Type (36mm)
    # 5. Glass Name / Spec (27mm)
    # 6. Area (Sq.Ft) (18mm)
    # 7. Rate (Rs./Sq.Ft) (18mm)
    # 8. Total Amount (Rs.) (24mm)
    # -------------------------------------------------------------
    base_w_sr = 8 * mm
    base_w_cad = 50 * mm
    base_w_qty = 9 * mm
    base_w_name = 36 * mm
    base_w_glass = 27 * mm
    base_w_area = 18 * mm
    base_w_rate = 18 * mm
    base_w_amt = 24 * mm
    
    table_col_widths = [
        base_w_sr,
        base_w_cad,
        base_w_qty,
        base_w_name,
        base_w_glass,
        base_w_area,
        base_w_rate,
        base_w_amt,
    ]

    header_row = [
        Paragraph("Sr.No.", style_th),
        Paragraph("Window / Door Design Drawing (CAD)", style_th),
        Paragraph("Qty", style_th),
        Paragraph("Drawing Name / Type", style_th),
        Paragraph("Glass Name / Spec", style_th),
        Paragraph("Area (Sq.Ft)", style_th_blue),
        Paragraph("Rate (Rs./Sq.Ft)", style_th_blue),
        Paragraph("Total Amount (Rs.)", style_th_blue),
    ]

    table_data = [header_row]

    # Data Rows (Support both 'rows' and 'items' schemas)
    raw_rows = data.get('rows') or data.get('items') or []
    rows_data = []
    for idx, r in enumerate(raw_rows):
        sr_no = str(r.get('srNo') or r.get('itemNo') or idx + 1)
        
        # CAD thumbnail
        drawing_img = decode_base64_image(
            r.get('drawingImageBase64') or r.get('elevationBase64'),
            max_width_pt=125,
            max_height_pt=62
        )
        dim_text = clean_str(r.get('dimensions') or r.get('size') or '')
        
        cad_cell = []
        if drawing_img:
            cad_cell.append(drawing_img)
        if dim_text:
            cad_cell.append(Paragraph(f"<b>Size:</b> {dim_text}", style_td_dim))
        if not cad_cell:
            cad_cell.append(Paragraph(f"<b>CAD Elevation</b><br/>{dim_text}", style_td_center))

        qty_val = str(r.get('qty', 1))
        drawing_name = clean_str(r.get('drawingName') or r.get('title') or 'uPVC Window / Door')
        glass_name = clean_str(r.get('glassName') or r.get('glass') or 'CLEAR 5MM Toughened' or '-')

        custom_vals = r.get('customValues', {})
        area_val = clean_str(custom_vals.get('area') or r.get('areaSqFt') or r.get('area') or '')
        rate_val = clean_str(custom_vals.get('rate') or r.get('rate') or '')
        amount_val = clean_str(custom_vals.get('amount') or r.get('amount') or '')

        if not area_val:
            area_val = '10.76'
        if not rate_val:
            rate_val = clean_str(data.get('summary', {}).get('rate') or data.get('totals', {}).get('rate', '570'))
        if not amount_val or amount_val == '-':
            try:
                computed = round(float(area_val) * float(rate_val.replace(',', '')) * int(qty_val))
                amount_val = f"{computed:,}"
            except Exception:
                amount_val = '-'

        row_cells = [
            Paragraph(sr_no, style_td_center),
            cad_cell,
            Paragraph(qty_val, style_td_center),
            Paragraph(f"<b>{drawing_name}</b>", style_td),
            Paragraph(glass_name, style_td),
            Paragraph(area_val, style_td_right),
            Paragraph(f"Rs. {rate_val}" if not rate_val.startswith('Rs.') else rate_val, style_td_right),
            Paragraph(f"Rs. {amount_val}" if not amount_val.startswith('Rs.') else amount_val, style_td_right_bold),
        ]
        table_data.append(row_cells)

    items_table = Table(
        table_data,
        colWidths=table_col_widths,
        repeatRows=1,
    )

    table_style = [
        ('BACKGROUND', (0, 0), (4, 0), colors.HexColor('#f1f5f9')),  # Standard columns light slate
        ('BACKGROUND', (5, 0), (7, 0), colors.HexColor('#e0e7ff')),  # Commercial columns light indigo/blue
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, 0), 3),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 3),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0, 1), (-1, -1), 2.5),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 2.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 2.5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 2.5),
    ]

    # Row striping
    for r_i in range(1, len(table_data)):
        if r_i % 2 == 0:
            table_style.append(('BACKGROUND', (0, r_i), (-1, r_i), colors.HexColor('#f8fafc')))

    items_table.setStyle(TableStyle(table_style))
    story.append(items_table)
    story.append(Spacer(1, 2.5 * mm))

    # -------------------------------------------------------------
    # 4. COMMERCIAL SUMMARY TABLE (Exact 4 Columns Matching Web UI)
    # Columns: ITEM DESCRIPTION (56mm) | Sq.Ft. (22mm) | Per Sq.Ft Amt (26mm) | PRICE (Rs.) (34mm)
    # Total = 138 mm
    # Beside it: Bank Details Card (50 mm) => Total = 188 mm
    # -------------------------------------------------------------
    summary = data.get('summary') or {}
    if not summary and data.get('totals'):
        t_obj = data.get('totals', {})
        summary = {
            'baseItemLabel': 'uPVC Windows & Doors',
            'totalArea': clean_str(t_obj.get('totalSqFt', '0')),
            'rate': clean_str(t_obj.get('rate', '')),
            'basePrice': clean_str(t_obj.get('subtotal', t_obj.get('grandTotal', '0'))),
            'totalAmount': clean_str(t_obj.get('grandTotal', t_obj.get('netAmount', '0'))),
            'charges': []
        }
        if t_obj.get('taxAmount') and str(t_obj.get('taxAmount')) != '0':
            summary['charges'].append({'label': 'GST / Tax', 'amount': clean_str(t_obj.get('taxAmount'))})
    
    base_item_lbl = clean_str(summary.get('baseItemLabel') or 'uPVC Windows & Doors')
    tot_area = clean_str(summary.get('totalArea', '0'))
    base_rate = clean_str(summary.get('rate', '570'))
    base_price = clean_str(summary.get('basePrice', '0'))

    # Header row of 4-column summary
    summary_rows = [
        [
            Paragraph("<b>ITEM DESCRIPTION</b>", style_th),
            Paragraph("<b>Sq.Ft.</b>", style_th),
            Paragraph("<b>Per Sq.Ft Amt</b>", style_th),
            Paragraph("<b>PRICE (Rs.)</b>", style_th),
        ],
        [
            Paragraph(f"<b>{base_item_lbl}</b>", style_td),
            Paragraph(tot_area, style_td_center),
            Paragraph(f"Rs. {base_rate}", style_td_center),
            Paragraph(f"<b>Rs. {base_price}</b>", style_td_right_bold),
        ],
    ]

    # Extra charges (e.g. CARTAGE / FREIGHT, INSTALLATION)
    for chg in summary.get('charges', []):
        lbl = clean_str(chg.get('label', 'Extra Charge'))
        amt = clean_str(chg.get('amount', '0'))
        if amt and amt != '0':
            summary_rows.append([
                Paragraph(f"<b>+ {lbl}</b>", style_td),
                Paragraph("-", style_td_center),
                Paragraph("-", style_td_center),
                Paragraph(f"Rs. {amt}", style_td_right),
            ])

    # TOTAL AMOUNT (Highlighted with Amber-50 #fef3c7 background and bold borders)
    tot_lbl = clean_str(summary.get('totalAmountLabel') or 'TOTAL AMOUNT')
    tot_amt = clean_str(summary.get('totalAmount', '0'))
    
    summary_rows.append([
        Paragraph(f"<b>{tot_lbl}</b>", style_td_bold),
        Paragraph("", style_td),
        Paragraph("", style_td),
        Paragraph(f"<b>Rs. {tot_amt}</b>", style_td_right_bold),
    ])
    total_row_index = len(summary_rows) - 1

    # Optional Advance Amount
    if summary.get('advanceAmount'):
        adv_lbl = clean_str(summary.get('advanceAmountLabel') or 'ADVANCE AMOUNT RECEIVED')
        adv_val = clean_str(summary.get('advanceAmount'))
        summary_rows.append([
            Paragraph(adv_lbl, style_td),
            Paragraph("", style_td),
            Paragraph("", style_td),
            Paragraph(f"Rs. {adv_val}", style_td_right),
        ])

    # Optional Balance Due
    if summary.get('balanceAmount'):
        bal_lbl = clean_str(summary.get('balanceLabel') or 'BALANCE DUE / NET PAYABLE')
        bal_val = clean_str(summary.get('balanceAmount'))
        summary_rows.append([
            Paragraph(f"<b>{bal_lbl}</b>", style_td_bold),
            Paragraph("", style_td),
            Paragraph("", style_td),
            Paragraph(f"<font color='#b91c1c'><b>Rs. {bal_val}</b></font>", style_td_right_bold),
        ])

    summary_table = Table(
        summary_rows,
        colWidths=[56 * mm, 22 * mm, 26 * mm, 34 * mm]
    )
    
    summary_style = [
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#94a3b8')),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f8fafc')),  # Header background
        ('BACKGROUND', (0, total_row_index), (-1, total_row_index), colors.HexColor('#fef3c7')),  # Total row amber highlight
        ('LINEBELOW', (0, total_row_index), (-1, total_row_index), 1.2, colors.HexColor('#0f172a')),
        ('LINEABOVE', (0, total_row_index), (-1, total_row_index), 1.2, colors.HexColor('#0f172a')),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]
    summary_table.setStyle(TableStyle(summary_style))

    # Bank Details Card (width 50 mm)
    bank = data.get('bank', {})
    bank_lines = [
        "<b>BANK DETAILS:</b>",
        f"<b>Bank:</b> {clean_str(bank.get('bankName', 'HDFC BANK LTD'))}",
        f"<b>A/C Name:</b> {clean_str(bank.get('accountName', comp_name))}",
        f"<b>A/C No:</b> {clean_str(bank.get('accountNo', '50200012345678'))}",
        f"<b>IFSC:</b> {clean_str(bank.get('ifsc', 'HDFC0000123'))}",
    ]
    if bank.get('branch'):
        bank_lines.append(f"<b>Branch:</b> {clean_str(bank.get('branch'))}")
    if bank.get('upiId'):
        bank_lines.append(f"<b>UPI:</b> {clean_str(bank.get('upiId'))}")

    bank_para = Paragraph("<br/>".join(bank_lines), style_client_detail)
    bank_box = Table([[bank_para]], colWidths=[49 * mm])
    bank_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))

    bottom_summary_row = Table(
        [[bank_box, summary_table]],
        colWidths=[51 * mm, 139 * mm]
    )
    bottom_summary_row.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))

    # -------------------------------------------------------------
    # 5. GUARANTEE TERMS, PAYMENT TERMS & SIGNATURES
    # -------------------------------------------------------------
    terms_list = data.get('terms', [
        "50% Advance along with confirmed Purchase Order / CAD drawing approval.",
        "40% against material readiness & dispatch at site prior to installation.",
        "10% upon complete installation and silicon perimeter handover.",
        "Quotation valid for 15 days from date of issuance.",
    ])
    if isinstance(terms_list, str):
        terms_list = [terms_list]

    guarantee_list = data.get('guaranteeTerms', [
        "10 Years Warranty on UPVC Profiles against warping, cracking & discoloration.",
        "1 Year Comprehensive Guarantee on all moving Hardware, Rollers, Hinges & Locks.",
    ])
    if isinstance(guarantee_list, str):
        guarantee_list = [guarantee_list]

    terms_formatted = ["<b>Payment Terms:</b>"]
    for i, t in enumerate(terms_list[:4]):
        clean_t = clean_str(t)
        if clean_t:
            terms_formatted.append(f"{i + 1}. {clean_t}")

    guarantee_formatted = ["<b>Warranty & Guarantee:</b>"]
    for g in guarantee_list[:2]:
        clean_g = clean_str(g)
        if clean_g:
            guarantee_formatted.append(f"✓ {clean_g}")

    combined_terms_para = Paragraph("<br/>".join(terms_formatted + [""] + guarantee_formatted), style_td_dim)

    sig_customer_para = Paragraph(
        "<br/><br/><hr color='#94a3b8' width='100%' size='0.5'/><b>Customer Acceptance & Signature</b><br/><font color='#64748b' size='6'>Accepted all drawings & terms</font>",
        style_td_center
    )
    sig_company_para = Paragraph(
        f"<br/><br/><hr color='#94a3b8' width='100%' size='0.5'/><b>For {comp_name}</b><br/><font color='#64748b' size='6'>Authorized Signatory & Stamp</font>",
        style_td_center
    )

    terms_sig_table = Table(
        [[combined_terms_para, sig_customer_para, sig_company_para]],
        colWidths=[100 * mm, 45 * mm, 45 * mm]
    )
    terms_sig_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
        ('LEFTPADDING', (0, 0), (-1, -1), 2),
        ('RIGHTPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
    ]))

    story.append(KeepTogether([
        bottom_summary_row,
        Spacer(1, 2 * mm),
        terms_sig_table,
    ]))

    # Build document using 2-pass NumberedCanvas for "Page X of Y"
    doc.build(story, canvasmaker=NumberedCanvas)
    return pdf_buffer.getvalue()


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] != '-':
        with open(sys.argv[1], 'r', encoding='utf-8') as f:
            payload = json.load(f)
    else:
        payload = json.loads(sys.stdin.read())

    pdf_bytes = generate_quotation_pdf(payload)

    if len(sys.argv) > 2:
        with open(sys.argv[2], 'wb') as f:
            f.write(pdf_bytes)
        print(f"Vector PDF generated successfully: {sys.argv[2]} ({len(pdf_bytes)} bytes)")
    else:
        sys.stdout.buffer.write(pdf_bytes)
