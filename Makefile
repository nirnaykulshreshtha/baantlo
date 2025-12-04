.PHONY: help up down logs ps restart reup build clean shell backend-shell worker-logs beat-logs baantlo-logs db-logs redis-logs status

DEV_COMPOSE=docker compose -f docker-compose.dev.yml

# Core application services (restarted by default)
CORE_SERVICES=backend worker beat baantlo
# Infrastructure services
INFRA_SERVICES=db redis minio
# All available services
ALL_SERVICES=db redis minio backend worker beat baantlo pgadmin

# Default target
.DEFAULT_GOAL := help

##@ General

help: ## Display this help message
	@echo "🚀 Baant Lo Development Commands"
	@echo ""
	@echo "📋 Available Commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "📦 Available Services:"
	@echo "  Core services: $(CORE_SERVICES)"
	@echo "  Infrastructure: $(INFRA_SERVICES)"
	@echo "  All services:  $(ALL_SERVICES)"
	@echo ""
	@echo "💡 Examples:"
	@echo "  make up                                    # Start all services"
	@echo "  make reup                                  # Restart core services (skips dependencies)"
	@echo "  make reup SERVICES=backend,worker         # Restart specific services (skips dependencies)"
	@echo "  make reup SERVICES=backend WITH_DEPS=true # Restart with dependencies"
	@echo "  make restart SERVICES=backend             # Quick restart without rebuild"
	@echo "  make backend-logs                          # View logs for backend service"
	@echo "  make status                                # Show service status"

up: ## Start all services
	@echo "🚀 Starting all services..."
	$(DEV_COMPOSE) up -d --build
	@echo "✅ Services started! Use 'make status' to check status."

down: ## Stop all services and remove volumes
	@echo "🛑 Stopping all services and removing volumes..."
	$(DEV_COMPOSE) down -v
	@echo "✅ Services stopped and volumes removed."

ps: status ## Show status of all services
	@echo "📊 Service Status:"
	@$(DEV_COMPOSE) ps

status: ## Show status of all services (alias for ps)
	@$(DEV_COMPOSE) ps

##@ Logs

logs: ## Show logs for all services (follow mode)
	$(DEV_COMPOSE) logs -f

backend-logs: ## Show logs for backend service
	$(DEV_COMPOSE) logs -f backend

worker-logs: ## Show logs for worker service
	$(DEV_COMPOSE) logs -f worker

beat-logs: ## Show logs for beat service
	$(DEV_COMPOSE) logs -f beat

baantlo-logs: ## Show logs for baantlo (frontend) service
	$(DEV_COMPOSE) logs -f baantlo

db-logs: ## Show logs for database service
	$(DEV_COMPOSE) logs -f db

redis-logs: ## Show logs for redis service
	$(DEV_COMPOSE) logs -f redis

##@ Restart & Rebuild

restart: ## Quick restart services without rebuild
	@echo "⚡ Quick restarting services..."
	@if [ -z "$(SERVICES)" ]; then \
		echo "📦 Restarting core services: $(CORE_SERVICES)"; \
		$(DEV_COMPOSE) restart $(CORE_SERVICES); \
	else \
		echo "📦 Validating and restarting services: $(SERVICES)"; \
		for service in $$(echo $(SERVICES) | tr ',' ' '); do \
			if ! echo " $(ALL_SERVICES) " | grep -q " $$service "; then \
				echo "❌ Error: Invalid service '$$service'. Available: $(ALL_SERVICES)"; \
				exit 1; \
			fi; \
		done; \
		$(DEV_COMPOSE) restart $$(echo $(SERVICES) | tr ',' ' '); \
	fi
	@echo "✅ Services restarted!"

reup: ## Restart services with rebuild (core services by default, skips dependencies)
	@echo "🔄 Restarting services with rebuild..."
	@if [ -z "$(SERVICES)" ]; then \
		echo "📦 Restarting core services: $(CORE_SERVICES)"; \
		echo "🚫 Skipping dependencies (infrastructure services remain running)"; \
		$(DEV_COMPOSE) stop $(CORE_SERVICES); \
		$(DEV_COMPOSE) rm -f $(CORE_SERVICES); \
		$(DEV_COMPOSE) up -d --build --no-deps $(CORE_SERVICES); \
	else \
		echo "📦 Validating and restarting services: $(SERVICES)"; \
		for service in $$(echo $(SERVICES) | tr ',' ' '); do \
			if ! echo " $(ALL_SERVICES) " | grep -q " $$service "; then \
				echo "❌ Error: Invalid service '$$service'. Available: $(ALL_SERVICES)"; \
				exit 1; \
			fi; \
		done; \
		if [ "$(WITH_DEPS)" = "true" ]; then \
			echo "🔗 Including dependencies (WITH_DEPS=true)"; \
			$(DEV_COMPOSE) stop $$(echo $(SERVICES) | tr ',' ' '); \
			$(DEV_COMPOSE) rm -f $$(echo $(SERVICES) | tr ',' ' '); \
			$(DEV_COMPOSE) up -d --build $$(echo $(SERVICES) | tr ',' ' '); \
		else \
			echo "🚫 Skipping dependencies (infrastructure services remain running)"; \
			$(DEV_COMPOSE) stop $$(echo $(SERVICES) | tr ',' ' '); \
			$(DEV_COMPOSE) rm -f $$(echo $(SERVICES) | tr ',' ' '); \
			$(DEV_COMPOSE) up -d --build --no-deps $$(echo $(SERVICES) | tr ',' ' '); \
		fi; \
	fi
	@echo "✅ Services restarted successfully!"

build: ## Build all services without starting
	@echo "🔨 Building all services..."
	$(DEV_COMPOSE) build
	@echo "✅ Build complete!"

##@ Shell Access

shell: backend-shell ## Open shell in backend container (alias for backend-shell)
	@$(DEV_COMPOSE) exec backend bash || $(DEV_COMPOSE) exec backend sh

backend-shell: ## Open shell in backend container
	@echo "🐚 Opening shell in backend container..."
	@$(DEV_COMPOSE) exec backend bash || $(DEV_COMPOSE) exec backend sh

##@ Cleanup

clean: ## Remove stopped containers and unused images
	@echo "🧹 Cleaning up Docker resources..."
	$(DEV_COMPOSE) down --remove-orphans
	docker system prune -f
	@echo "✅ Cleanup complete!"

clean-all: ## Remove all containers, volumes, and images (WARNING: destructive)
	@echo "⚠️  WARNING: This will remove ALL containers, volumes, and images!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		$(DEV_COMPOSE) down -v --remove-orphans; \
		docker system prune -af --volumes; \
		echo "✅ All Docker resources removed!"; \
	else \
		echo "❌ Cleanup cancelled."; \
	fi
