package main
import "fmt"

func printGrid(grid [][]int) {
	for _, row := range grid {
		for _, cell := range row {
			fmt.Print(cell, " ")
		}
		fmt.Println()
	}
}

func countNeighbors(grid [][]int, x, y int) int {
	dirs := [8][2]int{{-1,-1},{-1,0},{-1,1},{0,-1},{0,1},{1,-1},{1,0},{1,1}}
	count := 0
	for _, d := range dirs {
		nx, ny := x+d[0], y+d[1]
		if nx >= 0 && nx < len(grid) && ny >= 0 && ny < len(grid[0]) {
			count += grid[nx][ny]
		}
	}
	return count
}

func nextGeneration(grid [][]int) [][]int {
	newGrid := make([][]int, len(grid))
	for i := range grid {
		newGrid[i] = make([]int, len(grid[i]))
		for j := range grid[i] {
			neighbors := countNeighbors(grid, i, j)
			if grid[i][j] == 1 && (neighbors == 2 || neighbors == 3) {
				newGrid[i][j] = 1
			} else if grid[i][j] == 0 && neighbors == 3 {
				newGrid[i][j] = 1
			}
		}
	}
	return newGrid
}

func main() {
	grid := [][]int{
		{0,1,0,0,0},
		{0,1,0,0,0},
		{0,1,0,0,0},
		{0,0,0,0,0},
		{0,0,0,0,0},
	}

	fmt.Println("Initial:")
	printGrid(grid)
	grid = nextGeneration(grid)
	fmt.Println("\nNext Gen:")
	printGrid(grid)
}
