const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/labor-management'

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['masteradmin', 'partner', 'staff'], required: true },
  createdAt: { type: Date, default: Date.now },
})

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
  next()
})

const User = mongoose.model('User', userSchema)

async function createTestUsers() {
  try {
    await mongoose.connect(mongoUri)
    
    const users = [
      { email: 'admin@laborapp.com', password: 'password123', role: 'masteradmin' },
      { email: 'partner1@laborapp.com', password: 'password123', role: 'partner' },
      { email: 'partner2@laborapp.com', password: 'password123', role: 'partner' },
      { email: 'staff@laborapp.com', password: 'password123', role: 'staff' },
    ]

    for (const userData of users) {
      const existing = await User.findOne({ email: userData.email })
      if (!existing) {
        await User.create(userData)
        console.log(`Created user: ${userData.email}`)
      } else {
        console.log(`User already exists: ${userData.email}`)
      }
    }

    console.log('Test users created successfully!')
    process.exit(0)
  } catch (error) {
    console.error('Error creating users:', error)
    process.exit(1)
  }
}

createTestUsers()
