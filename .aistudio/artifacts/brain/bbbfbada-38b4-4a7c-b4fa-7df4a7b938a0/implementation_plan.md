# Implementation Plan: Khatabook & Order Lifecycle Integration

This plan details the upgrade for **Mohanty Enterprises - B2B Trading Terminal** according to the client specification PDF (`mohanty_93d5a990.pdf`), incorporating the full order lifecycle, multi-item billing, GST/Non-GST toggle, digital thermal slip receipt view, Money Receipts with words conversion, Khatabook single-format party directory, and detailed party transaction statements with WhatsApp integration.

---

## 1. Architecture & Navigation Updates
- **Sidebar Navigation**:
  - Update navigation items: **Overview**, **Orders & Estimates**, **Invoices**, **Inventory**, and **Ledger / Khatabook**.
  - Clutter-free sidebar styling retained with active states and clean icons.
- **Top Header**:
  - Update breadcrumb states to reflect new views (`Orders & Estimates`, `Party Ledger & Khatabook`).
  - Single prominent action `+ New Order / Estimate` in the header.

---

## 2. Order Lifecycle & Multi-Item Estimate System (Page 1)
- **Data Models**:
  - Extend order structure to support multiple items per order (`OrderItem`: Category, Item Description, Quantity, Unit, Unit Price, Line Total).
  - Add `shipTo` (destination address / project site line 2).
  - Add order status pipeline: `Pending Verification` $\rightarrow$ `Confirmed` $\rightarrow$ `In Transit` $\rightarrow$ `Delivered` (with `Cancelled` / `Modify` options).
- **Multi-Stage Order Interface**:
  - **Stage 1 (Create Order)**:
    - Contractor/Party selection with auto-fill and "Ship To" 2nd line delivery site.
    - Multiple dynamic line item rows (adding items strictly from the verified Cement, TMT, Fertilizer, and Asbestos catalog).
    - Truck / Vehicle number input.
    - Real-time subtotal, GST toggle preview, and grand total.
  - **Stage 2 (Verify & Confirm via WhatsApp)**:
    - Formats order into structured text and triggers direct WhatsApp Web/app message with itemized summary.
    - Order status update: `Confirm Order`, `Modify Order`, `Cancel Order`.
  - **Stage 3 (Fulfillment & Invoicing)**:
    - Convert confirmed order to active delivery with generated Order ID.
    - One-click "Create Party Bill" button converting order into invoice with direct WhatsApp dispatch.

---

## 3. Invoices, GST Toggle, Digital Slip Receipt & Money Receipt (Page 2)
- **GST vs. Non-GST Toggle**:
  - Option on invoice modal to switch between **Tax Invoice (18% CGST/SGST + HSN)** and **Non-GST / Estimate Memo** (clean wholesale trade challan).
- **Digital Receipt Format (Compact Thermal Slip View)**:
  - Provide a dedicated toggle to view the invoice in the requested **compact 2-inch / 3-inch roll receipt format** (mimicking receipt printer layout on screen without requiring physical printing), complete with item columns, subtotal, and company header.
- **Direct WhatsApp Bill Button**:
  - Formatted WhatsApp message link including invoice number, customer name, line items, net total, and payment term.
- **Money Receipt Voucher Generator**:
  - "Receive Payment" modal generating official money receipt slip.
  - Fields: Party Name, Address, Received Amount, Auto-calculated **Amount in Words** (Indian numbering system: Lakhs, Crores, Thousands), Payment Mode (Cash / RTGS / NEFT / UPI / Cheque), For (Account of), and Balance Due.
  - Direct "Send Receipt to WhatsApp" in clean text format.

---

## 4. Khatabook Single-Format Ledger Directory (Page 3)
- **Single-Format Consolidated Party Table**:
  - High-density table replacing card-only view, matching the client's Khatabook reference:
    - `Company Name / Party`
    - `Total Due (₹)`
    - `Total Overdue (₹)`
    - `Last Payment Date`
    - `Average Collection (Days)`
    - `Oldest Due (Days)`
    - `Next Follow-up` with interactive date selection and note
    - `Promises to Pay / Remark`
    - `Actions`: Direct WhatsApp reminder icon, SMS copy icon, Receive Payment button, and Open Detailed Statement.
- **Data Export**:
  - Working **Download PDF** and **Download Excel / CSV** buttons for all party balances.

---

## 5. Detailed Khatabook Customer Statement (Page 4)
- **Party Statement View**:
  - Header with Contractor Name, Contact, GSTIN, and Date Range filter.
  - **Khatabook KPI Metric Strip**: `Opening Balance`, `Total Debit (-)`, `Total Credit (+)`, and `Net Balance (Dr / Cr)`.
  - **Statement Table with Specific Columns**:
    - `Date`
    - `Voucher Type` (Sales, Purchase / Pur, Payment, Discount)
    - `Particulars / Details`
    - `Quantity-wise traded column` (Item name, Bags/Tons/Pcs count)
    - `Debit (-)`
    - `Credit (+)`
    - `Running Balance` with Dr/Cr status
  - 1-click **Share Statement on WhatsApp** and print-friendly export.

---

## Verification & Deployment Plan
1. **Compilation & Type Checking**: Verify with `compile_applet` and `lint_applet` (`tsc --noEmit`).
2. **Workflow Validation**: Test multi-item order creation $\rightarrow$ WhatsApp verification $\rightarrow$ conversion to invoice $\rightarrow$ payment receipt generation $\rightarrow$ ledger and detailed statement updates.
3. **Vercel Compatibility**: Ensure build output stays fully production-ready for GitHub $\rightarrow$ Vercel deployment.
