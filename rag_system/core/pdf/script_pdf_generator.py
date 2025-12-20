"""
Experience Script PDF Generator - Creates beautiful, cinematic PDFs.

This module transforms AIlessia's Experience Scripts into branded,
story-driven PDF documents that clients will treasure.
"""

from typing import Optional
from datetime import datetime
import structlog
from io import BytesIO

try:
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
    from reportlab.lib.colors import HexColor
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Image
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False

from core.ailessia.script_composer import ExperienceScript

logger = structlog.get_logger()


class ScriptPDFGenerator:
    """
    Generates beautiful, branded PDFs from Experience Scripts.
    
    These aren't just documents—they're keepsakes, works of art that
    capture the emotional journey AIlessia has designed.
    """
    
    # Brand colors (luxury palette)
    COLOR_PRIMARY = HexColor("#1a1a1a") if REPORTLAB_AVAILABLE else None  # Deep charcoal
    COLOR_ACCENT = HexColor("#c9a961") if REPORTLAB_AVAILABLE else None   # Luxury gold
    COLOR_TEXT = HexColor("#2c2c2c") if REPORTLAB_AVAILABLE else None     # Rich black
    COLOR_SUBTLE = HexColor("#8c8c8c") if REPORTLAB_AVAILABLE else None   # Elegant gray
    
    def __init__(self):
        """Initialize PDF generator."""
        if not REPORTLAB_AVAILABLE:
            logger.warning("ReportLab not available - PDF generation will be limited")
        
        self.styles = self._create_styles() if REPORTLAB_AVAILABLE else None
    
    def _create_styles(self) -> dict:
        """Create custom paragraph styles for luxury branding."""
        base_styles = getSampleStyleSheet()
        
        styles = {
            "Title": ParagraphStyle(
                "CustomTitle",
                parent=base_styles["Title"],
                fontSize=32,
                textColor=self.COLOR_PRIMARY,
                alignment=TA_CENTER,
                spaceAfter=30,
                fontName="Helvetica-Bold",
                leading=40
            ),
            "Subtitle": ParagraphStyle(
                "CustomSubtitle",
                parent=base_styles["Normal"],
                fontSize=16,
                textColor=self.COLOR_ACCENT,
                alignment=TA_CENTER,
                spaceAfter=20,
                fontName="Helvetica-Oblique",
                leading=22
            ),
            "Hook": ParagraphStyle(
                "CustomHook",
                parent=base_styles["Normal"],
                fontSize=14,
                textColor=self.COLOR_TEXT,
                alignment=TA_JUSTIFY,
                spaceAfter=20,
                fontName="Helvetica-Oblique",
                leading=20,
                firstLineIndent=0
            ),
            "Heading": ParagraphStyle(
                "CustomHeading",
                parent=base_styles["Heading1"],
                fontSize=20,
                textColor=self.COLOR_PRIMARY,
                spaceAfter=12,
                spaceBefore=20,
                fontName="Helvetica-Bold",
                leading=24
            ),
            "SubHeading": ParagraphStyle(
                "CustomSubHeading",
                parent=base_styles["Heading2"],
                fontSize=16,
                textColor=self.COLOR_ACCENT,
                spaceAfter=8,
                spaceBefore=15,
                fontName="Helvetica-Bold",
                leading=20
            ),
            "Body": ParagraphStyle(
                "CustomBody",
                parent=base_styles["Normal"],
                fontSize=11,
                textColor=self.COLOR_TEXT,
                alignment=TA_JUSTIFY,
                spaceAfter=12,
                fontName="Helvetica",
                leading=16
            ),
            "BodyItalic": ParagraphStyle(
                "CustomBodyItalic",
                parent=base_styles["Normal"],
                fontSize=11,
                textColor=self.COLOR_SUBTLE,
                alignment=TA_JUSTIFY,
                spaceAfter=10,
                fontName="Helvetica-Oblique",
                leading=16
            ),
            "Quote": ParagraphStyle(
                "CustomQuote",
                parent=base_styles["Normal"],
                fontSize=13,
                textColor=self.COLOR_ACCENT,
                alignment=TA_CENTER,
                spaceAfter=15,
                spaceBefore=15,
                fontName="Helvetica-Oblique",
                leading=18,
                leftIndent=40,
                rightIndent=40
            ),
            "Details": ParagraphStyle(
                "CustomDetails",
                parent=base_styles["Normal"],
                fontSize=10,
                textColor=self.COLOR_SUBTLE,
                alignment=TA_LEFT,
                spaceAfter=8,
                fontName="Helvetica",
                leading=14
            )
        }
        
        return styles
    
    async def generate_pdf(
        self,
        script: ExperienceScript,
        client_name: Optional[str] = None,
        output_path: Optional[str] = None
    ) -> BytesIO:
        """
        Generate PDF from Experience Script.
        
        Args:
            script: ExperienceScript to convert to PDF
            client_name: Optional client name for personalization
            output_path: Optional file path to save PDF
        
        Returns:
            BytesIO buffer containing PDF data
        """
        if not REPORTLAB_AVAILABLE:
            logger.error("ReportLab not available - cannot generate PDF")
            return self._generate_fallback_pdf(script, client_name)
        
        try:
            # Create PDF buffer
            buffer = BytesIO()
            
            # Create document
            doc = SimpleDocTemplate(
                buffer,
                pagesize=letter,
                rightMargin=72,
                leftMargin=72,
                topMargin=72,
                bottomMargin=72,
                title=script.title,
                author="AIlessia"
            )
            
            # Build content
            story = []
            
            # Cover page
            story.extend(self._build_cover_page(script, client_name))
            story.append(PageBreak())
            
            # Cinematic hook
            story.extend(self._build_hook_section(script))
            
            # Emotional arc
            story.extend(self._build_arc_section(script))
            
            # Signature experiences
            story.extend(self._build_experiences_section(script))
            story.append(PageBreak())
            
            # Sensory journey
            story.extend(self._build_sensory_section(script))
            
            # Personalized rituals
            if script.personalized_rituals:
                story.extend(self._build_rituals_section(script))
            
            # Transformation promise
            story.extend(self._build_transformation_section(script))
            story.append(PageBreak())
            
            # Journey details
            story.extend(self._build_details_section(script))
            
            # Closing
            story.extend(self._build_closing_section(script, client_name))
            
            # Build PDF
            doc.build(story)
            
            # Save to file if path provided
            if output_path:
                buffer.seek(0)
                with open(output_path, 'wb') as f:
                    f.write(buffer.read())
                buffer.seek(0)
            
            logger.info("PDF generated successfully",
                       script_title=script.title,
                       pages=len(story))
            
            buffer.seek(0)
            return buffer
            
        except Exception as e:
            logger.error("PDF generation failed", error=str(e), script_title=script.title)
            return self._generate_fallback_pdf(script, client_name)
    
    def _build_cover_page(self, script: ExperienceScript, client_name: Optional[str]) -> list:
        """Build cover page elements."""
        elements = []
        
        # Add spacer for vertical centering
        elements.append(Spacer(1, 2*inch))
        
        # Title
        elements.append(Paragraph(script.title, self.styles["Title"]))
        
        # Subtitle with destination
        if script.destination:
            elements.append(Paragraph(script.destination, self.styles["Subtitle"]))
        
        # Add more space
        elements.append(Spacer(1, 0.5*inch))
        
        # Client name if provided
        if client_name:
            elements.append(Paragraph(
                f"<i>Composed for {client_name}</i>",
                self.styles["BodyItalic"]
            ))
        
        # AIlessia signature
        elements.append(Spacer(1, 1*inch))
        elements.append(Paragraph(
            "<i>by AIlessia</i>",
            self.styles["Details"]
        ))
        
        # Date
        elements.append(Paragraph(
            datetime.now().strftime("%B %Y"),
            self.styles["Details"]
        ))
        
        return elements
    
    def _build_hook_section(self, script: ExperienceScript) -> list:
        """Build cinematic hook section."""
        elements = []
        
        elements.append(Spacer(1, 0.5*inch))
        elements.append(Paragraph(script.cinematic_hook, self.styles["Hook"]))
        elements.append(Spacer(1, 0.3*inch))
        
        return elements
    
    def _build_arc_section(self, script: ExperienceScript) -> list:
        """Build emotional arc section."""
        elements = []
        
        elements.append(Paragraph("Your Emotional Journey", self.styles["Heading"]))
        elements.append(Paragraph(
            f"<i>{script.emotional_arc}</i>",
            self.styles["Quote"]
        ))
        
        if script.story_theme:
            elements.append(Paragraph(
                f"Theme: {script.story_theme}",
                self.styles["BodyItalic"]
            ))
        
        elements.append(Spacer(1, 0.2*inch))
        
        return elements
    
    def _build_experiences_section(self, script: ExperienceScript) -> list:
        """Build signature experiences section."""
        elements = []
        
        elements.append(Paragraph("Your Signature Experiences", self.styles["Heading"]))
        elements.append(Spacer(1, 0.2*inch))
        
        for i, exp in enumerate(script.signature_experiences, 1):
            # Experience name
            exp_name = exp.get("name", f"Experience {i}")
            elements.append(Paragraph(
                f"{i}. {exp_name}",
                self.styles["SubHeading"]
            ))
            
            # Arc stage
            if "arc_stage" in exp:
                elements.append(Paragraph(
                    f"<i>{exp['arc_stage']}</i>",
                    self.styles["BodyItalic"]
                ))
            
            # Hook
            if "cinematic_hook" in exp:
                elements.append(Paragraph(
                    exp["cinematic_hook"],
                    self.styles["Body"]
                ))
            
            # Signature moment
            if "signature_moment" in exp:
                elements.append(Paragraph(
                    f"<b>The Moment:</b> {exp['signature_moment']}",
                    self.styles["Body"]
                ))
            
            elements.append(Spacer(1, 0.2*inch))
        
        return elements
    
    def _build_sensory_section(self, script: ExperienceScript) -> list:
        """Build sensory journey section."""
        elements = []
        
        if not script.sensory_journey:
            return elements
        
        elements.append(Paragraph("Your Sensory Journey", self.styles["Heading"]))
        elements.append(Paragraph(
            "Every sense will be awakened throughout this experience:",
            self.styles["Body"]
        ))
        elements.append(Spacer(1, 0.1*inch))
        
        sensory_labels = {
            "visual_arc": "Visual",
            "gustatory_arc": "Taste",
            "olfactory_arc": "Scent",
            "auditory_arc": "Sound",
            "tactile_arc": "Touch"
        }
        
        for key, label in sensory_labels.items():
            if key in script.sensory_journey and script.sensory_journey[key]:
                elements.append(Paragraph(
                    f"<b>{label}:</b> {' → '.join(script.sensory_journey[key][:3])}",
                    self.styles["Body"]
                ))
        
        elements.append(Spacer(1, 0.2*inch))
        
        return elements
    
    def _build_rituals_section(self, script: ExperienceScript) -> list:
        """Build personalized rituals section."""
        elements = []
        
        elements.append(Paragraph("Your Personal Rituals", self.styles["Heading"]))
        elements.append(Paragraph(
            "Unique touches designed just for you:",
            self.styles["Body"]
        ))
        elements.append(Spacer(1, 0.1*inch))
        
        for ritual in script.personalized_rituals:
            elements.append(Paragraph(
                f"• {ritual}",
                self.styles["Body"]
            ))
        
        elements.append(Spacer(1, 0.2*inch))
        
        return elements
    
    def _build_transformation_section(self, script: ExperienceScript) -> list:
        """Build transformation promise section."""
        elements = []
        
        elements.append(Paragraph("Your Transformation", self.styles["Heading"]))
        elements.append(Paragraph(
            script.transformational_promise,
            self.styles["Quote"]
        ))
        elements.append(Spacer(1, 0.2*inch))
        
        return elements
    
    def _build_details_section(self, script: ExperienceScript) -> list:
        """Build journey details section."""
        elements = []
        
        elements.append(Paragraph("Journey Details", self.styles["Heading"]))
        
        # Duration and investment
        details_data = [
            ["Duration:", f"{script.duration_days} days"],
            ["Investment:", f"€{script.total_investment:,.2f}"],
        ]
        
        if script.destination:
            details_data.insert(0, ["Destination:", script.destination])
        
        details_table = Table(details_data, colWidths=[2*inch, 4*inch])
        details_table.setStyle(TableStyle([
            ('FONT', (0, 0), (0, -1), 'Helvetica-Bold', 11),
            ('FONT', (1, 0), (1, -1), 'Helvetica', 11),
            ('TEXTCOLOR', (0, 0), (-1, -1), self.COLOR_TEXT),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        elements.append(details_table)
        elements.append(Spacer(1, 0.2*inch))
        
        # Included elements
        if script.included_elements:
            elements.append(Paragraph("Included:", self.styles["SubHeading"]))
            for element in script.included_elements[:8]:
                elements.append(Paragraph(
                    f"• {element}",
                    self.styles["Body"]
                ))
        
        elements.append(Spacer(1, 0.2*inch))
        
        return elements
    
    def _build_closing_section(self, script: ExperienceScript, client_name: Optional[str]) -> list:
        """Build closing section."""
        elements = []
        
        elements.append(Spacer(1, 0.5*inch))
        
        closing_message = "This is more than an itinerary—it's a story waiting to be lived."
        if client_name:
            closing_message = f"{client_name}, this is more than an itinerary—it's your story waiting to be lived."
        
        elements.append(Paragraph(
            closing_message,
            self.styles["Quote"]
        ))
        
        elements.append(Spacer(1, 0.3*inch))
        
        elements.append(Paragraph(
            "<i>With intuition and care,<br/>AIlessia</i>",
            self.styles["BodyItalic"]
        ))
        
        return elements
    
    def _generate_fallback_pdf(self, script: ExperienceScript, client_name: Optional[str]) -> BytesIO:
        """Generate simple text-based PDF fallback."""
        buffer = BytesIO()
        
        # Simple text content
        content = f"""
        {script.title}
        {'=' * len(script.title)}
        
        {script.cinematic_hook}
        
        Emotional Journey: {script.emotional_arc}
        Theme: {script.story_theme}
        
        SIGNATURE EXPERIENCES
        {'-' * 50}
        
        """
        
        for i, exp in enumerate(script.signature_experiences, 1):
            content += f"\n{i}. {exp.get('name', 'Experience')}\n"
            content += f"   {exp.get('cinematic_hook', '')}\n"
        
        content += f"\n\nDURATION: {script.duration_days} days"
        content += f"\nINVESTMENT: €{script.total_investment:,.2f}"
        content += f"\n\n{script.transformational_promise}"
        
        buffer.write(content.encode('utf-8'))
        buffer.seek(0)
        
        logger.warning("Generated fallback PDF (text only)")
        return buffer


# Global PDF generator instance
pdf_generator = ScriptPDFGenerator()

