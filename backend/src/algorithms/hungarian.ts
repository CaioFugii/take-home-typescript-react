type SearchStep = {
  nextColumn: number
  priceDrop: number
}

// Atribui pedido a Entregador, dado a menor distancia.
export function hungarian(cost: number[][]): number[] {
  const size = cost.length
  const rowLabel = zeros(size + 1)
  const columnLabel = zeros(size + 1)
  const matchedRowByColumn = zeros(size + 1)
  const previousColumn = zeros(size + 1)

  for (let row = 1; row <= size; row += 1) {
    assignRow(cost, row, rowLabel, columnLabel, matchedRowByColumn, previousColumn)
  }

  return columnOfEachRow(matchedRowByColumn, size)
}

function assignRow(
  cost: number[][],
  row: number,
  rowLabel: number[],
  columnLabel: number[],
  matchedRowByColumn: number[],
  previousColumn: number[],
): void {
  const size = cost.length
  matchedRowByColumn[0] = row
  let column = 0
  const slack = infinities(size + 1)
  const visited = flags(size + 1)

  do {
    visited[column] = true
    const step = cheapestUnusedColumn(
      cost,
      column,
      slack,
      visited,
      previousColumn,
      rowLabel,
      columnLabel,
      matchedRowByColumn,
    )
    applyPriceDrop(step.priceDrop, visited, slack, rowLabel, columnLabel, matchedRowByColumn)
    column = step.nextColumn
  } while (valueAt(matchedRowByColumn, column) !== 0)

  commitPath(column, matchedRowByColumn, previousColumn)
}

function cheapestUnusedColumn(
  cost: number[][],
  column: number,
  slack: number[],
  visited: boolean[],
  previousColumn: number[],
  rowLabel: number[],
  columnLabel: number[],
  matchedRowByColumn: number[],
): SearchStep {
  const size = cost.length
  const row = valueAt(matchedRowByColumn, column)
  let priceDrop = Number.POSITIVE_INFINITY
  let nextColumn = 0

  for (let candidate = 1; candidate <= size; candidate += 1) {
    if (visited[candidate]) {
      continue
    }
    const reduced = cellCost(cost, row, candidate) - valueAt(rowLabel, row) - valueAt(columnLabel, candidate)
    if (reduced < valueAt(slack, candidate)) {
      slack[candidate] = reduced
      previousColumn[candidate] = column
    }
    if (valueAt(slack, candidate) < priceDrop) {
      priceDrop = valueAt(slack, candidate)
      nextColumn = candidate
    }
  }

  return { nextColumn, priceDrop }
}

function applyPriceDrop(
  priceDrop: number,
  visited: boolean[],
  slack: number[],
  rowLabel: number[],
  columnLabel: number[],
  matchedRowByColumn: number[],
): void {
  for (let column = 0; column < visited.length; column += 1) {
    if (visited[column]) {
      const row = valueAt(matchedRowByColumn, column)
      rowLabel[row] = valueAt(rowLabel, row) + priceDrop
      columnLabel[column] = valueAt(columnLabel, column) - priceDrop
      continue
    }
    slack[column] = valueAt(slack, column) - priceDrop
  }
}

function commitPath(column: number, matchedRowByColumn: number[], previousColumn: number[]): void {
  let current = column
  do {
    const prior = valueAt(previousColumn, current)
    matchedRowByColumn[current] = valueAt(matchedRowByColumn, prior)
    current = prior
  } while (current !== 0)
}

function columnOfEachRow(matchedRowByColumn: number[], size: number): number[] {
  const columnByRow = new Array<number>(size).fill(-1)
  for (let column = 1; column <= size; column += 1) {
    const row = valueAt(matchedRowByColumn, column)
    if (row !== 0) {
      columnByRow[row - 1] = column - 1
    }
  }
  return columnByRow
}

function cellCost(cost: number[][], row: number, column: number): number {
  return cost[row - 1]?.[column - 1] ?? 0
}

function zeros(length: number): number[] {
  return new Array<number>(length).fill(0)
}

function infinities(length: number): number[] {
  return new Array<number>(length).fill(Number.POSITIVE_INFINITY)
}

function flags(length: number): boolean[] {
  return new Array<boolean>(length).fill(false)
}

function valueAt(values: number[], index: number): number {
  return values[index] ?? 0
}
