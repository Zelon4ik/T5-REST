package config

import (
	"fmt"
	"log"
	"os"

	"github.com/Zelon4ik/T5-REST/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// InitDB ініціалізує з'єднання з базою даних PostgreSQL та виконує авто-міграцію моделей.
func InitDB() *gorm.DB {
	host := os.Getenv("DB_HOST")
	if host == "" {
		host = "127.0.0.1"
	}
	port := os.Getenv("DB_PORT")
	if port == "" {
		port = "5432"
	}
	user := os.Getenv("DB_USER")
	if user == "" {
		user = "postgres"
	}
	password := os.Getenv("DB_PASSWORD")
	if password == "" {
		password = "postgres"
	}
	dbname := os.Getenv("DB_NAME")
	if dbname == "" {
		dbname = "incident_tracker"
	}

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Europe/Kyiv",
		host, user, password, dbname, port)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		log.Fatalf("[GORM] Помилка підключення до PostgreSQL: %v", err)
	}

	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatalf("[GORM] Помилка отримання екземпляра sql.DB: %v", err)
	}

	if err := sqlDB.Ping(); err != nil {
		log.Fatalf("[GORM] PostgreSQL не відповідає на ping: %v", err)
	}

	log.Printf("[GORM] Connected to PostgreSQL successfully (host=%s:%s, db=%s)", host, port, dbname)

	// Авто-міграція таблиць users та incidents
	if err := DB.AutoMigrate(&models.User{}, &models.Incident{}); err != nil {
		log.Fatalf("[GORM] Помилка авто-міграції схеми: %v", err)
	}

	log.Println("[GORM] Auto-migration completed: 'users', 'incidents' tables are up to date.")
	return DB
}
