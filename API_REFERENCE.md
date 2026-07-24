<<<<<<< HEAD
# API Reference

## Base URL
```
http://localhost:8000/api
```

## Authentication
All endpoints except login require JWT token:
```
Authorization: Bearer <access_token>
```

---

## Authentication Endpoints

### Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "account": 123456789,
  "password": "your_password",
  "server": "ICMarketsSC-Demo"
}
```

**Response:**
```json
{
  "success": true,
  "message": "ورود موفق",
  "access_token": "eyJhbGc...",
  "token_type": "bearer"
}
```

**Status Codes:**
- `200 OK` - Login successful
- `401 Unauthorized` - Invalid credentials

---

### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "خروج موفق"
}
```

---

## Account Endpoints

### Get Account Info
```http
GET /api/account/info
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "login": 123456789,
    "server": "ICMarketsSC-Demo",
    "balance": 10000.00,
    "credit": 0.00,
    "profit": 150.50,
    "equity": 10150.50,
    "margin": 1000.00,
    "marginFree": 9150.50,
    "marginLevel": 1015.05,
    "currency": "USD",
    "leverage": 100,
    "company": "IC Markets",
    "name": "Account Name"
  }
}
```

---

### Get Connection Status
```http
GET /api/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "connected": true,
  "account": 123456789,
  "server": "ICMarketsSC-Demo"
}
```

---

## Trading Data Endpoints

### Get Open Positions
```http
GET /api/positions
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "ticket": 123456,
      "symbol": "EURUSD",
      "type": "BUY",
      "magic": 0,
      "volume": 1.0,
      "priceOpen": 1.0850,
      "priceCurrent": 1.0860,
      "sl": 1.0800,
      "tp": 1.0900,
      "profit": 10.00,
      "commission": -1.00,
      "swap": 0.00,
      "timeOpen": "2024-01-15T10:30:00",
      "timeUpdate": "2024-01-15T14:45:30"
    }
  ],
  "count": 1
}
```

---

### Get Pending Orders
```http
GET /api/orders
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "ticket": 987654,
      "symbol": "GBPUSD",
      "type": "BUY_LIMIT",
      "magic": 0,
      "volume": 0.5,
      "volumeRemaining": 0.5,
      "priceOpen": 1.2600,
      "priceCurrent": 1.2620,
      "sl": 1.2580,
      "tp": 1.2650,
      "timeSetup": "2024-01-15T11:00:00",
      "expiration": null
    }
  ],
  "count": 1
}
```

---

### Get Symbols
```http
GET /api/symbols?filter_text=EUR
Authorization: Bearer <token>
```

**Query Parameters:**
- `filter_text` (optional) - Filter symbols by name

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "EURUSD",
      "description": "Euro vs US Dollar",
      "category": "Forex",
      "bid": 1.0860,
      "ask": 1.0861,
      "point": 0.00001,
      "digits": 5
    }
  ],
  "count": 1
}
```

---

### Get Symbol Tick
```http
GET /api/tick/EURUSD
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "EURUSD",
    "bid": 1.0860,
    "ask": 1.0861,
    "last": 1.0860,
    "volume": 1000000,
    "time": "2024-01-15T14:45:30"
  }
}
```

---

## Health Check Endpoint

### Health Status
```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "message": "Smart Tred API is running"
}
```

---

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "message": "خطای خوانایی برای کاربر"
}
```

**HTTP Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid parameters
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Rate Limiting

Currently no rate limiting is implemented. For production:
- Implement rate limiting on login endpoint
- Set max tokens per user
- Implement request throttling

---

## Pagination

Currently not implemented. Future versions may include:
- `page` query parameter
- `limit` query parameter
- Pagination metadata in responses

---

## Webhooks

Future feature for real-time notifications:
- Trade execution
- Account updates
- Margin calls
=======
# API Reference

## Base URL
```
http://localhost:8000/api
```

## Authentication
All endpoints except login require JWT token:
```
Authorization: Bearer <access_token>
```

---

## Authentication Endpoints

### Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "account": 123456789,
  "password": "your_password",
  "server": "ICMarketsSC-Demo"
}
```

**Response:**
```json
{
  "success": true,
  "message": "ورود موفق",
  "access_token": "eyJhbGc...",
  "token_type": "bearer"
}
```

**Status Codes:**
- `200 OK` - Login successful
- `401 Unauthorized` - Invalid credentials

---

### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "خروج موفق"
}
```

---

## Account Endpoints

### Get Account Info
```http
GET /api/account/info
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "login": 123456789,
    "server": "ICMarketsSC-Demo",
    "balance": 10000.00,
    "credit": 0.00,
    "profit": 150.50,
    "equity": 10150.50,
    "margin": 1000.00,
    "marginFree": 9150.50,
    "marginLevel": 1015.05,
    "currency": "USD",
    "leverage": 100,
    "company": "IC Markets",
    "name": "Account Name"
  }
}
```

---

### Get Connection Status
```http
GET /api/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "connected": true,
  "account": 123456789,
  "server": "ICMarketsSC-Demo"
}
```

---

## Trading Data Endpoints

### Get Open Positions
```http
GET /api/positions
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "ticket": 123456,
      "symbol": "EURUSD",
      "type": "BUY",
      "magic": 0,
      "volume": 1.0,
      "priceOpen": 1.0850,
      "priceCurrent": 1.0860,
      "sl": 1.0800,
      "tp": 1.0900,
      "profit": 10.00,
      "commission": -1.00,
      "swap": 0.00,
      "timeOpen": "2024-01-15T10:30:00",
      "timeUpdate": "2024-01-15T14:45:30"
    }
  ],
  "count": 1
}
```

---

### Get Pending Orders
```http
GET /api/orders
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "ticket": 987654,
      "symbol": "GBPUSD",
      "type": "BUY_LIMIT",
      "magic": 0,
      "volume": 0.5,
      "volumeRemaining": 0.5,
      "priceOpen": 1.2600,
      "priceCurrent": 1.2620,
      "sl": 1.2580,
      "tp": 1.2650,
      "timeSetup": "2024-01-15T11:00:00",
      "expiration": null
    }
  ],
  "count": 1
}
```

---

### Get Symbols
```http
GET /api/symbols?filter_text=EUR
Authorization: Bearer <token>
```

**Query Parameters:**
- `filter_text` (optional) - Filter symbols by name

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "EURUSD",
      "description": "Euro vs US Dollar",
      "category": "Forex",
      "bid": 1.0860,
      "ask": 1.0861,
      "point": 0.00001,
      "digits": 5
    }
  ],
  "count": 1
}
```

---

### Get Symbol Tick
```http
GET /api/tick/EURUSD
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "EURUSD",
    "bid": 1.0860,
    "ask": 1.0861,
    "last": 1.0860,
    "volume": 1000000,
    "time": "2024-01-15T14:45:30"
  }
}
```

---

## Health Check Endpoint

### Health Status
```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "message": "Smart Tred API is running"
}
```

---

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "message": "خطای خوانایی برای کاربر"
}
```

**HTTP Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid parameters
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Rate Limiting

Currently no rate limiting is implemented. For production:
- Implement rate limiting on login endpoint
- Set max tokens per user
- Implement request throttling

---

## Pagination

Currently not implemented. Future versions may include:
- `page` query parameter
- `limit` query parameter
- Pagination metadata in responses

---

## Webhooks

Future feature for real-time notifications:
- Trade execution
- Account updates
- Margin calls
>>>>>>> 484c99cdab74c588b287822ec809c7297d273de6
