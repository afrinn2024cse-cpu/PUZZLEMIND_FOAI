function black(clues = {}) {
  return { type: 'black', ...clues }
}

function white(id) {
  return { type: 'white', id }
}

export const kakuroPuzzles = {
  easy: {
    id: 'easy',
    name: 'Easy',
    grid: [
      [black(), black({ down: 3 }), black({ down: 4 })],
      [black({ across: 4 }), white('X1'), white('X2')],
      [black({ across: 3 }), white('X3'), white('X4')],
    ],
  },
  constraintHeavy: {
    id: 'constraintHeavy',
    name: 'Constraint-heavy',
    grid: [
      [black(), black({ down: 3 }), black({ down: 5 }), black({ down: 4 })],
      [black({ across: 6 }), white('X1'), white('X2'), white('X3')],
      [black({ across: 6 }), white('X4'), white('X5'), white('X6')],
    ],
  },
  unsatisfiable: {
    id: 'unsatisfiable',
    name: 'Unsatisfiable test',
    grid: [
      [black(), black({ down: 8 }), black({ down: 4 })],
      [black({ across: 4 }), white('X1'), white('X2')],
      [black({ across: 3 }), white('X3'), white('X4')],
    ],
  },
}

export function getKakuroPuzzleNames() {
  return Object.values(kakuroPuzzles).map(({ id, name }) => ({ id, name }))
}