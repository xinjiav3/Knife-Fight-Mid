def print_grid(grid):
    for row in grid:
        print(" ".join(str(cell) for cell in row))

def count_neighbors(grid, x, y):
    directions = [(-1,-1), (-1,0), (-1,1), (0,-1), (0,1), (1,-1), (1,0), (1,1)]
    count = 0
    for dx, dy in directions:
        nx, ny = x + dx, y + dy
        if 0 <= nx < len(grid) and 0 <= ny < len(grid[0]):
            count += grid[nx][ny]
    return count

def next_generation(grid):
    new_grid = [[0]*len(row) for row in grid]
    for i in range(len(grid)):
        for j in range(len(grid[0])):
            neighbors = count_neighbors(grid, i, j)
            if grid[i][j] == 1 and neighbors in (2, 3):
                new_grid[i][j] = 1
            elif grid[i][j] == 0 and neighbors == 3:
                new_grid[i][j] = 1
    return new_grid

# Initial 5x5 grid
grid = [
    [0,1,0,0,0],
    [0,1,0,0,0],
    [0,1,0,0,0],
    [0,0,0,0,0],
    [0,0,0,0,0],
]

print("Initial:")
print_grid(grid)
grid = next_generation(grid)
print("\nNext Gen:")
print_grid(grid)
