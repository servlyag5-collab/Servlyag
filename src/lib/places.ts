// Choices for the City and Village pickers on Offer a service and Edit listing.
// Merchants can still type a place that isn't listed, so these lists only need the common ones.
// To add a place, add its name below (any order; the picker sorts them).

// The six parishes of Antigua, plus Barbuda.
export const PARISHES = ['St. George', 'St. John', 'St. Mary', 'St. Paul', 'St. Peter', 'St. Philip', 'Barbuda'];

// Villages, towns and areas of Antigua and Barbuda.
export const VILLAGES = [
  'All Saints', 'Barnes Hill', 'Bendals', 'Bethesda', 'Bolands', 'Briggins', 'Buckleys', 'Carlisle',
  'Cassada Gardens', 'Cedar Grove', 'Cedar Valley', 'Christian Valley', 'Clare Hall', 'Cobbs Cross',
  'Codrington', 'Coolidge', 'Crosbies', 'Dickenson Bay', 'English Harbour', 'Falmouth', 'Fitches Creek',
  'Five Islands', 'Fort James', 'Freemans Village', 'Freetown', 'Gambles', 'Glanvilles', 'Golden Grove',
  "Gray's Farm", 'Green Bay', 'Hodges Bay', 'Jennings', 'John Hughes', 'Johnsons Point', 'Jolly Harbour',
  'Liberta', 'Marble Hill', 'McKinnons', 'New Winthorpes', 'Newfield', 'Old Road', 'Osbourn', 'Ottos',
  'Parham', 'Pares', 'Paynters', 'Piggotts', 'Potters', 'Redcliffe Quay', 'Runaway Bay', 'Sea View Farm',
  'Seatons', "St. John's", 'Swetes', 'Table Hill Gordon', 'Tomlinson', 'Urlings', 'Villa', 'Willikies', 'Yorks',
].sort((a, b) => a.localeCompare(b));
