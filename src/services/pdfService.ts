import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';


handlebars.registerHelper('inc', (value) => parseInt(value) + 1);
handlebars.registerHelper('formatDate', (datetime: string) => {
  const date = new Date(datetime);
  return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
});
handlebars.registerHelper('formatTime', (datetime: string) => {
  const date = new Date(datetime);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
});


handlebars.registerHelper('formatDuration', (duration: string) => 
  (duration ?? '').replace('PT', '').replace('H', 'h ').replace('M', 'm').trim()
);



handlebars.registerHelper('eq', (a, b) => a === b);
handlebars.registerHelper('getPassenger', (passengers: any[], index: number)=>{
  return passengers && passengers[index] ? passengers[index] : {};
});


export async function generateNewPdf(bookingData: any): Promise<Buffer> {
  // console.log("bookingData",bookingData);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Load and compile template
    const newTemplatePath = path.join(__dirname,"views",'pdf_template.hbs');
    const newTemplateContent = fs.readFileSync(newTemplatePath, 'utf8');
    const newTemplate = handlebars.compile(newTemplateContent);
    console.log("Using template:", newTemplatePath);
    console.log("Template content:", newTemplate); 

    let processedBookingData = {
        ...bookingData,
        passenger: (() => {
          if (!bookingData.passenger) return []; // Handle undefined/null case
          if (typeof bookingData.passenger === "string") {
            try {
              return JSON.parse(bookingData.passenger); // Convert string to array
            } catch (error) {
              console.error("Error parsing passenger data:", error);
              return []; // Return an empty array if parsing fails
            }
          }
          return Array.isArray(bookingData.passenger) ? bookingData.passenger : [bookingData.passenger];
        })(),
      };
      // console.log("processedBookingData",processedBookingData);

    const newHtml = newTemplate({
      ...processedBookingData,
      formatIsoDate: (isoDate: string) => 
        new Date(isoDate).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
    });

    console.log("Generated HTML:", newHtml);

    // Set HTML content with network idle check
    await page.setContent(newHtml, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Add PDF generation delay if needed
    // await page.waitForTimeout(1000);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generating PDF with proper settings
    const newPdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    }) as Buffer;

    // Validate PDF
    if (!newPdfBuffer || newPdfBuffer.length < 1024) {
      throw new Error('Generated PDF is empty or too small');
    }

    return newPdfBuffer;
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error('Failed to generate PDF');
  } finally {
    await browser.close();
  }
}