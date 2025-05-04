function printGrid(grid) {
    for (const row of grid) {
      console.log(row.join(" "));
    }
  }
  
  function countNeighbors(grid, x, y) {
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [ 0, -1],          [ 0, 1],
      [ 1, -1], [ 1, 0], [ 1, 1]
    ];
    let count = 0;
  
    for (const [dx, dy] of directions) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < grid.length && ny >= 0 && ny < grid[0].length) {
        count += grid[nx][ny];
      }
    }
  
    return count;
  }
  
  function nextGeneration(grid) {
    const rows = grid.length;
    const cols = grid[0].length;
    const newGrid = Array.from({ length: rows }, () => Array(cols).fill(0));
  
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const neighbors = countNeighbors(grid, i, j);
        if (grid[i][j] === 1 && (neighbors === 2 || neighbors === 3)) {
          newGrid[i][j] = 1;
        } else if (grid[i][j] === 0 && neighbors === 3) {
          newGrid[i][j] = 1;
        }
      }
    }
  
    return newGrid;
  }
  
  // Initial 5x5 grid
  let grid = [
    [0, 1, 0, 0, 0],
    [0, 1, 0, 0, 0],
    [0, 1, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ];
  
  console.log("Initial:");
  printGrid(grid);
  grid = nextGeneration(grid);
  console.log("\nNext Gen:");
  printGrid(grid);
  