const filterTabName = 'GenresFilter';
const mainTabName = 'template';

function onEdit(e) {
  const sheet = e.range.getSheet();
  const sheetName = sheet.getName();
  const columnNumber = e.range.getColumn();
  const rowNumber = e.range.getRow();
  Logger.log(`Edited cells in sheet ${sheetName} column ${columnNumber} row ${rowNumber}`);
  if (sheetName === filterTabName && inRange(columnNumber, 1, 16) && rowNumber === 2) {
    const check_boxes_status = checkBoxesStatus();
    if (Object.keys(check_boxes_status).filter((key) => check_boxes_status[key]).length==0){
     SpreadsheetApp.getActiveSpreadsheet().getSheetByName(mainTabName).getFilter().remove()
    }
    else if (check_boxes_status) {
      applyFilter(check_boxes_status);
    }
  }
}

function applyFilter(check_boxes_status) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(mainTabName);
  if (sheet.getFilter()){
    sheet.getFilter().remove();
  }
  const range = sheet.getDataRange();
  const formula = generateFormula(check_boxes_status);
  range.createFilter().setColumnFilterCriteria(1, SpreadsheetApp.newFilterCriteria().whenFormulaSatisfied(formula).build());
}

function checkBoxesStatus() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(filterTabName);
  const values = sheet.getRange('A2:O2').getValues()[0];
  const dict = {};
  for (let i = 0; i < values.length; i++) {
    dict[i + 1] = values[i] === true;
  }
  return dict;
}

function inRange(x, min, max) {
  return ((x - min) * (x - max) <= 0);
}

function getCorrespondingColumn(input_column_number) {
  const mappings =getMapping()
  const structure = columnRangeDict(mappings[0],mappings[1]);
  return `${structure[input_column_number]}2`;
}

function generateFormula(dict) {
  const columns = Object.keys(dict).filter((key) => dict[key] === true);
  const columnLetters = columns.map((column) => getCorrespondingColumn(column));
  const formula = `=OR(${columnLetters.join(', ')}=TRUE)`;
  return formula;
}

function columnRangeDict(start,end) {  
  const startInt = columnToInt(start);
  const endInt = columnToInt(end);
  const columnDict = {};
  for (let i = 0; i <= endInt - startInt; i++) {
    const firstLetter = String.fromCharCode(65 + (startInt - 1 + i) % 26);
    const secondLetter = startInt - 1 + i < 26 ? "" : String.fromCharCode(65 + Math.floor((startInt - 1 + i) / 26) - 1);
    columnDict[i + 1] = secondLetter + firstLetter;
  }
  return columnDict;
}

function columnToInt(column) {
  let num = 0;
  for (let char of column) {
    num = num * 26 + (char.toUpperCase().charCodeAt(0) - "A".charCodeAt(0) + 1);
  }
  return num;
}

function getMapping() {
  var headers = columnRangeDict('A','AZ')
  var l = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('template').getRange('A1:1').getValues()[0]
  var start = l.indexOf('SHOWCASE')+1;
  var end = l.indexOf('IMPROV')+1;
  return [headers[start],headers[end]]
}