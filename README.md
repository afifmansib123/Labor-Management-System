# Labor Management System

Bangladesh-based labor management system for transportation business with support for Master Admin, Partners, and Staff roles.

## Features

- **Authentication**: NextAuth with email/password credentials
- **Role-Based Access**: MasterAdmin, Partner, Staff roles
- **Job Management**: Route creation with map upload, job scheduling with calendar/clock
- **Workforce Management**: Employee tracking, batch operations, approval workflows
- **Financial Management**: Payment tracking, batch payments, proof uploads
- **Dashboard**: Overview with analytics and statistics

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- shadcn/ui
- MongoDB
- NextAuth.js
- Zod (validation)
- React Hook Form
- Redux RTK Query
- Cloudinary (file uploads)

## Setup

### Prerequisites
- Node.js 18+
- MongoDB running locally or MongoDB Atlas connection
- Cloudinary account (optional, for file uploads)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env.local`:
```
MONGODB_URI=mongodb://localhost:27017/labor-management
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Creating Test Users

Run this Node script to create test users:

```bash
node scripts/create-users.js
```

Or manually create users via API:

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123",
    "role": "masteradmin"
  }'
```

## Project Structure

```
├── app/
│   ├── api/                 # API routes
│   ├── auth/                # Auth pages
│   ├── dashboard/           # Dashboard pages
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Root page
├── components/
│   ├── dashboard/          # Dashboard components
│   └── ui/                 # UI components
├── lib/
│   ├── models/             # MongoDB models
│   ├── auth.ts             # NextAuth config
│   ├── db.ts               # Database connection
│   └── utils/              # Validation schemas
└── styles/                 # Global styles
```

## Database Models

- **User**: Email, password, role
- **Route**: Name, points, operating days/hours, map data
- **Job**: Route reference, scheduled date/time, status
- **Employee**: Unique ID, level, salary, NID, approval status
- **EmployeeLevel**: Level name, base salary
- **Payment**: Employee, amount, due date, status, proof
- **PartnerPayment**: Partner, amount, due date, status

## API Routes

### Auth
- `POST /api/auth/[...nextauth]` - NextAuth routes

### Users & Partners
- `POST /api/users` - Create user

### Routes
- `GET /api/routes` - Get all routes
- `POST /api/routes` - Create route
- `GET /api/routes/[id]` - Get route details
- `PUT /api/routes/[id]` - Update route
- `DELETE /api/routes/[id]` - Delete route

### Jobs
- `GET /api/jobs` - Get all jobs
- `POST /api/jobs` - Create job
- `PUT /api/jobs/[id]/status` - Update job status

### Employees
- `GET /api/employees` - Get employees
- `POST /api/employees` - Create employee
- `POST /api/employees/batch` - Batch add employees
- `PUT /api/employees/[id]/approve` - Approve employee

### Payments
- `GET /api/payments` - Get payments
- `POST /api/payments` - Create payment
- `PUT /api/payments/[id]/mark-paid` - Mark payment as paid

## User Roles

### MasterAdmin
- Full access to all features
- Create/manage routes and jobs
- Add partners and employees
- Manage all payments
- Approve partner employees

### Partner
- View own employees
- Mark own employees as paid
- View payment due dates

### Staff
- Limited workforce management
- Limited job management
- Process employee payments
- Upload payment proofs

## Development

### Running in Development
```bash
npm run dev
```

### Building for Production
```bash
npm run build
npm start
```

## Notes

- Credentials are manually set by admin, no self-registration
- All file uploads use Cloudinary integration
- Payment proofs require master admin approval
- Partner employees require master admin approval before payroll

## License

Private
