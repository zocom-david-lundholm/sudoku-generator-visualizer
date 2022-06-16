interface Cell{
  values: number[];
  column: number;
  row: number;
  box: number;
}
interface Deletion{
  cell: Cell;
  value: number;
}
interface Operation{
  column: number;
  row: number;
  previousValues: number[];
  newValue: number;
  illegalValues: number[];
  deletedPossibilities: Deletion[]
}

const GRID_WIDTH = 9;
const GRID_HEIGHT = 9;
const GRID_SIZE = GRID_WIDTH * GRID_HEIGHT;
const BOX_WIDTH = 3;
const BOX_HEIGHT = 3;
const BOX_COUNT = (GRID_WIDTH / BOX_WIDTH) * (GRID_HEIGHT / BOX_HEIGHT);
let TICK_SPEED = 50;
let RUNNING = false;


const generatePossibilities = (): Cell[] => {
  const grid: Cell[] = [];
  const possibilities = [...Array(GRID_WIDTH).keys()].map(i=>i+1)

  for(let column = 0; column < GRID_WIDTH; column++){
    for(let row = 0; row < GRID_HEIGHT; row++){
      if(!grid.some(cell => cell.column == column && cell.row == row)) {
        grid.push({
          column,
          row,
          box: Math.floor(column/BOX_WIDTH) + Math.floor(row/BOX_HEIGHT) * BOX_HEIGHT,
          values: [...possibilities]
        })
      }
    }
  }
  return grid;
}

const performOperation = (grid: Cell[], operation: Operation) => {
  const cellIndex = grid.findIndex(cell => cell.column == operation.column && cell.row == operation.row)
  const cell = grid[cellIndex]

  if(!cell){
    throw new Error(`Cannot find cell with column ${operation.column} and row ${operation.row}`)
  }
  cell.values = [operation.newValue]
  const row = grid.filter((c, index) => c.row == cell.row && index !== cellIndex)
  const column = grid.filter((c, index) => c.column == cell.column && index !== cellIndex)
  const box = grid.filter((c, index) => c.box == cell.box && index !== cellIndex)

  const cells = [...row, ...column, ...box]
  cells.forEach(cell => {
    if(cell.values.includes(operation.newValue)){
      operation.deletedPossibilities.push({cell,value: operation.newValue})
      cell.values = cell.values.filter(val => val !== operation.newValue)
    }
  })
}

const undoOperation = (grid: Cell[], operation: Operation) => {
  const cellIndex = grid.findIndex(cell => cell.column == operation.column && cell.row == operation.row)
  const cell = grid[cellIndex]

  if(!cell){
    throw new Error(`Cannot find cell with column ${operation.column} and row ${operation.row}`)
  }
  cell.values = operation.previousValues
  const row = grid.filter((c, index) => c.row == cell.row && index !== cellIndex)
  const column = grid.filter((c, index) => c.column == cell.column && index !== cellIndex)
  const box = grid.filter((c, index) => c.box == cell.box && index !== cellIndex)

  const cells = [...row, ...column, ...box]
  operation.deletedPossibilities.forEach(deletion => {
    deletion.cell.values.push(deletion.value)
  })
}

const validate = (grid:Cell[]) => {
  return !grid.some(cell => cell.values.length === 0)
}

const sleep = (delay:number) => new Promise((resolve) => setTimeout(resolve,delay))

const generateSudokuGrid = async (grid: Cell[]) => {
  const clone = structuredClone(grid)
  const operations: Operation[] = []

  renderGrid(clone)

  for(let gridIndex = 0; gridIndex < GRID_SIZE; gridIndex++){
    const columnIndex = gridIndex % GRID_WIDTH;
    const rowIndex = Math.floor(gridIndex / GRID_HEIGHT)
    const cell = clone.find(cell => cell.column==columnIndex && cell.row == rowIndex)
    if(!cell){
      throw new Error(`Cannot find cell with column ${columnIndex} and row ${rowIndex}`)
    }

    let operation: Operation = {
      column: columnIndex,
      row: rowIndex,
      previousValues: [...cell.values],
      newValue: cell.values[Math.floor(Math.random()*cell.values.length)],
      illegalValues: [],
      deletedPossibilities: []
    }

    performOperation(clone, operation)
    renderOperation(clone, operation)
    operations.push(operation)
    await sleep(TICK_SPEED)


    let impossible = false
    while(!validate(clone) || impossible){
      impossible = false
      undoOperation(clone, operation)
      operation.illegalValues.push(operation.newValue)
      renderOperation(clone, operation)
      await sleep(TICK_SPEED)
      const legalValues = operation.previousValues.filter(value => !operation.illegalValues.includes(value))
      if(legalValues.length === 0){
        impossible = true
        gridIndex--;
        if(operations.length == 0){ throw new Error("Fatal: No operations")}
        unrenderIllegalNumbers()
        operations.pop()
        operation = operations[operations.length - 1]
        renderOperation(clone, operation)
        await sleep(TICK_SPEED)
      }else{
        operation.newValue = legalValues[Math.floor(Math.random()*legalValues.length)]
        performOperation(clone, operation)
        renderOperation(clone, operation)
        operations.push(operation)
        await sleep(TICK_SPEED)
      }
    }
  }
  return clone
}

const renderGrid = (grid: Cell[]) => {
  for(let cell of grid){
    const cellElement: HTMLElement|null = document.querySelector(`.row:nth-of-type(${cell.row+1}) .cell:nth-of-type(${cell.column+1})`)

    if(!cellElement){ throw new Error("Cell element not found")}
    cellElement.querySelectorAll(".num").forEach((element:any) => {
      if(!element.classList.contains("illegal")){
        element.innerText = ""
      }
    })
    for(let value of cell.values){
      const numberElement: HTMLElement|null = cellElement.querySelector(`.num:nth-of-type(${value})`)

      if(!numberElement){ throw new Error("Number element not found")}
      numberElement.innerText = ""+value
    }
  }
}


const renderOperation = (grid:Cell[], operation:Operation) => {
  renderGrid(grid)
  const cellElement: HTMLElement|null = document.querySelector(`.row:nth-of-type(${operation.row+1}) .cell:nth-of-type(${operation.column+1})`)
  if(!cellElement){ throw new Error("Cell element not found")}
  operation.illegalValues.forEach(value => {
    const numberElement: HTMLElement|null = cellElement.querySelector(`.num:nth-of-type(${value})`)
    if(!numberElement){ throw new Error("Number element not found")}
    numberElement.classList.add("illegal")
    numberElement.innerText = ""+value
  })
  document.querySelectorAll(".active").forEach(el => el.classList.remove("active"))
  cellElement.classList.add("active")
}
// const renderUndoOperation = (grid:Cell[], operation:Operation) => {
//   renderGrid(grid)
//   const cellElement: HTMLElement|null = document.querySelector(`.row:nth-of-type(${operation.row+1}) .cell:nth-of-type(${operation.column+1})`)
//   if(!cellElement){ throw new Error("Cell element not found")}
//   // cellElement.querySelectorAll(".num").forEach((element)=> element.innerText = "")
// }
const unrenderIllegalNumbers = () => {
  document.querySelectorAll(".active .illegal").forEach(el => el.classList.remove("illegal"))
}

const renderSudokuGrid = (grid:Cell[]) => {
  document.querySelectorAll(".active").forEach(el => el.classList.remove("active"))
  for(let cell of grid){
    const cellElement: HTMLElement|null = document.querySelector(`.row:nth-of-type(${cell.row+1}) .cell:nth-of-type(${cell.column+1})`)
    if(!cellElement){ throw new Error("Cell element not found")}
    cellElement.innerHTML = `<p class="number">${cell.values[0]}</p>`
  }
}
const createElements = () => {
  const container = document.querySelector(".container .grid") as HTMLElement
  container.innerHTML = ""
  for(let row = 0; row < GRID_HEIGHT; row++){
    const rowElement = document.createElement("div")
    rowElement.classList.add("row")
    for(let cell = 0; cell < GRID_WIDTH; cell++){
      const cellElement = document.createElement("div")
      cellElement.classList.add("cell")
      rowElement.append(cellElement)
      for(let num = 0; num < BOX_WIDTH*BOX_HEIGHT;num++){
        const numElement = document.createElement("div")
        numElement.classList.add("num")
        cellElement.append(numElement)
      }
    }
    container?.append(rowElement)
  }
}

const start = async () => {
  if(RUNNING){ return }
  RUNNING = true
  createElements()
  const possibilityGrid = generatePossibilities()
  const sudokuGrid = await generateSudokuGrid(possibilityGrid)
  renderSudokuGrid(sudokuGrid)
  RUNNING = false
}

(() => {
  document.querySelector("button")?.addEventListener("click", () => {
    start()
  })
  const input = document.querySelector("input")
  if(!input){ throw new Error("input element not found")}
  input.placeholder = "Delay: "+TICK_SPEED;
  input.addEventListener("input", (e:any) => {
    TICK_SPEED = e.target.value
    input.placeholder = "Delay: "+TICK_SPEED;
  })
})()