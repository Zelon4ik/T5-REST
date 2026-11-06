package handlers

import (
	"errors"
	"net/http"

	"github.com/Zelon4ik/T5-REST/config"
	"github.com/Zelon4ik/T5-REST/models"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ListIncidentsHandler повертає список усіх зареєстрованих інцидентів.
// @Summary Отримати список усіх інцидентів
// @Description Повертає масив інцидентів із бази даних PostgreSQL (публічний доступ)
// @Tags Incidents
// @Produce json
// @Success 200 {array} models.Incident "Список інцидентів"
// @Failure 500 {object} map[string]string "Помилка сервера"
// @Router /incidents [get]
func ListIncidentsHandler(c *gin.Context) {
	var incidents []models.Incident
	if err := config.DB.Order("id desc").Find(&incidents).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Помилка отримання списку інцидентів"})
		return
	}

	c.JSON(http.StatusOK, incidents)
}

// CreateIncidentHandler створює новий інцидент, прив'язаний до поточного інженера.
// @Summary Створити новий інцидент
// @Description Створює запис про інцидент з обов'язковою прив'язкою до авторизованого користувача
// @Security BearerAuth
// @Tags Incidents
// @Accept json
// @Produce json
// @Param request body models.CreateIncidentDTO true "Дані для створення інциденту"
// @Success 201 {object} models.Incident "Інцидент успішно зареєстровано"
// @Failure 400 {object} map[string]string "Помилка валідації полів DTO"
// @Failure 401 {object} map[string]string "Неавторизований доступ"
// @Failure 500 {object} map[string]string "Внутрішня помилка сервера"
// @Router /incidents [post]
func CreateIncidentHandler(c *gin.Context) {
	var dto models.CreateIncidentDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Помилка валідації інциденту: " + err.Error()})
		return
	}

	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Ідентифікатор користувача відсутній у контексті"})
		return
	}
	userID := userIDVal.(uint)

	incident := models.Incident{
		Title:       dto.Title,
		Description: dto.Description,
		Priority:    dto.Priority,
		Status:      "open",
		UserID:      userID,
	}

	if err := config.DB.Create(&incident).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не вдалося зберегти інцидент у базі даних"})
		return
	}

	c.JSON(http.StatusCreated, incident)
}

// GetIncidentHandler повертає інцидент за його унікальним ідентифікатором.
// @Summary Отримати інцидент за ID
// @Description Шукає інцидент у PostgreSQL за значенням первинного ключа
// @Security BearerAuth
// @Tags Incidents
// @Produce json
// @Param id path int true "ID інциденту"
// @Success 200 {object} models.Incident "Знайдений інцидент"
// @Failure 401 {object} map[string]string "Неавторизований доступ"
// @Failure 404 {object} map[string]string "Інцидент не знайдено"
// @Failure 500 {object} map[string]string "Помилка сервера"
// @Router /incidents/{id} [get]
func GetIncidentHandler(c *gin.Context) {
	id := c.Param("id")
	var incident models.Incident

	if err := config.DB.First(&incident, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Інцидент з вказаним ID не знайдено"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Помилка пошуку інциденту"})
		return
	}

	c.JSON(http.StatusOK, incident)
}

// UpdateStatusHandler оновлює статус вирішення інциденту.
// @Summary Оновити статус інциденту
// @Description Змінює поточний статус інциденту (open, in_progress, resolved, closed)
// @Security BearerAuth
// @Tags Incidents
// @Accept json
// @Produce json
// @Param id path int true "ID інциденту"
// @Param request body models.UpdateStatusDTO true "Новий статус інциденту"
// @Success 200 {object} models.Incident "Оновлений інцидент"
// @Failure 400 {object} map[string]string "Невалідний статус"
// @Failure 401 {object} map[string]string "Неавторизований доступ"
// @Failure 404 {object} map[string]string "Інцидент не знайдено"
// @Failure 500 {object} map[string]string "Помилка оновлення"
// @Router /incidents/{id}/status [patch]
func UpdateStatusHandler(c *gin.Context) {
	id := c.Param("id")
	var incident models.Incident

	if err := config.DB.First(&incident, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Інцидент для оновлення не знайдено"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Помилка читання інциденту"})
		return
	}

	var dto models.UpdateStatusDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некоректний статус: " + err.Error()})
		return
	}

	incident.Status = dto.Status
	if err := config.DB.Save(&incident).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не вдалося зберегти новий статус"})
		return
	}

	c.JSON(http.StatusOK, incident)
}

// DeleteIncidentHandler видаляє інцидент за ID.
// @Summary Видалити інцидент за ID
// @Description Видаляє запис про інцидент з таблиці бази даних
// @Security BearerAuth
// @Tags Incidents
// @Produce json
// @Param id path int true "ID інциденту"
// @Success 204 "Інцидент успішно видалено (тіло відповіді порожнє)"
// @Failure 401 {object} map[string]string "Неавторизований доступ"
// @Failure 404 {object} map[string]string "Інцидент не знайдено"
// @Failure 500 {object} map[string]string "Помилка видалення"
// @Router /incidents/{id} [delete]
func DeleteIncidentHandler(c *gin.Context) {
	id := c.Param("id")
	var incident models.Incident

	if err := config.DB.First(&incident, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Інцидент для видалення не знайдено"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Помилка пошуку інциденту"})
		return
	}

	if err := config.DB.Delete(&incident).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не вдалося видалити інцидент"})
		return
	}

	c.Status(http.StatusNoContent)
}
