import { SaleRecord } from '../types';
import { formatINR } from './formatters';

/**
 * Renders the exact authentic thermal receipt slip onto an HTML5 Canvas at 2x high-DPI,
 * downloads it as a PNG image, and writes the image directly to the clipboard.
 */
export async function generateAndCopyReceiptImage(sale: SaleRecord): Promise<{
  success: boolean;
  copiedToClipboard: boolean;
  error?: string;
}> {
  try {
    const isGst = sale.isGst ?? true;
    const subtotal = sale.subtotal || sale.totalAmount;
    const gstRate = 0.18;
    const gstAmount = isGst ? Math.round(subtotal * gstRate) : 0;
    const grandTotal = isGst ? subtotal + gstAmount : subtotal;

    const lineItems = sale.items && sale.items.length > 0
      ? sale.items
      : [
          {
            id: 'item-1',
            category: sale.category,
            itemDescription: sale.itemDescription,
            quantity: sale.quantity,
            unit: sale.unit,
            unitPrice: sale.unitPrice,
            amount: subtotal,
          },
        ];

    // High DPI scaling factor
    const scale = 2;
    const width = 440;
    // Calculate required height dynamically based on items
    const headerHeight = 170;
    const metaHeight = 110;
    const itemHeight = lineItems.length * 40 + 35;
    const totalsHeight = isGst ? 140 : 100;
    const footerHeight = 90;
    const height = headerHeight + metaHeight + itemHeight + totalsHeight + footerHeight;

    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D canvas context');

    ctx.scale(scale, scale);

    // Background - crisp receipt thermal paper look
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Subtle receipt border
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    let y = 38;

    // Company Header
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 18px "Courier New", Courier, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MOHANTY ENTERPRISES', width / 2, y);

    y += 18;
    ctx.font = '11px "Courier New", Courier, monospace';
    ctx.fillStyle = '#475569';
    ctx.fillText('Plot 128, Industrial Estate, Rasulgarh', width / 2, y);

    y += 16;
    ctx.fillText('Bhubaneswar · Phone: +91 9861044211', width / 2, y);

    if (isGst) {
      y += 16;
      ctx.font = 'bold 11px "Courier New", Courier, monospace';
      ctx.fillStyle = '#1E293B';
      ctx.fillText('GSTIN: 21AAAFM9201E1Z8', width / 2, y);
    }

    y += 24;
    // Receipt Type Badge
    ctx.fillStyle = '#F1F5F9';
    ctx.fillRect(width / 2 - 110, y - 13, 220, 20);
    ctx.strokeStyle = '#94A3B8';
    ctx.strokeRect(width / 2 - 110, y - 13, 220, 20);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 11px "Courier New", Courier, monospace';
    ctx.fillText(isGst ? 'COMMERCIAL TAX INVOICE' : 'ESTIMATE / CASH MEMO', width / 2, y + 1);

    y += 22;
    // Dashed divider line
    const drawDashedLine = (currY: number) => {
      ctx.save();
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(24, currY);
      ctx.lineTo(width - 24, currY);
      ctx.stroke();
      ctx.restore();
    };

    drawDashedLine(y);
    y += 18;

    // Meta details (Left and Right aligned)
    ctx.textAlign = 'left';
    ctx.font = '11px "Courier New", Courier, monospace';
    ctx.fillStyle = '#334155';

    ctx.fillText(`Inv No:  ${sale.invoiceNo}`, 24, y);
    ctx.textAlign = 'right';
    ctx.fillText(`Date: ${sale.date}`, width - 24, y);

    y += 18;
    ctx.textAlign = 'left';
    ctx.fillText(`Party:   ${sale.customerName.slice(0, 22)}`, 24, y);
    if (sale.truckNumber) {
      ctx.textAlign = 'right';
      ctx.fillText(`Veh: ${sale.truckNumber}`, width - 24, y);
    }

    if (sale.shipToAddress) {
      y += 18;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#64748B';
      ctx.fillText(`Ship To: ${sale.shipToAddress.slice(0, 36)}`, 24, y);
    }

    y += 18;
    drawDashedLine(y);
    y += 18;

    // Items table header
    ctx.textAlign = 'left';
    ctx.font = 'bold 11px "Courier New", Courier, monospace';
    ctx.fillStyle = '#0F172A';
    ctx.fillText('ITEM & DESCRIPTION', 24, y);
    ctx.textAlign = 'right';
    ctx.fillText('QTY / RATE', width - 120, y);
    ctx.fillText('AMOUNT', width - 24, y);

    y += 16;
    drawDashedLine(y);
    y += 16;

    // Items rows
    lineItems.forEach((item) => {
      ctx.textAlign = 'left';
      ctx.font = 'bold 11px "Courier New", Courier, monospace';
      ctx.fillStyle = '#0F172A';
      ctx.fillText(item.itemDescription.slice(0, 30), 24, y);

      y += 15;
      ctx.font = '11px "Courier New", Courier, monospace';
      ctx.fillStyle = '#475569';
      ctx.fillText(`  ${item.quantity} ${item.unit} @ ₹${item.unitPrice}`, 24, y);

      ctx.textAlign = 'right';
      ctx.font = 'bold 11px "Courier New", Courier, monospace';
      ctx.fillStyle = '#0F172A';
      ctx.fillText(`₹${item.amount.toLocaleString('en-IN')}`, width - 24, y);

      y += 18;
    });

    drawDashedLine(y);
    y += 18;

    // Calculations
    ctx.textAlign = 'left';
    ctx.font = '11px "Courier New", Courier, monospace';
    ctx.fillStyle = '#475569';
    ctx.fillText('Subtotal:', 24, y);
    ctx.textAlign = 'right';
    ctx.fillText(`₹${subtotal.toLocaleString('en-IN')}`, width - 24, y);

    if (isGst) {
      y += 16;
      ctx.textAlign = 'left';
      ctx.fillText('CGST (9%):', 24, y);
      ctx.textAlign = 'right';
      ctx.fillText(`₹${Math.round(gstAmount / 2).toLocaleString('en-IN')}`, width - 24, y);

      y += 16;
      ctx.textAlign = 'left';
      ctx.fillText('SGST (9%):', 24, y);
      ctx.textAlign = 'right';
      ctx.fillText(`₹${Math.round(gstAmount / 2).toLocaleString('en-IN')}`, width - 24, y);
    }

    y += 12;
    drawDashedLine(y);
    y += 20;

    // Grand total
    ctx.textAlign = 'left';
    ctx.font = 'bold 14px "Courier New", Courier, monospace';
    ctx.fillStyle = '#0F172A';
    ctx.fillText('TOTAL AMOUNT:', 24, y);
    ctx.textAlign = 'right';
    ctx.font = 'bold 16px "Courier New", Courier, monospace';
    ctx.fillText(formatINR(grandTotal), width - 24, y);

    y += 16;
    ctx.textAlign = 'left';
    ctx.font = '11px "Courier New", Courier, monospace';
    ctx.fillStyle = '#475569';
    ctx.fillText(`Payment: ${sale.paymentStatus}`, 24, y);

    y += 20;
    drawDashedLine(y);
    y += 20;

    // Footer
    ctx.textAlign = 'center';
    ctx.font = 'bold 11px "Courier New", Courier, monospace';
    ctx.fillStyle = '#334155';
    ctx.fillText('Thank you for trading with us!', width / 2, y);

    y += 16;
    ctx.font = '10px "Courier New", Courier, monospace';
    ctx.fillStyle = '#64748B';
    ctx.fillText('Goods once sold will not be returned.', width / 2, y);

    y += 14;
    ctx.fillStyle = '#94A3B8';
    ctx.fillText('Mohanty Enterprises · B2B Trading Terminal', width / 2, y);

    // Convert to Blob
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png')
    );

    if (!blob) throw new Error('Canvas blob generation failed');

    // 1. Download file
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `Mohanty_Enterprises_${sale.invoiceNo.replace(/\//g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);

    // 2. Copy image directly to clipboard
    let copiedToClipboard = false;
    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob,
          }),
        ]);
        copiedToClipboard = true;
      } catch (clipboardErr) {
        console.warn('Clipboard writeImage not permitted or supported:', clipboardErr);
      }
    }

    return {
      success: true,
      copiedToClipboard,
    };
  } catch (err: any) {
    console.error('Error generating receipt image:', err);
    return {
      success: false,
      copiedToClipboard: false,
      error: err.message || 'Failed to generate image',
    };
  }
}
