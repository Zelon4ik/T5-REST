package main

import (
	"log"
	"net/http"
	"os"

	"github.com/Zelon4ik/T5-REST/config"
	_ "github.com/Zelon4ik/T5-REST/docs" // Ініціалізація згенерованої Swagger-документації
	"github.com/Zelon4ik/T5-REST/handlers"
	"github.com/Zelon4ik/T5-REST/middleware"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// @title Incident Tracker API
// @version 1.0
// @description RESTful вебсервіс обліку технічних інцидентів та аварій на базі Gin, GORM та PostgreSQL.
// @termsOfService http://swagger.io/terms/

// @contact.name Служба технічної підтримки
// @contact.email engineer@company.internal

// @license.name MIT
// @license.url https://opensource.org/licenses/MIT

// @host localhost:8080
// @BasePath /api/v1

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Введіть токен у форматі: Bearer <JWT_TOKEN>
func main() {
	// Ініціалізація пулу з'єднань із базою даних PostgreSQL та авто-міграція
	config.InitDB()

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "super-secret-incident-tracker-key-2026"
	}

	// Створення екземпляра Gin Engine з Middleware Logger та Recovery
	r := gin.Default()

	// Інтерактивна Swagger UI документація
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// Базовий ендпоінт перевірки працездатності (Health Check)
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "pong",
			"service": "Incident Tracker API v1.0",
			"status":  "healthy",
		})
	})

	// Група API v1
	v1 := r.Group("/api/v1")
	{
		// Публічні маршрути автентифікації
		authGroup := v1.Group("/auth")
		{
			authGroup.POST("/register", handlers.RegisterHandler)
			authGroup.POST("/login", handlers.LoginHandler)
		}

		// Публічний перегляд каталогу інцидентів
		v1.GET("/incidents", handlers.ListIncidentsHandler)

		// Захищені приватні маршрути (вимагають валідного Bearer JWT токена)
		protected := v1.Group("/")
		protected.Use(middleware.AuthMiddleware(jwtSecret))
		{
			protected.POST("/incidents", handlers.CreateIncidentHandler)
			protected.GET("/incidents/:id", handlers.GetIncidentHandler)
			protected.PATCH("/incidents/:id/status", handlers.UpdateStatusHandler)
			protected.DELETE("/incidents/:id", handlers.DeleteIncidentHandler)
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Println("[СЕРВЕР] Сервіс успішно запущено на http://localhost:" + port)
	log.Println("[СЕРВЕР] Swagger UI доступний за адресою: http://localhost:" + port + "/swagger/index.html")

	if err := r.Run(":" + port); err != nil {
		log.Fatalf("[СЕРВЕР] Помилка запуску HTTP-сервера: %v", err)
	}
}
