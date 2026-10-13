function parsePuzzle(rows) {
  return rows.map((row) => [...row].map(Number))
}

export const sudokuPuzzles = {
  Easy: parsePuzzle([
    '530070000',
    '600195000',
    '098000060',
    '800060003',
    '400803001',
    '700020006',
    '060000280',
    '000419005',
    '000080079',
  ]),
  Medium: parsePuzzle([
    '000260701',
    '680070090',
    '190004500',
    '820100040',
    '004602900',
    '050003028',
    '009300074',
    '040050036',
    '703018000',
  ]),
  Hard: parsePuzzle([
    '100007090',
    '030020008',
    '009600500',
    '005300900',
    '010080002',
    '600004000',
    '300000010',
    '040000007',
    '007000300',
  ]),
}

export function cloneSudokuBoard(board) {
  return board.map((row) => [...row])
}