# truckbook

## ⚠️ Security Notice

**IMPORTANT: Handling Environment Variables Safely**

This project uses environment variables to manage sensitive configuration data like API keys. Please follow these security best practices:

### Environment Variables Setup

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Add your actual API keys to the `.env` file** (never commit this file!)

3. **Configure your Firebase API key:**
   - Get your API key from [Firebase Console](https://console.firebase.google.com/)
   - Replace `your_firebase_api_key_here` in `.env` with your actual key

### Security Best Practices

🔐 **Never commit sensitive data:**
- The `.env` file is already included in `.gitignore`
- Never hardcode API keys, passwords, or secrets directly in source code
- Always use environment variables for sensitive configuration

🔍 **Regular security checks:**
- Regularly audit your codebase for accidentally committed secrets
- Use tools like `git-secrets` to prevent committing sensitive data
- Rotate API keys periodically

📝 **Team collaboration:**
- Share the `.env.example` file (without real values) with your team
- Document all required environment variables
- Use a secure method to share actual API keys with team members

### Environment Variables Used

- `EXPO_PUBLIC_FIREBASE_API_KEY`: Firebase API key for authentication and services

Remember: Environment variables prefixed with `EXPO_PUBLIC_` are accessible in the client-side code in Expo applications.
