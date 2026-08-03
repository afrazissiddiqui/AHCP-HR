# IGP Bulk Upload CSV Format Guide

## Overview
This guide explains how to prepare a CSV file for bulk uploading IGP (Inward Gate Pass) records with both header information and multiple line items.

---

## CSV Structure

A bulk upload CSV has **two sections**:

### Section 1: HEADER INFORMATION (Optional)
The first data row contains metadata about the entire IGP record:
- **Type** - IGP type (e.g., "Purchase Order", "Stock Transfer")
- **Business Partner** - Vendor/supplier name
- **Department** - Receiving department
- **Vehicle No** - Vehicle number
- **Branch** - Branch location
- **From Unit** - Sending unit/warehouse
- **Driver Name** - Driver's full name
- **Driver CNIC** - Driver's CNIC number
- **Driver Phone** - Driver's contact number
- **Weight** - Total weight

**Note:** All header fields are optional. You can skip them if not needed.

---

### Section 2: LINE ITEMS (Required)
Starting from the second data row, each row represents one line item in the IGP:
- **Item Code** - Product/item identifier
- **Item Name** - Product description
- **Qty** - Quantity (numeric)
- **Category** - Item category (e.g., "Finished", "Spare", "Consumable")
- **Packing Condition** - How it's packed (e.g., "Loose", "Boxed", "Crated")
- **Product Quality** - Quality status (e.g., "Good", "Used", "Damaged")
- **UOM** - Unit of Measure (e.g., "EA", "KG", "Rolls")
- **Batch Number** - Batch/lot number (optional)
- **Remarks** - Any additional notes

---

## Example CSV

```csv
HEADER INFORMATION
Type,Business Partner,Department,Vehicle No,Branch,From Unit,Driver Name,Driver CNIC,Driver Phone,Weight
Purchase Order,Gourmet Foods (Vendor),Procurement,JW-2434,FSD,Manufacturing,Ahmed Khan,42101-1234567-8,03001234567,500 Kg

LINE ITEMS
Item Code,Item Name,Qty,Category,Packing Condition,Product Quality,UOM,Batch Number,Remarks
PM-0000026,"Used Wooden Pallet - 41"" X 41""",684,Finished,Loose,USED,Numbers,USED-PALLET-01,USED PALLETS
INV-0000451,Invoice Paper Roll,50,Consumable,Boxed,Good,Rolls,ROLL-2024-001,New stock arrival
```

---

## Important Notes

### Blank Rows
- Label rows like "HEADER INFORMATION" and "LINE ITEMS" are for clarity only
- The parser skips blank rows automatically
- You can use blank rows to organize your CSV visually

### Quoted Values
- Use double quotes around values that contain commas
- Example: `"Used Wooden Pallet - 41"" X 41"""` (note the escaped inner quotes as `""`)

### Header Field Aliases
These column names are recognized as alternatives:

| Field | Accepted Names |
|-------|-----------------|
| Item Code | `Item Code`, `Code`, `Item ID` |
| Item Name | `Item Name`, `Name`, `Description` |
| Qty | `Qty`, `Quantity` |
| Packing Condition | `Packing Condition`, `Packing`, `Pack` |
| Product Quality | `Product Quality`, `Quality` |
| UOM | `UOM`, `Unit`, `Unit of Measure` |
| Remarks | `Remarks`, `Comment`, `Comments` |

### Minimum Requirements
- **At least one line item row is required**
- Header fields can be completely skipped if not needed
- Item Code and Item Name are typically required for each line item

### Best Practices
1. **Keep it organized** - Use blank rows between sections
2. **Label sections** - Add "HEADER INFORMATION" and "LINE ITEMS" labels for clarity
3. **Use realistic data** - Test with a few rows first before bulk uploading hundreds
4. **Consistent formatting** - Use the same column order throughout
5. **No trailing columns** - Remove any empty columns at the end

---

## How to Use

1. **Download the sample** - Click "Sample" on the IGP Listing page
2. **Edit in Excel or Google Sheets** - Add your data following the format above
3. **Export as CSV** - Save as `.csv` format
4. **Upload** - Click "Upload CSV" on the IGP Listing page and select your file
5. **Review** - All fields will be auto-populated in the create form
6. **Submit** - Make any final adjustments and submit to create the IGP record

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No rows found" error | Ensure at least one line item row exists with data |
| Fields not auto-populating | Check column headers match exactly (case-insensitive) |
| Commas in item names cause issues | Wrap values in double quotes: `"Item, with comma"` |
| CNIC or Phone format errors | Paste values as text, not formatted numbers |

---

## Questions?
For more details on IGP forms and fields, contact your administrator.
