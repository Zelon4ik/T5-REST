package models

import "time"

// User представляє модель облікового запису інженера у PostgreSQL.
type User struct {
	ID           uint       `gorm:"primaryKey" json:"id" example:"1"`
	Email        string     `gorm:"uniqueIndex;not null" json:"email" example:"engineer@company.internal"`
	PasswordHash string     `gorm:"not null" json:"-"` // Захист: хеш пароля ніколи не серіалізується в JSON
	CreatedAt    time.Time  `json:"created_at" example:"2026-09-08T14:10:00Z"`
	Incidents    []Incident `gorm:"foreignKey:UserID" json:"-"`
}

// RegisterDTO містить правила валідації для реєстрації нового інженера.
type RegisterDTO struct {
	Email    string `json:"email" binding:"required,email" example:"engineer@company.internal"`
	Password string `json:"password" binding:"required,min=6" example:"SuperSecretPassword123"`
}

// LoginDTO містить облікові дані для проходження автентифікації.
type LoginDTO struct {
	Email    string `json:"email" binding:"required,email" example:"engineer@company.internal"`
	Password string `json:"password" binding:"required" example:"SuperSecretPassword123"`
}

// AuthResponseDTO повертає згенерований JWT токен.
type AuthResponseDTO struct {
	Token string `json:"token" example:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`
}

// UserResponseDTO повертає публічну інформацію про створеного користувача.
type UserResponseDTO struct {
	ID        uint      `json:"id" example:"1"`
	Email     string    `json:"email" example:"engineer@company.internal"`
	CreatedAt time.Time `json:"created_at" example:"2026-09-08T14:10:00Z"`
}
