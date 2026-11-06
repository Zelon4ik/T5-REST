package middleware

import (
	"net/http"
	"strings"

	"github.com/Zelon4ik/T5-REST/utils"
	"github.com/gin-gonic/gin"
)

// AuthMiddleware перехоплює HTTP-запити, витягує заголовок Authorization,
// перевіряє валідність Bearer JWT токена та зберігає userID у контексті gin.Context.
func AuthMiddleware(secretKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized access"})
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized access"})
			return
		}

		tokenString := parts[1]
		claims, err := utils.VerifyToken(tokenString, secretKey)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized access"})
			return
		}

		// Збереження ідентифікатора авторизованого користувача в контексті запиту
		c.Set("userID", claims.UserID)
		c.Set("userEmail", claims.Email)
		c.Next()
	}
}
