const mainTabName = 'template';

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Filter Festivals')
    .addItem('Run Custom Filter Tool', 'showSidebar')
    .addToUi();
}

function showSidebar() {
  var html = HtmlService.createHtmlOutputFromFile("index").setTitle('Filter Applyer');
  SpreadsheetApp.getUi().showSidebar(html);
}

function applyFilter(check_boxes_status, dateFilters) {
  const sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(mainTabName);
  const formula = generateFormula(check_boxes_status, dateFilters);
  const criteria = SpreadsheetApp.newFilterCriteria()
    .whenFormulaSatisfied(formula)
    .build();
  if (sheet.getFilter()) {
    sheet.getFilter().setColumnFilterCriteria(1, criteria);
  } else {
    const range = sheet.getDataRange();
    range.createFilter().setColumnFilterCriteria(1, criteria);
  }
}

function inRange(x, min, max) {
  return (x - min) * (x - max) <= 0;
}

function columnRangeDict(start, end) {
  const startInt = columnToInt(start);
  const endInt = columnToInt(end);
  const columnDict = {};
  for (let i = 0; i <= endInt - startInt; i++) {
    const firstLetter = String.fromCharCode(65 + ((startInt - 1 + i) % 26));
    const secondLetter =
      startInt - 1 + i < 26
        ? ''
        : String.fromCharCode(65 + Math.floor((startInt - 1 + i) / 26) - 1);
    columnDict[i + 1] = secondLetter + firstLetter;
  }
  return columnDict;
}

function columnToInt(column) {
  let num = 0;
  for (let char of column) {
    num =
      num * 26 + (char.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0) + 1);
  }
  return num;
}

function getMapping() {
  var headers = columnRangeDict('A', 'AZ');
  var l = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(mainTabName)
    .getRange('A1:1')
    .getValues()[0];
  var start = l.indexOf('SHOWCASE') + 1;
  var end = l.indexOf('IMPROV') + 1;
  return [headers[start], headers[end]];
}

function checkBoxesStatus(spreadsheet) {
  const genreValues = getDeveloperMetaData(spreadsheet).genreValues;
  // Logger.log(`checkBoxesStatus->\n\t values: ${genreValues}`)
  const dict = {};
  for (let i = 0; i < genreValues.length; i++) {
    dict[i + 1] = genreValues[i] === true;
  }
  return dict;
}

function modifyFiltersSheet(dateFilters) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const check_boxes_status = checkBoxesStatus(spreadsheet);
  Logger.log(`check_boxes_status: ${Object.values(check_boxes_status)}`);
  if (
    Object.keys(check_boxes_status).filter((key) => check_boxes_status[key])
      .length == 0
  ) {
    const filter = spreadsheet.getSheetByName(mainTabName).getFilter();
    if (filter) {
      filter.remove();
    }
  } else {
    applyFilter(check_boxes_status, dateFilters);
  }
}

function convertDate(dateString) {
  const originalDate = new Date(dateString);
  const formattedDate = `${
    originalDate.getMonth() + 1
  }/${originalDate.getDate()}/${originalDate.getFullYear()}`;
  return formattedDate;
}

function setDeveloperMetaData(spreadsheet, filterDict) {
  for (const metaData of spreadsheet.getDeveloperMetadata()) {
    metaData.remove();
  }
  const metadataString = JSON.stringify(filterDict);
  spreadsheet.addDeveloperMetadata('filterMetadata', metadataString);
}

function getDeveloperMetaData(spreadsheet) {
  const allMetaData = spreadsheet.getDeveloperMetadata();
  const filterMetadata = JSON.parse(allMetaData[0].getValue());
  return filterMetadata;
}

function setFilterValuesFunction(configuration) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const fromDate =
    configuration.fromDate != null ||
    configuration.fromDate != 'Invalid Date'
      ? convertDate(configuration.fromDate)
      : null;
  const toDate =
    configuration.toDate != null || configuration.toDate != 'Invalid Date'
      ? convertDate(configuration.toDate)
      : null;
  const dateFilters = {
    from_date: fromDate,
    to_date: toDate,
  };
  const devMetaData = {
    genreValues: configuration.generes.map((i) => i.isChecked),
    from_date: fromDate,
    to_date: toDate,
  };
  // Logger.log(`devMetaData: ${Object.values(devMetaData)}`)
  setDeveloperMetaData(spreadsheet, devMetaData);
  modifyFiltersSheet(dateFilters);
  return 0;
}

/*
=AND(
  OR(AA2=TRUE),
  OR(
    AND(NOT(ISBLANK(AT2)), AT2>DATEVALUE("${from_date}"),AU2<DATEVALUE("${to_date}"),NOT(ISBLANK(AU2)), NOT(AU2<AT2)),
    AND(NOT(ISBLANK(AT2)), AT2>DATEVALUE("${from_date}"),AT2<DATEVALUE("${to_date}"),ISBLANK(AU2), NOT(AU2<AT2)),
    AND(NOT(ISBLANK(AT2)), NOT(ISBLANK(AU2)), NOT(AU2<AT2), AT2>DATEVALUE("${from_date}"), AT2<DATEVALUE("${to_date}"), AU2>DATEVALUE("${to_date}")),
    AND(NOT(ISBLANK(AT2)), NOT(ISBLANK(AU2)), NOT(AU2<AT2), DATEVALUE("${to_date}")<AU2, DATEVALUE("${to_date}")>AT2)
  )
)
*/
function generateFormula(dict, dateFilters) {
  const columns = getSelectedColumns(dict);
  // Logger.log(`columns: ${Object.values(columns)}`)
  const columnLetters = getColumnLetters(columns).join(', ');
  // Logger.log(`columnLetters: ${Object.values(columnLetters)}`)
  const dateConditions = getDateConditions(
    dateFilters.from_date,
    dateFilters.to_date,
  );
  // Logger.log(`dateFilters.from_date: ${dateFilters.from_date}`)
  let generatedFormula = `=AND(OR(${columnLetters}=TRUE)${
    isValidDate(dateFilters.from_date) && isValidDate(dateFilters.to_date)
      ? String(', OR(' + dateConditions + ')')
      : ''
  })`;
  Logger.log(`generatedFormula: ${generatedFormula}`);
  return generatedFormula;
}

function getSelectedColumns(dict) {
  return Object.keys(dict).filter((key) => dict[key] === true);
}

function getColumnLetters(columns) {
  return columns.map((column) => getCorrespondingColumn(column));
}

function getDateConditions(fromDate, toDate) {
  const from_date = formatDate(fromDate);
  const to_date = formatDate(toDate);
  let dateConditionFormulas = `
    AND(NOT(ISBLANK(AT2)), ISBLANK(AU2), AT2 > DATEVALUE("${from_date}") , AT2 < DATEVALUE("${to_date}")),
    AND(NOT(ISBLANK(AT2)), AT2>DATEVALUE("${from_date}"), AU2<DATEVALUE("${to_date}"), NOT(ISBLANK(AU2)), NOT(AU2<AT2)),
    AND(NOT(ISBLANK(AT2)), AT2>DATEVALUE("${from_date}"), AT2<DATEVALUE("${to_date}"), ISBLANK(AU2), NOT(AU2<AT2)),
    AND(NOT(ISBLANK(AT2)), NOT(ISBLANK(AU2)), NOT(AU2<AT2), AT2>DATEVALUE("${from_date}"), AT2<DATEVALUE("${to_date}"), AU2>DATEVALUE("${to_date}")),
    AND(NOT(ISBLANK(AT2)), NOT(ISBLANK(AU2)), NOT(AU2<AT2), DATEVALUE("${to_date}")<AU2, DATEVALUE("${to_date}")>AT2)
  `;
  return dateConditionFormulas.trim();
}

function formatDate(date) {
  const formattedDate = new Date(date).toUTCString().slice(0,16);
  return formattedDate;
}

function isValidDate(date) {
  const isvalid = date != null && date !== '1/1/1970' && !isNaN(Date.parse(date)) && (new Date(Date.parse(date))>new Date(Date.parse("12/31/2021")));
  Logger.log(`isvalid:${isvalid}`)
  return isvalid;
}

function getCorrespondingColumn(input_column_number) {
  const mappings = getMapping();
  // Logger.log(`getCorrespondingColumn->\n\tmappings: ${mappings}`)
  const structure = columnRangeDict(mappings[0], mappings[1]);
  // Logger.log(`\tstructure: ${Object.values(structure)}`)
  const correspondingColumn = `${structure[input_column_number]}2`;
  // Logger.log(`\tcorrespondingColumn: ${correspondingColumn}`)
  return correspondingColumn;
}