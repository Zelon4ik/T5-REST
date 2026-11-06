package models

import "time"

// Incident представляє сутність технічного інциденту в базі даних PostgreSQL.
type Incident struct {
	ID          uint      `gorm:"primaryKey" json:"id" example:"1"`
	Title       string    `gorm:"size:100;not null" json:"title" example:"Перегрів шлюзу Gateway-01"`
	Description string    `gorm:"type:text;not null" json:"description" example:"Температура ядра процесора досягла 85C"`
	Priority    string    `gorm:"size:20;not null" json:"priority" example:"critical"`
	Status      string    `gorm:"size:20;default:'open'" json:"status" example:"open"`
	UserID      uint      `gorm:"not null" json:"user_id" example:"1"`
	CreatedAt   time.Time `json:"created_at" example:"2026-09-08T14:10:25Z"`
}

// CreateIncidentDTO містить валідаційні теги для створення інциденту.
type CreateIncidentDTO struct {
	Title       string `json:"title" binding:"required,min=3,max=100" example:"Перегрів шлюзу Gateway-01"`
	Description string `json:"description" binding:"required" example:"Температура ядра процесора досягла 85C"`
	Priority    string `json:"priority" binding:"required,oneof=low medium high critical" example:"critical"`
}

// UpdateStatusDTO використовується для оновлення статусу виконання інциденту.
type UpdateStatusDTO struct {
	Status string `json:"status" binding:"required,oneof=open in_progress resolved closed" example:"in_progress"`
}
