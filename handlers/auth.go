package handlers

import (
	"errors"
	"net/http"
	"os"

	"github.com/Zelon4ik/T5-REST/config"
	"github.com/Zelon4ik/T5-REST/models"
	"github.com/Zelon4ik/T5-REST/utils"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// RegisterHandler реєструє нового користувача з хешуванням пароля через bcrypt.
// @Summary Реєстрація нового інженера
// @Description Створює обліковий запис із захищеним гешуванням пароля (bcrypt)
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body models.RegisterDTO true "Дані реєстрації (email та password >= 6 символів)"
// @Success 201 {object} models.UserResponseDTO "Користувача успішно створено"
// @Failure 400 {object} map[string]string "Помилка валідації DTO"
// @Failure 409 {object} map[string]string "Користувач із таким email вже існує"
// @Failure 500 {object} map[string]string "Внутрішня помилка сервера"
// @Router /auth/register [post]
func RegisterHandler(c *gin.Context) {
	var dto models.RegisterDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некоректні вхідні дані: " + err.Error()})
		return
	}

	// Перевірка на існування користувача з таким email
	var existingUser models.User
	result := config.DB.Where("email = ?", dto.Email).First(&existingUser)
	if result.Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Користувач із таким email вже зареєстрований"})
		return
	} else if !errors.Is(result.Error, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Помилка бази даних під час перевірки email"})
		return
	}

	// Криптографічне гешування пароля через bcrypt
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(dto.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не вдалося згенерувати хеш пароля"})
		return
	}

	user := models.User{
		Email:        dto.Email,
		PasswordHash: string(hashedPassword),
	}

	if err := config.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Помилка збереження користувача в БД"})
		return
	}

	c.JSON(http.StatusCreated, models.UserResponseDTO{
		ID:        user.ID,
		Email:     user.Email,
		CreatedAt: user.CreatedAt,
	})
}

// LoginHandler перевіряє облікові дані та видає підписаний JWT токен.
// @Summary Вхід інженера та отримання JWT токена
// @Description Перевіряє пару email/пароль за допомогою bcrypt та генерує токен
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body models.LoginDTO true "Облікові дані"
// @Success 200 {object} models.AuthResponseDTO "Токен успішно згенеровано"
// @Failure 400 {object} map[string]string "Помилка валідації DTO"
// @Failure 401 {object} map[string]string "Невірний email або пароль"
// @Failure 500 {object} map[string]string "Внутрішня помилка сервера"
// @Router /auth/login [post]
func LoginHandler(c *gin.Context) {
	var dto models.LoginDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некоректні вхідні дані: " + err.Error()})
		return
	}

	var user models.User
	if err := config.DB.Where("email = ?", dto.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Невірний email або пароль"})
		return
	}

	// Перевірка відповідності введеного пароля збереженому хешу у постійному часі
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(dto.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Невірний email або пароль"})
		return
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "super-secret-incident-tracker-key-2026"
	}

	token, err := utils.GenerateToken(user.ID, user.Email, jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Помилка генерації JWT токена"})
		return
	}

	c.JSON(http.StatusOK, models.AuthResponseDTO{
		Token: token,
	})
}
