function onEdit(e) {
  const sheet = e.range.getSheet();
  const sheetName = sheet.getName();
  const columnNumber = e.range.getColumn();
  const rowNumber = e.range.getRow();
  Logger.log(`Edited cells in sheet ${sheetName} column ${columnNumber} row ${rowNumber}`);
  if (sheetName === 'GenresFilter' && inRange(columnNumber, 1, 16) && rowNumber === 2) {
    const check_boxes_status = checkBoxesStatus();
    if (Object.keys(check_boxes_status).filter((key) => check_boxes_status[key]).length==0){
     SpreadsheetApp.getActiveSpreadsheet().getSheetByName('template').getFilter().remove()
    }
    else if (check_boxes_status) {
      applyFilter(check_boxes_status);
    }
  }
}
function applyFilter(check_boxes_status) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('template');
  if (sheet.getFilter()){
    sheet.getFilter().remove();
  }
  const range = sheet.getDataRange();
  const formula = generateFormula(check_boxes_status);
  range.createFilter().setColumnFilterCriteria(1, SpreadsheetApp.newFilterCriteria().whenFormulaSatisfied(formula).build());
}

function checkBoxesStatus() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('GenresFilter');
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
  const structure = {
    1: 'O',
    2: 'P',
    3: 'Q',
    4: 'R',
    5: 'S',
    6: 'T',
    7: 'U',
    8: 'V',
    9: 'W',
    10:'X',
    11:'Y',
    12:'Z',
    13:"AA",
    14:"AB",
    15:"AC"
  };
  return `${structure[input_column_number]}2`;
}

function generateFormula(dict) {
  const columns = Object.keys(dict).filter((key) => dict[key] === true);
  const columnLetters = columns.map((column) => getCorrespondingColumn(column));
  const formula = `=OR(${columnLetters.join(', ')}=TRUE)`;
  return formula;
}

function synchronizer_viewer() {
  const ui = SpreadsheetApp.getUi()
  var interface = HtmlService
    .createHtmlOutputFromFile('filtered_data_visualizer')
    .setWidth(1200)
    .setHeight(700);
  ui.showModelessDialog(interface,"Google Calendar Updater")
}

function generate_template(rowDict){
  return [
    rowDict['Company Name (festival name)'],
    rowDict['City']+", "+rowDict['Country'],
    new Date(rowDict['start date 2023']).toUTCString(),
    new Date(rowDict['end date 2023']).toUTCString(),
    rowDict['Festival Tags (fx)']+"\n"+rowDict['festival url']+ "\n" +rowDict['company email']+ "\n" +rowDict['Festival Notes']
  ]
}
