# XAMPP Setup Guide for Social Media App

## Prerequisites
- XAMPP installed and running (Apache + MySQL)
- Node.js installed
- Git (optional)

## 1. Database Setup

### Start XAMPP Services
1. Open XAMPP Control Panel
2. Start **Apache** and **MySQL** services
3. Click **Admin** next to MySQL to open phpMyAdmin

### Create Database
1. In phpMyAdmin, click "New" to create a database
2. Name it `socialmedia_app`
3. Click "Create"

### Import Schema
1. Select the `socialmedia_app` database
2. Click "Import" tab
3. Choose file: `database/schema.sql`
4. Click "Go" to import

## 2. Backend Setup

### Install Dependencies
```bash
cd server
npm install
```

### Configure Environment
1. Copy `config.env` and update if needed:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=socialmedia_app
DB_PORT=3306
JWT_SECRET=your_super_secure_jwt_secret_key_here
PORT=5000
```

### Start Backend Server
```bash
npm run dev
```

The API will be available at `http://localhost:5000`

## 3. Frontend Setup

### Install Dependencies
```bash
# In the root directory
npm install
```

### Configure Environment
1. Copy `env.example` to `.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

### Start Frontend
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## 4. Testing the Setup

1. Visit `http://localhost:5000/api/health` - should show API status
2. Visit `http://localhost:5173` - should show the app
3. Try registering a new account
4. Create posts, follow users, etc.

## 5. Troubleshooting

### Database Connection Issues
- Ensure MySQL is running in XAMPP
- Check database credentials in `server/config.env`
- Verify database name exists in phpMyAdmin

### API Errors
- Check server console for error messages
- Ensure all npm packages are installed
- Verify JWT_SECRET is set in config.env

### Frontend Issues
- Check browser console for errors
- Ensure backend is running on port 5000
- Verify VITE_API_URL in .env file

## 6. Default Test Data

The schema includes sample users:
- Email: `john@example.com` / Password: (you'll need to register)
- Email: `jane@example.com` / Password: (you'll need to register)

## 7. File Upload (Optional)

To enable image uploads:
1. Create `server/uploads` directory
2. Images will be stored locally and served at `/uploads/filename`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Posts
- `GET /api/posts` - Get posts feed
- `POST /api/posts` - Create new post
- `POST /api/posts/:id/like` - Like/unlike post
- `GET /api/posts/:id/comments` - Get post comments
- `POST /api/posts/:id/comments` - Add comment

### Users
- `GET /api/users/suggestions` - Get user suggestions
- `POST /api/users/:id/follow` - Follow user
- `DELETE /api/users/:id/follow` - Unfollow user
- `GET /api/users/me/profile` - Get my profile
- `PUT /api/users/me/profile` - Update my profile
