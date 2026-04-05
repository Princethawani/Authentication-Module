.PHONY: dev prod build seed logs down clean help

# ── Development ───────────────────────────────────────────────────────────────
dev:
	docker compose up --build

dev-bg:
	docker compose up --build -d

# ── Production ────────────────────────────────────────────────────────────────
prod:
	docker compose -f docker-compose.yml up --build -d

# ── Database ──────────────────────────────────────────────────────────────────
seed:
	npm run seed

# ── Utilities ─────────────────────────────────────────────────────────────────
logs:
	docker compose logs -f authserver

down:
	docker compose down

clean:
	docker compose down -v --remove-orphans
	rm -rf dist node_modules

# ── Help ──────────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "  AuthServer Commands"
	@echo "  ─────────────────────────────────────"
	@echo "  make dev       Start dev stack (hot reload)"
	@echo "  make dev-bg    Start dev stack in background"
	@echo "  make prod      Start production stack"
	@echo "  make seed      Seed database"
	@echo "  make logs      Tail app logs"
	@echo "  make down      Stop all containers"
	@echo "  make clean     Full teardown + remove volumes"
	@echo ""