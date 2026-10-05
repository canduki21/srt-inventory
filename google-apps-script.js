// Paste this entire file into Google Apps Script (script.google.com)
// Then deploy as a Web App (see instructions below)

function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Inventory');
  const action = e.parameter.action;

  if (action === 'update') {
    const sku   = e.parameter.sku;
    const field = e.parameter.field;
    const value = parseInt(e.parameter.value, 10);

    const data     = sheet.getDataRange().getValues();
    const headers  = data[0];
    const skuCol   = headers.indexOf('SKU');
    const fieldCol = headers.indexOf(field);

    for (let i = 1; i < data.length; i++) {
      if (data[i][skuCol] === sku) {
        sheet.getRange(i + 1, fieldCol + 1).setValue(value);
        break;
      }
    }

    return output({ success: true });
  }

  // Default: return all records
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const records = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });

  return output({ records });
}

function output(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
