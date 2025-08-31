class ShashkaGame {
	constructor() {
		this.board = []
		this.currentPlayer = 'white'
		this.selectedPiece = null
		this.possibleMoves = []
		this.gameHistory = []
		this.capturedPieces = { white: 0, black: 0 }
		this.mustCapture = false
		this.captureSequence = false
		this.init()
	}

	init() {
		this.createBoard()
		this.setupPieces()
		this.render()
		this.updateDisplay()
	}

	createBoard() {
		this.board = []
		for (let row = 0; row < 8; row++) {
			this.board[row] = []
			for (let col = 0; col < 8; col++) {
				this.board[row][col] = null
			}
		}
	}

	setupPieces() {
		// Qora shashkalar (yuqori 3 qator, faqat qora kataklar)
		for (let row = 0; row < 3; row++) {
			for (let col = 0; col < 8; col++) {
				if ((row + col) % 2 === 1) {
					this.board[row][col] = { color: 'black', dama: false }
				}
			}
		}

		// Oq shashkalar (pastki 3 qator, faqat qora kataklar)
		for (let row = 5; row < 8; row++) {
			for (let col = 0; col < 8; col++) {
				if ((row + col) % 2 === 1) {
					this.board[row][col] = { color: 'white', dama: false }
				}
			}
		}
	}

	render() {
		const boardElement = document.getElementById('board')
		boardElement.innerHTML = ''

		for (let row = 0; row < 8; row++) {
			for (let col = 0; col < 8; col++) {
				const cell = document.createElement('div')
				cell.className = `cell ${(row + col) % 2 === 0 ? 'light' : 'dark'}`
				cell.onclick = () => this.handleCellClick(row, col)

				if (
					this.selectedPiece &&
					this.selectedPiece.row === row &&
					this.selectedPiece.col === col
				) {
					cell.classList.add('selected')
				}

				const moveType = this.getMoveType(row, col)
				if (moveType === 'move') {
					cell.classList.add('possible-move')
				} else if (moveType === 'capture') {
					cell.classList.add('possible-capture')
				}

				const piece = this.board[row][col]
				if (piece) {
					const pieceElement = document.createElement('div')
					pieceElement.className = `piece ${piece.color}${
						piece.dama ? ' dama' : ''
					}`
					cell.appendChild(pieceElement)
				}

				boardElement.appendChild(cell)
			}
		}
	}

	getMoveType(row, col) {
		const move = this.possibleMoves.find(m => m.row === row && m.col === col)
		if (!move) return null
		return move.captures && move.captures.length > 0 ? 'capture' : 'move'
	}

	handleCellClick(row, col) {
		const piece = this.board[row][col]

		if (this.selectedPiece) {
			const move = this.possibleMoves.find(m => m.row === row && m.col === col)
			if (move) {
				this.makeMove(this.selectedPiece, move)
				return
			}
		}

		// Agar ketma-ket yutish rejimida bo'lsa, faqat o'sha toshni tanlash mumkin
		if (this.captureSequence && this.selectedPiece) {
			if (row !== this.selectedPiece.row || col !== this.selectedPiece.col) {
				return
			}
		}

		if (piece && piece.color === this.currentPlayer) {
			this.selectPiece(row, col)
		} else {
			this.deselectPiece()
		}
	}

	selectPiece(row, col) {
		this.selectedPiece = { row, col }
		this.possibleMoves = this.getPossibleMoves(row, col)
		this.render()
	}

	deselectPiece() {
		this.selectedPiece = null
		this.possibleMoves = []
		this.render()
	}

	getPossibleMoves(row, col) {
		const piece = this.board[row][col]
		if (!piece) return []

		// Avval yutish harakatlarini qidirish
		const captureMoves = this.getCaptureMoves(row, col)

		// Agar ketma-ket yutish rejimida bo'lsa yoki yutish majburiy bo'lsa
		if (this.captureSequence || this.mustCapture || captureMoves.length > 0) {
			return captureMoves
		}

		// Oddiy harakatlar
		return this.getRegularMoves(row, col)
	}

	getCaptureMoves(row, col, captured = []) {
		const piece = this.board[row][col]
		const moves = []
		const directions = piece.dama
			? [
					[-1, -1],
					[-1, 1],
					[1, -1],
					[1, 1],
			  ]
			: piece.color === 'white'
			? [
					[-1, -1],
					[-1, 1],
			  ]
			: [
					[1, -1],
					[1, 1],
			  ]

		// Har bir yo'nalish uchun yutish imkoniyatini tekshirish
		for (const [dRow, dCol] of directions) {
			const capturesInDirection = this.getCapturesInDirection(
				row,
				col,
				dRow,
				dCol,
				captured
			)

			for (const captureSequence of capturesInDirection) {
				const landRow = captureSequence.landRow
				const landCol = captureSequence.landCol
				const newCaptured = [...captured, ...captureSequence.captures]

				// Vaqtincha board o'zgartirib, qo'shimcha yutishni tekshirish
				const tempBoard = JSON.parse(JSON.stringify(this.board))
				for (const capture of newCaptured) {
					tempBoard[capture.row][capture.col] = null
				}
				tempBoard[landRow][landCol] = piece
				tempBoard[row][col] = null

				const originalBoard = this.board
				this.board = tempBoard

				// BARCHA yo'nalishlarda qo'shimcha yutish imkoniyatini tekshirish
				const additionalCaptures = this.getCaptureMoves(
					landRow,
					landCol,
					newCaptured
				)
				this.board = originalBoard

				if (additionalCaptures.length > 0) {
					// Qo'shimcha yutish mavjud
					moves.push(...additionalCaptures)
				} else {
					// Oxirgi yutish
					moves.push({
						row: landRow,
						col: landCol,
						captures: newCaptured,
					})
				}
			}
		}

		return moves
	}

	getCapturesInDirection(row, col, dRow, dCol, alreadyCaptured) {
		const piece = this.board[row][col]
		const captures = []

		if (piece.dama) {
			// Dama uchun - bir yo'nalishda ketma-ket yutish
			const capturedInDirection = []
			let foundCapture = false

			for (let step = 1; step < 8; step++) {
				const checkRow = row + dRow * step
				const checkCol = col + dCol * step

				if (!this.isValidPosition(checkRow, checkCol)) break

				const targetPiece = this.board[checkRow][checkCol]
				if (!targetPiece) {
					// Bo'sh joy - agar yutish bo'lgan bo'lsa, qo'nish mumkin
					if (foundCapture) {
						captures.push({
							landRow: checkRow,
							landCol: checkCol,
							captures: [...capturedInDirection],
						})
					}
					continue
				}

				if (targetPiece.color === piece.color) break

				// Raqib shashkasi
				if (
					!alreadyCaptured.some(c => c.row === checkRow && c.col === checkCol)
				) {
					capturedInDirection.push({ row: checkRow, col: checkCol })
					foundCapture = true
				} else {
					break
				}
			}
		} else {
			// Oddiy shashka uchun - faqat bitta yutish
			const enemyRow = row + dRow
			const enemyCol = col + dCol

			if (this.isValidPosition(enemyRow, enemyCol)) {
				const enemyPiece = this.board[enemyRow][enemyCol]
				if (
					enemyPiece &&
					enemyPiece.color !== piece.color &&
					!alreadyCaptured.some(c => c.row === enemyRow && c.col === enemyCol)
				) {
					const landRow = row + dRow * 2
					const landCol = col + dCol * 2

					if (
						this.isValidPosition(landRow, landCol) &&
						!this.board[landRow][landCol]
					) {
						captures.push({
							landRow: landRow,
							landCol: landCol,
							captures: [{ row: enemyRow, col: enemyCol }],
						})
					}
				}
			}
		}

		return captures
	}

	getRegularMoves(row, col) {
		const piece = this.board[row][col]
		const moves = []
		const directions = piece.dama
			? [
					[-1, -1],
					[-1, 1],
					[1, -1],
					[1, 1],
			  ]
			: piece.color === 'white'
			? [
					[-1, -1],
					[-1, 1],
			  ]
			: [
					[1, -1],
					[1, 1],
			  ]

		for (const [dRow, dCol] of directions) {
			if (piece.dama) {
				// Dama uchun - istalgan masofaga yurish
				for (let step = 1; step < 8; step++) {
					const newRow = row + dRow * step
					const newCol = col + dCol * step

					if (
						!this.isValidPosition(newRow, newCol) ||
						this.board[newRow][newCol]
					)
						break

					moves.push({ row: newRow, col: newCol, captures: [] })
				}
			} else {
				// Oddiy shashka uchun - faqat bir qadam
				const newRow = row + dRow
				const newCol = col + dCol

				if (
					this.isValidPosition(newRow, newCol) &&
					!this.board[newRow][newCol]
				) {
					moves.push({ row: newRow, col: newCol, captures: [] })
				}
			}
		}

		return moves
	}

	isValidPosition(row, col) {
		return row >= 0 && row < 8 && col >= 0 && col < 8
	}

	getAllCaptureMoves(playerColor) {
		const captureMoves = []
		for (let row = 0; row < 8; row++) {
			for (let col = 0; col < 8; col++) {
				const piece = this.board[row][col]
				if (piece && piece.color === playerColor) {
					const moves = this.getCaptureMoves(row, col)
					if (moves.length > 0) {
						captureMoves.push(
							...moves.map(move => ({ piece: { row, col }, move }))
						)
					}
				}
			}
		}
		return captureMoves
	}

	makeMove(from, to) {
		const piece = this.board[from.row][from.col]

		// Tarixni saqlash
		this.gameHistory.push({
			board: JSON.parse(JSON.stringify(this.board)),
			player: this.currentPlayer,
			captured: { ...this.capturedPieces },
			mustCapture: this.mustCapture,
			captureSequence: this.captureSequence,
		})

		// Shashkani ko'chirish
		this.board[to.row][to.col] = piece
		this.board[from.row][from.col] = null

		// Yutish (barcha ketma-ket yutilgan shashkalar)
		if (to.captures && to.captures.length > 0) {
			for (const capture of to.captures) {
				this.board[capture.row][capture.col] = null
				this.capturedPieces[piece.color === 'white' ? 'black' : 'white']++
			}

			// Ketma-ket yutish tugadi - xabar ko'rsatish
			const captureCount = to.captures.length
			if (captureCount > 1) {
				document.getElementById(
					'message'
				).textContent = `🔥 Ajoyib! ${captureCount} ta shashka ketma-ket yutildi!`
				document.getElementById('message').className = 'message capture-mode'
			} else {
				document.getElementById('message').textContent = '⚔️ Shashka yutildi!'
				document.getElementById('message').className = 'message capture-mode'
			}
		} else {
			// Oddiy yurish
			document.getElementById('message').textContent = ''
			document.getElementById('message').className = 'message'
		}

		// Dama qilish
		if (
			(piece.color === 'white' && to.row === 0) ||
			(piece.color === 'black' && to.row === 7)
		) {
			piece.dama = true
			document.getElementById('message').textContent += " 👑 Dama bo'ldi!"
			document.getElementById('message').className = 'message winner'
		}

		// Navbatni o'zgartirish
		this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white'
		this.mustCapture = false
		this.captureSequence = false
		this.deselectPiece()

		// Keyingi o'yinchi uchun majburiy yutishni tekshirish
		const nextPlayerCaptures = this.getAllCaptureMoves(this.currentPlayer)
		if (nextPlayerCaptures.length > 0) {
			this.mustCapture = true
		}

		this.updateDisplay()
		this.checkWinner()
	}

	updateDisplay() {
		document.getElementById('currentPlayer').textContent =
			this.currentPlayer === 'white' ? 'Oq' : 'Qora'

		const totalCaptured = this.capturedPieces.white + this.capturedPieces.black
		document.getElementById('captured').textContent = totalCaptured

		// Qolgan shashkalarni hisoblash
		let whiteCount = 0,
			blackCount = 0
		for (let row = 0; row < 8; row++) {
			for (let col = 0; col < 8; col++) {
				const piece = this.board[row][col]
				if (piece) {
					if (piece.color === 'white') whiteCount++
					else blackCount++
				}
			}
		}

		document.getElementById('whiteScore').textContent = whiteCount
		document.getElementById('blackScore').textContent = blackCount
	}

	checkWinner() {
		let whitePieces = 0,
			blackPieces = 0
		let whiteMoves = 0,
			blackMoves = 0

		for (let row = 0; row < 8; row++) {
			for (let col = 0; col < 8; col++) {
				const piece = this.board[row][col]
				if (piece) {
					if (piece.color === 'white') {
						whitePieces++
						const moves = this.getRegularMoves(row, col)
						const captures = this.getCaptureMoves(row, col)
						whiteMoves += moves.length + captures.length
					} else {
						blackPieces++
						const moves = this.getRegularMoves(row, col)
						const captures = this.getCaptureMoves(row, col)
						blackMoves += moves.length + captures.length
					}
				}
			}
		}

		const messageElement = document.getElementById('message')

		if (
			whitePieces === 0 ||
			(this.currentPlayer === 'white' && whiteMoves === 0)
		) {
			messageElement.textContent = "🎉 Qora g'olib bo'ldi!"
			messageElement.className = 'message winner'
		} else if (
			blackPieces === 0 ||
			(this.currentPlayer === 'black' && blackMoves === 0)
		) {
			messageElement.textContent = "🎉 Oq g'olib bo'ldi!"
			messageElement.className = 'message winner'
		} else if (!this.captureSequence) {
			messageElement.textContent = this.mustCapture ? 'Yutish majburiy!' : ''
			messageElement.className = this.mustCapture
				? 'message capture-mode'
				: 'message'
		}
	}

	reset() {
		this.currentPlayer = 'white'
		this.selectedPiece = null
		this.possibleMoves = []
		this.gameHistory = []
		this.capturedPieces = { white: 0, black: 0 }
		this.mustCapture = false
		this.captureSequence = false
		this.createBoard()
		this.setupPieces()
		this.render()
		this.updateDisplay()
		document.getElementById('message').textContent = ''
		document.getElementById('message').className = 'message'
	}

	undo() {
		if (this.gameHistory.length > 0) {
			const previousState = this.gameHistory.pop()
			this.board = previousState.board
			this.currentPlayer = previousState.player
			this.capturedPieces = previousState.captured
			this.mustCapture = previousState.mustCapture
			this.captureSequence = previousState.captureSequence
			this.deselectPiece()
			this.updateDisplay()
		}
	}
}

let game

function initGame() {
	game = new ShashkaGame()
}

function resetGame() {
	game.reset()
}

function undoMove() {
	game.undo()
}

/* ===== Modal funksiyalari ===== */
function openModal() {
	document.getElementById('rulesModal').style.display = 'flex'
}
function closeModal() {
	document.getElementById('rulesModal').style.display = 'none'
}

window.onload = initGame
