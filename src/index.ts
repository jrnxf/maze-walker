// import './firebase'
import { COLORS, DIMENSIONS } from './constants';

const canvas: HTMLCanvasElement = document.getElementById(
  'canvas'
) as HTMLCanvasElement;
const ctx: CanvasRenderingContext2D = canvas.getContext(
  '2d'
) as CanvasRenderingContext2D;
canvas.height = DIMENSIONS.CANVAS;
canvas.width = DIMENSIONS.CANVAS;

let cellDimension: number;

let timeout: NodeJS.Timeout;

let maze: number[][];
let mazeSpeed: number; //ms

let startR: number; // starting row
let startC: number; // starting column

let solutionIsShown: boolean = false;
let mazeIsGenerated: boolean = false;

// Utility Functions
const color = (coords: number[], color: string): void => {
  ctx.fillStyle = color;
  const [x, y] = coords;
  /**
   * since HTML Canvas' coodinate system has (0,0) as upper left,
   * swapping x and y orients the board like we'd expect.
   */
  ctx.fillRect(
    y * cellDimension,
    x * cellDimension,
    cellDimension,
    cellDimension
  );
};

const generate = async () => {
  solutionIsShown = false;
  mazeIsGenerated = false;
  disableButtons(['#solve', '#download']);

  if (timeout) {
    clearTimeout(timeout);
  }
  cellDimension = DIMENSIONS.CANVAS / DIMENSIONS.ROWCOL;

  canvas.height = DIMENSIONS.CANVAS;
  canvas.width = DIMENSIONS.CANVAS;
  maze = await generateMaze(DIMENSIONS.ROWCOL, DIMENSIONS.ROWCOL);
  mazeIsGenerated = true;
  enableButtons(['#solve', '#download']);
};

const disableButtons = (ids: string[]) => {
  for (let id of ids) {
    let elem = document.querySelector(id);
    elem.setAttribute('disabled', 'true');
  }
};

const enableButtons = (ids: string[]) => {
  for (let id of ids) {
    let elem = document.querySelector(id);
    console.log('enable', elem);
    elem.removeAttribute('disabled');
  }
};

const generateMaze = async (width, height) => {
  // initialize maze with all walls
  const maze = [[]];
  for (let i = 0; i < width; i++) {
    maze[i] = [];
    for (let j = 0; j < height; j++) {
      maze[i][j] = 1;
      color([i, j], COLORS.WALL);
    }
  }
  // generate random starting row/col starting positions
  startR = 0;
  while (startR % 2 === 0) startR = Math.floor(Math.random() * height);

  startC = 0;
  while (startC % 2 === 0) startC = Math.floor(Math.random() * width);

  maze[startR][startC] = 0; // starting point

  await dfs(maze, startR, startC, width, height);

  return maze;
};

// HACK TODO look into Fisher-Yates Shuffle
const getRandomDirection = () => {
  let directions = [];
  for (let i = 0; i < 4; i++) {
    let nextDir = Math.floor(Math.random() * 4) + 1;
    while (directions.includes(nextDir)) {
      nextDir = Math.floor(Math.random() * 4) + 1;
    }
    directions.push(nextDir);
  }
  return directions;
};

const dfs = async (m, r, c, width, height) => {
  let directions = getRandomDirection();

  for (let i = 0; i < directions.length; i++) {
    switch (directions[i]) {
      case 1: // up
        if ((r - 2 > 0 && m[r - 2][c] === 1) || isStartingLocation(r - 2, c)) {
          await set(m, r - 1, c, 0, COLORS.PATH);
          await set(m, r - 2, c, 0, COLORS.PATH);
          await dfs(m, r - 2, c, width, height);
        }
        break;
      case 2: // right
        if (c + 1 === width - 1 && r === height - 2)
          await set(m, r, c + 1, 0, COLORS.PATH);
        else if (
          (c + 2 < width - 1 && m[r][c + 2] === 1) ||
          isStartingLocation(r, c + 2)
        ) {
          await set(m, r, c + 1, 0, COLORS.PATH);
          await set(m, r, c + 2, 0, COLORS.PATH);
          await dfs(m, r, c + 2, width, height);
        }
        break;
      case 3: // down
        if (
          (r + 2 < height - 1 && m[r + 2][c] === 1) ||
          isStartingLocation(r + 2, c)
        ) {
          await set(m, r + 1, c, 0, COLORS.PATH);
          await set(m, r + 2, c, 0, COLORS.PATH);
          await dfs(m, r + 2, c, width, height);
        }
        break;
      case 4: // left
        if (c - 1 === 0 && r === 1) await set(m, r, c - 1, 0, COLORS.PATH);
        else if (
          (c - 2 > 0 && m[r][c - 2] === 1) ||
          isStartingLocation(r, c - 2)
        ) {
          await set(m, r, c - 1, 0, COLORS.PATH);
          await set(m, r, c - 2, 0, COLORS.PATH);
          await dfs(m, r, c - 2, width, height);
        }
        break;
    }
  }
};

const isStartingLocation = (r, c) => {
  return r === startR && c === startC;
};

const set = (m, r, c, val, colorToSet) => {
  return new Promise(resolve => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      m[r][c] = val;
      color([r, c], colorToSet);
      resolve();
    }, mazeSpeed);
  });
};

const solve = (maze, r = 1, c = 0, history = []) => {
  maze[r][c] = 2; // 2 === visited cell
  color([r, c], COLORS.GOOD);

  timeout = setTimeout(() => {
    if (hasFinished(r, c)) return;
    else if (isPath(r, c + 1) && !!history.push([r, c]))
      return solve(maze, r, c + 1, history);
    else if (isPath(r + 1, c) && !!history.push([r, c]))
      return solve(maze, r + 1, c, history);
    else if (isPath(r, c - 1) && !!history.push([r, c]))
      return solve(maze, r, c - 1, history);
    else if (isPath(r - 1, c) && !!history.push([r, c]))
      return solve(maze, r - 1, c, history);
    else {
      maze[r][c] = 3; // 3 === bad cell
      color([r, c], COLORS.BAD);
      const [lastRow, col] = history.pop();
      solve(maze, lastRow, col, history);
    }
  }, mazeSpeed);

  function isPath(nextr, nextc) {
    return maze[nextr] && maze[nextr][nextc] === 0 ? true : false;
  }
  function hasFinished(r, c) {
    if (r === DIMENSIONS.ROWCOL - 2 && c === DIMENSIONS.ROWCOL - 1) {
      for (let i = 0; i < DIMENSIONS.ROWCOL; i++) {
        for (let j = 0; j < DIMENSIONS.ROWCOL; j++) {
          if (maze[i][j] === 3) {
            color([i, j], COLORS.PATH);
          }
        }
      }
      disableButtons(['#solve']);
      return true;
    } else return false;
  }
};

generate();
document.querySelector('#slow').checked = true;
document.querySelector('#solve').addEventListener('click', () => {
  if (!solutionIsShown && mazeIsGenerated) {
    solve(maze);
    solutionIsShown = true;
  }
});
document.querySelector('#generate').addEventListener('click', generate);
document.querySelector('#download').addEventListener('click', () => {
  const a = document.createElement('a');

  document.body.appendChild(a);
  a.href = canvas.toDataURL('image/png');
  a.download = 'maze.png';
  a.click();
  document.removeChild(a);
});

document.querySelectorAll('.animation-speed-option').forEach(elem => {
  if (elem.id === 'fast') {
    elem.checked = true;
    mazeSpeed = elem.value;
  }
  elem.addEventListener('click', () => {
    mazeSpeed = elem.value;
  });
});
